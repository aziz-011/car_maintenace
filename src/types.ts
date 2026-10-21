export interface Vehicle {
  id: string;
  name: string;
  make: string;
  model: string;
  /** e.g. "Golf IV (Mk4)". */
  generation?: string;
  /** e.g. "1.9 TDI diesel · 110 hp". */
  engine?: string;
  year?: number;
  plate?: string;
  initialOdometer: number;
}

export interface FuelEntry {
  id: string;
  vehicleId: string;
  date: string; // YYYY-MM-DD
  odometer: number; // km
  liters: number;
  totalCost: number;
  fullTank: boolean;
  station?: string;
  notes?: string;
}

/** Kind of job done at a visit. */
export const SERVICE_TYPES = [
  'Periodic service',
  'Oil change',
  'Brake service',
  'Tire change',
  'Repair',
  'Technical inspection (visite technique)',
  'Diagnostics',
  'Air conditioning',
  'Bodywork',
  'Car wash',
  'Insurance',
  'Road tax / vignette',
];

export interface OptionGroup {
  label: string;
  options: string[];
}

/** Parts that can be replaced during a service, grouped for the dropdown. */
export const COMPONENT_GROUPS: OptionGroup[] = [
  { label: 'Filters', options: ['Oil filter', 'Air filter', 'Cabin filter', 'Fuel filter'] },
  {
    label: 'Fluids',
    options: ['Engine oil', 'Coolant', 'Brake fluid', 'Transmission fluid', 'Power steering fluid', 'Windshield washer fluid', 'AC refrigerant'],
  },
  {
    label: 'Engine',
    options: ['Spark plugs', 'Glow plugs', 'Timing belt', 'Timing chain', 'Drive belt', 'Water pump', 'Thermostat', 'Ignition coil', 'Injectors', 'Turbo', 'Engine mounts'],
  },
  { label: 'Brakes', options: ['Front brake pads', 'Rear brake pads', 'Front brake discs', 'Rear brake discs', 'Brake shoes / drums', 'Handbrake cable'] },
  {
    label: 'Tires & suspension',
    options: ['Tires', 'Shock absorbers', 'Springs', 'Control arms', 'Ball joints', 'Tie rod ends', 'Wheel bearings', 'Wheel alignment', 'Wheel balancing'],
  },
  { label: 'Transmission', options: ['Clutch kit', 'Flywheel', 'CV joint', 'Gearbox'] },
  { label: 'Electrical', options: ['Battery', 'Alternator', 'Starter motor', 'Headlight bulbs', 'Other bulbs', 'Fuses', 'Sensors'] },
  { label: 'Exhaust', options: ['Exhaust', 'Catalytic converter', 'DPF', 'EGR valve', 'Oxygen sensor'] },
  { label: 'Body & interior', options: ['Wiper blades', 'Windshield', 'Mirrors', 'AC compressor'] },
];

export const COMPONENTS = COMPONENT_GROUPS.flatMap((g) => g.options);

/** Paperwork and legal deadlines, usually tracked by an expiry date. */
export const DOCUMENT_TYPES = [
  'Technical inspection (visite technique)',
  'Insurance',
  'Road tax / vignette',
  'Registration',
  'Driving licence',
  'Emissions test',
  'Warranty',
  'Roadside assistance',
  'Fire extinguisher',
  'Toll badge',
  'Parking permit',
];

export interface ServiceEntry {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number;
  type: string;
  /** Parts replaced during this service. */
  parts?: string[];
  cost: number;
  shop?: string;
  notes?: string;
}

export interface Reminder {
  id: string;
  vehicleId: string;
  type: string;
  /** Fixed deadline such as an insurance expiry. When set, the km/month intervals are not used. */
  dueDate?: string;
  /** Repeat every N km (optional). */
  intervalKm?: number;
  /** Repeat every N months (optional). */
  intervalMonths?: number;
  /** Reference point used when no matching service has been logged yet. */
  lastDate: string;
  lastOdometer: number;
}

/** An odometer reading on its own, e.g. the weekly check-in. */
export interface OdometerReading {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number;
}

export interface AppData {
  vehicles: Vehicle[];
  fuel: FuelEntry[];
  services: ServiceEntry[];
  reminders: Reminder[];
  readings: OdometerReading[];
}

/** Every kind of record, in one place for storage and sync code. */
export const COLLECTIONS = ['vehicles', 'fuel', 'services', 'reminders', 'readings'] as const;

/** Oil change interval suggested for new cars. */
export const DEFAULT_OIL_INTERVAL_KM = 7500;

export function emptyData(): AppData {
  return { vehicles: [], fuel: [], services: [], reminders: [], readings: [] };
}

/**
 * True for data and backups from any version: collections added later
 * (like readings) may be missing and are filled in by normalizeData.
 */
export function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  const required = ['vehicles', 'fuel', 'services', 'reminders'];
  return COLLECTIONS.every((k) => (required.includes(k) ? Array.isArray(v[k]) : v[k] === undefined || Array.isArray(v[k])));
}

export function normalizeData(value: Partial<AppData>): AppData {
  return Object.fromEntries(COLLECTIONS.map((k) => [k, value[k] ?? []])) as unknown as AppData;
}
