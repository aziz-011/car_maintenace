import { DEFAULT_PREFS, type Prefs } from './types';

/**
 * Every number, price, distance and date on screen and in emails goes
 * through these helpers, so the chosen currency, units and language apply
 * everywhere. Distances are always stored in km and converted for display.
 */

const KM_PER_MILE = 1.609344;

let prefs: Prefs = DEFAULT_PREFS;
let number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
let money = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'TND' });
let date = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' });
let monthYear = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Locale for a language; French uses Tunisian conventions (3-decimal dinar, day-month order). */
export const localeFor = (language: Prefs['language']) => (language === 'fr' ? 'fr-TN' : undefined);

export function applyPrefs(next: Prefs) {
  prefs = next;
  const locale = localeFor(next.language);
  number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  try {
    money = new Intl.NumberFormat(locale, { style: 'currency', currency: next.currency });
  } catch {
    money = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' });
  monthYear = new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export const currentPrefs = () => prefs;

export const fmtNum = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? '—' : number.format(n));
export const fmtMoney = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? '—' : money.format(n));
export const fmtDate = (d: string | undefined) => (d ? date.format(new Date(d)) : '—');
export const fmtMonth = (d: string) => monthYear.format(new Date(d));

/** "km" or "mi", for labels. */
export const distUnit = () => prefs.distance;

/** A distance stored in km, in the chosen unit. */
export const toUserDist = (km: number) => (prefs.distance === 'mi' ? km / KM_PER_MILE : km);

/** A distance typed in the chosen unit, back to km for storage. */
export const fromUserDist = (value: number) => (prefs.distance === 'mi' ? value * KM_PER_MILE : value);

/** For form fields: a stored km value shown in the chosen unit, rounded to whole units. */
export const distInput = (km: number | undefined) => (km == null ? '' : String(Math.round(toUserDist(km))));

/** For form fields: the typed value back to km (whole km), or 0 when empty. */
export const parseDist = (value: string) => (value.trim() === '' ? 0 : Math.round(fromUserDist(Number(value))));

export const fmtKm = (km: number | null | undefined) =>
  km == null || !Number.isFinite(km) ? '—' : `${number.format(Math.round(toUserDist(km)))} ${prefs.distance}`;

/** Consumption unit label: "L/100 km" or "km/L" (miles: "L/100 mi", "mi/L"). */
export const consumptionUnit = () => (prefs.consumption === 'kml' ? `${prefs.distance}/L` : `L/100 ${prefs.distance}`);

/** A consumption stored as L/100 km, in the chosen unit (without the unit). */
export function toUserConsumption(lPer100km: number): number {
  const lPer100 = prefs.distance === 'mi' ? lPer100km * KM_PER_MILE : lPer100km;
  return prefs.consumption === 'kml' ? 100 / lPer100 : lPer100;
}

export const fmtConsumption = (lPer100km: number | null | undefined) =>
  lPer100km == null || !Number.isFinite(lPer100km) || lPer100km <= 0 ? '—' : fmtNum(toUserConsumption(lPer100km));
