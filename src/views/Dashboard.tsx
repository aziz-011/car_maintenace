import { ConsumptionChart } from '../components/ConsumptionChart';
import { ReminderBadge } from '../components/ReminderBadge';
import { dueText } from '../reminderText';
import { consumptionSegments, daysBetween, fuelSummary, type DrivingRate, type ReminderStatus } from '../stats';
import { today } from '../store';
import { DEFAULT_OIL_INTERVAL_KM } from '../types';
import { fmtDate, fmtKm, fmtMoney, fmtNum } from '../format';
import type { FuelEntry, ServiceEntry } from '../types';

interface Props {
  odometer: number;
  fuel: FuelEntry[];
  services: ServiceEntry[];
  reminders: ReminderStatus[];
  onAddFuel: () => void;
  onAddService: () => void;
  onAddReminder: (type: string) => void;
  onUpdateOdometer: () => void;
  onAddOilReminder: (intervalKm: number) => void;
  driving: DrivingRate | null;
  lastOdometerDate?: string;
}

/** Deadlines most drivers have, offered as one-tap additions until they are set. */
const KEY_DATES = [
  { type: 'Technical inspection (visite technique)', label: 'Visite technique' },
  { type: 'Insurance', label: 'Insurance' },
  { type: 'Road tax / vignette', label: 'Road tax / vignette' },
];

/** After this many days without any odometer value, the overview asks for a reading. */
const STALE_READING_DAYS = 7;

export function Dashboard({
  odometer,
  fuel,
  services,
  reminders,
  onAddFuel,
  onAddService,
  onAddReminder,
  onUpdateOdometer,
  onAddOilReminder,
  driving,
  lastOdometerDate,
}: Props) {
  const summary = fuelSummary(fuel);
  const serviceCost = services.reduce((s, e) => s + e.cost, 0);
  const attention = reminders.filter((r) => r.state !== 'ok');
  const dated = reminders
    .filter((r) => r.reminder.dueDate)
    .sort((a, b) => a.reminder.dueDate!.localeCompare(b.reminder.dueDate!));
  const oil = reminders.find((r) => r.reminder.type === 'Oil change' && !r.reminder.dueDate);
  const sinceReading = lastOdometerDate ? daysBetween(lastOdometerDate, today()) : undefined;
  const missing = KEY_DATES.filter((k) => !reminders.some((r) => r.reminder.type === k.type));
  const recent = [
    ...fuel.map((f) => ({ id: f.id, date: f.date, label: `Fuel · ${fmtNum(f.liters)} L`, cost: f.totalCost })),
    ...services.map((s) => ({ id: s.id, date: s.date, label: s.type, cost: s.cost })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <div className="stack">
      <div className="quick-actions">
        <button className="btn primary" onClick={onAddFuel}>
          + Fill-up
        </button>
        <button className="btn" onClick={onAddService}>
          + Service
        </button>
        <button className="btn" onClick={onUpdateOdometer}>
          Update odometer
        </button>
      </div>

      {(sinceReading === undefined || sinceReading > STALE_READING_DAYS) && (
        <div className="notice">
          <span>
            {sinceReading === undefined
              ? 'Add your odometer reading once a week so the app can estimate your next oil change.'
              : `Your last odometer reading was ${sinceReading} days ago.`}
          </span>
          <button className="btn small primary" onClick={onUpdateOdometer}>
            Update odometer
          </button>
        </div>
      )}

      <section className="tiles">
        <div className="tile">
          <span className="tile-label">Odometer</span>
          <span className="tile-value">{fmtKm(odometer)}</span>
          {lastOdometerDate && <span className="tile-sub">As of {fmtDate(lastOdometerDate)}</span>}
        </div>
        <div className="tile">
          <span className="tile-label">Driving</span>
          <span className="tile-value">
            {driving ? fmtNum(Math.round(driving.kmPerDay * 7)) : '—'} <small>km/week</small>
          </span>
          <span className="tile-sub">
            {driving ? `${fmtNum(Math.round(driving.kmPerDay * 30))} km a month` : 'Needs readings a week apart'}
          </span>
        </div>
        <div className="tile">
          <span className="tile-label">Avg consumption</span>
          <span className="tile-value">
            {fmtNum(summary.averageLPer100)} <small>L/100 km</small>
          </span>
          {summary.lastLPer100 != null && <span className="tile-sub">Last tank: {fmtNum(summary.lastLPer100)}</span>}
        </div>
        <div className="tile">
          <span className="tile-label">Fuel cost / km</span>
          <span className="tile-value">{fmtMoney(summary.costPerKm)}</span>
          <span className="tile-sub">Avg price: {fmtMoney(summary.averagePricePerLiter)}/L</span>
        </div>
        <div className="tile">
          <span className="tile-label">Total spent</span>
          <span className="tile-value">{fmtMoney(summary.totalCost + serviceCost)}</span>
          <span className="tile-sub">
            Fuel {fmtMoney(summary.totalCost)} · Service {fmtMoney(serviceCost)}
          </span>
        </div>
      </section>

      {attention.length > 0 && (
        <section className="card">
          <h3>Needs attention</h3>
          <ul className="list">
            {attention.map((r) => (
              <li key={r.reminder.id} className="list-item">
                <div>
                  <strong>{r.reminder.type}</strong>
                  <span className="muted">{dueText(r)}</span>
                </div>
                <ReminderBadge state={r.state} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h3>Next oil change</h3>
        {oil ? (
          <div className="list-item solo">
            <div>
              <strong>At {fmtKm(oil.dueOdometer)}</strong>
              <span>{dueText(oil)}</span>
              <span className="muted">
                Every {fmtKm(oil.reminder.intervalKm)}, last done at {fmtKm(oil.lastOdometer)} on{' '}
                {fmtDate(oil.lastDate)}
              </span>
              {!oil.estimatedDate && oil.state !== 'overdue' && (
                <span className="muted">Add odometer readings a week apart to get an estimated date.</span>
              )}
            </div>
            <ReminderBadge state={oil.state} />
          </div>
        ) : (
          <div className="quick-actions">
            <button className="btn small" onClick={() => onAddOilReminder(DEFAULT_OIL_INTERVAL_KM)}>
              + Oil change every {fmtKm(DEFAULT_OIL_INTERVAL_KM)}
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <h3>Key dates</h3>
        {dated.length === 0 && <p className="empty">Add the dates of your inspection, insurance… to get reminded.</p>}
        {dated.length > 0 && (
          <ul className="list">
            {dated.map((r) => (
              <li key={r.reminder.id} className="list-item">
                <div>
                  <strong>{r.reminder.type}</strong>
                  <span className="muted">{fmtDate(r.reminder.dueDate)}</span>
                </div>
                <ReminderBadge state={r.state} />
              </li>
            ))}
          </ul>
        )}
        {missing.length > 0 && (
          <div className="quick-actions">
            {missing.map((k) => (
              <button key={k.type} className="btn small" onClick={() => onAddReminder(k.type)}>
                + {k.label}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <ConsumptionChart segments={consumptionSegments(fuel)} />
      </section>

      <section className="card">
        <h3>Recent activity</h3>
        {recent.length === 0 ? (
          <p className="empty">Nothing logged yet. Add your first fill-up or service.</p>
        ) : (
          <ul className="list">
            {recent.map((r) => (
              <li key={r.id} className="list-item">
                <div>
                  <strong>{r.label}</strong>
                  <span className="muted">{fmtDate(r.date)}</span>
                </div>
                <span>{fmtMoney(r.cost)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
