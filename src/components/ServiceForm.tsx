import { useState, type FormEvent } from 'react';
import { newId, today } from '../store';
import { COMPONENT_GROUPS, SERVICE_TYPES, type ServiceEntry } from '../types';
import { Modal } from './Modal';
import { PartsPicker } from './PartsPicker';
import { SelectOrOther } from './SelectOrOther';

interface Props {
  vehicleId: string;
  entry?: ServiceEntry;
  currentOdometer: number;
  onSave: (e: ServiceEntry) => void;
  onClose: () => void;
}

export function ServiceForm({ vehicleId, entry, currentOdometer, onSave, onClose }: Props) {
  const [date, setDate] = useState(entry?.date ?? today());
  const [odometer, setOdometer] = useState(entry?.odometer.toString() ?? currentOdometer.toString());
  const [type, setType] = useState(entry?.type ?? SERVICE_TYPES[0]);
  const [parts, setParts] = useState<string[]>(entry?.parts ?? []);
  const [cost, setCost] = useState(entry?.cost.toString() ?? '');
  const [shop, setShop] = useState(entry?.shop ?? '');
  const [notes, setNotes] = useState(entry?.notes ?? '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      id: entry?.id ?? newId(),
      vehicleId,
      date,
      odometer: Number(odometer),
      type: type.trim(),
      parts: parts.length ? parts : undefined,
      cost: Number(cost) || 0,
      shop: shop.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal title={entry ? 'Edit service' : 'Add service'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>
          Service
          <SelectOrOther required value={type} onChange={setType} options={SERVICE_TYPES} otherPlaceholder="Service name" />
        </label>
        <div className="field">
          <span>Parts replaced</span>
          <PartsPicker value={parts} onChange={setParts} groups={COMPONENT_GROUPS} />
        </div>
        <div className="row">
          <label>
            Date
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Odometer (km)
            <input type="number" min="0" required value={odometer} onChange={(e) => setOdometer(e.target.value)} />
          </label>
        </div>
        <div className="row">
          <label>
            Cost
            <input type="number" step="0.01" min="0" value={cost} onChange={(e) => setCost(e.target.value)} />
          </label>
          <label>
            Shop / garage
            <input value={shop} onChange={(e) => setShop(e.target.value)} />
          </label>
        </div>
        <label>
          Notes
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Oil grade, part brands…" />
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
