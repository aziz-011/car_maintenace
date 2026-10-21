import { Icon } from '../components/Icon';
import { yearlyCosts } from '../costs';
import { fmtDate, fmtKm, fmtMoney, fmtNum } from '../format';
import { t } from '../i18n';
import { tripYears } from '../insights';
import { TRIP_PURPOSE_LABEL, type FuelEntry, type OdometerReading, type ServiceEntry, type Trip } from '../types';

interface Props {
  trips: Trip[];
  fuel: FuelEntry[];
  services: ServiceEntry[];
  readings: OdometerReading[];
  nameOf: (driver?: string) => string;
  onAdd: () => void;
  onEdit: (t: Trip) => void;
  onDelete: (t: Trip) => void;
}

const pct = (share: number | null) => (share == null ? '—' : `${fmtNum(Math.round(share * 1000) / 10)} %`);

/** Logged journeys, and per year how much of the driving and the costs were for work. */
export function TripsView({ trips, fuel, services, readings, nameOf, onAdd, onEdit, onDelete }: Props) {
  const driven = new Map(yearlyCosts(fuel, services, readings).map((y) => [y.year, y.distance ?? 0]));
  const years = tripYears(trips, fuel, services, driven);
  const sorted = [...trips].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="stack">
      <section className="card">
        <div className="card-header">
          <h3>{t('Trips')}</h3>
          <button className="btn primary" onClick={onAdd}>
            <Icon name="plus" size={16} /> {t('Trip')}
          </button>
        </div>
        {sorted.length === 0 ? (
          <p className="empty">{t('Log trips to split work and personal driving, for example to claim your work kilometres.')}</p>
        ) : (
          <ul className="list">
            {sorted.map((trip) => (
              <li key={trip.id} className="list-item">
                <div>
                  <strong>
                    {[trip.from, trip.to].filter(Boolean).join(' → ') || t('Trip')}
                    <span className={`tag${trip.purpose === 'work' ? ' on' : ''}`}>{t(TRIP_PURPOSE_LABEL[trip.purpose])}</span>
                  </strong>
                  <span className="muted">
                    {fmtDate(trip.date)}
                    {trip.driver && ` · ${nameOf(trip.driver)}`}
                  </span>
                  {trip.notes && <span className="notes">{trip.notes}</span>}
                </div>
                <div className="list-end">
                  <span className="num">{fmtKm(trip.distance)}</span>
                  <span className="row-actions">
                    <button className="link" onClick={() => onEdit(trip)}>
                      {t('Edit')}
                    </button>
                    <button className="link danger" onClick={() => onDelete(trip)}>
                      {t('Delete')}
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {years.length > 0 && (
        <section className="card">
          <h3>{t('Work and personal driving')}</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('Year')}</th>
                  <th className="num">{t('Work')}</th>
                  <th className="num">{t('Personal')}</th>
                  <th className="num">{t('Work share')}</th>
                  <th className="num">{t('Fuel for work')}</th>
                  <th className="num">{t('Work share of costs')}</th>
                </tr>
              </thead>
              <tbody>
                {years.map((y) => (
                  <tr key={y.year}>
                    <td>{y.year}</td>
                    <td className="num">{fmtKm(y.km.work)}</td>
                    <td className="num">{fmtKm(y.km.personal)}</td>
                    <td className="num">{pct(y.workShare)}</td>
                    <td className="num">{fmtMoney(y.workFuelCost)}</td>
                    <td className="num">{fmtMoney(y.workShareOfCosts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint">
            {t('The work share compares work trips with all the distance driven that year (from your odometer values). Fuel for work uses your average fuel cost per km; the share of costs also counts maintenance.')}
          </p>
        </section>
      )}
    </div>
  );
}
