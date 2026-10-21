import { ConsumptionChart } from '../components/ConsumptionChart';
import { Icon } from '../components/Icon';
import { ReminderBadge } from '../components/ReminderBadge';
import { dueText } from '../reminderText';
import { consumptionSegments, daysBetween, fuelSummary, type DrivingRate, type ReminderStatus } from '../stats';
import { consumptionUnit, currentPrefs, distUnit, fmtConsumption, localeFor, fmtDate, fmtKm, fmtMoney, fmtNum, toUserDist } from '../format';
import { today } from '../store';
import { DEFAULT_OIL_INTERVAL_KM, type FuelEntry, type ServiceEntry, type Vehicle } from '../types';
import { plural, t } from '../i18n';
import type { BudgetStatus, ConsumptionAlert } from '../insights';

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
  consumptionAlert: ConsumptionAlert | null;
  budget: BudgetStatus | null;
  openFaults: number;
  onOpenFaults: () => void;
  onLogFault: () => void;
  onOpenCosts: () => void;
}

const BUDGET_STATE = { ok: 'ok', close: 'soon', over: 'overdue' } as const;

/** Things worth a look now: a tank that used too much fuel, the month's fuel budget, faults not fixed yet. */
function Watch({ alert, budget, openFaults, onOpenFaults, onLogFault, onOpenCosts }: Pick<Props, 'budget' | 'openFaults' | 'onOpenFaults' | 'onLogFault' | 'onOpenCosts'> & { alert: ConsumptionAlert | null }) {
  if (!alert && !budget && !openFaults) return null;
  return (
    <section className="card watch" aria-label={t('Worth a look')}>
      {alert && (
        <div className="watch-row warn">
          <Icon name="alert" size={20} />
          <div>
            <strong>{t('Your last tank used {n}% more fuel than usual', { n: Math.round(alert.percent) })}</strong>
            <span className="muted">
              {t('{last} {unit} instead of about {usual}. Check the tire pressure, the air filter and the brakes; if it continues, note it as a fault.', {
                last: fmtConsumption(alert.last),
                usual: fmtConsumption(alert.usual),
                unit: consumptionUnit(),
              })}
            </span>
          </div>
          <button className="btn small" onClick={onLogFault}>
            {t('Note a fault')}
          </button>
        </div>
      )}
      {budget && (
        <button className="watch-row budget" onClick={onOpenCosts}>
          <Icon name="fuel" size={20} />
          <div>
            <strong>
              {t('Fuel this month: {spent} of {budget}', { spent: fmtMoney(budget.spent), budget: fmtMoney(budget.budget) })}
            </strong>
            <div
              className={`meter ${BUDGET_STATE[budget.state]}`}
              role="meter"
              aria-label={t('Monthly fuel budget used')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round((budget.spent / budget.budget) * 100)}
            >
              <span style={{ width: `${Math.max(2, Math.min(100, (budget.spent / budget.budget) * 100))}%` }} />
            </div>
            <span className="muted">
              {budget.state === 'over'
                ? t('Over budget by {amount}.', { amount: fmtMoney(budget.spent - budget.budget) })
                : t('At this pace: about {amount} by the end of the month.', { amount: fmtMoney(budget.projected) })}
            </span>
          </div>
        </button>
      )}
      {openFaults > 0 && (
        <button className="watch-row" onClick={onOpenFaults}>
          <Icon name="wrench" size={20} />
          <div>
            <strong>{plural(openFaults, '{n} fault not fixed yet', '{n} faults not fixed yet')}</strong>
            <span className="muted">{t('See the fault log')}</span>
          </div>
        </button>
      )}
    </section>
  );
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
/** Short month for the date chips, in the chosen language. */
const shortMonth = (date: string) => new Intl.DateTimeFormat(localeFor(currentPrefs().language), { month: 'short', timeZone: 'UTC' }).format(new Date(date));

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
      <span className="odo-unit">{t('km')}</span>
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
  consumptionAlert,
  budget,
  openFaults,
  onOpenFaults,
  onLogFault,
  onOpenCosts,
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
      label: t('{n} L fuel', { n: fmtNum(f.liters) }),
      cost: f.totalCost,
    })),
    ...services.map((s) => ({ id: s.id, date: s.date, icon: 'wrench' as const, label: t(s.type), cost: s.cost })),
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
                  {vehicle.engine && ` · ${t(vehicle.engine)}`}
                </span>
              )}
            </div>
            {vehicle.plate && <span className="plate">{vehicle.plate}</span>}
          </div>

          <div className="hero-odo">
            <OdometerDigits value={odometer} />
            <span className="hero-note">
              {lastOdometerDate ? t('Read {date}', { date: fmtDate(lastOdometerDate) }) : t('No reading yet')}
              {driving && ` · ${t('about {km} a week', { km: fmtKm(driving.kmPerDay * 7) })}`}
            </span>
          </div>

          {oil ? (
            <div className="oil">
              <div className="oil-row">
                <span className="oil-label">
                  <Icon name="oil" size={16} /> {t('Next oil change at {km}', { km: fmtKm(oil.dueOdometer) })}
                </span>
                <ReminderBadge state={oil.state} />
              </div>
              <div
                className={`meter ${oil.state}`}
                role="meter"
                aria-label={t('Oil used since the last change')}
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
              <Icon name="oil" size={16} /> {t('Track oil changes every {km}', { km: fmtKm(DEFAULT_OIL_INTERVAL_KM) })}
            </button>
          )}

          <div className="hero-actions">
            <button className="btn primary" onClick={onAddFuel}>
              <Icon name="fuel" size={18} /> {t('Fill-up')}
            </button>
            <button className="btn on-dark" onClick={onAddService}>
              <Icon name="wrench" size={18} /> {t('Service')}
            </button>
            <button className="btn on-dark" onClick={onUpdateOdometer}>
              <Icon name="odometer" size={18} /> {t('Odometer')}
            </button>
          </div>
        </section>

        {(sinceReading === undefined || sinceReading > STALE_READING_DAYS) && (
          <div className="notice">
            <span>
              {sinceReading === undefined
                ? t('Add your odometer reading once a week so the app can estimate your next oil change.') : t('Your last odometer reading was {n} days ago.', { n: sinceReading })}
            </span>
            <button className="btn small primary" onClick={onUpdateOdometer}>
              {t('Update odometer')}
            </button>
          </div>
        )}

        <Watch alert={consumptionAlert} budget={budget} openFaults={openFaults} onOpenFaults={onOpenFaults} onLogFault={onLogFault} onOpenCosts={onOpenCosts} />

        <section className="card coming">
          <div className="card-header">
            <h3>{t('Coming up')}</h3>
            {coming.length > 0 && (
              <button className="link" onClick={onOpenReminders}>
                {t('All reminders')}
              </button>
            )}
          </div>
          {coming.length === 0 && <p className="empty">{t('Nothing scheduled yet. Add your key dates below.')}</p>}
          <ul className="list">
            {coming.slice(0, 6).map((r) => {
              const date = whenDue(r);
              return (
                <li key={r.reminder.id} className={`list-item due ${r.state}`}>
                  <span className="date-chip" aria-hidden="true">
                    {date ? (
                      <>
                        <b>{Number(date.slice(8, 10))}</b>
                        {shortMonth(date)}
                      </>
                    ) : (
                      <>
                        <b>{fmtNum(Math.round((r.kmLeft ?? 0) / 1000))}k</b>{t('km')}
                      </>
                    )}
                  </span>
                  <div>
                    <strong>{t(r.reminder.type)}</strong>
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
                  <Icon name="plus" size={14} /> {t(k.label)}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="dash-col">
        <section className="tiles" aria-label={t('Running costs')}>
          <div className="tile">
            <span className="tile-label">{t('Consumption')}</span>
            <span className="tile-value">
              {fmtConsumption(summary.averageLPer100)} <small>{consumptionUnit()}</small>
            </span>
            <span className="tile-sub">
              {summary.lastLPer100 != null ? t('Last tank {n}', { n: fmtConsumption(summary.lastLPer100) }) : t('Two full tanks needed')}
            </span>
          </div>
          <div className="tile">
            <span className="tile-label">{t('Fuel per {unit}', { unit: distUnit() })}</span>
            <span className="tile-value">{fmtMoney(summary.costPerKm == null ? null : summary.costPerKm / toUserDist(1))}</span>
            <span className="tile-sub">{t('Avg {price} / L', { price: fmtMoney(summary.averagePricePerLiter) })}</span>
          </div>
          <div className="tile">
            <span className="tile-label">{t('Fuel spent')}</span>
            <span className="tile-value">{fmtMoney(summary.totalCost)}</span>
            <span className="tile-sub">{plural(fuel.length, '{n} fill-up', '{n} fill-ups')}</span>
          </div>
          <div className="tile">
            <span className="tile-label">{t('Maintenance')}</span>
            <span className="tile-value">{fmtMoney(serviceCost)}</span>
            <span className="tile-sub">{plural(services.length, '{n} service', '{n} services')}</span>
          </div>
        </section>

        <section className="card chart-card">
          <ConsumptionChart segments={consumptionSegments(fuel)} />
        </section>

        <section className="card recent">
          <h3>{t('Recent activity')}</h3>
          {recent.length === 0 ? (
            <p className="empty">{t('Nothing logged yet. Add your first fill-up or service.')}</p>
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
