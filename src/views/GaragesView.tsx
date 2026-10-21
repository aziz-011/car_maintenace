import { Icon } from '../components/Icon';
import { fmtDate, fmtMoney } from '../format';
import { plural, t } from '../i18n';
import { garageStats } from '../insights';
import type { Garage, Quote, ServiceEntry } from '../types';

interface Props {
  garages: Garage[];
  /** Every car's services, since garages are shared. */
  services: ServiceEntry[];
  quotes: Quote[];
  onAddGarage: () => void;
  onEditGarage: (g: Garage) => void;
  onDeleteGarage: (g: Garage) => void;
  onAddQuote: (job?: string) => void;
  onEditQuote: (q: Quote) => void;
  onDeleteQuote: (q: Quote) => void;
  onAcceptQuote: (q: Quote) => void;
}

const stars = (n?: number) => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '');

/** Garages with what they did and charged, and the quotes collected for upcoming jobs. */
export function GaragesView(props: Props) {
  const { garages, services, quotes } = props;
  const rows = garages
    .map((g) => ({ garage: g, stats: garageStats(g, services) }))
    .sort((a, b) => (b.garage.rating ?? 0) - (a.garage.rating ?? 0) || b.stats.jobs - a.stats.jobs);
  const nameOf = (id: string) => garages.find((g) => g.id === id)?.name ?? t('Deleted garage');

  // Quotes grouped by job, cheapest first, so the prices compare at a glance.
  const jobs = new Map<string, Quote[]>();
  for (const q of [...quotes].sort((a, b) => a.amount - b.amount)) {
    const key = q.job.trim().toLowerCase();
    jobs.set(key, [...(jobs.get(key) ?? []), q]);
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="card-header">
          <h3>{t('Garages')}</h3>
          <button className="btn primary" onClick={props.onAddGarage}>
            <Icon name="plus" size={16} /> {t('Garage')}
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="empty">{t('Keep your garages and mechanics here with their phone number and your rating. Services typed with the same name are counted for each.')}</p>
        ) : (
          <ul className="list">
            {rows.map(({ garage: g, stats }) => (
              <li key={g.id} className="list-item">
                <div>
                  <strong>
                    {g.name} {g.rating ? <span className="stars-read" aria-label={t('{n} out of 5', { n: g.rating })}>{stars(g.rating)}</span> : null}
                  </strong>
                  <span className="muted">
                    {stats.jobs
                      ? `${plural(stats.jobs, '{n} job', '{n} jobs')} · ${fmtMoney(stats.spent)} · ${t('last {date}', { date: fmtDate(stats.lastDate) })}`
                      : t('No services logged here yet')}
                  </span>
                  {(g.phone || g.address) && (
                    <span className="muted">
                      {g.phone && (
                        <a href={`tel:${g.phone.replace(/[^\d+]/g, '')}`} className="link">
                          <Icon name="phone" size={14} /> {g.phone}
                        </a>
                      )}
                      {g.phone && g.address && ' · '}
                      {g.address}
                    </span>
                  )}
                  {g.notes && <span className="notes">{g.notes}</span>}
                </div>
                <span className="row-actions">
                  <button className="link" onClick={() => props.onEditGarage(g)}>
                    {t('Edit')}
                  </button>
                  <button className="link danger" onClick={() => props.onDeleteGarage(g)}>
                    {t('Delete')}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h3>{t('Quotes')}</h3>
          <button className="btn" onClick={() => props.onAddQuote()}>
            <Icon name="plus" size={16} /> {t('Quote')}
          </button>
        </div>
        {jobs.size === 0 ? (
          <p className="empty">{t('Before a big job, note the price each garage asks to compare them.')}</p>
        ) : (
          [...jobs.values()].map((list) => (
            <div key={list[0].job} className="quote-group">
              <div className="card-header">
                <h4>{t(list[0].job)}</h4>
                <button className="link" onClick={() => props.onAddQuote(list[0].job)}>
                  {t('+ Another price')}
                </button>
              </div>
              <ul className="list">
                {list.map((q, i) => (
                  <li key={q.id} className="list-item">
                    <div>
                      <strong>
                        {nameOf(q.garageId)}
                        {i === 0 && list.length > 1 && <span className="tag on">{t('Cheapest')}</span>}
                        {q.accepted && <span className="tag">{t('Chosen')}</span>}
                      </strong>
                      <span className="muted">
                        {fmtDate(q.date)}
                        {i > 0 && ` · +${fmtMoney(q.amount - list[0].amount)}`}
                      </span>
                      {q.notes && <span className="notes">{q.notes}</span>}
                    </div>
                    <div className="list-end">
                      <span className="num">{fmtMoney(q.amount)}</span>
                      <span className="row-actions">
                        {!q.accepted && (
                          <button className="link" onClick={() => props.onAcceptQuote(q)}>
                            {t('Choose')}
                          </button>
                        )}
                        <button className="link" onClick={() => props.onEditQuote(q)}>
                          {t('Edit')}
                        </button>
                        <button className="link danger" onClick={() => props.onDeleteQuote(q)}>
                          {t('Delete')}
                        </button>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
