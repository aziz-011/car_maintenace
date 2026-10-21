import { useEffect, useRef, useState } from 'react';
import { monthlyCosts, priceHistory, stationStats, yearlyCosts, type MonthCost, type PricePoint } from '../costs';
import { consumptionUnit, distUnit, fmtConsumption, fmtDate, fmtKm, fmtMoney, fmtMonth, fmtNum, toUserDist } from '../format';
import { plural, t } from '../i18n';
import { budgetStatus, compareCars, driverStats, forecast } from '../insights';
import { today } from '../store';
import type { AppData, FuelEntry, OdometerReading, ServiceEntry, Trip, Vehicle } from '../types';

interface Props {
  vehicle: Vehicle;
  data: AppData;
  fuel: FuelEntry[];
  services: ServiceEntry[];
  readings: OdometerReading[];
  trips: Trip[];
  nameOf: (driver?: string) => string;
  onSetBudget: (amount: number | undefined) => void;
}

const perUnit = (perKm: number | null) => (perKm == null ? null : perKm / toUserDist(1));

/** The monthly fuel budget: set or change it, and see how this month is going. */
function BudgetCard({ vehicle, fuel, onSetBudget }: Pick<Props, 'vehicle' | 'fuel' | 'onSetBudget'>) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(vehicle.fuelBudget?.toString() ?? '');
  const status = budgetStatus(vehicle, fuel, today());
  return (
    <section className="card">
      <div className="card-header">
        <h3>{t('Monthly fuel budget')}</h3>
        {!editing && (
          <button className="btn small" onClick={() => setEditing(true)}>
            {vehicle.fuelBudget ? t('Change') : t('Set a budget')}
          </button>
        )}
      </div>
      {editing ? (
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSetBudget(Number(value) > 0 ? Number(value) : undefined);
            setEditing(false);
          }}
        >
          <label>
            {t('Budget per month')}
            <input type="number" min="0" step="1" autoFocus value={value} onChange={(e) => setValue(e.target.value)} />
          </label>
          <button className="btn primary">{t('Save')}</button>
          <button type="button" className="btn ghost" onClick={() => setEditing(false)}>
            {t('Cancel')}
          </button>
        </form>
      ) : status ? (
        <>
          <div className="budget-line">
            <span className="figure">{fmtMoney(status.spent)}</span>
            <span className="muted">{t('of {budget} this month', { budget: fmtMoney(status.budget) })}</span>
          </div>
          <div className={`meter ${{ ok: 'ok', close: 'soon', over: 'overdue' }[status.state]}`} aria-hidden="true">
            <span style={{ width: `${Math.max(2, Math.min(100, (status.spent / status.budget) * 100))}%` }} />
          </div>
          <p className="hint">
            {status.state === 'over'
              ? t('Over budget by {amount}.', { amount: fmtMoney(status.spent - status.budget) })
              : t('At this pace: about {amount} by the end of the month.', { amount: fmtMoney(status.projected) })}{' '}
            {t('You get a warning on the overview, and by email with the home server, when it gets close.')}
          </p>
        </>
      ) : (
        <p className="empty">{t('Set how much you want to spend on fuel each month to be warned before going over.')}</p>
      )}
    </section>
  );
}

/** Next 12 months: fuel at the current pace plus the maintenance that falls due. */
function ForecastCard({ vehicle, data }: Pick<Props, 'vehicle' | 'data'>) {
  const f = forecast(vehicle, data, today());
  const [open, setOpen] = useState(false);
  const shown = open ? f.items : f.items.slice(0, 5);
  return (
    <section className="card">
      <div className="card-header">
        <h3>{t('Next 12 months')}</h3>
        {f.total != null && <span className="figure">≈ {fmtMoney(f.total)}</span>}
      </div>
      <dl className="facts">
        <div>
          <dt>{t('Fuel')}</dt>
          <dd>{f.fuel != null ? fmtMoney(f.fuel) : '—'}</dd>
        </div>
        <div>
          <dt>{t('Maintenance')}</dt>
          <dd>{fmtMoney(f.services)}</dd>
        </div>
        <div>
          <dt>{t('Distance')}</dt>
          <dd>{f.km != null ? fmtKm(f.km) : '—'}</dd>
        </div>
      </dl>
      {f.fuel == null && <p className="hint">{t('The fuel estimate needs two odometer values a week apart and two fill-ups.')}</p>}
      {f.items.length > 0 ? (
        <>
          <ul className="list">
            {shown.map((i, n) => (
              <li key={`${i.reminderId}-${n}`} className="list-item">
                <div>
                  <strong>{t(i.type)}</strong>
                  <span className="muted">{fmtDate(i.date)}</span>
                </div>
                <span className="num">{i.cost != null ? fmtMoney(i.cost) : t('cost unknown')}</span>
              </li>
            ))}
          </ul>
          {f.items.length > 5 && (
            <button className="link" onClick={() => setOpen(!open)}>
              {open ? t('Show less') : t('Show all {n}', { n: f.items.length })}
            </button>
          )}
          {f.unknown > 0 && (
            <p className="hint">
              {plural(f.unknown, '{n} item has no known cost', '{n} items have no known cost')}
              {'. '}
              {t('Set a usual cost on the reminder, or log the service once with its price.')}
            </p>
          )}
        </>
      ) : (
        <p className="empty">{t('Nothing falls due in the next 12 months.')}</p>
      )}
    </section>
  );
}

