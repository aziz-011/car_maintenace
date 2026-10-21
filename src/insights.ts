import { addDays, consumptionSegments, daysBetween, fuelSummary, vehicleOverview } from './stats';
import type { AppData, FuelEntry, Garage, Issue, ServiceEntry, Trip, TripPurpose, Vehicle } from './types';

/**
 * Alerts and projections built on the logged history: unusual consumption,
 * the monthly fuel budget, next year's spending, and comparisons between
 * cars, drivers, garages and trips.
 */

export const DEFAULT_CONSUMPTION_ALERT = 15;
/** Earlier tanks the latest one is compared with. */
const USUAL_TANKS = 5;
const MIN_USUAL_TANKS = 3;
/** Short hops between fill-ups give noisy figures; they never raise the alert. */
const MIN_ALERT_DISTANCE = 150;

export interface ConsumptionAlert {
  entryId: string;
  date: string;
  /** L/100 km of the latest full tank. */
  last: number;
  /** L/100 km over the tanks before it. */
  usual: number;
  /** How much worse, in percent. */
  percent: number;
}

/** The latest full tank when it used clearly more fuel than the ones before it. */
export function consumptionAlert(fuel: FuelEntry[], thresholdPercent = DEFAULT_CONSUMPTION_ALERT): ConsumptionAlert | null {
  const segments = consumptionSegments(fuel);
  const last = segments.at(-1);
  const before = segments.slice(-1 - USUAL_TANKS, -1);
  if (!last || before.length < MIN_USUAL_TANKS || last.distance < MIN_ALERT_DISTANCE) return null;
  const usual = (before.reduce((s, x) => s + x.liters, 0) / before.reduce((s, x) => s + x.distance, 0)) * 100;
  const percent = (last.litersPer100km / usual - 1) * 100;
  if (percent < thresholdPercent) return null;
  return { entryId: last.entryId, date: last.date, last: last.litersPer100km, usual, percent };
}

export type BudgetState = 'ok' | 'close' | 'over';

export interface BudgetStatus {
  budget: number;
  spent: number;
  /** Spending at this pace by the end of the month. */
  projected: number;
  state: BudgetState;
}

/** The share of the monthly fuel budget used so far this month. */
export function budgetStatus(vehicle: Vehicle, fuel: FuelEntry[], today: string): BudgetStatus | null {
  const budget = vehicle.fuelBudget;
  if (!budget || budget <= 0) return null;
  const month = today.slice(0, 7);
  const spent = fuel.filter((f) => f.vehicleId === vehicle.id && f.date.startsWith(month)).reduce((s, f) => s + f.totalCost, 0);
  const [y, m, d] = today.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const projected = (spent / d) * daysInMonth;
  const state: BudgetState = spent > budget ? 'over' : spent >= budget * 0.9 || projected > budget ? 'close' : 'ok';
  return { budget, spent, projected, state };
}

export interface ForecastItem {
  reminderId: string;
  type: string;
  date: string;
  cost: number | null;
}

export interface Forecast {
  months: number;
  /** Distance expected over the period at the current pace. */
  km: number | null;
  fuel: number | null;
  items: ForecastItem[];
  /** Sum of the items with a known cost. */
  services: number;
  /** Items whose cost is not known yet. */
  unknown: number;
  total: number | null;
}

const DAYS_PER_MONTH = 365.25 / 12;
/** Safety limit, e.g. a 500 km interval on a car driven a lot. */
const MAX_REPEATS = 24;

