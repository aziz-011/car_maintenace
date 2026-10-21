import { useState, type FormEvent } from 'react';
import { distInput, distUnit, fmtKm, parseDist } from '../format';
import { newId, today } from '../store';
import type { OdometerReading } from '../types';
import { Modal } from './Modal';
import { t } from '../i18n';

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
  const value = parseDist(odometer);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({ id: newId(), vehicleId, date, odometer: value });
  };

  return (
    <Modal title={t('Update odometer')} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>
          {t('Odometer now ({unit})', { unit: distUnit() })}
          <input
            type="number"
            inputMode="numeric"
            min="0"
            required
            autoFocus
            value={odometer}
            placeholder={distInput(currentOdometer)}
            onChange={(e) => setOdometer(e.target.value)}
          />
        </label>
        {odometer && value < currentOdometer && (
          <p className="hint warn">{t('Lower than the last known reading ({km}).', { km: fmtKm(currentOdometer) })}</p>
        )}
        {odometer && value > currentOdometer && (
          <p className="hint">{t('{km} since the last reading.', { km: fmtKm(value - currentOdometer) })}</p>
        )}
        <label>
          {t('Date')}
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <p className="hint">{t('A reading every week or so lets the app estimate when the next oil change is due.')}</p>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            {t('Cancel')}
          </button>
          <button className="btn primary">{t('Save')}</button>
        </div>
      </form>
    </Modal>
  );
}
