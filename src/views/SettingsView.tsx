import { useRef, useState } from 'react';
import { isAppData, today } from '../store';
import type { AppData, Vehicle } from '../types';

interface Props {
  data: AppData;
  onAddVehicle: () => void;
  onEditVehicle: (v: Vehicle) => void;
  onDeleteVehicle: (v: Vehicle) => void;
  onImport: (d: AppData) => void;
  serverMode: boolean;
}

export function SettingsView({ data, onAddVehicle, onEditVehicle, onDeleteVehicle, onImport, serverMode }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `car-maintenance-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isAppData(parsed)) throw new Error('invalid');
      if (!confirm('Replace all current data with this backup?')) return;
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
        <h3>Backup</h3>
        <p className="muted">
          {serverMode
            ? 'Your data is saved on the PC running the server (with a daily backup). You can also export a copy here.'
            : 'Your data is stored only in this browser. Export a backup regularly, or to move it to another device.'}
        </p>
        <div className="quick-actions">
          <button className="btn" onClick={exportData}>
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
