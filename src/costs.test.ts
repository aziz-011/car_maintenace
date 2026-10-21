import { describe, expect, it } from 'vitest';
import { monthlyCosts, priceHistory, stationStats, yearlyCosts } from './costs';
import type { FuelEntry, ServiceEntry } from './types';

const fill = (date: string, odometer: number, liters: number, totalCost: number, station?: string): FuelEntry => ({
  id: date + odometer, vehicleId: 'v', date, odometer, liters, totalCost, fullTank: true, station,
});
const service = (date: string, odometer: number, cost: number): ServiceEntry => ({ id: date, vehicleId: 'v', date, odometer, type: 'Repair', cost });

describe('costs', () => {
  const fuel = [fill('2025-12-20', 9000, 40, 90, 'Shell'), fill('2026-01-05', 9600, 40, 96, 'Agil'), fill('2026-03-10', 10800, 30, 75, 'Agil')];
  const services = [service('2026-03-15', 10850, 200)];

  it('spreads spending over months, keeping empty months', () => {
    const months = monthlyCosts(fuel, services, '2026-03-31', 4);
    expect(months.map((m) => m.month)).toEqual(['2025-12', '2026-01', '2026-02', '2026-03']);
    expect(months.map((m) => [m.fuel, m.service])).toEqual([[90, 0], [96, 0], [0, 0], [75, 200]]);
  });

  it('totals years with the distance driven inside each', () => {
    const [y2026, y2025] = yearlyCosts(fuel, services, []);
    expect(y2026).toMatchObject({ year: '2026', fuel: 171, service: 200, liters: 70, distance: 1250 });
    expect(y2025.distance).toBeNull();
  });

  it('ranks stations by average price per litre', () => {
    const stats = stationStats(fuel, '2026-04-01');
    expect(stats.map((s) => s.station)).toEqual(['Shell', 'Agil']);
    expect(stats[1].averagePrice).toBeCloseTo(171 / 70);
    expect(stats[1].lastPrice).toBeCloseTo(2.5);
    expect(priceHistory(fuel).map((p) => p.price)).toEqual([2.25, 2.4, 2.5]);
  });
});
