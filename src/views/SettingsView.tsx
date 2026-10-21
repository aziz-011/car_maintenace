import { useRef, useState } from 'react';
import { EmailSettings } from '../components/EmailSettings';
import { confirmAction } from '../confirm';
import { isAppData, today } from '../store';
import type { AppData, Vehicle } from '../types';

interface Props {
  data: AppData;
  onAddVehicle: () => void;
  onEditVehicle: (v: Vehicle) => void;
  onDeleteVehicle: (v: Vehicle) => void;
  onImport: (d: AppData) => void;
  backend: 'server' | 'cloud' | 'local';
}

export function SettingsView({ data, onAddVehicle, onEditVehicle, onDeleteVehicle, onImport, backend }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');

  const exportData = async () => {
    const filename = `car-maintenance-${today()}.json`;
    const json = JSON.stringify(data, null, 2);
    // claude.ai pages cannot start downloads themselves; they ask the viewer to save.
    const downloads = backend === 'cloud' ? await window.claude?.use('downloads') : null;
    if (downloads) {
      try {
        await downloads.save({ filename, data: json });
        setMessage('Backup saved.');
      } catch (e) {
        if ((e as { code?: string }).code !== 'declined') setMessage('Could not save the backup here.');
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
      if (!(await confirmAction('Replace all current data with this backup? This cannot be undone.', 'Replace'))) return;
      onImport(parsed);
      setMessage('Backup restored.');
    } catch {
      setMessage('That file is not a valid backup.');
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="card-header">
          <h3>Vehicles</h3>
          <button className="btn primary" onClick={onAddVehicle}>
            + Vehicle
          </button>
        </div>
        <ul className="list">
          {data.vehicles.map((v) => (
            <li key={v.id} className="list-item">
              <div>
                <strong>{v.name}</strong>
                <span className="muted">
                  {[v.year, v.make, v.model].filter(Boolean).join(' ')}
                  {v.plate && ` · ${v.plate}`}
                </span>
              </div>
              <span className="row-actions">
                <button className="link" onClick={() => onEditVehicle(v)}>
                  Edit
                </button>
                <button className="link danger" onClick={() => onDeleteVehicle(v)}>
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3>Email reminders</h3>
        {backend === 'server' ? (
          <EmailSettings />
        ) : (
          <p className="muted">
            Emails are sent by the home server (start-server.bat on your PC).{' '}
            {backend === 'cloud'
              ? 'This claude.ai version shows your reminders in the app but cannot send emails.'
              : "This single-file version can't send emails."}
          </p>
        )}
      </section>

      <section className="card">
        <h3>Backup</h3>
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
            Export JSON
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Import JSON
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