/** What a reminder usually costs: its own estimate, or the last service of that type. */
function usualCost(type: string, estimate: number | undefined, services: ServiceEntry[]): number | null {
  if (estimate != null && estimate > 0) return estimate;
  const last = services
    .filter((s) => s.type === type && s.cost > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
  return last ? last.cost : null;
}

/**
 * Spending expected over the next months: fuel at the current pace and price
 * per km, plus each maintenance item that falls due, repeated as often as its
 * interval comes round.
 */
export function forecast(vehicle: Vehicle, data: AppData, today: string, months = 12): Forecast {
  const own = <T extends { vehicleId: string }>(list: T[]) => list.filter((x) => x.vehicleId === vehicle.id);
  const fuel = own(data.fuel);
  const services = own(data.services);
  const overview = vehicleOverview(vehicle, data, today);
  const end = addDays(today, Math.round(months * DAYS_PER_MONTH));
  const kmPerDay = overview.driving?.kmPerDay ?? null;
  const km = kmPerDay != null ? kmPerDay * daysBetween(today, end) : null;
  const costPerKm = fuelSummary(fuel).costPerKm;
  const fuelCost = km != null && costPerKm != null ? km * costPerKm : null;

  const items: ForecastItem[] = [];
  for (const s of overview.statuses) {
    const r = s.reminder;
    const cost = usualCost(r.type, r.estimatedCost, services);
    const first = s.state === 'overdue' ? today : [s.dueDate, s.estimatedDate].filter((d): d is string => !!d).sort()[0];
    if (!first || first > end) continue;
    // The interval in days, whichever of distance and time comes first.
    const every = [
      r.dueDate ? undefined : r.intervalMonths && r.intervalMonths * DAYS_PER_MONTH,
      r.dueDate ? undefined : r.intervalKm && kmPerDay ? r.intervalKm / kmPerDay : undefined,
    ].filter((d): d is number => !!d && d > 0);
    const step = every.length ? Math.min(...every) : null;
    let date = first < today ? today : first;
    for (let i = 0; i < MAX_REPEATS && date <= end; i++) {
      items.push({ reminderId: r.id, type: r.type, date, cost });
      if (!step) break;
      date = addDays(date, Math.max(1, Math.round(step)));
    }
  }
  items.sort((a, b) => a.date.localeCompare(b.date));
  const known = items.filter((i) => i.cost != null);
  const serviceCost = known.reduce((sum, i) => sum + i.cost!, 0);
  return {
    months,
    km,
    fuel: fuelCost,
    items,
    services: serviceCost,
    unknown: items.length - known.length,
    total: fuelCost != null || known.length ? (fuelCost ?? 0) + serviceCost : null,
  };
}

/** Spending and distance in the last `days` days, from the first to the last odometer value in that window. */
function lastDays(fuel: FuelEntry[], services: ServiceEntry[], points: { date: string; odometer: number }[], today: string, days: number) {
  const since = addDays(today, -days);
  const inWindow = <T extends { date: string }>(list: T[]) => list.filter((x) => x.date > since && x.date <= today);
  const odo = inWindow(points).map((p) => p.odometer);
  const distance = odo.length > 1 ? Math.max(...odo) - Math.min(...odo) : 0;
  const fuelSpent = inWindow(fuel).reduce((s, f) => s + f.totalCost, 0);
  const serviceSpent = inWindow(services).reduce((s, x) => s + x.cost, 0);
  return { spent: fuelSpent + serviceSpent, serviceSpent, distance };
}

export interface CarComparison {
  vehicle: Vehicle;
  odometer: number;
  kmPerWeek: number | null;
  consumption: number | null;
  fuelPerKm: number | null;
  /** Fuel per km plus maintenance per km over the last 12 months. */
  costPerKm: number | null;
  spent12m: number;
}

/** The same figures for every car, side by side. */
export function compareCars(data: AppData, today: string): CarComparison[] {
  return data.vehicles.map((vehicle) => {
    const own = <T extends { vehicleId: string }>(list: T[]) => list.filter((x) => x.vehicleId === vehicle.id);
    const fuel = own(data.fuel);
    const services = own(data.services);
    const overview = vehicleOverview(vehicle, data, today);
    const summary = fuelSummary(fuel);
    const year = lastDays(fuel, services, [...fuel, ...services, ...own(data.readings)], today, 365);
    return {
      vehicle,
      odometer: overview.odometer,
      kmPerWeek: overview.driving ? overview.driving.kmPerDay * 7 : null,
      consumption: summary.averageLPer100,
      fuelPerKm: summary.costPerKm,
      costPerKm: summary.costPerKm != null ? summary.costPerKm + (year.distance > 0 ? year.serviceSpent / year.distance : 0) : null,
      spent12m: year.spent,
    };
  });
}

export interface DriverStats {
  driver: string;
  fills: number;
  liters: number;
  fuelCost: number;
  serviceCost: number;
  tripKm: number;
}

/** Who filled up, paid for services and drove the logged trips. Entries without a driver are left out. */
export function driverStats(fuel: FuelEntry[], services: ServiceEntry[], trips: Trip[]): DriverStats[] {
  const by = new Map<string, DriverStats>();
  const get = (driver: string) => {
    if (!by.has(driver)) by.set(driver, { driver, fills: 0, liters: 0, fuelCost: 0, serviceCost: 0, tripKm: 0 });
    return by.get(driver)!;
  };
  for (const f of fuel) {
    if (!f.driver) continue;
    const d = get(f.driver);
    d.fills++;
    d.liters += f.liters;
    d.fuelCost += f.totalCost;
  }
  for (const s of services) if (s.driver) get(s.driver).serviceCost += s.cost;
  for (const t of trips) if (t.driver) get(t.driver).tripKm += t.distance;
  return [...by.values()].sort((a, b) => b.fuelCost + b.serviceCost - (a.fuelCost + a.serviceCost));
}

export interface TripYear {
  year: string;
  km: Record<TripPurpose, number>;
  trips: Record<TripPurpose, number>;
  /** Fuel cost of the work trips, at the car's fuel cost per km. */
  workFuelCost: number | null;
  /** Work distance as a share of all the distance driven that year (or of the logged trips). */
  workShare: number | null;
  /** That share of the year's fuel and maintenance spending. */
  workShareOfCosts: number | null;
}

/** Work and personal driving per year, newest first, with what the work part costs. */
export function tripYears(trips: Trip[], fuel: FuelEntry[], services: ServiceEntry[], driven: Map<string, number>): TripYear[] {
  const costPerKm = fuelSummary(fuel).costPerKm;
  const years = new Map<string, TripYear>();
  for (const t of trips) {
    const year = t.date.slice(0, 4);
    if (!years.has(year))
      years.set(year, { year, km: { work: 0, personal: 0 }, trips: { work: 0, personal: 0 }, workFuelCost: null, workShare: null, workShareOfCosts: null });
    const y = years.get(year)!;
    y.km[t.purpose] += t.distance;
    y.trips[t.purpose]++;
  }
  for (const y of years.values()) {
    const logged = y.km.work + y.km.personal;
    const total = Math.max(driven.get(y.year) ?? 0, logged);
    y.workFuelCost = costPerKm != null ? y.km.work * costPerKm : null;
    y.workShare = total > 0 ? y.km.work / total : null;
    const spent =
      fuel.filter((f) => f.date.startsWith(y.year)).reduce((s, f) => s + f.totalCost, 0) +
      services.filter((s) => s.date.startsWith(y.year)).reduce((s, x) => s + x.cost, 0);
    y.workShareOfCosts = y.workShare != null && spent > 0 ? y.workShare * spent : null;
  }
  return [...years.values()].sort((a, b) => b.year.localeCompare(a.year));
}

/** Same car and same code, or same description: the same problem. */
const issueKey = (i: Issue) => `${i.vehicleId}|${i.code?.trim().toUpperCase() || i.title.trim().toLowerCase()}`;

/** How many times each issue's problem has been logged in total, by issue id. */
export function issueRepeats(issues: Issue[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const i of issues) counts.set(issueKey(i), (counts.get(issueKey(i)) ?? 0) + 1);
  return new Map(issues.map((i) => [i.id, counts.get(issueKey(i))!]));
}

const sameName = (a: string | undefined, b: string) => !!a && a.trim().toLowerCase() === b.trim().toLowerCase();

export interface GarageStats {
  jobs: number;
  spent: number;
  lastDate?: string;
}

/** The services done at a garage, matched by the name typed on each service. */
export function garageStats(garage: Garage, services: ServiceEntry[]): GarageStats {
  const done = services.filter((s) => sameName(s.shop, garage.name));
  return {
    jobs: done.length,
    spent: done.reduce((s, x) => s + x.cost, 0),
    lastDate: done.reduce<string | undefined>((d, s) => (!d || s.date > d ? s.date : d), undefined),
  };
}
