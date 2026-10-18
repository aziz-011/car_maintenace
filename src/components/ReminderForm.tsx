import { useState, type FormEvent } from 'react';
import { addMonths } from '../stats';
import { newId, today } from '../store';
import { COMPONENT_GROUPS, DOCUMENT_TYPES, SERVICE_TYPES, type Reminder } from '../types';
import { Modal } from './Modal';
import { SelectOrOther } from './SelectOrOther';

const REMINDER_GROUPS = [
  { label: 'Documents & deadlines', options: DOCUMENT_TYPES },
  { label: 'Services', options: SERVICE_TYPES.filter((t) => !DOCUMENT_TYPES.includes(t)) },
  ...COMPONENT_GROUPS,
];

type Mode = 'date' | 'interval';

interface Props {
  vehicleId: string;
  reminder?: Reminder;
  /** Prefill for a new reminder, e.g. "Insurance" from a quick-add button. */
  initialType?: string;
  currentOdometer: number;
  onSave: (r: Reminder) => void;
  onClose: () => void;
}

export function ReminderForm({ vehicleId, reminder, initialType, currentOdometer, onSave, onClose }: Props) {
  const startType = reminder?.type ?? initialType ?? DOCUMENT_TYPES[0];
  const [type, setType] = useState(startType);
  const [mode, setMode] = useState<Mode>(
    reminder ? (reminder.dueDate ? 'date' : 'interval') : DOCUMENT_TYPES.includes(startType) ? 'date' : 'interval',
  );
  const [dueDate, setDueDate] = useState(reminder?.dueDate ?? '');
  const [intervalKm, setIntervalKm] = useState(reminder?.intervalKm?.toString() ?? '');
  const [intervalMonths, setIntervalMonths] = useState(reminder?.intervalMonths?.toString() ?? '');
  const [lastDate, setLastDate] = useState(reminder?.lastDate ?? today());
  const [lastOdometer, setLastOdometer] = useState(reminder?.lastOdometer.toString() ?? currentOdometer.toString());
  const [error, setError] = useState('');

  // Paperwork usually has an expiry date; maintenance usually repeats.
  const changeType = (value: string) => {
    setType(value);
    if (!reminder && value) setMode(DOCUMENT_TYPES.includes(value) ? 'date' : 'interval');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'date' && !dueDate) {
      setError('Choose the date it is due or expires.');
      return;
    }
    if (mode === 'interval' && !intervalKm && !intervalMonths) {
      setError('Set a distance interval, a time interval, or both.');
      return;
    }
    onSave({
      id: reminder?.id ?? newId(),
      vehicleId,
      type: type.trim(),
      dueDate: mode === 'date' ? dueDate : undefined,
      intervalKm: mode === 'interval' && intervalKm ? Number(intervalKm) : undefined,
      intervalMonths: mode === 'interval' && intervalMonths ? Number(intervalMonths) : undefined,
      lastDate: mode === 'interval' ? lastDate : (reminder?.lastDate ?? today()),
      lastOdometer: mode === 'interval' ? Number(lastOdometer) || 0 : (reminder?.lastOdometer ?? currentOdometer),
    });
  };

  return (
    <Modal title={reminder ? 'Edit reminder' : 'Add reminder'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>
          What
          <SelectOrOther required value={type} onChange={changeType} groups={REMINDER_GROUPS} otherPlaceholder="Name" />
        </label>

        <div className="segmented" role="radiogroup" aria-label="Reminder type">
          <button type="button" role="radio" aria-checked={mode === 'date'} onClick={() => setMode('date')}>
            On a date
          </button>
          <button type="button" role="radio" aria-checked={mode === 'interval'} onClick={() => setMode('interval')}>
            Every X km / months
          </button>
        </div>

        {mode === 'date' ? (
          <>
            <label>
              Due / expires on
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
            <div className="quick-actions">
              {[12, 24].map((m) => (
                <button key={m} type="button" className="btn small" onClick={() => setDueDate(addMonths(today(), m))}>
                  In {m / 12} year{m > 12 ? 's' : ''}
                </button>
              ))}
            </div>
            <p className="hint">For insurance, technical inspection, road tax… When you renew, edit the date or tap Renew.</p>
          </>
        ) : (
          <>
            <p className="hint">Resets when you log a service of this type, or one that replaced this part.</p>
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
          </>
        )}
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
