import { useEffect, useMemo, useState } from 'react';
import { ConfirmHost } from './components/ConfirmHost';
import { FuelForm } from './components/FuelForm';
import { OdometerForm } from './components/OdometerForm';
import { confirmAction } from './confirm';
import { ReminderForm } from './components/ReminderForm';
import { ServiceForm } from './components/ServiceForm';
import { VehicleForm } from './components/VehicleForm';
import { addMonths, vehicleOverview } from './stats';
import { newId, today, useAppData, type SyncStatus } from './store';
import { normalizeData, type AppData, type FuelEntry, type Reminder, type ServiceEntry, type Vehicle } from './types';
import { Dashboard } from './views/Dashboard';
import { FuelView } from './views/FuelView';
import { RemindersView } from './views/RemindersView';
import { ServicesView } from './views/ServicesView';
import { SettingsView } from './views/SettingsView';

const TABS = [
  { id: 'dashboard', label: 'Overview', icon: '◎' },
  { id: 'fuel', label: 'Fuel', icon: '⛽' },
  { id: 'services', label: 'Services', icon: '🔧' },
  { id: 'reminders', label: 'Reminders', icon: '⏰' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
] as const;
type Tab = (typeof TABS)[number]['id'];

type Dialog =
  | { kind: 'vehicle'; item?: Vehicle }
  | { kind: 'fuel'; item?: FuelEntry }
  | { kind: 'service'; item?: ServiceEntry }
  | { kind: 'reminder'; item?: Reminder; initialType?: string }
  | { kind: 'odometer' };

const SELECTED_KEY = 'car-maintenance:selected';

const STATUS_TEXT: Partial<Record<SyncStatus, string>> = {
  synced: '✓ Saved',
  saving: 'Saving…',
  offline: '! Not saved yet: connection problem',
};

/** Inserts or replaces an item by id. */
function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

function oilReminder(vehicleId: string, intervalKm: number, odometer: number): Reminder {
  return { id: newId(), vehicleId, type: 'Oil change', intervalKm, lastDate: today(), lastOdometer: odometer };
}

export default function App() {
  const { data, status, backend, update, replace, retry } = useAppData();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SELECTED_KEY);
    } catch {
      return null;
    }
  });

  const vehicle = data.vehicles.find((v) => v.id === selectedId) ?? data.vehicles[0];

  useEffect(() => {
    try {
      if (vehicle) localStorage.setItem(SELECTED_KEY, vehicle.id);
    } catch {
      // Ignore: only a convenience.
    }
  }, [vehicle]);

  const fuel = useMemo(() => data.fuel.filter((f) => f.vehicleId === vehicle?.id), [data.fuel, vehicle]);
  const services = useMemo(
    () => data.services.filter((s) => s.vehicleId === vehicle?.id),
    [data.services, vehicle],
  );
  const readings = useMemo(() => data.readings.filter((r) => r.vehicleId === vehicle?.id), [data.readings, vehicle]);
  const overview = useMemo(() => (vehicle ? vehicleOverview(vehicle, data, today()) : null), [vehicle, data]);
  const odometer = overview?.odometer ?? 0;
  const statuses = useMemo(() => overview?.statuses ?? [], [overview]);

  const close = () => setDialog(null);

  const saveVehicle = (v: Vehicle, oilIntervalKm?: number) => {
    update((d) => ({
      ...d,
      vehicles: upsert(d.vehicles, v),
      // A new car starts its oil change reminder from the odometer it was added with.
      reminders: oilIntervalKm ? [...d.reminders, oilReminder(v.id, oilIntervalKm, v.initialOdometer)] : d.reminders,
    }));
    setSelectedId(v.id);
    close();
  };

  const deleteVehicle = async (v: Vehicle) => {
    if (!(await confirmAction(`Delete ${v.name} and all of its fill-ups, services and reminders?`))) return;
    update((d) => ({
      vehicles: d.vehicles.filter((x) => x.id !== v.id),
      fuel: d.fuel.filter((x) => x.vehicleId !== v.id),
      services: d.services.filter((x) => x.vehicleId !== v.id),
      reminders: d.reminders.filter((x) => x.vehicleId !== v.id),
      readings: d.readings.filter((x) => x.vehicleId !== v.id),
    }));
  };

  const remove = async <K extends 'fuel' | 'services' | 'reminders' | 'readings'>(key: K, id: string) => {
    if (!(await confirmAction('Delete this entry?'))) return;
    update((d) => ({ ...d, [key]: (d[key] as { id: string }[]).filter((x) => x.id !== id) }));
  };

  if (status === 'loading' || status === 'unreachable') {
    return (
      <div className="welcome">
        <h1>Car Maintenance</h1>
        {status === 'loading' ? (
          <p>Loading…</p>
        ) : (
          <>
            <p>Can't reach the server. Check that it is running on your PC and that you're on the same network.</p>
            <button className="btn primary" onClick={() => void retry()}>
              Try again
            </button>
          </>
        )}
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="welcome">
        <h1>Car Maintenance</h1>
        <p>Track fuel consumption, services and upcoming maintenance for your vehicles.</p>
        <button className="btn primary" onClick={() => setDialog({ kind: 'vehicle' })}>
          Add your first vehicle
        </button>
        {dialog?.kind === 'vehicle' && <VehicleForm onSave={saveVehicle} onClose={close} />}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="title">
          <h1>Car Maintenance</h1>
          {STATUS_TEXT[status] && (
            <span className={`sync ${status}`} role="status">
              {STATUS_TEXT[status]}
            </span>
          )}
        </div>
        <select
          aria-label="Vehicle"
          value={vehicle.id}
          onChange={(e) =>
            e.target.value === '__new' ? setDialog({ kind: 'vehicle' }) : setSelectedId(e.target.value)
          }
        >
          {data.vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
          <option value="__new">+ Add vehicle…</option>
        </select>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <span aria-hidden="true">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'dashboard' && (
          <Dashboard
            odometer={odometer}
            fuel={fuel}
            services={services}
            reminders={statuses}
            onAddFuel={() => setDialog({ kind: 'fuel' })}
            onAddService={() => setDialog({ kind: 'service' })}
            onAddReminder={(initialType) => setDialog({ kind: 'reminder', initialType })}
            onUpdateOdometer={() => setDialog({ kind: 'odometer' })}
            onAddOilReminder={(km) => update((d) => ({ ...d, reminders: [...d.reminders, oilReminder(vehicle.id, km, odometer)] }))}
            driving={overview?.driving ?? null}
            lastOdometerDate={overview?.lastOdometerDate}
          />
        )}
        {tab === 'fuel' && (
          <FuelView
            entries={fuel}
            onAdd={() => setDialog({ kind: 'fuel' })}
            onEdit={(item) => setDialog({ kind: 'fuel', item })}
            onDelete={(e) => remove('fuel', e.id)}
            readings={readings}
            onAddReading={() => setDialog({ kind: 'odometer' })}
            onDeleteReading={(r) => remove('readings', r.id)}
          />
        )}
        {tab === 'services' && (
          <ServicesView
            entries={services}
            onAdd={() => setDialog({ kind: 'service' })}
            onEdit={(item) => setDialog({ kind: 'service', item })}
            onDelete={(e) => remove('services', e.id)}
          />
        )}
        {tab === 'reminders' && (
          <RemindersView
            statuses={statuses}
            onAdd={() => setDialog({ kind: 'reminder' })}
            onEdit={(item) => setDialog({ kind: 'reminder', item })}
            // Renewing usually extends the deadline by a year; the form lets you adjust it.
            onRenew={(r) => setDialog({ kind: 'reminder', item: { ...r, dueDate: addMonths(r.dueDate!, 12) } })}
            onDelete={(r) => remove('reminders', r.id)}
          />
        )}
        {tab === 'settings' && (
          <SettingsView
            data={data}
            onAddVehicle={() => setDialog({ kind: 'vehicle' })}
            onEditVehicle={(item) => setDialog({ kind: 'vehicle', item })}
            onDeleteVehicle={deleteVehicle}
            onImport={(d: AppData) => replace(normalizeData(d))}
            backend={backend}
          />
        )}
      </main>

      {dialog?.kind === 'vehicle' && <VehicleForm vehicle={dialog.item} onSave={saveVehicle} onClose={close} />}
      {dialog?.kind === 'fuel' && (
        <FuelForm
          vehicleId={vehicle.id}
          entry={dialog.item}
          minOdometer={odometer}
          onSave={(e) => {
            update((d) => ({ ...d, fuel: upsert(d.fuel, e) }));
            close();
          }}
          onClose={close}
        />
      )}
      {dialog?.kind === 'odometer' && (
        <OdometerForm
          vehicleId={vehicle.id}
          currentOdometer={odometer}
          onSave={(r) => {
            update((d) => ({ ...d, readings: [...d.readings, r] }));
            close();
          }}
          onClose={close}
        />
      )}
      {dialog?.kind === 'service' && (
        <ServiceForm
          vehicleId={vehicle.id}
          entry={dialog.item}
          currentOdometer={odometer}
          onSave={(e) => {
            update((d) => ({ ...d, services: upsert(d.services, e) }));
            close();
          }}
          onClose={close}
        />
      )}
      {dialog?.kind === 'reminder' && (
        <ReminderForm
          vehicleId={vehicle.id}
          reminder={dialog.item}
          initialType={dialog.initialType}
          currentOdometer={odometer}
          onSave={(r) => {
            update((d) => ({ ...d, reminders: upsert(d.reminders, r) }));
            close();
          }}
          onClose={close}
        />
      )}
      <ConfirmHost />
    </div>
  );
}
