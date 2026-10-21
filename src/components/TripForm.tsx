import { useState, type FormEvent } from 'react';
import { distInput, distUnit, parseDist } from '../format';
import { t } from '../i18n';
import { newId, today } from '../store';
import { TRIP_PURPOSE_LABEL, TRIP_PURPOSES, type Trip, type TripPurpose } from '../types';
import { Modal } from './Modal';

interface Props {
  vehicleId: string;
  trip?: Trip;
  /** Places used before, offered as suggestions. */
  places: string[];
  driver?: string;
  onSave: (t: Trip) => void;
  onClose: () => void;
}

/** A journey: where, how far, and whether it was for work. The distance can come from two odometer readings. */
export function TripForm({ vehicleId, trip, places, driver, onSave, onClose }: Props) {
  const [date, setDate] = useState(trip?.date ?? today());
  const [from, setFrom] = useState(trip?.from ?? '');
  const [to, setTo] = useState(trip?.to ?? '');
  const [distance, setDistance] = useState(distInput(trip?.distance));
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [purpose, setPurpose] = useState<TripPurpose>(trip?.purpose ?? 'work');
  const [notes, setNotes] = useState(trip?.notes ?? '');

  const fromOdometer = (s: string, e: string) => {
    if (s && e && Number(e) > Number(s)) setDistance(String(Number(e) - Number(s)));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      id: trip?.id ?? newId(),
      vehicleId,
      date,
      from: from.trim() || undefined,
      to: to.trim() || undefined,
      distance: parseDist(distance),
      purpose,
      notes: notes.trim() || undefined,
      driver: trip ? trip.driver : driver,
    });
  };

  return (
    <Modal title={trip ? 'Edit trip' : 'Add trip'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <div className="segmented" role="radiogroup" aria-label={t('Purpose')}>
          {TRIP_PURPOSES.map((p) => (
            <button key={p} type="button" role="radio" aria-checked={purpose === p} onClick={() => setPurpose(p)}>
              {t(TRIP_PURPOSE_LABEL[p])}
            </button>
          ))}
        </div>
        <div className="row">
          <label>
            {t('From')}
            <input list="trip-places" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Tunis" />
          </label>
          <label>
            {t('To')}
            <input list="trip-places" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Sousse" />
          </label>
        </div>
        <datalist id="trip-places">
          {places.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <div className="row">
          <label>
            {t('Date')}
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            {t('Distance ({unit})', { unit: distUnit() })}
            <input type="number" min="1" required value={distance} onChange={(e) => setDistance(e.target.value)} />
          </label>
        </div>
        {!trip && (
          <div className="row">
            <label>
              {t('Odometer at start')}
              <input
                type="number"
                min="0"
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  fromOdometer(e.target.value, end);
                }}
              />
            </label>
            <label>
              {t('Odometer at end')}
              <input
                type="number"
                min="0"
                value={end}
                onChange={(e) => {
                  setEnd(e.target.value);
                  fromOdometer(start, e.target.value);
                }}
              />
            </label>
          </div>
        )}
        <label>
          {t('Notes')}
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('Client, reason, tolls…')} />
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
