import { consumptionSegments } from '../stats';
import { consumptionUnit, fmtConsumption, fmtDate, fmtKm, fmtMoney, fmtNum } from '../format';
import type { FuelEntry, OdometerReading } from '../types';
import { t } from '../i18n';

interface Props {
  entries: FuelEntry[];
  onAdd: () => void;
  onEdit: (e: FuelEntry) => void;
  onDelete: (e: FuelEntry) => void;
  readings: OdometerReading[];
  onAddReading: () => void;
  onDeleteReading: (r: OdometerReading) => void;
  nameOf: (driver?: string) => string;
}

export function FuelView({ entries, onAdd, onEdit, onDelete, readings, onAddReading, onDeleteReading, nameOf }: Props) {
  const consumption = new Map(consumptionSegments(entries).map((s) => [s.entryId, s.litersPer100km]));
  const sorted = [...entries].sort((a, b) => b.odometer - a.odometer || b.date.localeCompare(a.date));

  const sortedReadings = [...readings].sort((a, b) => b.date.localeCompare(a.date) || b.odometer - a.odometer);

  return (
    <div className="stack">
      <section className="card">
        <div className="card-header">
          <h3>{t('Fuel log')}</h3>
          <button className="btn primary" onClick={onAdd}>
            {t('+ Fill-up')}
          </button>
        </div>
        {sorted.length === 0 ? (
          <p className="empty">{t('No fill-ups yet.')}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('Date')}</th>
                  <th className="num">{t('Odometer')}</th>
                  <th className="num">{t('Liters')}</th>
                  <th className="num">{t('Price/L')}</th>
                  <th className="num">{t('Total')}</th>
                  <th className="num">{consumptionUnit()}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorted.map((e) => (
                  <tr key={e.id}>
                    <td>
                      {fmtDate(e.date)}
                      {!e.fullTank && <span className="tag">{t('partial')}</span>}
                      {(e.station || e.driver) && <div className="muted">{[e.station, nameOf(e.driver)].filter(Boolean).join(' · ')}</div>}
                    </td>
                    <td className="num">{fmtKm(e.odometer)}</td>
                    <td className="num">{fmtNum(e.liters)}</td>
                    <td className="num">{fmtMoney(e.totalCost / e.liters)}</td>
                    <td className="num">{fmtMoney(e.totalCost)}</td>
                    <td className="num">{fmtConsumption(consumption.get(e.id))}</td>
                    <td className="row-actions">
                      <button className="link" onClick={() => onEdit(e)}>
                        {t('Edit')}
                      </button>
                      <button className="link danger" onClick={() => onDelete(e)}>
                        {t('Delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h3>{t('Odometer readings')}</h3>
          <button className="btn" onClick={onAddReading}>
            {t('Update odometer')}
          </button>
        </div>
        {sortedReadings.length === 0 ? (
          <p className="empty">{t('No readings yet. Fill-ups and services also count as readings.')}</p>
        ) : (
          <ul className="list">
            {sortedReadings.map((r) => (
              <li key={r.id} className="list-item">
                <div>
                  <strong>{fmtKm(r.odometer)}</strong>
                  <span className="muted">{fmtDate(r.date)}</span>
                </div>
                <button className="link danger" onClick={() => onDeleteReading(r)}>
                  {t('Delete')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
