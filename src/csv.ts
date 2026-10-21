import { distUnit, fromUserDist, toUserDist } from './format';
import { t } from './i18n';
import { newId } from './storeShared';
import { TRIP_PURPOSES, type FuelEntry, type Prefs, type ServiceEntry, type Trip, type TripPurpose } from './types';

/**
 * Spreadsheet export and import. Files open directly in Excel: French uses
 * ";" between columns and a decimal comma, English "," and a decimal point.
 * Imports accept either, and column names in English or French.
 */

export interface CsvFormat {
  sep: ';' | ',';
  decimal: ',' | '.';
}

export const csvFormat = (language: Prefs['language']): CsvFormat => (language === 'fr' ? { sep: ';', decimal: ',' } : { sep: ',', decimal: '.' });

type Cell = string | number | boolean | null | undefined;

function cell(value: Cell, f: CsvFormat): string {
  if (value == null) return '';
  let s: string;
  if (typeof value === 'number') s = String(Math.round(value * 1000) / 1000).replace('.', f.decimal);
  else if (typeof value === 'boolean') s = value ? t('yes') : t('no');
  else s = value;
  return /["\r\n]/.test(s) || s.includes(f.sep) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** A CSV file's text, with a byte-order mark so Excel reads accents correctly. */
export function toCsv(header: string[], rows: Cell[][], f: CsvFormat): string {
  return '\uFEFF' + [header, ...rows].map((r) => r.map((c) => cell(c, f)).join(f.sep)).join('\r\n') + '\r\n';
}

const dist = (km: number) => Math.round(toUserDist(km));

export function fuelCsv(entries: FuelEntry[], f: CsvFormat, names: (driver?: string) => string = (d) => d ?? ''): string {
  const unit = distUnit();
  const rows = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date) || a.odometer - b.odometer)
    .map((e) => [e.date, dist(e.odometer), e.liters, e.liters > 0 ? e.totalCost / e.liters : null, e.totalCost, e.fullTank, e.station, names(e.driver), e.notes]);
  return toCsv(
    [t('Date'), `${t('Odometer')} (${unit})`, t('Liters'), t('Price / L'), t('Total'), t('Full tank'), t('Station'), t('Driver'), t('Notes')],
    rows,
    f,
  );
}

export function servicesCsv(entries: ServiceEntry[], f: CsvFormat, names: (driver?: string) => string = (d) => d ?? ''): string {
  const unit = distUnit();
  const rows = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date) || a.odometer - b.odometer)
    .map((e) => [e.date, dist(e.odometer), t(e.type), (e.parts ?? []).map((p) => t(p)).join(' | '), e.cost, e.shop, names(e.driver), e.notes]);
  return toCsv(
    [t('Date'), `${t('Odometer')} (${unit})`, t('Service'), t('Parts replaced'), t('Cost'), t('Garage'), t('Driver'), t('Notes')],
    rows,
    f,
  );
}

export function tripsCsv(trips: Trip[], f: CsvFormat, names: (driver?: string) => string = (d) => d ?? ''): string {
  const unit = distUnit();
  const rows = [...trips]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => [e.date, e.from, e.to, dist(e.distance), t(e.purpose === 'work' ? 'Work' : 'Personal'), names(e.driver), e.notes]);
  return toCsv([t('Date'), t('From'), t('To'), `${t('Distance')} (${unit})`, t('Purpose'), t('Driver'), t('Notes')], rows, f);
}

/** Splits CSV text into rows, guessing the column separator from the first line. */
export function parseCsv(text: string): string[][] {
  text = text.replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const sep = [';', '\t', ','].map((s) => ({ s, n: firstLine.split(s).length })).sort((a, b) => b.n - a.n)[0].s;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === sep) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows.map((r) => r.map((x) => x.trim()));
}

/** Lowercase without accents or punctuation, for matching column names. */
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9/]+/g, ' ')
    .trim();