/** Width of the element, so charts draw in real pixels and text stays readable. */
function useWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Round axis steps (1, 2, 5 × 10^n) so tick labels are values people read easily. */
function niceMax(value: number) {
  if (value <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(value));
  return [1, 2, 2.5, 5, 10].map((m) => m * step).find((v) => v >= value)!;
}

const PAD = { top: 16, right: 8, bottom: 26, left: 52 };

function MonthlyBars({ months }: { months: MonthCost[] }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = W < 480 ? 200 : 240;
  const max = niceMax(Math.max(...months.map((m) => m.fuel + m.service)));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / months.length;
  const barW = Math.max(6, Math.min(32, slot * 0.62));
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, max / 2, max];
  const active = hover !== null ? months[hover] : null;
  const peak = months.reduce((best, m, i) => (m.fuel + m.service > months[best].fuel + months[best].service ? i : best), 0);

  /** A bar segment with rounded top corners only when it is the top of the stack. */
  const segment = (x: number, top: number, bottom: number, roundTop: boolean) => {
    const h = Math.max(0, bottom - top);
    const r = roundTop ? Math.min(4, h, barW / 2) : 0;
    return `M${x},${bottom} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${bottom} Z`;
  };

  return (
    <div className="chart chart-wrap" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('Monthly fuel and maintenance spending')}>
        {ticks.map((v) => (
          <g key={v}>
            <line className="grid" x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} />
            <text className="axis" x={PAD.left - 6} y={y(v)} textAnchor="end" dominantBaseline="middle">
              {fmtNum(v)}
            </text>
          </g>
        ))}
        {months.map((m, i) => {
          const x = PAD.left + i * slot + (slot - barW) / 2;
          const fuelTop = y(m.fuel);
          const totalTop = y(m.fuel + m.service);
          const label = i % (W < 480 ? 3 : 2) === 0 || i === months.length - 1;
          return (
            <g key={m.month} className={hover === i ? 'bar hovered' : 'bar'}>
              {m.fuel > 0 && <path className="seg-fuel" d={segment(x, fuelTop, y(0), m.service === 0)} />}
              {/* A 2px surface gap separates the two segments. */}
              {m.service > 0 && <path className="seg-service" d={segment(x, totalTop, fuelTop - (m.fuel > 0 ? 2 : 0), true)} />}
              {label && (
                <text className="axis" x={x + barW / 2} y={H - 8} textAnchor="middle">
                  {fmtMonth(m.month + '-01').replace(/\s?\d{4}$/, '')}
                </text>
              )}
              {i === peak && m.fuel + m.service > 0 && (
                <text className="bar-label" x={x + barW / 2} y={totalTop - 5} textAnchor="middle">
                  {fmtNum(Math.round(m.fuel + m.service))}
                </text>
              )}
              <rect
                x={PAD.left + i * slot}
                y={PAD.top}
                width={slot}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onTouchStart={() => setHover(i)}
              />
            </g>
          );
        })}
      </svg>
      {active && hover !== null && (
        <div className="tooltip" style={{ left: `${((PAD.left + (hover + 0.5) * slot) / W) * 100}%`, top: `${(y(active.fuel + active.service) / H) * 100}%` }}>
          <strong>{fmtMonth(active.month + '-01')}</strong>
          <span>
            <i className="swatch fuel" /> {t('Fuel')}: {fmtMoney(active.fuel)}
          </span>
          <span>
            <i className="swatch service" /> {t('Maintenance')}: {fmtMoney(active.service)}
          </span>
          <span>
            {t('Total')}: {fmtMoney(active.fuel + active.service)}
          </span>
        </div>
      )}
    </div>
  );
}

