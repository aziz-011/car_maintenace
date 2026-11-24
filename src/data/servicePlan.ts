import type { Vehicle } from '../types';

/**
 * A suggested maintenance plan for a car, from its make and engine. The
 * intervals are typical values, not the manufacturer's schedule: the plan
 * card says to check them against the manual or the garage.
 */

export type Drive = 'belt' | 'wet-belt' | 'chain' | 'unknown';

export interface PlanItem {
  /** A service type or part name, as used by reminders. */
  type: string;
  intervalKm?: number;
  intervalMonths?: number;
  /** Ticked by default in the plan card. */
  recommended: boolean;
  note?: string;
}

const VAG = ['Volkswagen', 'Audi', 'Seat', 'Škoda'];
const PSA = ['Peugeot', 'Citroën', 'DS', 'Opel'];
const RENAULT = ['Renault', 'Dacia'];

interface DriveRule {
  makes: string[];
  engine: RegExp;
  drive: Drive;
  intervalKm?: number;
  intervalMonths?: number;
}

/** Timing drive of common engines; the first rule that matches wins. */
const DRIVE_RULES: DriveRule[] = [
  { makes: VAG, engine: /\b(1\.9|2\.0|1\.6|1\.2|1\.4|1\.7) (TDI|SDI|D|TD)\b/, drive: 'belt', intervalKm: 90000, intervalMonths: 60 },
  { makes: VAG, engine: /\b(1\.4 16V|1\.6 16V|1\.6|1\.8 20V|1\.8 T|1\.8|2\.0) petrol/, drive: 'belt', intervalKm: 90000, intervalMonths: 60 },
  { makes: VAG, engine: /\b(2\.3 V5|2\.8 VR6|2\.8 V6|3\.2 R32|3\.2 V6|3\.6 V6)\b/, drive: 'chain' },
  { makes: RENAULT, engine: /\b1\.5 (Blue )?dCi\b/, drive: 'belt', intervalKm: 120000, intervalMonths: 60 },
  {
    makes: RENAULT,
    engine: /\b(1\.2 16V|1\.2 petrol|1\.4|1\.4 16V|1\.4 MPI|1\.6|1\.6 8V|1\.6 16V|1\.6 MPI|1\.6 SCe) petrol/,
    drive: 'belt',
    intervalKm: 60000,
    intervalMonths: 48,
  },
  { makes: RENAULT, engine: /\b(0\.9|1\.0|1\.2|1\.3) TCe\b/, drive: 'chain' },
  { makes: PSA, engine: /\b1\.2 PureTech\b/, drive: 'wet-belt', intervalKm: 100000, intervalMonths: 72 },
  { makes: PSA, engine: /\b(1\.4|1\.6) (VTi|THP)\b/, drive: 'chain' },
  {
    makes: PSA,
    engine: /\b(1\.4|1\.6|2\.0) (HDi|e-HDi|BlueHDi|HDi \/ BlueHDi|HDi \/ e-HDi)\b/,
    drive: 'belt',
    intervalKm: 120000,
    intervalMonths: 60,
  },
  { makes: ['Toyota'], engine: /\b(1\.0|1\.3|1\.33|1\.5|1\.6|1\.8) petrol/, drive: 'chain' },
  { makes: ['Hyundai', 'Kia'], engine: /./, drive: 'chain' },
  { makes: ['Mercedes-Benz', 'BMW'], engine: /./, drive: 'chain' },
  { makes: ['Ford'], engine: /\b1\.0 EcoBoost\b/, drive: 'wet-belt', intervalKm: 160000, intervalMonths: 120 },
  { makes: ['Fiat'], engine: /\b(1\.3 Multijet|0\.9 TwinAir)\b/, drive: 'chain' },
  { makes: ['Suzuki'], engine: /./, drive: 'chain' },
];

/** Whether the engine has a timing belt (and how often it is changed) or a chain. */
export function timingDrive(vehicle: Pick<Vehicle, 'make' | 'engine'>): { drive: Drive; intervalKm?: number; intervalMonths?: number } {
  const engine = vehicle.engine ?? '';
  if (!engine) return { drive: 'unknown' };
  const rule = DRIVE_RULES.find((r) => r.makes.includes(vehicle.make) && r.engine.test(engine));
  return rule ? { drive: rule.drive, intervalKm: rule.intervalKm, intervalMonths: rule.intervalMonths } : { drive: 'unknown' };
}

