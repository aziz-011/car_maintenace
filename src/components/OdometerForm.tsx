import { useState, type FormEvent } from 'react';
import { fmtKm } from '../format';
import { newId, today } from '../store';
import type { OdometerReading } from '../types';
import { Modal } from './Modal';

interface Props {
  vehicleId: string;
  currentOdometer: number;
  onSave: (r: OdometerReading) => void;
  onClose: () => void;
}

/** The quick weekly check-in: just today's date and what the dashboard shows. */
export function OdometerForm({ vehicleId, currentOdometer, onSave, onClose }: Props) {
  const [date, setDate] = useState(today());
  const [odometer, setOdometer] = useState('');
  const value = Number(odometer);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({ id: newId(), vehicleId, date, odometer: value });
  };

  return (
    <Modal title="Update odometer" onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>
          Odometer now (km)
          <input
            type="number"
            inputMode="numeric"
            min="0"
            required
            autoFocus
            value={odometer}
            placeholder={currentOdometer.toString()}
            onChange={(e) => setOdometer(e.target.value)}
          />
        </label>
        {odometer && value < currentOdometer && (
          <p className="hint warn">Lower than the last known reading ({fmtKm(currentOdometer)}).</p>
        )}
        {odometer && value > currentOdometer && (
          <p className="hint">{fmtKm(value - currentOdometer)} since the last reading.</p>
        )}
        <label>
          Date
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <p className="hint">A reading every week or so lets the app estimate when the next oil change is due.</p>
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
