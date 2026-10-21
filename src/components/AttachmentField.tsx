import { useRef, useState } from 'react';
import { isImage, uploadAttachment, type Backend } from '../files';
import { t } from '../i18n';
import type { Attachment } from '../types';
import { Icon } from './Icon';

interface Props {
  value: Attachment[];
  onChange: (files: Attachment[]) => void;
  backend: Backend;
  label?: string;
}

/** Photos and PDFs for a record: take a picture or pick a file; tap a thumbnail to open it. */
export function AttachmentField({ value, onChange, backend, label }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError('');
    const added: Attachment[] = [];
    for (const file of Array.from(files)) {
      try {
        added.push(await uploadAttachment(file, backend));
      } catch (e) {
        setError((e as Error).message);
      }
    }
    onChange([...value, ...added]);
    setBusy(false);
  };

  return (
    <div className="field">
      <span>{label ?? t('Photos and receipts')}</span>
      <div className="attachments">
        {value.map((a) => (
          <div key={a.id} className="attachment">
            <a href={a.url} target="_blank" rel="noreferrer" title={a.name}>
              {isImage(a) ? <img src={a.url} alt={a.name} loading="lazy" /> : <span className="attachment-doc">PDF</span>}
            </a>
            <button type="button" aria-label={t('Remove {name}', { name: a.name })} onClick={() => onChange(value.filter((x) => x.id !== a.id))}>
              ×
            </button>
          </div>
        ))}
        <button type="button" className="attachment-add" onClick={() => input.current?.click()} disabled={busy}>
          <Icon name="plus" size={18} />
          <span>{busy ? t('Uploading…') : t('Add photo')}</span>
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*,application/pdf"
          multiple
          hidden
          onChange={(e) => {
            void add(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {error && <span className="hint warn">{error}</span>}
    </div>
  );
}
