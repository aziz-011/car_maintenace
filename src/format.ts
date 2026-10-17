const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const money = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' });

export const fmtNum = (n: number | null | undefined) => (n == null ? '—' : number.format(n));
export const fmtMoney = (n: number | null | undefined) => (n == null ? '—' : money.format(n));
export const fmtKm = (n: number | null | undefined) => (n == null ? '—' : `${number.format(n)} km`);
export const fmtDate = (d: string | undefined) => (d ? date.format(new Date(d)) : '—');
