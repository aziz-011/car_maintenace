import { describe, expect, it } from 'vitest';
// @ts-expect-error plain JS module shared with the Node server
import { applyOps, emptyData } from './ops.mjs';
import { diffOps } from '../src/sync';
import type { AppData } from '../src/types';

const vehicle = { id: 'v1', name: 'Car', make: 'VW', model: 'Golf', initialOdometer: 0 };
const fill = (id: string, liters: number) => ({
  id, vehicleId: 'v1', date: '2026-01-01', odometer: 1000, liters, totalCost: 10, fullTank: true,
});

describe('diffOps', () => {
  it('reports added, changed and removed records only', () => {
    const prev: AppData = { ...emptyData(), vehicles: [vehicle], fuel: [fill('a', 10), fill('b', 20)] };
    const next: AppData = { ...prev, fuel: [fill('a', 11), fill('c', 30)] };
    expect(diffOps(prev, next)).toEqual([
      { kind: 'upsert', collection: 'fuel', item: fill('a', 11) },
      { kind: 'upsert', collection: 'fuel', item: fill('c', 30) },
      { kind: 'delete', collection: 'fuel', id: 'b' },
    ]);
  });
});

describe('applyOps', () => {
  it('merges edits from two devices instead of overwriting', () => {
    const base = { ...emptyData(), vehicles: [vehicle] };
    // Two devices start from the same data and each add a fill-up.
    const phone = diffOps(base, { ...base, fuel: [fill('p', 10)] });
    const pc = diffOps(base, { ...base, fuel: [fill('q', 20)] });
    const merged = applyOps(applyOps(base, phone), pc);
    expect(merged.fuel.map((f: { id: string }) => f.id)).toEqual(['p', 'q']);
  });

  it('replaces everything on import', () => {
    const data = { ...emptyData(), vehicles: [vehicle] };
    expect(applyOps(data, [{ kind: 'replace', data: emptyData() }]).vehicles).toEqual([]);
  });

  it('rejects invalid operations', () => {
    expect(() => applyOps(emptyData(), [{ kind: 'upsert', collection: 'hack', item: { id: 'x' } }])).toThrow();
    expect(() => applyOps(emptyData(), [{ kind: 'upsert', collection: 'fuel', item: {} }])).toThrow();
    expect(() => applyOps(emptyData(), [{ kind: 'replace', data: { vehicles: [] } }])).toThrow();
  });
});
