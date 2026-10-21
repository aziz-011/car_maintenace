import { useState, type FormEvent } from 'react';
import { distInput, distUnit, parseDist } from '../format';
import { t } from '../i18n';
import { newId, today } from '../store';
import { TIRE_SEASON_LABEL, TIRE_SEASONS, type TireSet } from '../types';
import { Modal } from './Modal';

interface Props {
  vehicleId: string;
  tire?: TireSet;
  currentOdometer: number;
  onSave: (t: TireSet) => void;
  onClose: () => void;
}

/** Fitting a new set of tires, or editing one: brand, size, when and at what odometer. */
export function TireForm({ vehicleId, tire, currentOdometer, onSave, onClose }: Props) {
  const [brand, setBrand] = useState(tire?.brand ?? '');
  const [model, setModel] = useState(tire?.model ?? '');
  const [size, setSize] = useState(tire?.size ?? '');
  const [season, setSeason] = useState(tire?.season ?? 'summer');
  const [fittedDate, setFittedDate] = useState(tire?.fittedDate ?? today());
  const [fittedKm, setFittedKm] = useState(distInput(tire?.fittedOdometer ?? currentOdometer));
  const [notes, setNotes] = useState(tire?.notes ?? '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      ...tire,
      id: tire?.id ?? newId(),
      vehicleId,
      brand: brand.trim(),
      model: model.trim() || undefined,
      size: size.trim() || undefined,
      season,
      fittedDate,
      fittedOdometer: parseDist(fittedKm),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal title={tire ? t('Edit tires') : t('Fit new tires')} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <div className="row">
          <label>
            {t('Brand')}
            <input required value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Michelin" />
          </label>
          <label>
            {t('Model')}
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Primacy 4" />
          </label>
        </div>
        <div className="row">
          <label>
            {t('Size')}
            <input value={size} onChange={(e) => setSize(e.target.value)} placeholder="195/65 R15 91H" />
          </label>
          <label>
            {t('Season')}
            <select value={season} onChange={(e) => setSeason(e.target.value as TireSet['season'])}>
              {TIRE_SEASONS.map((s) => (
                <option key={s} value={s}>
                  {t(TIRE_SEASON_LABEL[s])}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="row">
          <label>
            {t('Fitted on')}
            <input type="date" required value={fittedDate} onChange={(e) => setFittedDate(e.target.value)} />
          </label>
          <label>
            {t('At odometer ({unit})', { unit: distUnit() })}
            <input type="number" min="0" required value={fittedKm} onChange={(e) => setFittedKm(e.target.value)} />
          </label>
        </div>
        <p className="hint">{t('The size is written on the tire sidewall, e.g. 195/65 R15 91H.')}</p>
        <label>
          {t('Notes')}
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('Shop, price, tread depth…')} />
        </label>
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
