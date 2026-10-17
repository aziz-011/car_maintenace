import { fmtDate, fmtKm, fmtMoney } from '../format';
import type { ServiceEntry } from '../types';

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
        <h3>Service history</h3>
        <button className="btn primary" onClick={onAdd}>
          + Service
        </button>
      </div>
      {sorted.length === 0 ? (
        <p className="empty">No services logged yet.</p>
      ) : (
        <>
          <ul className="list">
            {sorted.map((e) => (
              <li key={e.id} className="list-item">
                <div>
                  <strong>{e.type}</strong>
                  <span className="muted">
                    {fmtDate(e.date)} · {fmtKm(e.odometer)}
                    {e.shop && ` · ${e.shop}`}
                  </span>
                  {e.notes && <span className="notes">{e.notes}</span>}
                </div>
                <div className="list-end">
                  <span>{fmtMoney(e.cost)}</span>
                  <span className="row-actions">
                    <button className="link" onClick={() => onEdit(e)}>
                      Edit
                    </button>
                    <button className="link danger" onClick={() => onDelete(e)}>
                      Delete
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p className="total">Total: {fmtMoney(total)}</p>
        </>
      )}
    </section>
  );
}