export type Fuel = 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'unknown';

export function fuelOf(vehicle: Pick<Vehicle, 'engine'>): Fuel {
  const e = (vehicle.engine ?? '').toLowerCase();
  if (/electric/.test(e) && !/hybrid/.test(e)) return 'electric';
  if (/hybrid/.test(e)) return 'hybrid';
  if (/diesel|tdi|dci|hdi|crdi|multijet|d-4d|tdci|cdti/.test(e)) return 'diesel';
  if (/petrol|essence|tsi|tfsi|tce|vti|puretech|ecoboost|lpg/.test(e)) return 'petrol';
  return 'unknown';
}

/** The usual maintenance items for this car, with typical intervals. */
export function servicePlan(vehicle: Pick<Vehicle, 'make' | 'engine'>): PlanItem[] {
  const fuel = fuelOf(vehicle);
  const drive = timingDrive(vehicle);
  const combustion = fuel !== 'electric';
  const items: PlanItem[] = [];

  if (combustion) items.push({ type: 'Air filter', intervalKm: 30000, intervalMonths: 24, recommended: true });
  items.push({ type: 'Cabin filter', intervalKm: 15000, intervalMonths: 12, recommended: true });
  if (fuel === 'diesel') items.push({ type: 'Fuel filter', intervalKm: 30000, intervalMonths: 24, recommended: true });
  if (fuel === 'petrol' || fuel === 'hybrid') {
    items.push({
      type: 'Fuel filter',
      intervalKm: 60000,
      intervalMonths: 48,
      recommended: false,
      note: 'Many recent petrol cars have a lifetime filter in the tank.',
    });
    items.push({ type: 'Spark plugs', intervalKm: 40000, intervalMonths: 48, recommended: true });
  }
  if (fuel === 'diesel') {
    items.push({ type: 'Glow plugs', intervalKm: 100000, recommended: false, note: 'Usually replaced when starting gets hard in cold weather.' });
  }

  if (combustion) {
    if (drive.drive === 'belt') {
      items.push({
        type: 'Timing belt',
        intervalKm: drive.intervalKm,
        intervalMonths: drive.intervalMonths,
        recommended: true,
        note: 'Change the water pump and tensioner at the same time. A broken belt can destroy the engine.',
      });
    } else if (drive.drive === 'wet-belt') {
      items.push({
        type: 'Timing belt',
        intervalKm: drive.intervalKm,
        intervalMonths: drive.intervalMonths,
        recommended: true,
        note: 'This engine has a belt running in oil: use exactly the oil grade the manufacturer specifies.',
      });
    } else if (drive.drive === 'unknown') {
      items.push({
        type: 'Timing belt',
        intervalKm: 90000,
        intervalMonths: 60,
        recommended: false,
        note: 'Ask your garage whether this engine has a timing belt or a chain, and at what interval.',
      });
    }
    items.push({ type: 'Drive belt', intervalKm: 60000, intervalMonths: 60, recommended: true });
    items.push({ type: 'Coolant', intervalMonths: 60, recommended: true });
    items.push({
      type: 'Transmission fluid',
      intervalKm: 90000,
      intervalMonths: 72,
      recommended: false,
      note: 'Some manual gearboxes are filled for life; automatics need it more often.',
    });
  }

  items.push({ type: 'Brake fluid', intervalMonths: 24, recommended: true });
  items.push({ type: 'Brake service', intervalKm: 20000, intervalMonths: 12, recommended: true, note: 'Check pads and discs; replace them when worn.' });
  items.push({ type: 'Tire rotation', intervalKm: 10000, recommended: false });
  items.push({ type: 'Air conditioning', intervalMonths: 24, recommended: false });
  if (combustion) items.push({ type: 'Battery', intervalMonths: 60, recommended: false, note: 'Have it tested before winter once it is 4 years old.' });
  return items;
}

export const driveLabel: Record<Drive, string> = {
  belt: 'Timing belt',
  'wet-belt': 'Timing belt in oil',
  chain: 'Timing chain (no regular change)',
  unknown: 'Belt or chain: ask your garage',
};
