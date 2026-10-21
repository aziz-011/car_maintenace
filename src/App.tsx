import { useEffect, useMemo, useState } from 'react';
import { ConfirmHost } from './components/ConfirmHost';
import { DocumentForm } from './components/DocumentForm';
import { FuelForm } from './components/FuelForm';
import { GarageForm } from './components/GarageForm';
import { Icon, type IconName } from './components/Icon';
import { IssueForm } from './components/IssueForm';
import { QuoteForm } from './components/QuoteForm';
import { SubTabs } from './components/SubTabs';
import { TripForm } from './components/TripForm';
import { OdometerForm } from './components/OdometerForm';
import { ReminderForm } from './components/ReminderForm';
import { ServiceForm } from './components/ServiceForm';
import { TireForm } from './components/TireForm';
import { VehicleForm } from './components/VehicleForm';
import { confirmAction } from './confirm';
import { withoutDuplicates, type CsvImport } from './csv';
import { budgetStatus, consumptionAlert, DEFAULT_CONSUMPTION_ALERT } from './insights';
import { useDrivers } from './people';
import { applyPrefs } from './format';
import { setLanguage, t } from './i18n';
import { addMonths, vehicleOverview } from './stats';
import { newId, today, useAppData, type SyncStatus } from './store';
import {
  DOCUMENT_REMINDER,
  normalizeData,
  prefsOf,
  type AppData,
  type CarDocument,
  type FuelEntry,
  type Garage,
  type Issue,
  type Prefs,
  type Quote,
  type Reminder,
  type ServiceEntry,
  type TireSet,
  type Trip,
  type Vehicle,
} from './types';
import { CarView } from './views/CarView';
import { CostsView } from './views/CostsView';
import { Dashboard } from './views/Dashboard';
import { FaultsView } from './views/FaultsView';
import { FuelView } from './views/FuelView';
import { GaragesView } from './views/GaragesView';
import { ServicesView } from './views/ServicesView';
import { TripsView } from './views/TripsView';
import { SettingsView } from './views/SettingsView';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'dashboard', label: 'Overview', icon: 'gauge' },
  { id: 'fuel', label: 'Fuel', icon: 'fuel' },
  { id: 'services', label: 'Services', icon: 'wrench' },
  { id: 'costs', label: 'Costs', icon: 'chart' },
  { id: 'car', label: 'Car', icon: 'car' },
];
type Tab = 'dashboard' | 'fuel' | 'services' | 'costs' | 'car' | 'settings';

type Dialog =
  | { kind: 'vehicle'; item?: Vehicle }
  | { kind: 'fuel'; item?: FuelEntry; scanFirst?: boolean }
  | { kind: 'service'; item?: ServiceEntry }
  | { kind: 'reminder'; item?: Reminder; initialType?: string }
  | { kind: 'odometer' }
  | { kind: 'document'; item?: CarDocument }
  | { kind: 'tires'; item?: TireSet }
  | { kind: 'issue'; item?: Issue }
  | { kind: 'garage'; item?: Garage; thenQuote?: boolean }
  | { kind: 'quote'; item?: Quote; job?: string }
  | { kind: 'trip'; item?: Trip };

type Collection = 'fuel' | 'services' | 'reminders' | 'readings' | 'documents' | 'tires' | 'issues' | 'quotes' | 'trips';
type FuelPart = 'fills' | 'trips';
type ServicePart = 'services' | 'faults' | 'garages';

/** Opened from a home-screen shortcut: /?add=fuel or /?add=receipt. */
function shortcutDialog(): Dialog | null {
  const add = new URLSearchParams(location.search).get('add');
  if (add !== 'fuel' && add !== 'receipt') return null;
  history.replaceState(null, '', location.pathname);
  return { kind: 'fuel', scanFirst: add === 'receipt' };
}

// Read once when the page opens, not on every render.
const SHORTCUT = shortcutDialog();

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

/** A document's expiry date becomes the due date of the matching reminder, created if needed. */
function withDocumentReminder(reminders: Reminder[], doc: CarDocument, odometer: number): Reminder[] {
  const type = DOCUMENT_REMINDER[doc.type];
  if (!type || !doc.expiryDate) return reminders;
  const existing = reminders.find((r) => r.vehicleId === doc.vehicleId && r.type === type);
  if (existing) return upsert(reminders, { ...existing, dueDate: doc.expiryDate, intervalKm: undefined, intervalMonths: undefined });
  return [...reminders, { id: newId(), vehicleId: doc.vehicleId, type, dueDate: doc.expiryDate, lastDate: today(), lastOdometer: odometer }];
}

