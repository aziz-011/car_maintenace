import { useRef, useState } from 'react';
import { EmailSettings } from '../components/EmailSettings';
import { PrefsCard } from '../components/PrefsCard';
import { ReceiptAiSettings } from '../components/ReceiptAiSettings';
import { calendarItems, toIcs } from '../calendar';
import { confirmAction } from '../confirm';
import { csvFormat, fuelCsv, importCsv, servicesCsv, tripsCsv, type CsvImport } from '../csv';
import { saveFile } from '../download';
import { isAppData, today } from '../store';
import type { AppData, Prefs, Vehicle } from '../types';
import { plural, t } from '../i18n';

interface Props {
  data: AppData;
  vehicle: Vehicle;
  onAddVehicle: () => void;
  onEditVehicle: (v: Vehicle) => void;
  onDeleteVehicle: (v: Vehicle) => void;
  onImport: (d: AppData) => void;
  /** Adds the rows from a spreadsheet to the selected car; returns how many were new. */
  onImportCsv: (r: CsvImport) => number;
  backend: 'server' | 'cloud' | 'local';
  prefs: Prefs;
  onChangePrefs: (p: Prefs) => void;
  driverName: string;
  onDriverName: (name: string) => void;
  nameOf: (driver?: string) => string;
}

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'car';

