import { useCallback, useEffect, useRef, useState } from 'react';
import { diffOps, type Op } from './sync';
import { COLLECTIONS, emptyData, type AppData } from './types';
import { EMPTY, loadLocal, saveLocal, type SyncStatus } from './storeShared';

type Collection = keyof AppData;

/**
 * Where the records live. Declared on publish as
 * `rules: [{path: "records", read: "interact", write: "interact"}]`: the
 * owner and the people they share the page with (allowed to use it) read and
 * change the same records; view-only visitors cannot. Claude reads them for
 * the weekly email acting as the owner.
 */
export const RECORDS = 'records';

const PENDING_KEY = 'car-maintenance:cloud-pending';
const CACHE_KEY = 'car-maintenance:cloud-cache';
const RETRY_MS = 15_000;

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

/** A write that failed for good (no permission, invalid), as opposed to a dropped connection. */
const isFinal = (e: unknown) => ['permission_denied', 'not_granted', 'invalid_argument', 'not_writer', 'forbidden'].includes((e as { code?: string })?.code ?? '');

function readJson<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '') as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: only the offline safety net is lost.
  }
}

/** Builds the app's data from stored rows, oldest first. */
function toData(rows: Map<string, Row>): AppData {
  const next = emptyData();
  for (const row of [...rows.values()].sort((a, b) => a.order - b.order)) (next[row.kind] as unknown[]).push(row.item);
  return next;
}

/**
 * App data kept in the claude.ai page's database, so it follows the account
 * across devices and is shared with the people the page is shared with.
 * Changes are queued in this browser until the database confirms them, so a
 * fill-up added with no signal is sent once the connection is back. A
 * visitor who may not change the records uses this browser's storage.
 */