export default function App() {
  const { data, status, backend, update, replace, retry } = useAppData();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [dialog, setDialog] = useState<Dialog | null>(SHORTCUT);
  const [fuelPart, setFuelPart] = useState<FuelPart>('fills');
  const [servicePart, setServicePart] = useState<ServicePart>('services');
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SELECTED_KEY);
    } catch {
      return null;
    }
  });

  // Applied while rendering, so every child formats with the current choices.
  const prefs = prefsOf(data);
  const prefsKey = JSON.stringify(prefs);
  useMemo(() => {
    applyPrefs(prefs);
    setLanguage(prefs.language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsKey]);

  const vehicle = data.vehicles.find((v) => v.id === selectedId) ?? data.vehicles[0];

  useEffect(() => {
    try {
      if (vehicle) localStorage.setItem(SELECTED_KEY, vehicle.id);
    } catch {
      // Ignore: only a convenience.
    }
  }, [vehicle]);

  const mine = <T extends { vehicleId: string }>(list: T[]) => list.filter((x) => x.vehicleId === vehicle?.id);
  const fuel = useMemo(() => data.fuel.filter((f) => f.vehicleId === vehicle?.id), [data.fuel, vehicle]);
  const services = useMemo(() => data.services.filter((s) => s.vehicleId === vehicle?.id), [data.services, vehicle]);
  const readings = useMemo(() => data.readings.filter((r) => r.vehicleId === vehicle?.id), [data.readings, vehicle]);
  const trips = useMemo(() => data.trips.filter((r) => r.vehicleId === vehicle?.id), [data.trips, vehicle]);
  const issues = useMemo(() => data.issues.filter((r) => r.vehicleId === vehicle?.id), [data.issues, vehicle]);
  const drivers = useDrivers(
    backend,
    [...data.fuel, ...data.services, ...data.trips].map((x) => x.driver).filter((d): d is string => !!d),
  );
  const previousFill = useMemo(() => [...fuel].sort((a, b) => a.odometer - b.odometer || a.date.localeCompare(b.date)).at(-1), [fuel]);
  const garageNames = useMemo(
    () => [...new Set([...data.garages.map((g) => g.name), ...data.services.map((s) => s.shop ?? '')].map((n) => n.trim()).filter(Boolean))].sort(),
    [data.garages, data.services],
  );
  const alertAt = prefs.consumptionAlert ?? DEFAULT_CONSUMPTION_ALERT;
  const fuelAlert = useMemo(() => (alertAt > 0 ? consumptionAlert(fuel, alertAt) : null), [fuel, alertAt]);
  // prefsKey: the estimates' text depends on units and language.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const overview = useMemo(() => (vehicle ? vehicleOverview(vehicle, data, today()) : null), [vehicle, data, prefsKey]);
  const odometer = overview?.odometer ?? 0;
  const statuses = useMemo(() => overview?.statuses ?? [], [overview]);

  const close = () => setDialog(null);
  const savePrefs = (p: Prefs) => update((d) => ({ ...d, prefs: [p] }));

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
    if (!(await confirmAction(t('Delete {name} and everything logged for it?', { name: v.name })))) return;
    const notThisCar = <T extends { vehicleId: string }>(list: T[]) => list.filter((x) => x.vehicleId !== v.id);
    update((d) => ({
      ...d,
      vehicles: d.vehicles.filter((x) => x.id !== v.id),
      fuel: notThisCar(d.fuel),
      services: notThisCar(d.services),
      reminders: notThisCar(d.reminders),
      readings: notThisCar(d.readings),
      documents: notThisCar(d.documents),
      tires: notThisCar(d.tires),
      issues: notThisCar(d.issues),
      quotes: notThisCar(d.quotes),
      trips: notThisCar(d.trips),
    }));
  };

  const deleteGarage = async (g: Garage) => {
    if (!(await confirmAction(t('Delete {name} and its quotes? Services done there are kept.', { name: g.name }), t('Delete')))) return;
    update((d) => ({ ...d, garages: d.garages.filter((x) => x.id !== g.id), quotes: d.quotes.filter((q) => q.garageId !== g.id) }));
  };

  /** The chosen quote is marked; the others for the same job are not. */
  const acceptQuote = (q: Quote) => {
    const job = q.job.trim().toLowerCase();
    update((d) => ({
      ...d,
      quotes: d.quotes.map((x) => (x.vehicleId === q.vehicleId && x.job.trim().toLowerCase() === job ? { ...x, accepted: x.id === q.id } : x)),
    }));
  };

  const importCsvRows = (r: CsvImport): number => {
    let added = 0;
    update((d) => {
      if (r.kind === 'fuel') {
        const rows = withoutDuplicates(r.items, d.fuel);
        added = rows.length;
        return { ...d, fuel: [...d.fuel, ...rows] };
      }
      if (r.kind === 'services') {
        const rows = withoutDuplicates(r.items, d.services);
        added = rows.length;
        return { ...d, services: [...d.services, ...rows] };
      }
      const rows = withoutDuplicates(r.items, d.trips);
      added = rows.length;
      return { ...d, trips: [...d.trips, ...rows] };
    });
    return added;
  };

  const remove = async (key: Collection, id: string) => {
    if (!(await confirmAction(t('Delete this entry?'), t('Delete')))) return;
    update((d) => ({ ...d, [key]: (d[key] as { id: string }[]).filter((x) => x.id !== id) }));
  };

  if (status === 'loading' || status === 'unreachable') {
    return (
      <div className="welcome">
        <h1>{t('Car Maintenance')}</h1>
        {status === 'loading' ? (
          <p>{t('Loading…')}</p>
        ) : (
          <>
            <p>{t("Can't reach the server. Check that it is running on your PC and that you're on the same network.")}</p>
            <button className="btn primary" onClick={() => void retry()}>
              {t('Try again')}
            </button>
          </>
        )}
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="welcome">
        <h1>{t('Car Maintenance')}</h1>
        <p>{t('Track fuel consumption, services and upcoming maintenance for your vehicles.')}</p>
        <button className="btn primary" onClick={() => setDialog({ kind: 'vehicle' })}>
          {t('Add your first vehicle')}
        </button>
        <p className="welcome-lang">
          <button className="link" onClick={() => savePrefs({ ...prefs, language: prefs.language === 'fr' ? 'en' : 'fr' })}>
            {prefs.language === 'fr' ? 'English' : 'Français'}
          </button>
        </p>
        {dialog?.kind === 'vehicle' && <VehicleForm onSave={saveVehicle} onClose={close} />}
        <ConfirmHost />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="title">
          <h1>
            <span className="brand-mark" aria-hidden="true">
              <Icon name="gauge" size={18} />
            </span>
            {t('Car Maintenance')}
          </h1>
          {STATUS_TEXT[status] && (
            <span className={`sync ${status}`} role="status">
              {t(STATUS_TEXT[status]!)}
            </span>
          )}
        </div>
        <div className="topbar-end">
          <select
            aria-label={t('Vehicle')}
            value={vehicle.id}
            onChange={(e) => (e.target.value === '__new' ? setDialog({ kind: 'vehicle' }) : setSelectedId(e.target.value))}
          >
            {data.vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
            <option value="__new">{t('+ Add vehicle…')}</option>
          </select>
          <button
            className={`icon-button${tab === 'settings' ? ' active' : ''}`}
            aria-label={t('Settings')}
            aria-current={tab === 'settings' ? 'page' : undefined}
            onClick={() => setTab('settings')}
          >
            <Icon name="gear" size={20} />
          </button>
        </div>
      </header>

      <nav className="tabs" aria-label={t('Sections')}>
        {TABS.map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? 'active' : ''}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => setTab(item.id)}
          >
            <Icon name={item.icon} size={20} />
            <span>{t(item.label)}</span>
          </button>
        ))}
      </nav>

      <main>
        {tab === 'dashboard' && (
          <Dashboard
            vehicle={vehicle}
            onOpenReminders={() => setTab('car')}
            odometer={odometer}
            fuel={fuel}
            services={services}
            reminders={statuses}
            onAddFuel={() => setDialog({ kind: 'fuel' })}
            onAddService={() => setDialog({ kind: 'service' })}
            onAddReminder={(initialType) => setDialog({ kind: 'reminder', initialType })}
            onUpdateOdometer={() => setDialog({ kind: 'odometer' })}
            onAddOilReminder={(km) =>
              update((d) => ({ ...d, reminders: [...d.reminders, oilReminder(vehicle.id, km, odometer)] }))
            }
            driving={overview?.driving ?? null}
            lastOdometerDate={overview?.lastOdometerDate}
            consumptionAlert={fuelAlert}
            budget={budgetStatus(vehicle, fuel, today())}
            openFaults={issues.filter((i) => !i.fixedDate && !i.fixedByServiceId).length}
            onOpenFaults={() => {
              setServicePart('faults');
              setTab('services');
            }}
            onLogFault={() => setDialog({ kind: 'issue' })}
            onOpenCosts={() => setTab('costs')}
          />
        )}
        {tab === 'fuel' && (
          <div className="stack">
            <SubTabs
              label="Fuel"
              value={fuelPart}
              onChange={setFuelPart}
              options={[
                { id: 'fills', label: 'Fill-ups' },
                { id: 'trips', label: 'Trips', count: trips.length },
              ]}
            />
            {fuelPart === 'fills' ? (
              <FuelView
                entries={fuel}
                onAdd={() => setDialog({ kind: 'fuel' })}
                onEdit={(item) => setDialog({ kind: 'fuel', item })}
                onDelete={(e) => remove('fuel', e.id)}
                readings={readings}
                onAddReading={() => setDialog({ kind: 'odometer' })}
                onDeleteReading={(r) => remove('readings', r.id)}
                nameOf={drivers.nameOf}
              />
            ) : (
              <TripsView
                trips={trips}
                fuel={fuel}
                services={services}
                readings={readings}
                nameOf={drivers.nameOf}
                onAdd={() => setDialog({ kind: 'trip' })}
                onEdit={(item) => setDialog({ kind: 'trip', item })}
                onDelete={(x) => remove('trips', x.id)}
              />
            )}
          </div>
        )}
        {tab === 'services' && (
          <div className="stack">
            <SubTabs
              label="Services"
              value={servicePart}
              onChange={setServicePart}
              options={[
                { id: 'services', label: 'Services' },
                { id: 'faults', label: 'Faults', count: issues.filter((i) => !i.fixedDate && !i.fixedByServiceId).length },
                { id: 'garages', label: 'Garages' },
              ]}
            />
            {servicePart === 'services' && (
              <ServicesView
                entries={services}
                onAdd={() => setDialog({ kind: 'service' })}
                onEdit={(item) => setDialog({ kind: 'service', item })}
                onDelete={(e) => remove('services', e.id)}
                nameOf={drivers.nameOf}
              />
            )}
            {servicePart === 'faults' && (
              <FaultsView
                issues={issues}
                services={services}
                onAdd={() => setDialog({ kind: 'issue' })}
                onEdit={(item) => setDialog({ kind: 'issue', item })}
                onDelete={(x) => remove('issues', x.id)}
              />
            )}
            {servicePart === 'garages' && (
              <GaragesView
                garages={data.garages}
                services={data.services}
                quotes={mine(data.quotes)}
                onAddGarage={() => setDialog({ kind: 'garage' })}
                onEditGarage={(item) => setDialog({ kind: 'garage', item })}
                onDeleteGarage={(g) => void deleteGarage(g)}
                onAddQuote={(job) => setDialog({ kind: 'quote', job })}
                onEditQuote={(item) => setDialog({ kind: 'quote', item })}
                onDeleteQuote={(q) => remove('quotes', q.id)}
                onAcceptQuote={acceptQuote}
              />
            )}
          </div>
        )}
        {tab === 'costs' && (
          <CostsView
            vehicle={vehicle}
            data={data}
            fuel={fuel}
            services={services}
            readings={readings}
            trips={trips}
            nameOf={drivers.nameOf}
            onSetBudget={(amount) => update((d) => ({ ...d, vehicles: upsert(d.vehicles, { ...vehicle, fuelBudget: amount }) }))}
          />
        )}
        {tab === 'car' && (
          <CarView
            vehicle={vehicle}
            odometer={odometer}
            documents={mine(data.documents)}
            tires={mine(data.tires)}
            statuses={statuses}
            onEditVehicle={() => setDialog({ kind: 'vehicle', item: vehicle })}
            onAddDocument={() => setDialog({ kind: 'document' })}
            onEditDocument={(item) => setDialog({ kind: 'document', item })}
            onDeleteDocument={(d) => remove('documents', d.id)}
            onFitTires={() => setDialog({ kind: 'tires' })}
            onEditTires={(item) => setDialog({ kind: 'tires', item })}
            onDeleteTires={(s) => remove('tires', s.id)}
            onAddPlan={(list) => update((d) => ({ ...d, reminders: [...d.reminders, ...list] }))}
            onAddReminder={() => setDialog({ kind: 'reminder' })}
            onEditReminder={(item) => setDialog({ kind: 'reminder', item })}
            // Renewing usually extends the deadline by a year; the form lets you adjust it.
            onRenewReminder={(r) => setDialog({ kind: 'reminder', item: { ...r, dueDate: addMonths(r.dueDate!, 12) } })}
            onDeleteReminder={(r) => remove('reminders', r.id)}
          />
        )}
        {tab === 'settings' && (
          <SettingsView
            data={data}
            vehicle={vehicle}
            onImportCsv={importCsvRows}
            driverName={drivers.name}
            onDriverName={drivers.saveName}
            nameOf={drivers.nameOf}
            prefs={prefs}
            onChangePrefs={savePrefs}
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
          backend={backend}
          previous={previousFill}
          driver={drivers.me}
          scanFirst={dialog.scanFirst}
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
          backend={backend}
          garageNames={garageNames}
          driver={drivers.me}
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
      {dialog?.kind === 'document' && (
        <DocumentForm
          vehicleId={vehicle.id}
          document={dialog.item}
          backend={backend}
          onSave={(doc) => {
            update((d) => ({
              ...d,
              documents: upsert(d.documents, doc),
              reminders: withDocumentReminder(d.reminders, doc, odometer),
            }));
            close();
          }}
          onClose={close}
        />
      )}
      {dialog?.kind === 'tires' && (
        <TireForm
          vehicleId={vehicle.id}
          tire={dialog.item}
          currentOdometer={odometer}
          onSave={(set) => {
            update((d) => ({
              ...d,
              // A new set replaces the one on the car, which is marked removed when and where the new one went on.
              tires: upsert(
                dialog.item
                  ? d.tires
                  : d.tires.map((x) =>
                      x.vehicleId === vehicle.id && !x.removedDate
                        ? { ...x, removedDate: set.fittedDate, removedOdometer: set.fittedOdometer }
                        : x,
                    ),
                set,
              ),
            }));
            close();
          }}
          onClose={close}
        />
      )}
      {dialog?.kind === 'issue' && (
        <IssueForm
          vehicleId={vehicle.id}
          issue={dialog.item}
          currentOdometer={odometer}
          services={services}
          backend={backend}
          onSave={(i) => {
            update((d) => ({ ...d, issues: upsert(d.issues, i) }));
            close();
          }}
          onClose={close}
        />
      )}
      {dialog?.kind === 'garage' && (
        <GarageForm
          garage={dialog.item}
          onSave={(g) => {
            update((d) => ({ ...d, garages: upsert(d.garages, g) }));
            setDialog(dialog.thenQuote ? { kind: 'quote' } : null);
          }}
          onClose={close}
        />
      )}
      {dialog?.kind === 'quote' && (
        <QuoteForm
          vehicleId={vehicle.id}
          quote={dialog.item}
          job={dialog.job}
          garages={data.garages}
          onSave={(q) => {
            update((d) => ({ ...d, quotes: upsert(d.quotes, q) }));
            close();
          }}
          onAddGarage={() => setDialog({ kind: 'garage', thenQuote: true })}
          onClose={close}
        />
      )}
      {dialog?.kind === 'trip' && (
        <TripForm
          vehicleId={vehicle.id}
          trip={dialog.item}
          places={[...new Set(data.trips.flatMap((x) => [x.from ?? '', x.to ?? '']).filter(Boolean))].sort()}
          driver={drivers.me}
          onSave={(x) => {
            update((d) => ({ ...d, trips: upsert(d.trips, x) }));
            close();
          }}
          onClose={close}
        />
      )}
      <ConfirmHost />
    </div>
  );
}
