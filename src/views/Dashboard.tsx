import { ConsumptionChart } from '../components/ConsumptionChart';
import { Icon } from '../components/Icon';
import { ReminderBadge } from '../components/ReminderBadge';
import { dueText } from '../reminderText';
import { consumptionSegments, daysBetween, fuelSummary, type DrivingRate, type ReminderStatus } from '../stats';
import { fmtDate, fmtKm, fmtMoney, fmtNum } from '../format';
import { today } from '../store';
import { DEFAULT_OIL_INTERVAL_KM, type FuelEntry, type ServiceEntry, type Vehicle } from '../types';

interface Props {
  vehicle: Vehicle;
  odometer: number;
  fuel: FuelEntry[];
  services: ServiceEntry[];
  reminders: ReminderStatus[];
  onAddFuel: () => void;
  onAddService: () => void;
  onAddReminder: (type: string) => void;
  onUpdateOdometer: () => void;
  onAddOilReminder: (intervalKm: number) => void;
  onOpenReminders: () => void;
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
const STATE_ORDER = { overdue: 0, soon: 1, ok: 2 } as const;
const MONTH = new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' });

/** The date a reminder is expected: a fixed or month-based date, or the driving estimate. */
const whenDue = (s: ReminderStatus) => [s.dueDate, s.estimatedDate].filter((d): d is string => !!d).sort()[0];

function byUrgency(a: ReminderStatus, b: ReminderStatus) {
  const da = whenDue(a);
  const db = whenDue(b);
  return (
    STATE_ORDER[a.state] - STATE_ORDER[b.state] ||
    (da && db ? da.localeCompare(db) : da ? -1 : db ? 1 : (a.kmLeft ?? Infinity) - (b.kmLeft ?? Infinity))
  );
}

/** The car's odometer as counter wheels; leading zeros are dimmed like on a real dial. */
function OdometerDigits({ value }: { value: number }) {
  const digits = String(Math.max(0, Math.round(value))).padStart(6, '0');
  const firstReal = digits.search(/[1-9]/);
  return (
    <span className="odo" aria-label={fmtKm(value)}>
      {[...digits].map((d, i) => (
        <span key={i} className={`odo-digit${firstReal === -1 || i < firstReal ? ' lead' : ''}`}>
          {d}
        </span>
      ))}
      <span className="odo-unit">km</span>
    </span>
  );
}

export function Dashboard({
  vehicle,
  odometer,
  fuel,
  services,
  reminders,
  onAddFuel,
  onAddService,
  onAddReminder,
  onUpdateOdometer,
  onAddOilReminder,
  onOpenReminders,
  driving,
  lastOdometerDate,
}: Props) {
  const summary = fuelSummary(fuel);
  const serviceCost = services.reduce((s, e) => s + e.cost, 0);
  const oil = reminders.find((r) => r.reminder.type === 'Oil change' && !r.reminder.dueDate);
  const oilUsed = oil?.reminder.intervalKm
    ? Math.min(1, Math.max(0, (odometer - oil.lastOdometer) / oil.reminder.intervalKm))
    : 0;
  const sinceReading = lastOdometerDate ? daysBetween(lastOdometerDate, today()) : undefined;
  const coming = [...reminders].sort(byUrgency);
  const missing = KEY_DATES.filter((k) => !reminders.some((r) => r.reminder.type === k.type));
  const subtitle = [vehicle.year, vehicle.make, vehicle.generation ?? vehicle.model].filter(Boolean).join(' ');
  const recent = [
    ...fuel.map((f) => ({
      id: f.id,
      date: f.date,
      icon: 'fuel' as const,
      label: `${fmtNum(f.liters)} L fuel`,
      cost: f.totalCost,
    })),
    ...services.map((s) => ({ id: s.id, date: s.date, icon: 'wrench' as const, label: s.type, cost: s.cost })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <div className="dash">
      <div className="dash-col">
        <section className="hero" aria-label={vehicle.name}>
          <div className="hero-head">
            <div className="hero-car">
              <h2>{vehicle.name}</h2>
              {(subtitle !== vehicle.name || vehicle.engine) && (
                <span className="hero-sub">
                  {subtitle}
                  {vehicle.engine && ` · ${vehicle.engine}`}
                </span>
              )}
            </div>
            {vehicle.plate && <span className="plate">{vehicle.plate}</span>}
          </div>

          <div className="hero-odo">
            <OdometerDigits value={odometer} />
            <span className="hero-note">
              {lastOdometerDate ? `Read ${fmtDate(lastOdometerDate)}` : 'No reading yet'}
              {driving && ` · about ${fmtNum(Math.round(driving.kmPerDay * 7))} km a week`}
            </span>
          </div>

          {oil ? (
            <div className="oil">
              <div className="oil-row">
                <span className="oil-label">
                  <Icon name="oil" size={16} /> Next oil change at {fmtKm(oil.dueOdometer)}
                </span>
                <ReminderBadge state={oil.state} />
              </div>
              <div
                className={`meter ${oil.state}`}
                role="meter"
                aria-label="Oil used since the last change"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(oilUsed * 100)}
              >
                <span style={{ width: `${Math.max(oilUsed * 100, 2)}%` }} />
              </div>
              <span className="hero-note">{dueText(oil)}</span>
            </div>
          ) : (
            <button className="btn small on-dark" onClick={() => onAddOilReminder(DEFAULT_OIL_INTERVAL_KM)}>
              <Icon name="oil" size={16} /> Track oil changes every {fmtKm(DEFAULT_OIL_INTERVAL_KM)}
            </button>
          )}

          <div className="hero-actions">
            <button className="btn primary" onClick={onAddFuel}>
              <Icon name="fuel" size={18} /> Fill-up
            </button>
            <button className="btn on-dark" onClick={onAddService}>
              <Icon name="wrench" size={18} /> Service
            </button>
            <button className="btn on-dark" onClick={onUpdateOdometer}>
              <Icon name="odometer" size={18} /> Odometer
            </button>
          </div>
        </section>

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

        <section className="card coming">
          <div className="card-header">
            <h3>Coming up</h3>
            {coming.length > 0 && (
              <button className="link" onClick={onOpenReminders}>
                All reminders
              </button>
            )}
          </div>
          {coming.length === 0 && <p className="empty">Nothing scheduled yet. Add your key dates below.</p>}
          <ul className="list">
            {coming.slice(0, 6).map((r) => {
              const date = whenDue(r);
              return (
                <li key={r.reminder.id} className={`list-item due ${r.state}`}>
                  <span className="date-chip" aria-hidden="true">
                    {date ? (
                      <>
                        <b>{Number(date.slice(8, 10))}</b>
                        {MONTH.format(new Date(date))}
                      </>
                    ) : (
                      <>
                        <b>{fmtNum(Math.round((r.kmLeft ?? 0) / 1000))}k</b>km
                      </>
                    )}
                  </span>
                  <div>
                    <strong>{r.reminder.type}</strong>
                    <span className="muted">{dueText(r)}</span>
                  </div>
                  <ReminderBadge state={r.state} />
                </li>
              );
            })}
          </ul>
          {missing.length > 0 && (
            <div className="quick-actions">
              {missing.map((k) => (
                <button key={k.type} className="btn small" onClick={() => onAddReminder(k.type)}>
                  <Icon name="plus" size={14} /> {k.label}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="dash-col">
        <section className="tiles" aria-label="Running costs">
          <div className="tile">
            <span className="tile-label">Consumption</span>
            <span className="tile-value">
              {fmtNum(summary.averageLPer100)} <small>L/100 km</small>
            </span>
            <span className="tile-sub">
              {summary.lastLPer100 != null ? `Last tank ${fmtNum(summary.lastLPer100)}` : 'Two full tanks needed'}
            </span>
          </div>
          <div className="tile">
            <span className="tile-label">Fuel per km</span>
            <span className="tile-value">{fmtMoney(summary.costPerKm)}</span>
            <span className="tile-sub">Avg {fmtMoney(summary.averagePricePerLiter)} / L</span>
          </div>
          <div className="tile">
            <span className="tile-label">Fuel spent</span>
            <span className="tile-value">{fmtMoney(summary.totalCost)}</span>
            <span className="tile-sub">{fuel.length} fill-up{fuel.length === 1 ? '' : 's'}</span>
          </div>
          <div className="tile">
            <span className="tile-label">Maintenance</span>
            <span className="tile-value">{fmtMoney(serviceCost)}</span>
            <span className="tile-sub">{services.length} service{services.length === 1 ? '' : 's'}</span>
          </div>
        </section>

        <section className="card chart-card">
          <ConsumptionChart segments={consumptionSegments(fuel)} />
        </section>

        <section className="card recent">
          <h3>Recent activity</h3>
          {recent.length === 0 ? (
            <p className="empty">Nothing logged yet. Add your first fill-up or service.</p>
          ) : (
            <ul className="list">
              {recent.map((r) => (
                <li key={r.id} className="list-item">
                  <span className="list-icon">
                    <Icon name={r.icon} size={18} />
                  </span>
                  <div>
                    <strong>{r.label}</strong>
                    <span className="muted">{fmtDate(r.date)}</span>
                  </div>
                  <span className="num">{fmtMoney(r.cost)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