export function SettingsView(props: Props) {
  const { data, vehicle, onAddVehicle, onEditVehicle, onDeleteVehicle, onImport, backend, prefs, onChangePrefs } = props;
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [csvMessage, setCsvMessage] = useState('');
  const [copied, setCopied] = useState('');
  const [name, setName] = useState(props.driverName);
  const feedUrl = `${location.origin}/calendar.ics`;
  const upcoming = calendarItems(data, today()).length;
  const own = <T extends { vehicleId: string }>(list: T[]) => list.filter((x) => x.vehicleId === vehicle.id);

  const downloadIcs = () => void saveFile('car-maintenance.ics', toIcs(calendarItems(data, today())), 'text/calendar', backend);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
    } catch {
      setCopied('');
    }
  };

  const exportData = async () => {
    try {
      if (await saveFile(`car-maintenance-${today()}.json`, JSON.stringify(data, null, 2), 'application/json', backend)) setMessage(t('Backup saved.'));
    } catch {
      setMessage(t('Could not save the backup here.'));
    }
  };

  const importData = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isAppData(parsed)) throw new Error('invalid');
      if (!(await confirmAction(t('Replace all current data with this backup? This cannot be undone.'), t('Replace')))) return;
      onImport(parsed);
      setMessage(t('Backup restored.'));
    } catch {
      setMessage(t('That file is not a valid backup.'));
    }
  };

  const exportCsv = async (kind: 'fuel' | 'services' | 'trips') => {
    const f = csvFormat(prefs.language);
    const text = { fuel: () => fuelCsv(own(data.fuel), f, props.nameOf), services: () => servicesCsv(own(data.services), f, props.nameOf), trips: () => tripsCsv(own(data.trips), f, props.nameOf) }[kind]();
    const label = { fuel: t('fill-ups'), services: t('services'), trips: t('trips') }[kind];
    try {
      if (await saveFile(`${slug(vehicle.name)}-${slug(label)}-${today()}.csv`, text, 'text/csv', backend)) setCsvMessage(t('Spreadsheet saved.'));
    } catch {
      setCsvMessage(t('Could not save the file here.'));
    }
  };

  const importSheet = async (file: File) => {
    const result = importCsv(await file.text(), vehicle.id);
    if (!result || result.items.length === 0) {
      setCsvMessage(
        t('No fill-ups, services or trips found in this file. It needs a header row with at least a date, and liters (fill-ups), a service (services) or a distance (trips).'),
      );
      return;
    }
    const kind = { fuel: t('fill-ups'), services: t('services'), trips: t('trips') }[result.kind];
    if (!(await confirmAction(t('Add {n} {kind} from this file to {car}?', { n: result.items.length, kind, car: vehicle.name }), t('Import')))) return;
    const added = props.onImportCsv(result);
    const skipped = result.items.length - added + result.skipped;
    setCsvMessage(
      t('Added {n} {kind}.', { n: added, kind }) + (skipped ? ' ' + plural(skipped, '{n} row was skipped (already logged or unreadable).', '{n} rows were skipped (already logged or unreadable).') : ''),
    );
  };

  const addUrl = `${location.origin}/?add=fuel`;
  const scanUrl = `${location.origin}/?add=receipt`;

  return (
    <div className="stack">
      <PrefsCard prefs={prefs} onChange={onChangePrefs} />

      <section className="card">
        <div className="card-header">
          <h3>{t('Vehicles')}</h3>
          <button className="btn primary" onClick={onAddVehicle}>
            {t('+ Vehicle')}
          </button>
        </div>
        <ul className="list">
          {data.vehicles.map((v) => (
            <li key={v.id} className="list-item">
              <div>
                <strong>{v.name}</strong>
                <span className="muted">
                  {[v.year, v.make, v.generation ?? v.model].filter(Boolean).join(' ')}
                  {v.engine && ` · ${t(v.engine)}`}
                  {v.plate && ` · ${v.plate}`}
                </span>
              </div>
              <span className="row-actions">
                <button className="link" onClick={() => onEditVehicle(v)}>
                  {t('Edit')}
                </button>
                <button className="link danger" onClick={() => onDeleteVehicle(v)}>
                  {t('Delete')}
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3>{t('Family and shared use')}</h3>
        {backend === 'cloud' ? (
          <p className="muted">
            {t("Share this page from its Share menu with the people who drive your cars, and let them use it. They see and add to the same records from their own Claude account, and each fill-up, service and trip shows who logged it. People who can only view the page can't change anything.")}
          </p>
        ) : (
          <>
            <p className="muted">
              {backend === 'server'
                ? t('Everyone on your home Wi-Fi opens the same address and shares the same records. Type your name on each phone so the entries show who logged them.')
                : t('This single-file version keeps its data in this browser only, so it cannot be shared. Use the home server to share it with your family.')}
            </p>
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                props.onDriverName(name);
                setMessage('');
              }}
            >
              <label>
                {t('Your name on this device')}
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('e.g. Aziz')} />
              </label>
              <button className="btn" disabled={name.trim() === props.driverName}>
                {t('Save')}
              </button>
            </form>
          </>
        )}
      </section>

      {backend === 'server' && (
        <section className="card">
          <h3>{t('Phone shortcut')}</h3>
          <p className="muted">
            {t('Open one of these links on your phone, then add it to the home screen (Chrome: menu ⋮ → Add to Home screen; iPhone Safari: Share → Add to Home Screen). The icon opens straight to a new fill-up, with your usual station and price already filled in.')}
          </p>
          {[
            { url: addUrl, label: t('New fill-up') },
            { url: scanUrl, label: t('New fill-up from a receipt photo') },
          ].map((l) => (
            <div key={l.url} className="copy-row">
              <span className="copy-label">{l.label}</span>
              <code>{l.url}</code>
              <button className="btn small" onClick={() => void copy(l.url)}>
                {copied === l.url ? t('Copied') : t('Copy')}
              </button>
            </div>
          ))}
          <p className="hint">
            {t('Offline: once opened, the app keeps your data on the phone. Fill-ups added without a connection are saved there and sent when the server is reachable again. Reopening the app with no connection needs a secure (https) address, so keep the page open in a tab when you leave home.')}
          </p>
        </section>
      )}

      <section className="card">
        <h3>{t('Reading receipts')}</h3>
        {backend === 'server' ? (
          <ReceiptAiSettings />
        ) : backend === 'cloud' ? (
          <p className="muted">
            {t('When you add a fill-up, tap "Fill in from a receipt photo": Claude reads the liters, price, total, station and date from the photo. You are asked once to allow the page to send images to Claude. Always check the values before saving.')}
          </p>
        ) : (
          <p className="muted">{t('Reading receipts needs the home server (with a Claude API key) or the claude.ai version.')}</p>
        )}
      </section>

      <section className="card">
        <h3>{t('Email reminders')}</h3>
        {backend === 'server' ? (
          <EmailSettings />
        ) : (
          <p className="muted">
            {backend === 'local' && <>{t('Emails are sent by the home server (start-server.bat on your PC).')} </>}
            {backend === 'cloud'
              ? t("On claude.ai, the weekly check-in and reminder emails are sent by a scheduled Claude task through your Gmail. Ask Claude to set it up if it isn't yet.")
              : t("This single-file version can't send emails.")}
          </p>
        )}
      </section>

      <section className="card">
        <h3>{t('Calendar')}</h3>
        <p className="muted">
          {t('{n} dates to put in your calendar: visite technique, insurance, road tax and the other key dates, plus the estimated date of each oil change.', { n: upcoming })}
        </p>
        {backend === 'cloud' ? (
          <p className="muted">
            {t("On claude.ai, Claude adds these to your Google Calendar and keeps them up to date with the weekly check-in. Ask Claude to set it up if it isn't yet.")}
          </p>
        ) : (
          <>
            {backend === 'server' && (
              <>
                <p className="muted">
                  {t("Subscribe to this address in your phone's calendar so it always shows the current dates (on iPhone: Settings → Calendar → Accounts → Add Subscribed Calendar). It works while you're on your home Wi-Fi.")}
                </p>
                <div className="copy-row">
                  <code>{feedUrl}</code>
                  <button className="btn small" onClick={() => void copy(feedUrl)}>
                    {copied === feedUrl ? t('Copied') : t('Copy')}
                  </button>
                </div>
              </>
            )}
            <div className="quick-actions">
              <button className="btn" onClick={downloadIcs} disabled={!upcoming}>
                {t('Download calendar file (.ics)')}
              </button>
            </div>
            <p className="hint">{t('Import the file in Google Calendar (Settings → Import), Outlook or Apple Calendar. Download it again after changes.')}</p>
          </>
        )}
      </section>

      <section className="card">
        <h3>{t('Spreadsheets (Excel, CSV)')}</h3>
        <p className="muted">{t('Export the fill-ups, services or trips of {car} to open them in Excel or Google Sheets, or import them from another app or an old spreadsheet.', { car: vehicle.name })}</p>
        <div className="quick-actions">
          <button className="btn" onClick={() => void exportCsv('fuel')} disabled={!own(data.fuel).length}>
            {t('Export fill-ups')}
          </button>
          <button className="btn" onClick={() => void exportCsv('services')} disabled={!own(data.services).length}>
            {t('Export services')}
          </button>
          <button className="btn" onClick={() => void exportCsv('trips')} disabled={!own(data.trips).length}>
            {t('Export trips')}
          </button>
          <button className="btn" onClick={() => csvRef.current?.click()}>
            {t('Import a spreadsheet')}
          </button>
          <input
            ref={csvRef}
            type="file"
            accept=".csv,text/csv,text/plain,.tsv"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importSheet(file);
              e.target.value = '';
            }}
          />
        </div>
        <p className="hint">
          {t('To import from Excel, save the sheet as CSV first. Columns are recognised by name in English or French (Date, Kilométrage, Litres, Prix/L, Montant, Station…), with either decimal style. Rows already logged are skipped.')}
        </p>
        {csvMessage && <p className="hint">{csvMessage}</p>}
      </section>

      <section className="card">
        <h3>{t('Backup')}</h3>
        <p className="muted">
          {
            {
              server: t(
                'Your data is saved on the PC running the server, in the CarMaintenance folder of your user folder, with a daily backup. You can also export a copy here.',
              ),
              cloud: t(
                'Your data is saved in your Claude account and is the same on every device where you are signed in. Export a copy now and then to keep your own backup.',
              ),
              local: t('Your data is stored only in this browser. Export a backup regularly, or to move it to another device.'),
            }[backend]
          }
        </p>
        <div className="quick-actions">
          <button className="btn" onClick={() => void exportData()}>
            {t('Export JSON')}
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            {t('Import JSON')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importData(file);
              e.target.value = '';
            }}
          />
        </div>
        {message && <p className="hint">{message}</p>}
      </section>
    </div>
  );
}
