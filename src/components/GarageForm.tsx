import { useState, type FormEvent } from 'react';
import { t } from '../i18n';
import { newId } from '../store';
import type { Garage } from '../types';
import { Modal } from './Modal';

interface Props {
  garage?: Garage;
  onSave: (g: Garage) => void;
  onClose: () => void;
}

export function GarageForm({ garage, onSave, onClose }: Props) {
  const [name, setName] = useState(garage?.name ?? '');
  const [phone, setPhone] = useState(garage?.phone ?? '');
  const [address, setAddress] = useState(garage?.address ?? '');
  const [rating, setRating] = useState(garage?.rating ?? 0);
  const [notes, setNotes] = useState(garage?.notes ?? '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      id: garage?.id ?? newId(),
      name: name.trim(),
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      rating: rating || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal title={garage ? 'Edit garage' : 'Add garage'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>
          {t('Name')}
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Garage or mechanic')} />
        </label>
        <div className="row">
          <label>
            {t('Phone')}
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+216 …" />
          </label>
          <label>
            {t('Address')}
            <input value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
        </div>
        <div className="field">
          <span>{t('Your rating')}</span>
          <div className="stars" role="radiogroup" aria-label={t('Your rating')}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={t('{n} out of 5', { n })}
                className={n <= rating ? 'on' : ''}
                onClick={() => setRating(rating === n ? 0 : n)}
              >
                ★
              </button>
            ))}
          </div>
        </div>
        <label>
          {t('Notes')}
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('Specialities, opening hours, who to ask for…')} />
        </label>
        <p className="hint">{t('Services are linked to a garage by the name typed in their Garage field.')}</p>
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
