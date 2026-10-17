import { describe, expect, it } from 'vitest';
import { addMonths, consumptionSegments, fuelSummary, reminderStatus } from './stats';
import type { FuelEntry, Reminder, ServiceEntry } from './types';

const fuel = (id: string, odometer: number, liters: number, fullTank = true, totalCost = liters * 2): FuelEntry => ({
  id,
  vehicleId: 'v',
  date: '2026-01-01',
  odometer,
  liters,
  totalCost,
  fullTank,
});

describe('consumptionSegments', () => {
  it('ignores fuel before the first full tank', () => {
    expect(consumptionSegments([fuel('a', 1000, 40)])).toEqual([]);
  });

  it('computes L/100km between full tanks', () => {
    const segs = consumptionSegments([fuel('a', 1000, 40), fuel('b', 1500, 30)]);
    expect(segs).toHaveLength(1);
    expect(segs[0].litersPer100km).toBeCloseTo(6);
  });

  it('accumulates partial fills into the next full segment', () => {
    const segs = consumptionSegments([
      fuel('c', 1800, 10, false), // out of order on purpose
      fuel('a', 1000, 40),
      fuel('b', 1400, 20, false),
      fuel('d', 2000, 20),
    ]);
    expect(segs).toHaveLength(1);
    expect(segs[0].distance).toBe(1000);
    expect(segs[0].litersPer100km).toBeCloseTo(5);
  });
});

describe('fuelSummary', () => {
  it('returns nulls without enough data', () => {
    const s = fuelSummary([fuel('a', 1000, 40)]);
    expect(s.averageLPer100).toBeNull();
    expect(s.costPerKm).toBeNull();
  });

  it('excludes the first fill-up cost from cost per km', () => {
    const s = fuelSummary([fuel('a', 1000, 40, true, 80), fuel('b', 1500, 30, true, 60)]);
    expect(s.costPerKm).toBeCloseTo(0.12);
    expect(s.totalCost).toBe(140);
  });
});

describe('addMonths', () => {
  it('clamps to the end of shorter months', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
  });
});

describe('reminderStatus', () => {
  const reminder: Reminder = {
    id: 'r',
    vehicleId: 'v',
    type: 'Oil change',
    intervalKm: 10000,
    intervalMonths: 12,
    lastDate: '2026-01-01',
    lastOdometer: 50000,
  };

  it('is overdue by distance', () => {
    expect(reminderStatus(reminder, [], 60500, '2026-03-01').state).toBe('overdue');
  });

  it('is soon by date', () => {
    expect(reminderStatus(reminder, [], 51000, '2026-12-15').state).toBe('soon');
  });

  it('resets after a matching service', () => {
    const service: ServiceEntry = {
      id: 's',
      vehicleId: 'v',
      date: '2026-06-01',
      odometer: 59000,
      type: 'Oil change',
      cost: 80,
    };
    const status = reminderStatus(reminder, [service], 60500, '2026-07-01');
    expect(status.state).toBe('ok');
    expect(status.dueOdometer).toBe(69000);
    expect(status.dueDate).toBe('2027-06-01');
  });
});
