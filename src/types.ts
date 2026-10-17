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

/** Kind of job done at a visit. */
export const SERVICE_TYPES = [
  'Periodic service',
  'Oil change',
  'Brake service',
  'Tire change',
  'Repair',
  'Inspection',
  'Diagnostics',
  'Air conditioning',
  'Bodywork',
  'Car wash',
  'Insurance',
  'Registration / tax',
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
