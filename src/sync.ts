import { COLLECTIONS, type AppData } from './types';

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
