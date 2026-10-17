import { useState, type FormEvent } from 'react';
import { FUEL_STATIONS } from '../data/vehicles';
import { newId, today } from '../store';
import type { FuelEntry } from '../types';
import { Modal } from './Modal';
import { SelectOrOther } from './SelectOrOther';

interface Props {
  vehicleId: string;
  entry?: FuelEntry;
  minOdometer: number;
  onSave: (e: FuelEntry) => void;
  onClose: () => void;
}

export function FuelForm({ vehicleId, entry, minOdometer, onSave, onClose }: Props) {
  const [date, setDate] = useState(entry?.date ?? today());
  const [odometer, setOdometer] = useState(entry?.odometer.toString() ?? '');
  const [liters, setLiters] = useState(entry?.liters.toString() ?? '');
  const [price, setPrice] = useState(
    entry ? (entry.totalCost / entry.liters).toFixed(3) : '',
  );
  const [total, setTotal] = useState(entry?.totalCost.toString() ?? '');
  const [fullTank, setFullTank] = useState(entry?.fullTank ?? true);
  const [station, setStation] = useState(entry?.station ?? '');
  const [notes, setNotes] = useState(entry?.notes ?? '');

  // Keep price/L and total in sync: editing one recomputes the other.
  const onLiters = (v: string) => {
    setLiters(v);
    if (price && v) setTotal((Number(v) * Number(price)).toFixed(2));
  };
  const onPrice = (v: string) => {
    setPrice(v);
    if (liters && v) setTotal((Number(liters) * Number(v)).toFixed(2));
  };
  const onTotal = (v: string) => {
    setTotal(v);
    if (liters && v && Number(liters) > 0) setPrice((Number(v) / Number(liters)).toFixed(3));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      id: entry?.id ?? newId(),
      vehicleId,
      date,
      odometer: Number(odometer),
      liters: Number(liters),
      totalCost: Number(total),
      fullTank,
      station: station.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  const odo = Number(odometer);
  const odoWarning = !entry && odometer && odo < minOdometer;

  return (
    <Modal title={entry ? 'Edit fill-up' : 'Add fill-up'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <div className="row">
          <label>
            Date
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Odometer (km)
            <input
              type="number"
              min="0"
              required
              value={odometer}
              placeholder={minOdometer.toString()}
              onChange={(e) => setOdometer(e.target.value)}
            />
          </label>
        </div>
        {odoWarning && <p className="hint warn">Lower than the last known odometer ({minOdometer} km).</p>}
        <div className="row three">
          <label>
            Liters
            <input type="number" step="0.01" min="0.01" required value={liters} onChange={(e) => onLiters(e.target.value)} />
          </label>
          <label>
            Price / L
            <input type="number" step="0.001" min="0" value={price} onChange={(e) => onPrice(e.target.value)} />
          </label>
          <label>
            Total
            <input type="number" step="0.01" min="0" required value={total} onChange={(e) => onTotal(e.target.value)} />
          </label>
        </div>
        <label className="check">
          <input type="checkbox" checked={fullTank} onChange={(e) => setFullTank(e.target.checked)} />
          Filled the tank completely
        </label>
        <p className="hint">Consumption is calculated between two full-tank fill-ups.</p>
        <label>
          Station
          <SelectOrOther value={station} onChange={setStation} options={FUEL_STATIONS} placeholder="—" otherPlaceholder="Station name" />
        </label>
        <label>
          Notes
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
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
