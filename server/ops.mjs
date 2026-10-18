// Applies client changes to the stored data. Kept free of I/O so it can be unit tested.

export const COLLECTIONS = ['vehicles', 'fuel', 'services', 'reminders'];

export function emptyData() {
  return { vehicles: [], fuel: [], services: [], reminders: [] };
}

export function isAppData(value) {
  return !!value && typeof value === 'object' && COLLECTIONS.every((k) => Array.isArray(value[k]));
}

/**
 * Returns a new data object with the operations applied, or throws on an invalid one.
 * Operations: { kind: 'upsert', collection, item } | { kind: 'delete', collection, id } | { kind: 'replace', data }
 */
export function applyOps(data, ops) {
  if (!Array.isArray(ops)) throw new Error('ops must be an array');
  let next = { ...data };
  for (const op of ops) {
    if (op?.kind === 'replace') {
      if (!isAppData(op.data)) throw new Error('invalid data');
      next = Object.fromEntries(COLLECTIONS.map((k) => [k, op.data[k]]));
      continue;
    }
    if (!COLLECTIONS.includes(op?.collection)) throw new Error('invalid collection');
    const list = next[op.collection];
    if (op.kind === 'upsert') {
      if (typeof op.item?.id !== 'string') throw new Error('item needs a string id');
      const i = list.findIndex((x) => x.id === op.item.id);
      next[op.collection] = i === -1 ? [...list, op.item] : list.map((x, j) => (j === i ? op.item : x));
    } else if (op.kind === 'delete') {
      next[op.collection] = list.filter((x) => x.id !== op.id);
    } else {
      throw new Error('unknown op');
    }
  }
  return next;
}
