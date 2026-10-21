import { useState, type FormEvent } from 'react';
import { newId, today } from '../store';
import { COMPONENT_GROUPS, SERVICE_TYPES, type ServiceEntry } from '../types';
import { distInput, distUnit, parseDist } from '../format';
import type { Backend } from '../files';
import { AttachmentField } from './AttachmentField';
import { Modal } from './Modal';
import { PartsPicker } from './PartsPicker';
import { SelectOrOther } from './SelectOrOther';
import { t } from '../i18n';

interface Props {
  vehicleId: string;
  entry?: ServiceEntry;
  currentOdometer: number;
  onSave: (e: ServiceEntry) => void;
  onClose: () => void;
  backend: Backend;
}

export function ServiceForm({ vehicleId, entry, currentOdometer, onSave, onClose, backend }: Props) {
  const [date, setDate] = useState(entry?.date ?? today());
  const [odometer, setOdometer] = useState(distInput(entry?.odometer) ?? distInput(currentOdometer));
  const [type, setType] = useState(entry?.type ?? SERVICE_TYPES[0]);
  const [parts, setParts] = useState<string[]>(entry?.parts ?? []);
  const [cost, setCost] = useState(entry?.cost.toString() ?? '');
  const [shop, setShop] = useState(entry?.shop ?? '');
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [attachments, setAttachments] = useState(entry?.attachments ?? []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      id: entry?.id ?? newId(),
      vehicleId,
      date,
      odometer: parseDist(odometer),
      type: type.trim(),
      parts: parts.length ? parts : undefined,
      cost: Number(cost) || 0,
      shop: shop.trim() || undefined,
      notes: notes.trim() || undefined,
      attachments: attachments.length ? attachments : undefined,
    });
  };

  return (
    <Modal title={entry ? 'Edit service' : 'Add service'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>
          {t('Service')}
          <SelectOrOther required value={type} onChange={setType} options={SERVICE_TYPES} otherPlaceholder={t('Service name')} />
        </label>
        <div className="field">
          <span>{t('Parts replaced')}</span>
          <PartsPicker value={parts} onChange={setParts} groups={COMPONENT_GROUPS} />
        </div>
        <div className="row">
          <label>
            {t('Date')}
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            {t('Odometer ({unit})', { unit: distUnit() })}
            <input type="number" min="0" required value={odometer} onChange={(e) => setOdometer(e.target.value)} />
          </label>
        </div>
        <div className="row">
          <label>
            {t('Cost')}
            <input type="number" step="0.01" min="0" value={cost} onChange={(e) => setCost(e.target.value)} />
          </label>
          <label>
            {t('Shop / garage')}
            <input value={shop} onChange={(e) => setShop(e.target.value)} />
          </label>
        </div>
        <label>
          {t('Notes')}
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('Oil grade, part brands…')} />
        </label>
        <AttachmentField value={attachments} onChange={setAttachments} backend={backend} />
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
