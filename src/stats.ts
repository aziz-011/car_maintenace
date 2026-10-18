import type { FuelEntry, Reminder, ServiceEntry } from './types';

export interface ConsumptionSegment {
  /** The full-tank fill-up that closes the segment. */
  entryId: string;
  date: string;
  distance: number;
  liters: number;
  litersPer100km: number;
}

const byOdometer = <T extends { odometer: number; date: string }>(a: T, b: T) =>
  a.odometer - b.odometer || a.date.localeCompare(b.date);

/**
 * Computes consumption using the full-tank method: the fuel added between two
 * full fill-ups (including partial fills in between) divided by the distance.
 */
export function consumptionSegments(entries: FuelEntry[]): ConsumptionSegment[] {
  const sorted = [...entries].sort(byOdometer);
  const segments: ConsumptionSegment[] = [];
  let lastFull: FuelEntry | undefined;
  let liters = 0;

  for (const entry of sorted) {
    if (!lastFull) {
      if (entry.fullTank) lastFull = entry;
      continue;
    }
    liters += entry.liters;
    if (!entry.fullTank) continue;
    const distance = entry.odometer - lastFull.odometer;
    if (distance > 0) {
      segments.push({
        entryId: entry.id,
        date: entry.date,
        distance,
        liters,
        litersPer100km: (liters / distance) * 100,
      });
    }
    lastFull = entry;
    liters = 0;
  }
  return segments;
}

export interface FuelSummary {
  totalLiters: number;
  totalCost: number;
  averageLPer100: number | null;
  lastLPer100: number | null;
  averagePricePerLiter: number | null;
  costPerKm: number | null;
}

export function fuelSummary(entries: FuelEntry[]): FuelSummary {
  const segments = consumptionSegments(entries);
  const totalLiters = entries.reduce((s, e) => s + e.liters, 0);
  const totalCost = entries.reduce((s, e) => s + e.totalCost, 0);
  const segDistance = segments.reduce((s, x) => s + x.distance, 0);
  const segLiters = segments.reduce((s, x) => s + x.liters, 0);

  const sorted = [...entries].sort(byOdometer);
  const distance = sorted.length > 1 ? sorted[sorted.length - 1].odometer - sorted[0].odometer : 0;
  // Fuel bought at the first fill-up was burned before tracking began.
  const costInRange = sorted.slice(1).reduce((s, e) => s + e.totalCost, 0);

  return {
    totalLiters,
    totalCost,
    averageLPer100: segDistance > 0 ? (segLiters / segDistance) * 100 : null,
    lastLPer100: segments.length ? segments[segments.length - 1].litersPer100km : null,
    averagePricePerLiter: totalLiters > 0 ? totalCost / totalLiters : null,
    costPerKm: distance > 0 ? costInRange / distance : null,
  };
}

export function currentOdometer(
  initial: number,
  fuel: FuelEntry[],
  services: ServiceEntry[],
): number {
  return Math.max(initial, ...fuel.map((f) => f.odometer), ...services.map((s) => s.odometer));
}

export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

export type ReminderState = 'ok' | 'soon' | 'overdue';

export interface ReminderStatus {
  reminder: Reminder;
  lastDate: string;
  lastOdometer: number;
  dueOdometer?: number;
  dueDate?: string;
  kmLeft?: number;
  daysLeft?: number;
  state: ReminderState;
}

export const SOON_KM = 1000;
export const SOON_DAYS = 30;

export function reminderStatus(
  reminder: Reminder,
  services: ServiceEntry[],
  odometer: number,
  today: string,
  soonDays = SOON_DAYS,
): ReminderStatus {
  if (reminder.dueDate) {
    const daysLeft = daysBetween(today, reminder.dueDate);
    const state: ReminderState = daysLeft <= 0 ? 'overdue' : daysLeft <= soonDays ? 'soon' : 'ok';
    return {
      reminder,
      lastDate: reminder.lastDate,
      lastOdometer: reminder.lastOdometer,
      dueDate: reminder.dueDate,
      daysLeft,
      state,
    };
  }

  // The most recent service of that type, or that replaced that part, resets the reminder.
  const last = services
    .filter(
      (s) =>
        s.vehicleId === reminder.vehicleId &&
        (s.type === reminder.type || (s.parts ?? []).includes(reminder.type)),
    )
    .sort(byOdometer)
    .at(-1);
  const lastDate = last && last.date > reminder.lastDate ? last.date : reminder.lastDate;
  const lastOdometer = Math.max(last?.odometer ?? 0, reminder.lastOdometer);

  const dueOdometer = reminder.intervalKm ? lastOdometer + reminder.intervalKm : undefined;
  const dueDate = reminder.intervalMonths ? addMonths(lastDate, reminder.intervalMonths) : undefined;
  const kmLeft = dueOdometer !== undefined ? dueOdometer - odometer : undefined;
  const daysLeft = dueDate !== undefined ? daysBetween(today, dueDate) : undefined;

  let state: ReminderState = 'ok';
  if ((kmLeft !== undefined && kmLeft <= 0) || (daysLeft !== undefined && daysLeft <= 0)) {
    state = 'overdue';
  } else if (
    (kmLeft !== undefined && kmLeft <= SOON_KM) ||
    (daysLeft !== undefined && daysLeft <= soonDays)
  ) {
    state = 'soon';
  }

  return { reminder, lastDate, lastOdometer, dueOdometer, dueDate, kmLeft, daysLeft, state };
}
