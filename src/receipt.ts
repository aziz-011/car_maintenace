import type { Backend } from './files';
import { t } from './i18n';

/** What a fuel receipt says; anything not printed on it stays empty. */
export interface ReceiptFields {
  date?: string;
  liters?: number;
  pricePerLiter?: number;
  total?: number;
  station?: string;
  odometer?: number;
}

/**
 * The instruction sent with the photo, the same on claude.ai and on the
 * home server. Known station brands are listed so the name matches the
 * dropdown.
 */
export function receiptPrompt(stations: readonly string[]): string {
  return `This image is a photo of a fuel station receipt (it may be in French or Arabic, often from Tunisia).
Read it and reply with only a JSON object with these keys:
- "date": the purchase date as YYYY-MM-DD, or null
- "liters": the quantity of fuel in liters, as a number, or null
- "price_per_liter": the unit price per liter, as a number, or null
- "total": the total amount paid, as a number, or null
- "station": the station brand. If it is one of these, use exactly this spelling: ${stations.join(', ')}. Otherwise the name as printed, or null.
- "odometer": the vehicle odometer (kilometrage) if the receipt shows one, as a whole number, or null
Numbers use a dot as the decimal separator and no thousands separator. Tunisian dinar amounts often have three decimals (e.g. 2.525). Use null for anything you cannot read with confidence; do not guess.
Example: {"date":"2026-03-05","liters":40.5,"price_per_liter":2.525,"total":102.263,"station":"Agil","odometer":null}`;
}

/** The same keys as a JSON schema, for the home server's structured output. */
export const RECEIPT_SCHEMA = {
  type: 'object',
  properties: {
    date: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    liters: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    price_per_liter: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    total: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    station: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    odometer: { anyOf: [{ type: 'number' }, { type: 'null' }] },
  },
  required: ['date', 'liters', 'price_per_liter', 'total', 'station', 'odometer'],
  additionalProperties: false,
};

const positive = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined);

/** Keeps only values that make sense, so a misread never fills a field with nonsense. */
export function cleanReceipt(raw: unknown): ReceiptFields {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const date = typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && !Number.isNaN(Date.parse(r.date)) ? r.date : undefined;
  const station = typeof r.station === 'string' && r.station.trim() ? r.station.trim().slice(0, 60) : undefined;
  const odometer = positive(r.odometer);
  return {
    date,
    liters: positive(r.liters),
    pricePerLiter: positive(r.price_per_liter),
    total: positive(r.total),
    station,
    odometer: odometer ? Math.round(odometer) : undefined,
  };
}

/** Whether this version of the app can read receipts: claude.ai always can; the home server needs an AI key. */
export async function canReadReceipts(backend: Backend): Promise<boolean> {
  if (backend === 'cloud') {
    const sample = await window.claude?.use('sample');
    const limits = await sample?.limits().catch(() => null);
    return !!limits?.images;
  }
  if (backend === 'server') {
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      return !!(await res.json()).ai?.hasKey;
    } catch {
      return false;
    }
  }
  return false;
}

/** Reads a receipt photo (already shrunk to a JPEG). */
export async function readReceipt(photo: Blob, backend: Backend, stations: readonly string[]): Promise<ReceiptFields> {
  if (backend === 'cloud') {
    const sample = await window.claude?.use('sample');
    if (!sample) throw new Error(t('Reading receipts is not available here.'));
    try {
      return cleanReceipt(await sample.json(receiptPrompt(stations), { images: [photo], cache: false }));
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'cancelled' || code === 'declined' || code === 'not_granted') throw new Error(t('Reading the receipt was cancelled.'));
      throw new Error(t('Could not read this receipt. Try a sharper photo, or fill in the fields.'));
    }
  }
  const res = await fetch('/api/scan', { method: 'POST', headers: { 'Content-Type': photo.type || 'image/jpeg' }, body: photo });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? t('Could not read this receipt. Try a sharper photo, or fill in the fields.'));
  return cleanReceipt(body);
}
