import { useCallback, useEffect, useRef, useState } from 'react';
import { useCloudData } from './cloudStore';
import { EMPTY, loadLocal, saveLocal, type SyncStatus } from './storeShared';
import { diffOps, type Op } from './sync';
import type { AppData } from './types';

export { isAppData, newId, today, type SyncStatus } from './storeShared';

const PENDING_KEY = 'car-maintenance:pending';
const POLL_MS = 15_000;

/** Changes not yet confirmed by the server, kept so closing the page never loses them. */
function loadPending(): Op[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function savePending(ops: Op[]) {
  try {
    if (ops.length) localStorage.setItem(PENDING_KEY, JSON.stringify(ops));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    // Unavailable storage only loses this safety net, not the in-memory queue.
  }
}

interface ServerState {
  version: number;
  data: AppData;
}

class NoServer extends Error {}
/** The server refused the request as invalid; retrying would fail the same way. */
class Rejected extends Error {}

async function fetchState(url: string, init?: RequestInit): Promise<ServerState> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  if (res.status === 404 || !isJson) throw new NoServer();
  if (res.status === 400) throw new Rejected((await res.json()).error);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** All app data: kept on the server when the app is served by it, otherwise in localStorage. */
function useServerData() {
  const canHaveServer = location.protocol.startsWith('http');
  const [data, setData] = useState<AppData>(canHaveServer ? EMPTY : loadLocal);
  const [status, setStatus] = useState<SyncStatus>(canHaveServer ? 'loading' : 'local');

  const mode = useRef<'server' | 'local' | null>(canHaveServer ? null : 'local');
  const dataRef = useRef(data);
  const version = useRef(-1);
  const pending = useRef<Op[]>(canHaveServer ? loadPending() : []);
  const inflight = useRef(false);

  const commit = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  /** Sends queued changes one batch at a time; failures stay queued for the next try. */
  const flush = useCallback(async () => {
    if (inflight.current || pending.current.length === 0) return;
    inflight.current = true;
    const ops = pending.current;
    pending.current = [];
    if (mode.current) setStatus('saving');
    let ok = false;
    try {
      const state = await fetchState('/api/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ops }),
      });
      mode.current = 'server';
      version.current = state.version;
      // Newer local edits are still queued; showing the server copy now would hide them.
      if (pending.current.length === 0) commit(state.data);
      ok = true;
      setStatus('synced');
    } catch (e) {
      if (e instanceof Rejected) {
        // Drop the bad batch and reload what the server has, rather than retrying forever.
        console.error('Server rejected changes:', e.message);
        version.current = -1;
        ok = true;
      } else {
        pending.current = [...ops, ...pending.current];
        setStatus(mode.current === 'server' ? 'offline' : 'unreachable');
      }
    } finally {
      inflight.current = false;
      // Saved only after the server confirms, so a crash or closed tab keeps unsent changes.
      savePending(pending.current);
    }
    if (ok && pending.current.length) void flush();
    else if (ok && version.current === -1) void pullRef.current();
  }, [commit]);

  const pullRef = useRef<() => Promise<void>>(async () => {});

  /** Fetches changes made from other devices. */
  const pull = useCallback(async () => {
    if (mode.current === 'local') return;
    if (pending.current.length || inflight.current) return flush();
    try {
      const state = await fetchState('/api/data');
      mode.current = 'server';
      if (state.version !== version.current && pending.current.length === 0 && !inflight.current) {
        version.current = state.version;
        commit(state.data);
      }
      setStatus('synced');
    } catch (e) {
      if (e instanceof NoServer && mode.current === null) {
        mode.current = 'local';
        commit(loadLocal());
        setStatus('local');
      } else {
        setStatus(mode.current === 'server' ? 'offline' : 'unreachable');
      }
    }
  }, [commit, flush]);

  pullRef.current = pull;

  useEffect(() => {
    if (!canHaveServer) return;
    void pull();
    const timer = setInterval(() => void pull(), POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && void pull();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [canHaveServer, pull]);

  useEffect(() => {
    if (mode.current === 'local') saveLocal(data);
  }, [data]);

  const update = useCallback(
    (fn: (d: AppData) => AppData) => {
      const prev = dataRef.current;
      const next = fn(prev);
      commit(next);
      if (mode.current === 'server') {
        pending.current.push(...diffOps(prev, next));
        savePending(pending.current);
        void flush();
      }
    },
    [commit, flush],
  );

  const replace = useCallback(
    (next: AppData) => {
      commit(next);
      if (mode.current === 'server') {
        pending.current.push({ kind: 'replace', data: next });
        savePending(pending.current);
        void flush();
      }
    },
    [commit, flush],
  );

  const backend: 'server' | 'local' = status === 'local' ? 'local' : 'server';
  return { data, status, backend, update, replace, retry: pull };
}

/**
 * Where the data lives depends on how the app was opened, and that never
 * changes while the page is open: as a claude.ai page, its database; from the
 * home server, the server; as a file, this browser.
 */
export const useAppData: () => ReturnType<typeof useServerData> | ReturnType<typeof useCloudData> =
  typeof window.claude?.use === 'function' ? useCloudData : useServerData;
