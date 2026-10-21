import { useState, type FormEvent } from 'react';
import { distInput, distUnit, fmtDate, parseDist } from '../format';
import type { Backend } from '../files';
import { t } from '../i18n';
import { newId, today } from '../store';
import { ISSUE_KIND_LABEL, ISSUE_KINDS, WARNING_LIGHTS, type Issue, type IssueKind, type ServiceEntry } from '../types';
import { AttachmentField } from './AttachmentField';
import { Modal } from './Modal';
import { SelectOrOther } from './SelectOrOther';

interface Props {
  vehicleId: string;
  issue?: Issue;
  currentOdometer: number;
  /** This car's services, to link the repair that fixed it. */
  services: ServiceEntry[];
  backend: Backend;
  onSave: (i: Issue) => void;
  onClose: () => void;
}

/** A warning light, noise, fault code or leak, and later the repair that fixed it. */
export function IssueForm({ vehicleId, issue, currentOdometer, services, backend, onSave, onClose }: Props) {
  const [kind, setKind] = useState<IssueKind>(issue?.kind ?? 'warning-light');
  const [title, setTitle] = useState(issue?.title ?? '');
  const [code, setCode] = useState(issue?.code ?? '');
  const [date, setDate] = useState(issue?.date ?? today());
  const [odometer, setOdometer] = useState(distInput(issue?.odometer ?? currentOdometer));
  const [notes, setNotes] = useState(issue?.notes ?? '');
  const [fixedBy, setFixedBy] = useState(issue?.fixedByServiceId ?? '');
  const [fixedDate, setFixedDate] = useState(issue?.fixedDate ?? '');
  const [attachments, setAttachments] = useState(issue?.attachments ?? []);

  // Repairs on or after the day it was noticed, newest first.
  const repairs = services.filter((s) => s.date >= date).sort((a, b) => b.date.localeCompare(a.date));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const service = services.find((s) => s.id === fixedBy);
    onSave({
      id: issue?.id ?? newId(),
      vehicleId,
      date,
      odometer: parseDist(odometer),
      kind,
      title: title.trim(),
      code: code.trim().toUpperCase() || undefined,
      notes: notes.trim() || undefined,
      fixedByServiceId: service?.id,
      fixedDate: service?.date ?? (fixedDate || undefined),
      attachments: attachments.length ? attachments : undefined,
    });
  };

  return (
    <Modal title={issue ? 'Edit fault' : 'Log a fault'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>
          {t('Kind')}
          <select value={kind} onChange={(e) => setKind(e.target.value as IssueKind)}>
            {ISSUE_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(ISSUE_KIND_LABEL[k])}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('What happens')}
          {kind === 'warning-light' ? (
            <SelectOrOther required value={title} onChange={setTitle} options={WARNING_LIGHTS} otherPlaceholder={t('Which light')} />
          ) : (
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('e.g. Squeak when braking')} />
          )}
        </label>
        {(kind === 'fault-code' || kind === 'warning-light') && (
          <label>
            {t('Fault code (optional)')}
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="P0401" autoCapitalize="characters" />
          </label>
        )}
        <div className="row">
          <label>
            {t('Noticed on')}
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            {t('Odometer ({unit})', { unit: distUnit() })}
            <input type="number" min="0" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
          </label>
        </div>
        <label>
          {t('Notes')}
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('When it happens: cold start, braking, at speed…')} />
        </label>
        <label>
          {t('Fixed by')}
          <select value={fixedBy} onChange={(e) => setFixedBy(e.target.value)}>
            <option value="">{t('Not fixed yet')}</option>
            {repairs.map((s) => (
              <option key={s.id} value={s.id}>
                {fmtDate(s.date)} · {t(s.type)}
                {s.shop ? ` · ${s.shop}` : ''}
              </option>
            ))}
          </select>
        </label>
        {!fixedBy && (
          <label>
            {t('Or gone by itself on')}
            <input type="date" value={fixedDate} onChange={(e) => setFixedDate(e.target.value)} />
          </label>
        )}
        <AttachmentField value={attachments} onChange={setAttachments} backend={backend} label={t('Photos or video stills')} />
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
