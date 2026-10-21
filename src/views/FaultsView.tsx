import { Icon } from '../components/Icon';
import { isImage } from '../files';
import { fmtDate, fmtKm } from '../format';
import { plural, t } from '../i18n';
import { issueRepeats } from '../insights';
import { ISSUE_KIND_LABEL, type Issue, type ServiceEntry } from '../types';

interface Props {
  issues: Issue[];
  services: ServiceEntry[];
  onAdd: () => void;
  onEdit: (i: Issue) => void;
  onDelete: (i: Issue) => void;
}

/** Warning lights, noises and fault codes, open ones first, with the repair that fixed each. */
export function FaultsView({ issues, services, onAdd, onEdit, onDelete }: Props) {
  const repeats = issueRepeats(issues);
  const sorted = [...issues].sort(
    (a, b) => Number(!!a.fixedDate || !!a.fixedByServiceId) - Number(!!b.fixedDate || !!b.fixedByServiceId) || b.date.localeCompare(a.date),
  );
  const open = issues.filter((i) => !i.fixedDate && !i.fixedByServiceId).length;

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h3>{t('Faults')}</h3>
          {issues.length > 0 && <span className="muted">{open ? plural(open, '{n} still open', '{n} still open') : t('All fixed')}</span>}
        </div>
        <button className="btn primary" onClick={onAdd}>
          <Icon name="plus" size={16} /> {t('Fault')}
        </button>
      </div>
      {sorted.length === 0 ? (
        <p className="empty">{t('Note warning lights, noises and fault codes here, then link the repair that fixed them. Problems that come back stand out.')}</p>
      ) : (
        <ul className="list">
          {sorted.map((i) => {
            const fix = services.find((s) => s.id === i.fixedByServiceId);
            const fixed = !!fix || !!i.fixedDate;
            const times = repeats.get(i.id) ?? 1;
            const thumbs = (i.attachments ?? []).filter(isImage).slice(0, 3);
            return (
              <li key={i.id} className="list-item">
                <div>
                  <strong>
                    {t(i.title)}
                    {i.code && <span className="tag">{i.code}</span>}
                    {times > 1 && <span className="tag warn">{t('Seen {n} times', { n: times })}</span>}
                  </strong>
                  <span className="muted">
                    {t(ISSUE_KIND_LABEL[i.kind])} · {fmtDate(i.date)}
                    {i.odometer > 0 && ` · ${fmtKm(i.odometer)}`}
                  </span>
                  {fix ? (
                    <span className="muted">
                      {t('Fixed {date}: {service}', { date: fmtDate(fix.date), service: [t(fix.type), fix.shop].filter(Boolean).join(', ') })}
                    </span>
                  ) : (
                    i.fixedDate && <span className="muted">{t('Gone since {date}', { date: fmtDate(i.fixedDate) })}</span>
                  )}
                  {i.notes && <span className="notes">{i.notes}</span>}
                  {thumbs.length > 0 && (
                    <div className="thumbs">
                      {thumbs.map((a) => (
                        <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
                          <img src={a.url} alt={a.name} loading="lazy" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <div className="list-end">
                  <span className={`badge ${fixed ? 'ok' : 'soon'}`}>{fixed ? t('✓ Fixed') : t('! Open')}</span>
                  <span className="row-actions">
                    <button className="link" onClick={() => onEdit(i)}>
                      {fixed ? t('Edit') : t('Mark fixed')}
                    </button>
                    <button className="link danger" onClick={() => onDelete(i)}>
                      {t('Delete')}
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