const COLUMNS: Record<string, string[]> = {
  date: ['date', 'jour', 'day'],
  odometer: ['odometer', 'odo', 'km', 'mi', 'mileage', 'kilometrage', 'compteur', 'kilometres', 'odometre', 'releve'],
  liters: ['liters', 'litres', 'liter', 'litre', 'l', 'volume', 'quantity', 'quantite', 'qty'],
  price: ['price / l', 'price/l', 'price per liter', 'price per litre', 'prix / l', 'prix/l', 'prix au litre', 'prix du litre', 'unit price', 'prix unitaire', 'price'],
  total: ['total', 'cost', 'amount', 'montant', 'cout', 'prix total', 'total cost', 'paid', 'paye', 'prix'],
  full: ['full tank', 'full', 'plein', 'plein complet', 'reservoir plein'],
  station: ['station', 'brand', 'fournisseur', 'marque', 'gas station'],
  notes: ['notes', 'note', 'comment', 'comments', 'commentaire', 'commentaires', 'remarque', 'remarques'],
  service: ['service', 'intervention', 'prestation', 'operation', 'work', 'travaux', 'type'],
  parts: ['parts replaced', 'parts', 'pieces remplacees', 'pieces'],
  garage: ['garage', 'shop', 'atelier', 'mechanic', 'mecanicien', 'shop / garage'],
  from: ['from', 'start', 'de', 'depart', 'origine'],
  to: ['to', 'end', 'a', 'arrivee', 'destination'],
  distance: ['distance', 'trajet', 'km parcourus', 'kilometres parcourus'],
  purpose: ['purpose', 'motif', 'usage', 'nature', 'category', 'categorie'],
  driver: ['driver', 'conducteur', 'chauffeur', 'by', 'par'],
};

/** Which known column each header is; the first exact match wins, so "Price / L" is not read as a total. */
function mapHeader(header: string[]): Record<string, number> {
  const found: Record<string, number> = {};
  header.forEach((h, i) => {
    const n = norm(h);
    for (const [key, names] of Object.entries(COLUMNS)) {
      if (key in found) continue;
      if (names.includes(n)) {
        found[key] = i;
        return;
      }
    }
  });
  return found;
}

/** "1 234,5", "1,234.5", "2,525" (Tunisian dinars) and "12.5 L" all read as numbers. */
export function parseNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  let s = raw.replace(/[\s\u00a0\u202f]/g, '').replace(/[^\d.,-]/g, '');
  if (!/\d/.test(s)) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    // The separator that comes last is the decimal one.
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma !== -1) {
    s = (s.match(/,/g)!.length > 1 ? s.replace(/,/g, '') : s.replace(',', '.'));
  } else if (lastDot !== -1 && s.match(/\./g)!.length > 1) {
    s = s.replace(/\./g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** An odometer is a whole number, so "281.850" or "281,850" is 281850, not 281.85. */
function parseOdometer(raw: string | undefined): number | null {
  if (raw && /^\s*\d{1,3}([.,\s\u00a0\u202f]\d{3})+\s*\D*$/.test(raw)) return Number(raw.replace(/\D/g, ''));
  const n = parseNumber(raw);
  return n == null ? null : Math.round(n);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Day-first unless the file shows otherwise (a second part above 12). Excel serial numbers work too. */
function dateReader(values: string[]): (raw: string) => string | null {
  const parts = values.map((v) => /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(v.trim())).filter(Boolean) as RegExpExecArray[];
  const monthFirst = parts.some((p) => Number(p[2]) > 12) && !parts.some((p) => Number(p[1]) > 12);
  return (raw) => {
    const v = raw.trim();
    let m = /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/.exec(v);
    if (m) return valid(Number(m[1]), Number(m[2]), Number(m[3]));
    m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(v);
    if (m) {
      const year = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
      return monthFirst ? valid(year, Number(m[1]), Number(m[2])) : valid(year, Number(m[2]), Number(m[1]));
    }
    if (/^\d{5}(\.\d+)?$/.test(v)) return new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(v)) * 86_400_000).toISOString().slice(0, 10);
    return null;
  };
}

function valid(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1950 || y > 2100) return null;
  const iso = `${y}-${pad(m)}-${pad(d)}`;
  return new Date(iso).toISOString().slice(0, 10) === iso ? iso : null;
}

const YES = ['yes', 'y', 'oui', 'o', 'true', 'vrai', '1', 'x', '✓', 'full', 'plein'];
const NO = ['no', 'n', 'non', 'false', 'faux', '0', 'partial', 'partiel'];

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  const v = norm(raw ?? '');
  return YES.includes(v) || raw?.trim() === '✓' ? true : NO.includes(v) ? false : fallback;
}

function parsePurpose(raw: string | undefined): TripPurpose {
  const v = norm(raw ?? '');
  if (TRIP_PURPOSES.includes(v as TripPurpose)) return v as TripPurpose;
  return ['travail', 'pro', 'professionnel', 'professional', 'business', 'boulot'].includes(v) ? 'work' : 'personal';
}

export type CsvImport =
  | { kind: 'fuel'; items: FuelEntry[]; skipped: number }
  | { kind: 'services'; items: ServiceEntry[]; skipped: number }
  | { kind: 'trips'; items: Trip[]; skipped: number };

