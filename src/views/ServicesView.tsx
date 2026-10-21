import { fmtDate, fmtKm, fmtMoney } from '../format';
import type { ServiceEntry } from '../types';
import { t } from '../i18n';

interface Props {
  entries: ServiceEntry[];
  onAdd: () => void;
  onEdit: (e: ServiceEntry) => void;
  onDelete: (e: ServiceEntry) => void;
}

export function ServicesView({ entries, onAdd, onEdit, onDelete }: Props) {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.odometer - a.odometer);
  const total = entries.reduce((s, e) => s + e.cost, 0);

  return (
    <section className="card">
      <div className="card-header">
        <h3>{t('Service history')}</h3>
        <button className="btn primary" onClick={onAdd}>
          {t('+ Service')}
        </button>
      </div>
      {sorted.length === 0 ? (
        <p className="empty">{t('No services logged yet.')}</p>
      ) : (
        <>
          <ul className="list">
            {sorted.map((e) => (
              <li key={e.id} className="list-item">
                <div>
                  <strong>{t(e.type)}</strong>
                  <span className="muted">
                    {fmtDate(e.date)} · {fmtKm(e.odometer)}
                    {e.shop && ` · ${e.shop}`}
                  </span>
                  {e.parts && e.parts.length > 0 && (
                    <ul className="chips small">
                      {e.parts.map((p) => (
                        <li key={p} className="chip">
                          {t(p)}
                        </li>
                      ))}
                    </ul>
                  )}
                  {e.notes && <span className="notes">{e.notes}</span>}
                </div>
                <div className="list-end">
                  <span>{fmtMoney(e.cost)}</span>
                  <span className="row-actions">
                    <button className="link" onClick={() => onEdit(e)}>
                      {t('Edit')}
                    </button>
                    <button className="link danger" onClick={() => onDelete(e)}>
                      {t('Delete')}
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p className="total">{t('Total: {amount}', { amount: fmtMoney(total) })}</p>
        </>
      )}
    </section>
  );
}
