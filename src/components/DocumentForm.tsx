import { useState, type FormEvent } from 'react';
import type { Backend } from '../files';
import { t } from '../i18n';
import { newId } from '../store';
import { CAR_DOCUMENT_TYPES, DOCUMENT_REMINDER, type CarDocument } from '../types';
import { AttachmentField } from './AttachmentField';
import { Modal } from './Modal';

interface Props {
  vehicleId: string;
  document?: CarDocument;
  backend: Backend;
  onSave: (d: CarDocument) => void;
  onClose: () => void;
}

export function DocumentForm({ vehicleId, document, backend, onSave, onClose }: Props) {
  const [type, setType] = useState(document?.type ?? CAR_DOCUMENT_TYPES[0]);
  const [number, setNumber] = useState(document?.number ?? '');
  const [issueDate, setIssueDate] = useState(document?.issueDate ?? '');
  const [expiryDate, setExpiryDate] = useState(document?.expiryDate ?? '');
  const [notes, setNotes] = useState(document?.notes ?? '');
  const [attachments, setAttachments] = useState(document?.attachments ?? []);
  const reminderType = DOCUMENT_REMINDER[type];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      id: document?.id ?? newId(),
      vehicleId,
      type,
      number: number.trim() || undefined,
      issueDate: issueDate || undefined,
      expiryDate: expiryDate || undefined,
      notes: notes.trim() || undefined,
      attachments: attachments.length ? attachments : undefined,
    });
  };

  return (
    <Modal title={document ? t('Edit document') : t('Add document')} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>
          {t('Document')}
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {CAR_DOCUMENT_TYPES.map((d) => (
              <option key={d} value={d}>
                {t(d)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('Number')}
          <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder={t('Policy or certificate number')} />
        </label>
        <div className="row">
          <label>
            {t('Issued on')}
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </label>
          <label>
            {t('Expires on')}
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </label>
        </div>
        {reminderType && expiryDate && (
          <p className="hint">{t('The "{name}" reminder will be set to this date.', { name: t(reminderType) })}</p>
        )}
        <AttachmentField value={attachments} onChange={setAttachments} backend={backend} label={t('Photos or scans')} />
        <label>
          {t('Notes')}
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('Insurer, agency, phone…')} />
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
