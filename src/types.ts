export interface Vehicle {
  id: string;
  name: string;
  make: string;
  model: string;
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

export const SERVICE_TYPES = [
  'Oil change',
  'Oil filter',
  'Air filter',
  'Cabin filter',
  'Fuel filter',
  'Brake pads',
  'Brake fluid',
  'Tires',
  'Tire rotation',
  'Battery',
  'Spark plugs',
  'Timing belt',
  'Coolant',
  'Transmission fluid',
  'Inspection',
  'Insurance',
] as const;

export interface ServiceEntry {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number;
  type: string;
  cost: number;
  shop?: string;
  notes?: string;
}

export interface Reminder {
  id: string;
  vehicleId: string;
  type: string;
  /** Repeat every N km (optional). */
  intervalKm?: number;
  /** Repeat every N months (optional). */
  intervalMonths?: number;
  /** Reference point used when no matching service has been logged yet. */
  lastDate: string;
  lastOdometer: number;
}

export interface AppData {
  vehicles: Vehicle[];
  fuel: FuelEntry[];
  services: ServiceEntry[];
  reminders: Reminder[];
}
