import { COLLECTIONS, isAppData, normalizeData, type AppData } from './types';

type Collection = keyof AppData;

export type Op =
  | { kind: 'upsert'; collection: Collection; item: { id: string } }
  | { kind: 'delete'; collection: Collection; id: string }
  | { kind: 'replace'; data: AppData };

/**
 * The per-record changes that turn `prev` into `next`. Sending these instead of
 * the whole data set lets edits from two devices merge on the server.
 */
export function diffOps(prev: AppData, next: AppData): Op[] {
  const ops: Op[] = [];
  for (const collection of COLLECTIONS) {
    const before = new Map<string, unknown>((prev[collection] ?? []).map((x) => [x.id, x]));
    const after = new Set<string>();
    for (const item of next[collection]) {
      after.add(item.id);
      const old = before.get(item.id);
      if (old !== item && JSON.stringify(old) !== JSON.stringify(item)) ops.push({ kind: 'upsert', collection, item });
    }
    for (const id of before.keys()) if (!after.has(id)) ops.push({ kind: 'delete', collection, id });
  }
  return ops;
}

/**
 * Returns a new data object with the operations applied, or throws on an
 * invalid one. The server applies what devices send; a device applies its
 * unsent changes to its offline copy the same way.
 */
export function applyOps(data: AppData, ops: unknown): AppData {
  if (!Array.isArray(ops)) throw new Error('ops must be an array');
  let next = normalizeData(data);
  for (const op of ops as Partial<Op & { collection: string; item: { id: unknown }; id: string }>[]) {
    if (op?.kind === 'replace') {
      if (!isAppData(op.data)) throw new Error('invalid data');
      next = normalizeData(op.data);
      continue;
    }
    const collection = op?.collection as Collection;
    if (!COLLECTIONS.includes(collection)) throw new Error('invalid collection');
    const list = next[collection] as { id: string }[];
    if (op.kind === 'upsert') {
      const item = op.item as { id: string };
      if (typeof item?.id !== 'string') throw new Error('item needs a string id');
      const i = list.findIndex((x) => x.id === item.id);
      (next as unknown as Record<string, unknown[]>)[collection] = i === -1 ? [...list, item] : list.map((x, j) => (j === i ? item : x));
    } else if (op.kind === 'delete') {
      (next as unknown as Record<string, unknown[]>)[collection] = list.filter((x) => x.id !== op.id);
    } else {
      throw new Error('unknown op');
    }
  }
  return next;
}
