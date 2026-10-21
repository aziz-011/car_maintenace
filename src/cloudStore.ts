import { useCallback, useEffect, useRef, useState } from 'react';
import { diffOps, type Op } from './sync';
import type { AppData } from './types';
import { EMPTY, loadLocal, saveLocal, type SyncStatus } from './storeShared';

type Collection = keyof AppData;
const COLLECTIONS: Collection[] = ['vehicles', 'fuel', 'services', 'reminders'];

/** One document per record, so edits on two devices touch different documents. */
const docId = (collection: Collection, id: string) => `${collection}~${id}`;

interface Row {
  kind: Collection;
  order: number;
  item: { id: string };
}

function isRow(value: unknown): value is Row {
  const v = value as Row | undefined;
  return !!v && COLLECTIONS.includes(v.kind) && typeof v.item?.id === 'string' && typeof v.order === 'number';
}

/**
 * App data kept in the claude.ai page's database, in the viewer's private
 * area (`data/users/<id>`), so it follows their account across devices.
 * Falls back to this browser's storage when the database is unavailable,
 * e.g. when signed out.
 */
export function useCloudData() {
  const [data, setData] = useState<AppData>(EMPTY);
  const [status, setStatus] = useState<SyncStatus>('loading');
  const [backend, setBackend] = useState<'cloud' | 'local'>('cloud');

  const dataRef = useRef(data);
  const col = useRef<ClaudeCollectionRef | null>(null);
  /** Display order of each stored document, so lists keep the order things were added in. */
  const order = useRef(new Map<string, number>());
  const writing = useRef(0);
  const failed = useRef(false);
  const perDoc = useRef(new Map<string, Promise<void>>());

  const commit = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  const applySnapshot = useCallback(
    (snap: ClaudeQuerySnapshot) => {
      const rows: Row[] = [];
      for (const d of snap.docs) {
        const body = d.data();
        if (isRow(body)) rows.push(body);
      }
      rows.sort((a, b) => a.order - b.order);
      const next: AppData = { vehicles: [], fuel: [], services: [], reminders: [] };
      order.current = new Map();
      for (const row of rows) {
        // Snapshots are frozen; the app treats records as plain values.
        (next[row.kind] as unknown[]).push(structuredClone(row.item));
        order.current.set(docId(row.kind, row.item.id), row.order);
      }
      commit(next);
    },
    [commit],
  );

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const [db, user] = await Promise.all([window.claude!.use('db'), window.claude!.use('user')]);
      const uid = await user?.id();
      if (cancelled) return;
      if (!db || !uid) {
        setBackend('local');
        commit(loadLocal());
        setStatus('local');
        return;
      }
      col.current = db.collection(`data/users/${uid}`);
      unsubscribe = col.current.onSnapshot(
        (snap) => {
          // While our own writes are in flight the snapshot can lag behind them.
          if (writing.current > 0) return;
          applySnapshot(snap);
          setStatus(failed.current ? 'offline' : 'synced');
        },
        () => setStatus('offline'),
      );
    })();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [applySnapshot, commit]);

  useEffect(() => {
    if (backend === 'local' && status === 'local') saveLocal(data);
  }, [backend, status, data]);

  /** Runs one write per document at a time, retrying a transient failure once. */
  const write = useCallback(
    (key: string, run: () => Promise<void>) => {
      writing.current++;
      setStatus('saving');
      const attempt = async () => {
        try {
          await run();
        } catch (e) {
          if ((e as { code?: string }).code !== 'unavailable') throw e;
          await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
          await run();
        }
      };
      const job = (perDoc.current.get(key) ?? Promise.resolve())
        .then(attempt)
        .catch((e) => {
          failed.current = true;
          console.error('Could not save', key, e);
        })
        .finally(async () => {
          if (perDoc.current.get(key) === job) perDoc.current.delete(key);
          if (--writing.current === 0 && col.current) {
            // Re-read once everything is written, so the view matches what is stored.
            try {
              applySnapshot(await col.current.get());
            } catch {
              failed.current = true;
            }
            setStatus(failed.current ? 'offline' : 'synced');
            failed.current = false;
          }
        });
      perDoc.current.set(key, job);
    },
    [applySnapshot],
  );

  const send = useCallback(
    (ops: Op[]) => {
      const c = col.current;
      if (!c) return;
      for (const op of ops) {
        if (op.kind === 'replace') {
          const keep = new Set(COLLECTIONS.flatMap((k) => op.data[k].map((x) => docId(k, x.id))));
          for (const key of order.current.keys()) if (!keep.has(key)) write(key, () => c.doc(key).delete());
          send(COLLECTIONS.flatMap((k) => op.data[k].map((item) => ({ kind: 'upsert', collection: k, item }) as Op)));
        } else if (op.kind === 'upsert') {
          const key = docId(op.collection, op.item.id);
          if (!order.current.has(key)) order.current.set(key, Date.now() + order.current.size / 1000);
          const row: Row = { kind: op.collection, order: order.current.get(key)!, item: op.item };
          write(key, () => c.doc(key).set({ ...row }));
        } else {
          const key = docId(op.collection, op.id);
          order.current.delete(key);
          write(key, () => c.doc(key).delete());
        }
      }
    },
    [write],
  );

  const update = useCallback(
    (fn: (d: AppData) => AppData) => {
      const prev = dataRef.current;
      const next = fn(prev);
      commit(next);
      if (col.current) send(diffOps(prev, next));
    },
    [commit, send],
  );

  const replace = useCallback(
    (next: AppData) => {
      commit(next);
      if (col.current) send([{ kind: 'replace', data: next }]);
    },
    [commit, send],
  );

  const retry = useCallback(async () => {
    if (col.current) applySnapshot(await col.current.get());
  }, [applySnapshot]);

  return { data, status, backend, update, replace, retry };
}