export function useCloudData() {
  const [data, setData] = useState<AppData>(EMPTY);
  const [status, setStatus] = useState<SyncStatus>('loading');
  const [backend, setBackend] = useState<'cloud' | 'local'>('cloud');

  const dataRef = useRef(data);
  const col = useRef<ClaudeCollectionRef | null>(null);
  /** The records as last read from the database. */
  const base = useRef(new Map<string, Row>());
  /** Changes not confirmed yet: the row to store, or null to delete. */
  const pending = useRef(new Map<string, Row | null>(readJson<[string, Row | null][]>(PENDING_KEY, [])));
  const inflight = useRef(new Set<string>());
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offline = useRef(false);

  const commit = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  /** What the app shows: the stored records with the unsent changes on top. */
  const view = useCallback(() => {
    const rows = new Map(base.current);
    for (const [key, row] of pending.current) {
      if (row) rows.set(key, row);
      else rows.delete(key);
    }
    return rows;
  }, []);

  const savePending = () => writeJson(PENDING_KEY, [...pending.current]);

  const refreshStatus = useCallback(() => {
    setStatus(offline.current ? 'offline' : pending.current.size || inflight.current.size ? 'saving' : 'synced');
  }, []);

  const applyRows = useCallback(
    (rows: Map<string, Row>) => {
      base.current = rows;
      writeJson(CACHE_KEY, [...rows]);
      commit(toData(view()));
    },
    [commit, view],
  );

  const readSnapshot = (snap: ClaudeQuerySnapshot) => {
    const rows = new Map<string, Row>();
    for (const d of snap.docs) {
      const body = d.data();
      // Snapshots are frozen; the app treats records as plain values.
      if (isRow(body)) rows.set(d.id, structuredClone(body));
    }
    return rows;
  };

  const flushRef = useRef<() => void>(() => {});

  /** Sends every queued change; what fails because of the connection stays queued for the next try. */
  const flush = useCallback(() => {
    const c = col.current;
    if (!c) return;
    for (const [key, row] of pending.current) {
      if (inflight.current.has(key)) continue;
      inflight.current.add(key);
      const run = row ? c.doc(key).set({ ...row }) : c.doc(key).delete();
      run
        .then(() => {
          offline.current = false;
          if (row) base.current.set(key, row);
          else base.current.delete(key);
          // A newer change to the same record may have been queued meanwhile.
          if (pending.current.get(key) === row) pending.current.delete(key);
        })
        .catch((e) => {
          if (isFinal(e)) {
            console.error('Could not save', key, e);
            pending.current.delete(key);
            commit(toData(view()));
          } else {
            offline.current = true;
            retryTimer.current ??= setTimeout(() => {
              retryTimer.current = null;
              flushRef.current();
            }, RETRY_MS);
          }
        })
        .finally(() => {
          inflight.current.delete(key);
          savePending();
          if (pending.current.size && !inflight.current.size && !offline.current) flushRef.current();
          refreshStatus();
        });
    }
    refreshStatus();
  }, [commit, refreshStatus, view]);

  flushRef.current = flush;

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const [db, user] = await Promise.all([window.claude!.use('db'), window.claude!.use('user')]);
      const [uid, isOwner, canWrite] = await Promise.all([user?.id(), user?.isOwner(), user?.can('data.write')]);
      if (cancelled) return;
      if (!db || (!isOwner && canWrite === false)) {
        setBackend('local');
        commit(loadLocal());
        setStatus('local');
        return;
      }
      col.current = db.collection(RECORDS);
      // Shown straight away, and all there is while offline.
      const cached = readJson<[string, Row][]>(CACHE_KEY, []);
      if (cached.length || pending.current.size) {
        base.current = new Map(cached.filter(([, r]) => isRow(r)));
        commit(toData(view()));
        setStatus(pending.current.size ? 'saving' : 'synced');
      }
      // The first claude.ai version kept records in the owner's private area; copy them over once.
      if (uid && isOwner) {
        try {
          const [current, old] = await Promise.all([col.current.get(), db.collection(`data/users/${uid}`).get()]);
          if (current.docs.length === 0 && old.docs.length > 0) {
            for (const d of old.docs) {
              const body = d.data();
              if (isRow(body)) await col.current.doc(d.id).set({ ...body });
            }
          }
        } catch (e) {
          console.error('Could not copy earlier records', e);
        }
      }
      if (cancelled) return;
      unsubscribe = col.current.onSnapshot(
        (snap) => {
          offline.current = false;
          applyRows(readSnapshot(snap));
          flushRef.current();
          refreshStatus();
        },
        () => {
          offline.current = true;
          setStatus('offline');
        },
      );
    })();
    const online = () => {
      offline.current = false;
      flushRef.current();
    };
    window.addEventListener('online', online);
    return () => {
      cancelled = true;
      unsubscribe?.();
      window.removeEventListener('online', online);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [applyRows, commit, refreshStatus, view]);

  useEffect(() => {
    if (backend === 'local' && status === 'local') saveLocal(data);
  }, [backend, status, data]);

  const queue = useCallback(
    (ops: Op[]) => {
      const rows = view();
      const nextOrder = () => Date.now() + rows.size / 1000;
      for (const op of ops) {
        if (op.kind === 'replace') {
          const keep = new Set(COLLECTIONS.flatMap((k) => op.data[k].map((x) => docId(k, x.id))));
          for (const key of rows.keys()) if (!keep.has(key)) pending.current.set(key, null);
          queue(COLLECTIONS.flatMap((k) => op.data[k].map((item) => ({ kind: 'upsert', collection: k, item }) as Op)));
        } else if (op.kind === 'upsert') {
          const key = docId(op.collection, op.item.id);
          const row: Row = { kind: op.collection, order: rows.get(key)?.order ?? nextOrder(), item: op.item };
          rows.set(key, row);
          pending.current.set(key, row);
        } else {
          const key = docId(op.collection, op.id);
          rows.delete(key);
          pending.current.set(key, null);
        }
      }
      savePending();
    },
    [view],
  );

  const update = useCallback(
    (fn: (d: AppData) => AppData) => {
      const prev = dataRef.current;
      const next = fn(prev);
      commit(next);
      if (!col.current) return;
      queue(diffOps(prev, next));
      flush();
    },
    [commit, queue, flush],
  );

  const replace = useCallback(
    (next: AppData) => {
      commit(next);
      if (!col.current) return;
      queue([{ kind: 'replace', data: next }]);
      flush();
    },
    [commit, queue, flush],
  );

  const retry = useCallback(async () => {
    offline.current = false;
    if (col.current) applyRows(readSnapshot(await col.current.get()));
    flush();
  }, [applyRows, flush]);

  return { data, status, backend, update, replace, retry };
}
