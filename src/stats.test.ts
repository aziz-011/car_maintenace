import { describe, expect, it } from 'vitest';
import { addMonths, consumptionSegments, drivingRate, fuelSummary, reminderStatus, vehicleOverview } from './stats';
import { normalizeData } from './types';
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

describe('reminderStatus with parts', () => {
  it('resets when a service replaced the matching part', () => {
    const reminder: Reminder = {
      id: 'r',
      vehicleId: 'v',
      type: 'Air filter',
      intervalKm: 20000,
      lastDate: '2025-01-01',
      lastOdometer: 30000,
    };
    const service: ServiceEntry = {
      id: 's',
      vehicleId: 'v',
      date: '2026-05-01',
      odometer: 49000,
      type: 'Periodic service',
      parts: ['Oil filter', 'Air filter'],
      cost: 150,
    };
    const status = reminderStatus(reminder, [service], 50500, '2026-06-01');
    expect(status.state).toBe('ok');
    expect(status.dueOdometer).toBe(69000);
  });
});

describe('reminderStatus with a fixed date', () => {
  const insurance: Reminder = {
    id: 'i',
    vehicleId: 'v',
    type: 'Insurance',
    dueDate: '2026-12-01',
    lastDate: '2026-01-01',
    lastOdometer: 0,
  };

  it('ignores the odometer and uses the date', () => {
    expect(reminderStatus(insurance, [], 999999, '2026-10-01').state).toBe('ok');
    expect(reminderStatus(insurance, [], 0, '2026-11-15').state).toBe('soon');
    expect(reminderStatus(insurance, [], 0, '2026-12-01').state).toBe('overdue');
  });

  it('uses a custom warning window', () => {
    expect(reminderStatus(insurance, [], 0, '2026-10-01', 90).state).toBe('soon');
  });
});

describe('drivingRate', () => {
  it('needs two values a week apart', () => {
    expect(drivingRate([{ date: '2026-10-01', odometer: 1000 }])).toBeNull();
    expect(drivingRate([{ date: '2026-10-01', odometer: 1000 }, { date: '2026-10-04', odometer: 1200 }])).toBeNull();
  });

  it('averages recent driving per day', () => {
    const rate = drivingRate([
      { date: '2026-01-01', odometer: 1000 }, // older than the window, ignored
      { date: '2026-09-01', odometer: 20000 },
      { date: '2026-09-29', odometer: 21400 },
    ]);
    expect(rate?.kmPerDay).toBeCloseTo(50);
    expect(rate?.lastOdometer).toBe(21400);
  });
});

describe('oil change estimate', () => {
  const oil: Reminder = { id: 'o', vehicleId: 'v', type: 'Oil change', intervalKm: 7500, lastDate: '2026-09-01', lastOdometer: 20000 };
  const driving = { kmPerDay: 50, lastDate: '2026-09-29', lastOdometer: 21400 };

  it('estimates the date the distance will be reached', () => {
    const s = reminderStatus(oil, [], 21400, '2026-09-29', 30, driving);
    expect(s.dueOdometer).toBe(27500);
    // 6,100 km left at 50 km a day = 122 days after the last reading.
    expect(s.estimatedDate).toBe('2027-01-29');
    expect(s.state).toBe('ok');
  });

  it('is due soon when the estimate is within two weeks', () => {
    expect(reminderStatus(oil, [], 21400, '2027-01-20', 30, driving).state).toBe('soon');
  });

  it('resets from a service that changed the engine oil', () => {
    const service: ServiceEntry = { id: 's', vehicleId: 'v', date: '2026-10-10', odometer: 22000, type: 'Periodic service', parts: ['Engine oil'], cost: 0 };
    expect(reminderStatus(oil, [service], 22000, '2026-10-10').dueOdometer).toBe(29500);
  });
});

describe('vehicleOverview', () => {
  it('uses odometer readings for the odometer and the rate', () => {
    const data = normalizeData({
      vehicles: [{ id: 'v', name: 'Car', make: 'A', model: 'B', initialOdometer: 20000 }],
      readings: [
        { id: 'r1', vehicleId: 'v', date: '2026-09-01', odometer: 20000 },
        { id: 'r2', vehicleId: 'v', date: '2026-09-15', odometer: 20700 },
      ],
    });
    const o = vehicleOverview(data.vehicles[0], data, '2026-09-15');
    expect(o.odometer).toBe(20700);
    expect(o.driving?.kmPerDay).toBeCloseTo(50);
    expect(o.lastOdometerDate).toBe('2026-09-15');
  });
});
