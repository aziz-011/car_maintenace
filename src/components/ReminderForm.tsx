import { useState, type FormEvent } from 'react';
import { newId, today } from '../store';
import { SERVICE_TYPES, type Reminder } from '../types';
import { Modal } from './Modal';
import { SelectOrOther } from './SelectOrOther';

interface Props {
  vehicleId: string;
  reminder?: Reminder;
  currentOdometer: number;
  onSave: (r: Reminder) => void;
  onClose: () => void;
}

export function ReminderForm({ vehicleId, reminder, currentOdometer, onSave, onClose }: Props) {
  const [type, setType] = useState(reminder?.type ?? SERVICE_TYPES[0]);
  const [intervalKm, setIntervalKm] = useState(reminder?.intervalKm?.toString() ?? '');
  const [intervalMonths, setIntervalMonths] = useState(reminder?.intervalMonths?.toString() ?? '');
  const [lastDate, setLastDate] = useState(reminder?.lastDate ?? today());
  const [lastOdometer, setLastOdometer] = useState(
    reminder?.lastOdometer.toString() ?? currentOdometer.toString(),
  );
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!intervalKm && !intervalMonths) {
      setError('Set a distance interval, a time interval, or both.');
      return;
    }
    onSave({
      id: reminder?.id ?? newId(),
      vehicleId,
      type: type.trim(),
      intervalKm: intervalKm ? Number(intervalKm) : undefined,
      intervalMonths: intervalMonths ? Number(intervalMonths) : undefined,
      lastDate,
      lastOdometer: Number(lastOdometer) || 0,
    });
  };

  return (
    <Modal title={reminder ? 'Edit reminder' : 'Add reminder'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>
          Service
          <SelectOrOther required value={type} onChange={setType} options={SERVICE_TYPES} otherPlaceholder="Service name" />
        </label>
        <p className="hint">Logging a service with this exact name resets the reminder.</p>
        <div className="row">
          <label>
            Every (km)
            <input type="number" min="1" value={intervalKm} onChange={(e) => setIntervalKm(e.target.value)} placeholder="10000" />
          </label>
          <label>
            Every (months)
            <input type="number" min="1" value={intervalMonths} onChange={(e) => setIntervalMonths(e.target.value)} placeholder="12" />
          </label>
        </div>
        <div className="row">
          <label>
            Last done on
            <input type="date" required value={lastDate} onChange={(e) => setLastDate(e.target.value)} />
          </label>
          <label>
            At odometer (km)
            <input type="number" min="0" value={lastOdometer} onChange={(e) => setLastOdometer(e.target.value)} />
          </label>
        </div>
        {error && <p className="hint warn">{error}</p>}
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">Save</button>
        </div>
      </form>
    </Modal>
  );
}
