import { describe, expect, it } from 'vitest';
import { budgetStatus, compareCars, consumptionAlert, driverStats, forecast, garageStats, issueRepeats, tripYears } from './insights';
import { normalizeData, type FuelEntry, type Issue, type ServiceEntry, type Trip, type Vehicle } from './types';

const car: Vehicle = { id: 'v', name: 'Golf', make: 'Volkswagen', model: 'Golf', initialOdometer: 10000 };
let n = 0;
const fill = (date: string, odometer: number, liters: number, totalCost = liters * 2.5, driver?: string): FuelEntry => ({
  id: `f${n++}`, vehicleId: 'v', date, odometer, liters, totalCost, fullTank: true, driver,
});
const service = (date: string, odometer: number, type: string, cost: number, shop?: string): ServiceEntry => ({
  id: `s${n++}`, vehicleId: 'v', date, odometer, type, cost, shop,
});

describe('consumptionAlert', () => {
  // 600 km per tank at 6 L/100 km.
  const usual = [fill('2026-01-01', 10000, 40), fill('2026-01-10', 10600, 36), fill('2026-01-20', 11200, 36), fill('2026-01-30', 11800, 36)];

  it('stays quiet while consumption is normal', () => {
    expect(consumptionAlert([...usual, fill('2026-02-10', 12400, 37)])).toBeNull();
  });

  it('flags a tank clearly worse than the ones before', () => {
    const alert = consumptionAlert([...usual, fill('2026-02-10', 12400, 45)]);
    expect(alert?.usual).toBeCloseTo(6);
    expect(alert?.last).toBeCloseTo(7.5);
    expect(alert?.percent).toBeCloseTo(25);
  });

  it('needs a few earlier tanks and a real distance', () => {
    expect(consumptionAlert([...usual.slice(0, 3), fill('2026-02-10', 11800, 50)])).toBeNull();
    expect(consumptionAlert([...usual, fill('2026-02-01', 11900, 20)])).toBeNull();
  });
});

describe('budgetStatus', () => {
  const budgeted = { ...car, fuelBudget: 300 };
  it('is off without a budget', () => {
    expect(budgetStatus(car, [], '2026-10-15')).toBeNull();
  });
  it('projects the month and warns before going over', () => {
    const fuel = [fill('2026-10-02', 10000, 40, 100), fill('2026-10-10', 10500, 40, 100), fill('2026-09-28', 9500, 40, 100)];
    const s = budgetStatus(budgeted, fuel, '2026-10-15')!;
    expect(s.spent).toBe(200);
    expect(s.projected).toBeCloseTo(200 / 15 * 31);
    expect(s.state).toBe('close');
    expect(budgetStatus(budgeted, fuel.slice(0, 1), '2026-10-15')!.state).toBe('ok');
    expect(budgetStatus(budgeted, [...fuel, fill('2026-10-14', 11000, 50, 120)], '2026-10-15')!.state).toBe('over');
  });
});

describe('forecast', () => {
  // 100 km a day, fuel at 0.15 per km.
  const fuel = [fill('2026-01-01', 10000, 40, 60), fill('2026-01-11', 11000, 60, 150)];
  const data = normalizeData({
    vehicles: [car],
    fuel,
    services: [service('2025-06-01', 1000, 'Timing belt', 450)],
    reminders: [
      { id: 'oil', vehicleId: 'v', type: 'Oil change', intervalKm: 7500, lastDate: '2026-01-11', lastOdometer: 11000, estimatedCost: 120 },
      { id: 'belt', vehicleId: 'v', type: 'Timing belt', intervalKm: 90000, lastDate: '2025-06-01', lastOdometer: 1000 },
      { id: 'ins', vehicleId: 'v', type: 'Insurance', dueDate: '2026-06-01', lastDate: '2025-06-01', lastOdometer: 0 },
    ],
  });
  const f = forecast(car, data, '2026-01-11');

  it('projects fuel from the driving pace and cost per km', () => {
    expect(f.km).toBeCloseTo(100 * 365, -2);
    expect(f.fuel).toBeCloseTo(f.km! * 0.15);
  });

  it('repeats interval items and prices them', () => {
    const oil = f.items.filter((i) => i.type === 'Oil change');
    // Every 75 days: 4 times within the year.
    expect(oil).toHaveLength(4);
    expect(oil[0].date).toBe('2026-03-27');
    expect(oil.every((i) => i.cost === 120)).toBe(true);
    // The belt is due at 91,000 km, about 800 days away.
    expect(f.items.some((i) => i.type === 'Timing belt')).toBe(false);
    expect(f.items.find((i) => i.type === 'Insurance')).toMatchObject({ date: '2026-06-01', cost: null });
    expect(f.unknown).toBe(1);
    expect(f.services).toBe(480);
    expect(f.total).toBeCloseTo(f.fuel! + 480);
  });

  it('uses the last service of that type when no estimate is set', () => {
    const soon = normalizeData({ ...data, reminders: [{ ...data.reminders[1], intervalKm: 5000 }] });
    expect(forecast(car, soon, '2026-01-11').items[0]).toMatchObject({ type: 'Timing belt', cost: 450, date: '2026-01-11' });
  });
});

