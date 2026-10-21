import { t } from '../i18n';
import { DEFAULT_CONSUMPTION_ALERT } from '../insights';
import { CURRENCIES, type Prefs } from '../types';

interface Props {
  prefs: Prefs;
  onChange: (p: Prefs) => void;
}

/** Language, currency and units; distances stay stored in km, so switching never changes the data. */
export function PrefsCard({ prefs, onChange }: Props) {
  const set = <K extends keyof Prefs>(key: K, value: Prefs[K]) => onChange({ ...prefs, [key]: value });
  return (
    <section className="card">
      <h3>{t('Language and units')}</h3>
      <div className="form">
        <div className="row">
          <label>
            {t('Language')}
            <select value={prefs.language} onChange={(e) => set('language', e.target.value as Prefs['language'])}>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </label>
          <label>
            {t('Currency')}
            <select value={prefs.currency} onChange={(e) => set('currency', e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="row">
          <label>
            {t('Distance')}
            <select value={prefs.distance} onChange={(e) => set('distance', e.target.value as Prefs['distance'])}>
              <option value="km">{t('Kilometres (km)')}</option>
              <option value="mi">{t('Miles (mi)')}</option>
            </select>
          </label>
          <label>
            {t('Consumption')}
            <select value={prefs.consumption} onChange={(e) => set('consumption', e.target.value as Prefs['consumption'])}>
              <option value="l100">{t('Litres per 100 {unit}', { unit: prefs.distance })}</option>
              <option value="kml">{t('{unit} per litre', { unit: prefs.distance })}</option>
            </select>
          </label>
        </div>
        <label>
          {t('Warn when a tank uses more fuel than usual')}
          <select
            value={prefs.consumptionAlert ?? DEFAULT_CONSUMPTION_ALERT}
            onChange={(e) => set('consumptionAlert', Number(e.target.value))}
          >
            {[10, 15, 20, 30].map((n) => (
              <option key={n} value={n}>
                {t('{n}% more', { n })}
              </option>
            ))}
            <option value={0}>{t('Never')}</option>
          </select>
        </label>
      </div>
    </section>
  );
}
