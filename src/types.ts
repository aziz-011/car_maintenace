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
  /** Monthly fuel budget for this car, in the chosen currency. */
  fuelBudget?: number;
}

/** A photo or PDF kept with a record: a receipt, an invoice, a scanned document. */
export interface Attachment {
  id: string;
  name: string;
  type: string;
  /** Where the file is served: the home server's /files/…, or a claude.ai asset. */
  url: string;
  size?: number;
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
  attachments?: Attachment[];
  /** Who logged it: a name typed on the device, or a claude.ai person id ("u_…"). */
  driver?: string;
}

/** Kind of job done at a visit. */
export const SERVICE_TYPES = [
  'Periodic service',
  'Oil change',
  'Brake service',
  'Tire change',
  'Tire rotation',
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
  attachments?: Attachment[];
  driver?: string;
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
  /** What it usually costs, for the spending forecast; the last matching service is used otherwise. */
  estimatedCost?: number;
}

/** An odometer reading on its own, e.g. the weekly check-in. */
export interface OdometerReading {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number;
}

/** Papers kept for a car; each can carry photos or PDFs. */
export const CAR_DOCUMENT_TYPES = [
  'Registration (carte grise)',
  'Insurance certificate',
  'Technical inspection report',
  'Road tax / vignette receipt',
  'Driving licence',
  'Purchase invoice',
  'Warranty',
  'Other',
] as const;

/**
 * A document whose expiry date also drives the matching reminder, so the
 * insurance expiry on the certificate is the one you get reminded about.
 */
export const DOCUMENT_REMINDER: Record<string, string> = {
  'Insurance certificate': 'Insurance',
  'Technical inspection report': 'Technical inspection (visite technique)',
  'Road tax / vignette receipt': 'Road tax / vignette',
  'Registration (carte grise)': 'Registration',
  'Driving licence': 'Driving licence',
  Warranty: 'Warranty',
};

export interface CarDocument {
  id: string;
  vehicleId: string;
  type: string;
  /** Policy, certificate or plate number. */
  number?: string;
  issueDate?: string;
  expiryDate?: string;
  notes?: string;
  attachments?: Attachment[];
}

export const TIRE_SEASONS = ['summer', 'winter', 'all-season'] as const;
export type TireSeason = (typeof TIRE_SEASONS)[number];
export const TIRE_SEASON_LABEL: Record<TireSeason, string> = { summer: 'Summer', winter: 'Winter', 'all-season': 'All-season' };

/** A set of tires: on the car while removedDate is empty. */
export interface TireSet {
  id: string;
  vehicleId: string;
  brand: string;
  model?: string;
  /** e.g. 195/65 R15 91H. */
  size?: string;
  season: TireSeason;
  fittedDate: string;
  fittedOdometer: number;
  removedDate?: string;
  removedOdometer?: number;
  notes?: string;
}

/** Kinds of trouble the fault log records. */
export const ISSUE_KINDS = ['warning-light', 'noise', 'fault-code', 'leak', 'vibration', 'other'] as const;
export type IssueKind = (typeof ISSUE_KINDS)[number];
export const ISSUE_KIND_LABEL: Record<IssueKind, string> = {
  'warning-light': 'Warning light',
  noise: 'Noise',
  'fault-code': 'Fault code (OBD)',
  leak: 'Leak',
  vibration: 'Vibration',
  other: 'Other',
};

/** Common dashboard warning lights, for the fault form. */
export const WARNING_LIGHTS = [
  'Check engine',
  'Oil pressure',
  'Battery / charging',
  'Coolant temperature',
  'Brake system',
  'ABS',
  'Airbag',
  'Glow plugs',
  'DPF',
  'Tire pressure',
  'ESP / traction control',
  'Power steering',
];

/** A problem noticed on the car; linking the repair that fixed it shows what keeps coming back. */
export interface Issue {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number;
  kind: IssueKind;
  /** e.g. "Check engine" or "Squeak when braking". */
  title: string;
  /** OBD code such as P0401. */
  code?: string;
  notes?: string;
  /** The service that fixed it; empty while it is still open. */
  fixedByServiceId?: string;
  fixedDate?: string;
  attachments?: Attachment[];
}

/** A garage or mechanic, shared by all cars. Services link to it by name. */
export interface Garage {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  /** 1 to 5. */
  rating?: number;
  notes?: string;
}

/** A price asked for a job, to compare garages before choosing. */
export interface Quote {
  id: string;
  vehicleId: string;
  garageId: string;
  date: string;
  job: string;
  amount: number;
  notes?: string;
  /** Set when this quote was the one chosen. */
  accepted?: boolean;
}

export const TRIP_PURPOSES = ['work', 'personal'] as const;
export type TripPurpose = (typeof TRIP_PURPOSES)[number];
export const TRIP_PURPOSE_LABEL: Record<TripPurpose, string> = { work: 'Work', personal: 'Personal' };

/** A journey logged on its own, e.g. to claim work driving. */
export interface Trip {
  id: string;
  vehicleId: string;
  date: string;
  from?: string;
  to?: string;
  /** km */
  distance: number;
  purpose: TripPurpose;
  notes?: string;
  driver?: string;
}

export type Currency = string;

/** App-wide choices; stored as a single record with id "prefs". */
export interface Prefs {
  id: 'prefs';
  language: 'en' | 'fr';
  currency: Currency;
  distance: 'km' | 'mi';
  consumption: 'l100' | 'kml';
  /** Warn when a tank uses this much more fuel than usual (percent). */
  consumptionAlert?: number;
}

export const DEFAULT_PREFS: Prefs = { id: 'prefs', language: 'en', currency: 'TND', distance: 'km', consumption: 'l100' };

export const CURRENCIES = ['TND', 'EUR', 'USD', 'DZD', 'MAD', 'LYD', 'GBP', 'CHF', 'CAD', 'SAR', 'AED', 'EGP'];

export interface AppData {
  vehicles: Vehicle[];
  fuel: FuelEntry[];
  services: ServiceEntry[];
  reminders: Reminder[];
  readings: OdometerReading[];
  documents: CarDocument[];
  tires: TireSet[];
  issues: Issue[];
  garages: Garage[];
  quotes: Quote[];
  trips: Trip[];
  prefs: Prefs[];
}

/** Every kind of record, in one place for storage and sync code. */
export const COLLECTIONS = [
  'vehicles',
  'fuel',
  'services',
  'reminders',
  'readings',
  'documents',
  'tires',
  'issues',
  'garages',
  'quotes',
  'trips',
  'prefs',
] as const;

export const prefsOf = (data: AppData): Prefs => ({ ...DEFAULT_PREFS, ...data.prefs?.[0] });

/** Oil change interval suggested for new cars. */
export const DEFAULT_OIL_INTERVAL_KM = 7500;

export function emptyData(): AppData {
  return Object.fromEntries(COLLECTIONS.map((k) => [k, []])) as unknown as AppData;
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