describe('comparisons', () => {
  it('compares cars over the last 12 months', () => {
    const data = normalizeData({
      vehicles: [car, { ...car, id: 'w', name: 'Clio' }],
      fuel: [fill('2026-01-01', 10000, 40, 100), fill('2026-02-01', 11000, 60, 150)],
      services: [service('2026-01-15', 10500, 'Repair', 50)],
      reminders: [],
    });
    const [golf, clio] = compareCars(data, '2026-03-01');
    // Fuel per km from the tank (150 for 1000 km) plus the service over the same distance.
    expect(golf.costPerKm).toBeCloseTo(0.15 + 50 / 1000);
    expect(golf.consumption).toBeCloseTo(6);
    expect(clio.costPerKm).toBeNull();
  });

  it('totals per driver', () => {
    const stats = driverStats(
      [fill('2026-01-01', 1, 40, 100, 'Aziz'), fill('2026-01-02', 2, 20, 50, 'Sara'), fill('2026-01-03', 3, 20, 50)],
      [{ ...service('2026-01-04', 4, 'Repair', 80), driver: 'Sara' }],
      [{ id: 't', vehicleId: 'v', date: '2026-01-05', distance: 120, purpose: 'work', driver: 'Aziz' }],
    );
    expect(stats.map((s) => [s.driver, s.fills, s.fuelCost, s.serviceCost, s.tripKm])).toEqual([
      ['Sara', 1, 50, 80, 0],
      ['Aziz', 1, 100, 0, 120],
    ]);
  });

  it('splits work and personal driving with the work share of costs', () => {
    const trips: Trip[] = [
      { id: 'a', vehicleId: 'v', date: '2026-02-01', distance: 300, purpose: 'work' },
      { id: 'b', vehicleId: 'v', date: '2026-02-03', distance: 100, purpose: 'personal' },
    ];
    const fuel = [fill('2026-01-01', 10000, 40, 100), fill('2026-03-01', 11000, 60, 150)];
    const [y] = tripYears(trips, fuel, [], new Map([['2026', 1000]]));
    expect(y.km).toEqual({ work: 300, personal: 100 });
    expect(y.workShare).toBeCloseTo(0.3);
    expect(y.workFuelCost).toBeCloseTo(300 * 0.15);
    expect(y.workShareOfCosts).toBeCloseTo(0.3 * 250);
  });

  it('spots a problem that keeps coming back', () => {
    const issue = (id: string, title: string, code?: string): Issue => ({ id, vehicleId: 'v', date: '2026-01-01', odometer: 0, kind: 'fault-code', title, code });
    const repeats = issueRepeats([issue('a', 'Check engine', 'P0401'), issue('b', 'Engine light', 'p0401 '), issue('c', 'Squeak')]);
    expect([repeats.get('a'), repeats.get('b'), repeats.get('c')]).toEqual([2, 2, 1]);
  });

  it('matches services to a garage by name', () => {
    const s = garageStats({ id: 'g', name: 'Garage Ben Ali' }, [
      service('2026-01-01', 1, 'Repair', 100, 'garage ben ali '),
      service('2026-03-01', 2, 'Repair', 50, 'Garage Ben Ali'),
      service('2026-02-01', 3, 'Repair', 70, 'Other'),
    ]);
    expect(s).toEqual({ jobs: 2, spent: 150, lastDate: '2026-03-01' });
  });
});
