import { afterEach, describe, expect, it } from 'vitest';
import { csvFormat, fuelCsv, importCsv, parseCsv, parseNumber, withoutDuplicates } from './csv';
import { applyPrefs } from './format';
import { setLanguage } from './i18n';
import { DEFAULT_PREFS, type FuelEntry } from './types';

afterEach(() => {
  applyPrefs(DEFAULT_PREFS);
  setLanguage('en');
});

describe('parseNumber', () => {
  it('reads both decimal styles and thousands separators', () => {
    expect(parseNumber('2,525')).toBe(2.525);
    expect(parseNumber('1 234,5')).toBe(1234.5);
    expect(parseNumber('1,234.5')).toBe(1234.5);
    expect(parseNumber('1.234,5')).toBe(1234.5);
    expect(parseNumber('45.20 DT')).toBe(45.2);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('n/a')).toBeNull();
  });
});

describe('parseCsv', () => {
  it('handles quotes, separators inside quotes and the BOM', () => {
    expect(parseCsv('\uFEFFa;b;c\r\n1;"x; y";"say ""hi"""\n\n2;;3')).toEqual([
      ['a', 'b', 'c'],
      ['1', 'x; y', 'say "hi"'],
      ['2', '', '3'],
    ]);
  });
});

describe('importCsv', () => {
  it('reads a French fuel sheet with day-first dates', () => {
    const csv = 'Date;Kilométrage;Litres;Prix/L;Montant;Plein;Station\n05/03/2026;281.850;40,5;2,525;102,263;oui;Agil\n20/03/2026;282 400;38;2,525;;non;Shell\nbad;1;2;3;4;;';
    const r = importCsv(csv, 'v')!;
    expect(r.kind).toBe('fuel');
    expect(r.skipped).toBe(1);
    const [a, b] = r.items as FuelEntry[];
    expect(a).toMatchObject({ date: '2026-03-05', odometer: 281850, liters: 40.5, totalCost: 102.263, fullTank: true, station: 'Agil', vehicleId: 'v' });
    expect(b).toMatchObject({ date: '2026-03-20', odometer: 282400, totalCost: 95.95, fullTank: false });
  });

  it('reads month-first dates and miles when the file says so', () => {
    const r = importCsv('Date,Odometer (mi),Gallons?,Liters,Total\n03/25/2026,1000,,40,100\n04/02/2026,1300,,30,75', 'v')!;
    expect((r.items as FuelEntry[]).map((e) => [e.date, e.odometer])).toEqual([
      ['2026-03-25', 1609],
      ['2026-04-02', 2092],
    ]);
  });

  it('recognises services and trips', () => {
    const s = importCsv('Date,Odometer,Service,Parts replaced,Cost,Garage\n2026-01-10,90000,Oil change,Oil filter | Engine oil,120,Garage Sami', 'v')!;
    expect(s.kind).toBe('services');
    expect(s.items[0]).toMatchObject({ type: 'Oil change', parts: ['Oil filter', 'Engine oil'], cost: 120, shop: 'Garage Sami', odometer: 90000 });
    const t = importCsv('Date;De;À;Distance (km);Motif\n2026-01-10;Tunis;Sousse;140;Travail', 'v')!;
    expect(t).toMatchObject({ kind: 'trips', items: [{ from: 'Tunis', to: 'Sousse', distance: 140, purpose: 'work' }] });
  });

  it('rejects files it cannot read', () => {
    expect(importCsv('Name,Value\na,1', 'v')).toBeNull();
    expect(importCsv('', 'v')).toBeNull();
  });

  it('round-trips an export, in French', () => {
    applyPrefs({ ...DEFAULT_PREFS, language: 'fr' });
    setLanguage('fr');
    const entries: FuelEntry[] = [{ id: 'a', vehicleId: 'v', date: '2026-02-01', odometer: 281850, liters: 40.5, totalCost: 102.263, fullTank: true, station: 'Agil; centre' }];
    const csv = fuelCsv(entries, csvFormat('fr'));
    expect(csv.split('\r\n')[1]).toBe('2026-02-01;281850;40,5;2,525;102,263;oui;"Agil; centre";;');
    const back = importCsv(csv, 'v')!.items[0] as FuelEntry;
    expect(back).toMatchObject({ date: '2026-02-01', odometer: 281850, liters: 40.5, totalCost: 102.263, fullTank: true, station: 'Agil; centre' });
    expect(withoutDuplicates([back], entries)).toEqual([]);
  });
});
