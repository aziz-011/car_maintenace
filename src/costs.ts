import type { FuelEntry, OdometerReading, ServiceEntry } from './types';

export interface MonthCost {
  /** YYYY-MM */
  month: string;
  fuel: number;
  service: number;
}

const monthOf = (date: string) => date.slice(0, 7);

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

/** Fuel and maintenance spending for each of the last `count` months, oldest first, empty months included. */
export function monthlyCosts(fuel: FuelEntry[], services: ServiceEntry[], today: string, count = 12): MonthCost[] {
  const last = monthOf(today);
  const months = Array.from({ length: count }, (_, i) => shiftMonth(last, i - count + 1));
  const rows = new Map(months.map((m) => [m, { month: m, fuel: 0, service: 0 }]));
  for (const f of fuel) {
    const row = rows.get(monthOf(f.date));
    if (row) row.fuel += f.totalCost;
  }
  for (const s of services) {
    const row = rows.get(monthOf(s.date));
    if (row) row.service += s.cost;
  }
  return months.map((m) => rows.get(m)!);
}

export interface YearCost {
  year: string;
  fuel: number;
  service: number;
  liters: number;
  /** Distance between the first and last odometer value of the year, when there are two. */
  distance: number | null;
}

/** Totals per calendar year, newest first. */
export function yearlyCosts(fuel: FuelEntry[], services: ServiceEntry[], readings: OdometerReading[]): YearCost[] {
  const years = new Map<string, YearCost & { min: number; max: number }>();
  const get = (date: string) => {
    const year = date.slice(0, 4);
    if (!years.has(year)) years.set(year, { year, fuel: 0, service: 0, liters: 0, distance: null, min: Infinity, max: -Infinity });
    return years.get(year)!;
  };
  const seen = (date: string, odometer: number) => {
    const y = get(date);
    y.min = Math.min(y.min, odometer);
    y.max = Math.max(y.max, odometer);
  };
  for (const f of fuel) {
    const y = get(f.date);
    y.fuel += f.totalCost;
    y.liters += f.liters;
    seen(f.date, f.odometer);
  }
  for (const s of services) {
    get(s.date).service += s.cost;
    seen(s.date, s.odometer);
  }
  for (const r of readings) seen(r.date, r.odometer);
  return [...years.values()]
    .map(({ min, max, ...y }) => ({ ...y, distance: max > min ? max - min : null }))
    .filter((y) => y.fuel || y.service)
    .sort((a, b) => b.year.localeCompare(a.year));
}

export interface PricePoint {
  date: string;
  price: number;
  station?: string;
}

/** Price per litre of each fill-up, oldest first. */
export function priceHistory(fuel: FuelEntry[]): PricePoint[] {
  return fuel
    .filter((f) => f.liters > 0 && f.totalCost > 0)
    .map((f) => ({ date: f.date, price: f.totalCost / f.liters, station: f.station }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface StationStats {
  station: string;
  fills: number;
  liters: number;
  averagePrice: number;
  lastPrice: number;
  lastDate: string;
}

/**
 * Average price per litre at each station, weighted by litres, cheapest first.
 * Only fill-ups from the last `withinDays` count, since prices change over time.
 */
export function stationStats(fuel: FuelEntry[], today: string, withinDays = 365): StationStats[] {
  const since = new Date(Date.parse(today) - withinDays * 86_400_000).toISOString().slice(0, 10);
  const by = new Map<string, { fills: number; liters: number; cost: number; last: FuelEntry }>();
  for (const f of fuel) {
    if (!f.station || f.date < since || f.liters <= 0) continue;
    const s = by.get(f.station) ?? { fills: 0, liters: 0, cost: 0, last: f };
    s.fills++;
    s.liters += f.liters;
    s.cost += f.totalCost;
    if (f.date >= s.last.date) s.last = f;
    by.set(f.station, s);
  }
  return [...by.entries()]
    .map(([station, s]) => ({
      station,
      fills: s.fills,
      liters: s.liters,
      averagePrice: s.cost / s.liters,
      lastPrice: s.last.totalCost / s.last.liters,
      lastDate: s.last.date,
    }))
    .sort((a, b) => a.averagePrice - b.averagePrice);
}
