import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FUEL_STATIONS } from '../data/vehicles';
import { newId, today } from '../store';
import type { FuelEntry } from '../types';
import { distInput, distUnit, fmtKm, parseDist } from '../format';
import { compressImage, uploadAttachment, type Backend } from '../files';
import { canReadReceipts, readReceipt } from '../receipt';
import { Icon } from './Icon';
import { AttachmentField } from './AttachmentField';
import { Modal } from './Modal';
import { SelectOrOther } from './SelectOrOther';
import { t } from '../i18n';

interface Props {
  vehicleId: string;
  entry?: FuelEntry;
  minOdometer: number;
  onSave: (e: FuelEntry) => void;
  onClose: () => void;
  backend: Backend;
  /** The car's latest fill-up: a new one starts with the same station and price. */
  previous?: FuelEntry;
  /** Who is logging it, for shared use. */
  driver?: string;
  /** Opened from the receipt shortcut: ask for the photo straight away. */
  scanFirst?: boolean;
}

export function FuelForm({ vehicleId, entry, minOdometer, onSave, onClose, backend, previous, driver, scanFirst }: Props) {
  const [date, setDate] = useState(entry?.date ?? today());
  const [odometer, setOdometer] = useState(distInput(entry?.odometer) ?? '');
  const [liters, setLiters] = useState(entry?.liters.toString() ?? '');
  const [price, setPrice] = useState(
    entry ? (entry.totalCost / entry.liters).toFixed(3) : previous && previous.liters > 0 ? (previous.totalCost / previous.liters).toFixed(3) : '',
  );
  const [total, setTotal] = useState(entry?.totalCost.toString() ?? '');
  const [fullTank, setFullTank] = useState(entry?.fullTank ?? true);
  const [station, setStation] = useState(entry?.station ?? previous?.station ?? '');
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [attachments, setAttachments] = useState(entry?.attachments ?? []);
  const [canScan, setCanScan] = useState(false);
  const [scan, setScan] = useState<{ busy: boolean; message?: string; warn?: boolean }>({ busy: false });
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let off = false;
    void canReadReceipts(backend).then((ok) => {
      if (off) return;
      setCanScan(ok);
      if (ok && scanFirst && !entry) photoInput.current?.click();
    });
    return () => {
      off = true;
    };
  }, [backend, scanFirst, entry]);

  /** Fills the form from a receipt photo and keeps the photo with the entry. */
  const scanReceipt = async (file: File) => {
    setScan({ busy: true, message: t('Reading the receipt…') });
    try {
      const photo = await compressImage(file);
      const [fields, attachment] = await Promise.all([
        readReceipt(photo, backend, FUEL_STATIONS),
        uploadAttachment(new File([photo], file.name, { type: photo.type || file.type }), backend).catch(() => null),
      ]);
      if (attachment) setAttachments((list) => [...list, attachment]);
      const found: string[] = [];
      if (fields.date) {
        setDate(fields.date);
        found.push(t('date'));
      }
      if (fields.station) {
        setStation(fields.station);
        found.push(t('station'));
      }
      if (fields.odometer && !odometer) {
        setOdometer(distInput(fields.odometer));
        found.push(t('odometer'));
      }
      const l = fields.liters ?? (fields.total && fields.pricePerLiter ? fields.total / fields.pricePerLiter : undefined);
      const p = fields.pricePerLiter ?? (fields.total && l ? fields.total / l : undefined);
      const tot = fields.total ?? (l && p ? l * p : undefined);
      if (l) setLiters(String(Math.round(l * 100) / 100));
      if (p) setPrice(p.toFixed(3));
      if (tot) setTotal(String(Math.round(tot * 1000) / 1000));
      if (l || tot) found.push(t('liters and price'));
      setScan(
        found.length
          ? { busy: false, message: t('Filled in from the receipt: {fields}. Check them before saving.', { fields: found.join(', ') }) }
          : { busy: false, message: t('Nothing could be read on this photo. Try a sharper one, or fill in the fields.'), warn: true },
      );
    } catch (e) {
      setScan({ busy: false, message: (e as Error).message, warn: true });
    }
  };

  // Keep price/L and total in sync: editing one recomputes the other.
  const onLiters = (v: string) => {
    setLiters(v);
    if (price && v) setTotal(String(Math.round(Number(v) * Number(price) * 1000) / 1000));
  };
  const onPrice = (v: string) => {
    setPrice(v);
    if (liters && v) setTotal(String(Math.round(Number(liters) * Number(v) * 1000) / 1000));
  };
  const onTotal = (v: string) => {
    setTotal(v);
    if (liters && v && Number(liters) > 0) setPrice((Number(v) / Number(liters)).toFixed(3));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      id: entry?.id ?? newId(),
      vehicleId,
      date,
      odometer: parseDist(odometer),
      liters: Number(liters),
      totalCost: Number(total),
      fullTank,
      station: station.trim() || undefined,
      notes: notes.trim() || undefined,
      attachments: attachments.length ? attachments : undefined,
      driver: entry ? entry.driver : driver,
    });
  };

  const odo = parseDist(odometer);
  const odoWarning = !entry && odometer && odo < minOdometer;

  return (
    <Modal title={entry ? 'Edit fill-up' : 'Add fill-up'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        {canScan && !entry && (
          <div className="scan">
            <button type="button" className="btn" onClick={() => photoInput.current?.click()} disabled={scan.busy}>
              <Icon name="camera" size={18} /> {scan.busy ? t('Reading the receipt…') : t('Fill in from a receipt photo')}
            </button>
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void scanReceipt(file);
                e.target.value = '';
              }}
            />
            {scan.message && !scan.busy && <p className={`hint${scan.warn ? ' warn' : ''}`}>{scan.message}</p>}
          </div>
        )}
        <div className="row">
          <label>
            {t('Date')}
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            {t('Odometer ({unit})', { unit: distUnit() })}
            <input
              type="number"
              min="0"
              required
              value={odometer}
              placeholder={distInput(minOdometer)}
              onChange={(e) => setOdometer(e.target.value)}
            />
          </label>
        </div>
        {odoWarning && <p className="hint warn">{t('Lower than the last known reading ({km}).', { km: fmtKm(minOdometer) })}</p>}
        <div className="row three">
          <label>
            {t('Liters')}
            <input type="number" step="0.01" min="0.01" required value={liters} onChange={(e) => onLiters(e.target.value)} />
          </label>
          <label>
            {t('Price / L')}
            <input type="number" step="0.001" min="0" value={price} onChange={(e) => onPrice(e.target.value)} />
          </label>
          <label>
            {t('Total')}
            <input type="number" step="0.001" min="0" required value={total} onChange={(e) => onTotal(e.target.value)} />
          </label>
        </div>
        <label className="check">
          <input type="checkbox" checked={fullTank} onChange={(e) => setFullTank(e.target.checked)} />
          {t('Filled the tank completely')}
        </label>
        <p className="hint">{t('Consumption is calculated between two full-tank fill-ups.')}</p>
        <label>
          {t('Station')}
          <SelectOrOther value={station} onChange={setStation} options={FUEL_STATIONS} placeholder="—" otherPlaceholder={t('Station name')} />
        </label>
        <label>
          {t('Notes')}
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
