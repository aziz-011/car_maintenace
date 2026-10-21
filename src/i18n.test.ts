import { afterEach, describe, expect, it } from 'vitest';
import { applyPrefs, distInput, fmtConsumption, fmtKm, fmtMoney, parseDist } from './format';
import { setLanguage, t } from './i18n';
import { dueText } from './reminderText';
import { DEFAULT_PREFS } from './types';

afterEach(() => {
  applyPrefs(DEFAULT_PREFS);
  setLanguage('en');
});

describe('French', () => {
  it('translates screens, stored names and engines', () => {
    setLanguage('fr');
    expect(t('Oil change')).toBe('Vidange');
    expect(t('Timing belt')).toBe('Courroie de distribution');
    expect(t('Your last odometer reading was {n} days ago.', { n: 9 })).toBe('Votre dernier relevé de compteur date de 9 jours.');
    expect(t('1.4 16V petrol · 75 hp')).toBe('1.4 16V essence · 75 ch');
    expect(t('Some text with no translation')).toBe('Some text with no translation');
  });

  it('writes reminder due text in French with Tunisian number formats', () => {
    applyPrefs({ ...DEFAULT_PREFS, language: 'fr' });
    setLanguage('fr');
    const text = dueText({ reminder: {} as never, lastDate: '', lastOdometer: 0, kmLeft: 5300, estimatedDate: '2027-02-19', state: 'ok' });
    expect(text).toMatch(/^Dans 5\s300 km \(vers le 19 févr\. 2027\)$/);
    expect(fmtMoney(12.5)).toMatch(/12,500\s?DT/);
  });
});

describe('units', () => {
  it('shows miles and km/L while storing km and L/100 km', () => {
    applyPrefs({ ...DEFAULT_PREFS, distance: 'mi', consumption: 'kml' });
    expect(fmtKm(16093.44)).toBe('10,000 mi');
    expect(distInput(1609.344)).toBe('1000');
    expect(parseDist('1000')).toBe(1609);
    // 6.2 L/100 km = 3.85 L/100 mi... shown as miles per litre: 100 / (6.2 * 1.609) ≈ 10
    expect(fmtConsumption(6.2)).toBe('10');
  });

  it('defaults to km, L/100 km and the dinar with 3 decimals', () => {
    expect(fmtKm(1234)).toBe('1,234 km');
    expect(fmtConsumption(6.24)).toBe('6.2');
    expect(fmtMoney(2.525)).toMatch(/2\.525/);
  });
});
