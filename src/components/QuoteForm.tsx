import { useState, type FormEvent } from 'react';
import { t } from '../i18n';
import { newId, today } from '../store';
import { SERVICE_TYPES, type Garage, type Quote } from '../types';
import { Modal } from './Modal';
import { SelectOrOther } from './SelectOrOther';

interface Props {
  vehicleId: string;
  quote?: Quote;
  garages: Garage[];
  /** Prefill the job, to add another garage's price for it. */
  job?: string;
  onSave: (q: Quote) => void;
  onAddGarage: () => void;
  onClose: () => void;
}

/** A price a garage asked for a job, to compare before choosing. */
export function QuoteForm({ vehicleId, quote, garages, job: initialJob, onSave, onAddGarage, onClose }: Props) {
  const [garageId, setGarageId] = useState(quote?.garageId ?? garages[0]?.id ?? '');
  const [job, setJob] = useState(quote?.job ?? initialJob ?? '');
  const [amount, setAmount] = useState(quote?.amount.toString() ?? '');
  const [date, setDate] = useState(quote?.date ?? today());
  const [notes, setNotes] = useState(quote?.notes ?? '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      ...quote,
      id: quote?.id ?? newId(),
      vehicleId,
      garageId,
      job: job.trim(),
      amount: Number(amount),
      date,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal title={quote ? 'Edit quote' : 'Add quote'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        {garages.length === 0 ? (
          <div className="notice">
            <span>{t('Add the garage first.')}</span>
            <button type="button" className="btn small primary" onClick={onAddGarage}>
              {t('Add garage')}
            </button>
          </div>
        ) : (
          <label>
            {t('Garage')}
            <select required value={garageId} onChange={(e) => setGarageId(e.target.value)}>
              {garages.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          {t('Job')}
          <SelectOrOther required value={job} onChange={setJob} options={SERVICE_TYPES} otherPlaceholder={t('e.g. Clutch kit')} />
        </label>
        <div className="row">
          <label>
            {t('Price asked')}
            <input type="number" min="0" step="0.001" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label>
            {t('Date')}
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <label>
          {t('Notes')}
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('Parts brand, warranty, how long it takes…')} />
        </label>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            {t('Cancel')}
          </button>
          <button className="btn primary" disabled={!garageId}>
            {t('Save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