function PriceLine({ points }: { points: PricePoint[] }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = W < 480 ? 170 : 200;
  const prices = points.map((p) => p.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const pad = Math.max((hi - lo) * 0.15, hi * 0.02);
  const min = lo - pad;
  const max = hi + pad;
  const t0 = Date.parse(points[0].date);
  const span = Math.max(1, Date.parse(points[points.length - 1].date) - t0);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (d: string) => PAD.left + ((Date.parse(d) - t0) / span) * innerW;
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * innerH;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date)},${y(p.price)}`).join(' ');
  const ticks = [min + (max - min) * 0.1, (min + max) / 2, max - (max - min) * 0.1];
  const active = hover !== null ? points[hover] : null;

  return (
    <div className="chart chart-wrap" ref={ref}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t('Fuel price per litre over time')}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - box.left) / box.width) * W;
          let best = 0;
          points.forEach((p, i) => {
            if (Math.abs(x(p.date) - px) < Math.abs(x(points[best].date) - px)) best = i;
          });
          setHover(best);
        }}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line className="grid" x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} />
            <text className="axis" x={PAD.left - 6} y={y(v)} textAnchor="end" dominantBaseline="middle">
              {v.toFixed(3)}
            </text>
          </g>
        ))}
        <text className="axis" x={PAD.left} y={H - 8}>
          {fmtDate(points[0].date)}
        </text>
        <text className="axis" x={W - PAD.right} y={H - 8} textAnchor="end">
          {fmtDate(points[points.length - 1].date)}
        </text>
        {active && <line className="crosshair" x1={x(active.date)} x2={x(active.date)} y1={PAD.top} y2={H - PAD.bottom} />}
        <path className="series-line" d={path} />
        {points.map((p, i) => (
          <circle key={i} className="series-dot" cx={x(p.date)} cy={y(p.price)} r={hover === i ? 5 : 4} onTouchStart={() => setHover(i)} />
        ))}
      </svg>
      {active && (
        <div className="tooltip" style={{ left: `${(x(active.date) / W) * 100}%`, top: `${(y(active.price) / H) * 100}%` }}>
          <strong>{t('{price} per litre', { price: fmtMoney(active.price) })}</strong>
          <span>{fmtDate(active.date)}</span>
          {active.station && <span>{active.station}</span>}
        </div>
      )}
    </div>
  );
}

/** Where the money goes: month by month, year by year, and what fuel costs at each station. */
export function CostsView({ vehicle, data, fuel, services, readings, trips, nameOf, onSetBudget }: Props) {
  const now = today();
  const months = monthlyCosts(fuel, services, now);
  const years = yearlyCosts(fuel, services, readings);
  const prices = priceHistory(fuel);
  const stations = stationStats(fuel, now);
  const last12 = months.reduce((s, m) => s + m.fuel + m.service, 0);
  const anySpending = months.some((m) => m.fuel || m.service);
  const cars = data.vehicles.length > 1 ? compareCars(data, now) : [];
  const drivers = driverStats(fuel, services, trips);

  return (
    <div className="stack">
      <ForecastCard key={vehicle.id} vehicle={vehicle} data={data} />
      <BudgetCard key={`${vehicle.id}-${vehicle.fuelBudget}`} vehicle={vehicle} fuel={fuel} onSetBudget={onSetBudget} />

      <section className="card">
        <div className="card-header">
          <h3>{t('Last 12 months')}</h3>
          <span className="figure">{fmtMoney(last12)}</span>
        </div>
        {anySpending ? (
          <>
            <div className="legend">
              <span>
                <i className="swatch fuel" /> {t('Fuel')}
              </span>
              <span>
                <i className="swatch service" /> {t('Maintenance')}
              </span>
            </div>
            <MonthlyBars months={months} />
          </>
        ) : (
          <p className="empty">{t('Spending appears here once you log fill-ups or services.')}</p>
        )}
      </section>

      <section className="card">
        <h3>{t('By year')}</h3>
        {years.length === 0 ? (
          <p className="empty">{t('No spending logged yet.')}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('Year')}</th>
                  <th className="num">{t('Fuel')}</th>
                  <th className="num">{t('Maintenance')}</th>
                  <th className="num">{t('Total')}</th>
                  <th className="num">{t('Distance')}</th>
                  <th className="num">{t('Per {unit}', { unit: distUnit() })}</th>
                </tr>
              </thead>
              <tbody>
                {years.map((y) => (
                  <tr key={y.year}>
                    <td>{y.year}</td>
                    <td className="num">{fmtMoney(y.fuel)}</td>
                    <td className="num">{fmtMoney(y.service)}</td>
                    <td className="num">
                      <strong>{fmtMoney(y.fuel + y.service)}</strong>
                    </td>
                    <td className="num">{y.distance ? fmtKm(y.distance) : '—'}</td>
                    <td className="num">{y.distance ? fmtMoney((y.fuel + y.service) / toUserDist(y.distance)) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="hint">{t('Distance counts from the first to the last odometer value logged that year.')}</p>
      </section>

      <section className="card">
        <h3>{t('Fuel price')}</h3>
        {prices.length < 2 ? (
          <p className="empty">{t('Log two or more fill-ups to follow the price per litre.')}</p>
        ) : (
          <PriceLine points={prices} />
        )}
      </section>

      <section className="card">
        <h3>{t('Stations')}</h3>
        {stations.length === 0 ? (
          <p className="empty">{t('Choose the station when you log a fill-up to compare prices.')}</p>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('Station')}</th>
                    <th className="num">{t('Average / L')}</th>
                    <th className="num">{t('Last / L')}</th>
                    <th className="num">{t('Fill-ups')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stations.map((s, i) => (
                    <tr key={s.station}>
                      <td>
                        {s.station}
                        {i === 0 && stations.length > 1 && <span className="tag on">{t('Cheapest')}</span>}
                      </td>
                      <td className="num">{fmtMoney(s.averagePrice)}</td>
                      <td className="num">
                        {fmtMoney(s.lastPrice)}
                        <div className="muted">{fmtDate(s.lastDate)}</div>
                      </td>
                      <td className="num">{s.fills}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="hint">{t('Average price paid over the last 12 months, weighted by litres.')}</p>
          </>
        )}
      </section>

      {cars.length > 0 && (
        <section className="card">
          <h3>{t('Your cars side by side')}</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('Car')}</th>
                  <th className="num">{consumptionUnit()}</th>
                  <th className="num">{t('Fuel per {unit}', { unit: distUnit() })}</th>
                  <th className="num">{t('All costs per {unit}', { unit: distUnit() })}</th>
                  <th className="num">{t('Per week')}</th>
                  <th className="num">{t('Spent, 12 months')}</th>
                </tr>
              </thead>
              <tbody>
                {cars.map((c) => (
                  <tr key={c.vehicle.id} className={c.vehicle.id === vehicle.id ? 'current' : undefined}>
                    <td>{c.vehicle.name}</td>
                    <td className="num">{fmtConsumption(c.consumption)}</td>
                    <td className="num">{fmtMoney(perUnit(c.fuelPerKm))}</td>
                    <td className="num">{fmtMoney(perUnit(c.costPerKm))}</td>
                    <td className="num">{c.kmPerWeek != null ? fmtKm(c.kmPerWeek) : '—'}</td>
                    <td className="num">{fmtMoney(c.spent12m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint">{t('All costs per km counts fuel and maintenance over the last 12 months.')}</p>
        </section>
      )}

      {drivers.length > 0 && (
        <section className="card">
          <h3>{t('By driver')}</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('Driver')}</th>
                  <th className="num">{t('Fill-ups')}</th>
                  <th className="num">{t('Fuel')}</th>
                  <th className="num">{t('Maintenance')}</th>
                  <th className="num">{t('Trips')}</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.driver}>
                    <td>{nameOf(d.driver)}</td>
                    <td className="num">{d.fills}</td>
                    <td className="num">{fmtMoney(d.fuelCost)}</td>
                    <td className="num">{fmtMoney(d.serviceCost)}</td>
                    <td className="num">{d.tripKm ? fmtKm(d.tripKm) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint">{t('For this car. Entries logged before names were set are not counted here.')}</p>
        </section>
      )}
    </div>
  );
}
