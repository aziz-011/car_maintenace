import { ReminderBadge } from '../components/ReminderBadge';
import { dueText } from '../reminderText';
import type { ReminderStatus } from '../stats';
import { fmtDate, fmtKm } from '../format';
import type { Reminder } from '../types';

interface Props {
  statuses: ReminderStatus[];
  onAdd: () => void;
  onEdit: (r: Reminder) => void;
  onDelete: (r: Reminder) => void;
}

const ORDER = { overdue: 0, soon: 1, ok: 2 } as const;

export function RemindersView({ statuses, onAdd, onEdit, onDelete }: Props) {
  const sorted = [...statuses].sort((a, b) => ORDER[a.state] - ORDER[b.state]);

  return (
    <section className="card">
      <div className="card-header">
        <h3>Maintenance reminders</h3>
        <button className="btn primary" onClick={onAdd}>
          + Reminder
        </button>
      </div>
      {sorted.length === 0 ? (
        <p className="empty">
          No reminders. Add one for oil changes, inspections, tire rotations… by distance, time, or both.
        </p>
      ) : (
        <ul className="list">
          {sorted.map((s) => {
            const r = s.reminder;
            const every = [r.intervalKm && fmtKm(r.intervalKm), r.intervalMonths && `${r.intervalMonths} months`]
              .filter(Boolean)
              .join(' / ');
            return (
              <li key={r.id} className="list-item">
                <div>
                  <strong>{r.type}</strong>
                  <span className="muted">Every {every}</span>
                  <span className="muted">
                    Last: {fmtDate(s.lastDate)} at {fmtKm(s.lastOdometer)}
                  </span>
                  <span className="muted">{dueText(s)}</span>
                </div>
                <div className="list-end">
                  <ReminderBadge state={s.state} />
                  <span className="row-actions">
                    <button className="link" onClick={() => onEdit(r)}>
                      Edit
                    </button>
                    <button className="link danger" onClick={() => onDelete(r)}>
                      Delete
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