/**
 * Reads fill-ups, services or trips from a spreadsheet, for one car. The kind
 * of file is recognised from its columns. Distances are in the chosen unit,
 * unless a column name says "(km)" or "(mi)". Returns null when the columns
 * are not recognised.
 */
export function importCsv(text: string, vehicleId: string): CsvImport | null {
  const [header, ...rows] = parseCsv(text);
  if (!header || rows.length === 0) return null;
  const col = mapHeader(header);
  const get = (row: string[], key: string) => (key in col ? row[col[key]] : undefined);
  const unitOf = (key: string) => {
    const h = key in col ? header[col[key]].toLowerCase() : '';
    return /\(\s*mi/.test(h) ? 'mi' : /\(\s*km/.test(h) ? 'km' : null;
  };
  const toKm = (value: number, key: string) => {
    const unit = unitOf(key);
    return Math.round(unit === 'mi' ? value * 1.609344 : unit === 'km' ? value : fromUserDist(value));
  };
  if (!('date' in col)) return null;
  const readDate = dateReader(rows.map((r) => get(r, 'date') ?? ''));
  let skipped = 0;
  const str = (row: string[], key: string) => get(row, key)?.trim() || undefined;

  if ('liters' in col) {
    const items: FuelEntry[] = [];
    for (const row of rows) {
      const date = readDate(get(row, 'date') ?? '');
      const odometer = parseOdometer(get(row, 'odometer'));
      let liters = parseNumber(get(row, 'liters'));
      const price = parseNumber(get(row, 'price'));
      let total = parseNumber(get(row, 'total'));
      if (total == null && liters != null && price != null) total = liters * price;
      if (liters == null && total != null && price) liters = total / price;
      if (!date || odometer == null || !liters || liters <= 0 || total == null) {
        skipped++;
        continue;
      }
      items.push({
        id: newId(),
        vehicleId,
        date,
        odometer: toKm(odometer, 'odometer'),
        liters: Math.round(liters * 100) / 100,
        totalCost: Math.round(total * 1000) / 1000,
        fullTank: parseBool(get(row, 'full'), true),
        station: str(row, 'station'),
        notes: str(row, 'notes'),
        driver: str(row, 'driver'),
      });
    }
    return { kind: 'fuel', items, skipped };
  }

  if ('distance' in col) {
    const items: Trip[] = [];
    for (const row of rows) {
      const date = readDate(get(row, 'date') ?? '');
      const distance = parseNumber(get(row, 'distance'));
      if (!date || !distance || distance <= 0) {
        skipped++;
        continue;
      }
      items.push({
        id: newId(),
        vehicleId,
        date,
        from: str(row, 'from'),
        to: str(row, 'to'),
        distance: toKm(distance, 'distance'),
        purpose: parsePurpose(get(row, 'purpose')),
        notes: str(row, 'notes'),
        driver: str(row, 'driver'),
      });
    }
    return { kind: 'trips', items, skipped };
  }

  if ('service' in col) {
    const items: ServiceEntry[] = [];
    for (const row of rows) {
      const date = readDate(get(row, 'date') ?? '');
      const type = str(row, 'service');
      if (!date || !type) {
        skipped++;
        continue;
      }
      const odometer = parseOdometer(get(row, 'odometer'));
      const parts = (get(row, 'parts') ?? '')
        .split(/\s*[|;/]\s*|,\s+/)
        .map((p) => p.trim())
        .filter(Boolean);
      items.push({
        id: newId(),
        vehicleId,
        date,
        odometer: odometer == null ? 0 : toKm(odometer, 'odometer'),
        type,
        parts: parts.length ? parts : undefined,
        cost: parseNumber(get(row, 'total')) ?? 0,
        shop: str(row, 'garage'),
        notes: str(row, 'notes'),
        driver: str(row, 'driver'),
      });
    }
    return { kind: 'services', items, skipped };
  }
  return null;
}

/** Imported rows that are already logged (same day and odometer, or the same trip) are left out. */
export function withoutDuplicates<T extends FuelEntry | ServiceEntry | Trip>(items: T[], existing: T[]): T[] {
  const key = (x: T) => ('odometer' in x ? `${x.vehicleId}|${x.date}|${x.odometer}` : `${x.vehicleId}|${x.date}|${x.distance}|${x.from ?? ''}|${x.to ?? ''}`);
  const seen = new Set(existing.map(key));
  return items.filter((x) => {
    const k = key(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
