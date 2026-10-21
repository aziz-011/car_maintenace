import { useRef, useState } from 'react';
import { EmailSettings } from '../components/EmailSettings';
import { PrefsCard } from '../components/PrefsCard';
import { calendarItems, toIcs } from '../calendar';
import { confirmAction } from '../confirm';
import { isAppData, today } from '../store';
import type { AppData, Prefs, Vehicle } from '../types';
import { t } from '../i18n';

interface Props {
  data: AppData;
  onAddVehicle: () => void;
  onEditVehicle: (v: Vehicle) => void;
  onDeleteVehicle: (v: Vehicle) => void;
  onImport: (d: AppData) => void;
  backend: 'server' | 'cloud' | 'local';
  prefs: Prefs;
  onChangePrefs: (p: Prefs) => void;
}

export function SettingsView({ data, onAddVehicle, onEditVehicle, onDeleteVehicle, onImport, backend, prefs, onChangePrefs }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const feedUrl = `${location.origin}/calendar.ics`;
  const upcoming = calendarItems(data, today()).length;

  const downloadIcs = () => {
    const url = URL.createObjectURL(new Blob([toIcs(calendarItems(data, today()))], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'car-maintenance.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyFeed = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const exportData = async () => {
    const filename = `car-maintenance-${today()}.json`;
    const json = JSON.stringify(data, null, 2);
    // claude.ai pages cannot start downloads themselves; they ask the viewer to save.
    const downloads = backend === 'cloud' ? await window.claude?.use('downloads') : null;
    if (downloads) {
      try {
        await downloads.save({ filename, data: json });
        setMessage(t('Backup saved.'));
      } catch (e) {
        if ((e as { code?: string }).code !== 'declined') setMessage(t('Could not save the backup here.'));
      }
      return;
    }
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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
        <h3>{t('Email reminders')}</h3>
        {backend === 'server' ? (
          <EmailSettings />
        ) : (
          <p className="muted">
            {backend === 'local' && <>{t('Emails are sent by the home server (start-server.bat on your PC).')} </>}
            {backend === 'cloud'
              ? 'On claude.ai, the weekly check-in and reminder emails are sent by a scheduled Claude task through your Gmail. Ask Claude to set it up if it isn\'t yet.'
              : "This single-file version can't send emails."}
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
                  <button className="btn small" onClick={() => void copyFeed()}>
                    {copied ? 'Copied' : 'Copy'}
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
        <h3>{t('Backup')}</h3>
        <p className="muted">
          {
            {
              server:
                'Your data is saved on the PC running the server, in the CarMaintenance folder of your user folder, with a daily backup. You can also export a copy here.',
              cloud:
                'Your data is saved in your Claude account, privately, and is the same on every device where you are signed in. Export a copy now and then to keep your own backup.',
              local: 'Your data is stored only in this browser. Export a backup regularly, or to move it to another device.',
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
              if (file) importData(file);
              e.target.value = '';
            }}
          />
        </div>
        {message && <p className="hint">{message}</p>}
      </section>
    </div>
  );
}
