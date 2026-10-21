import { useMemo, useState } from 'react';
import { driveLabel, servicePlan, timingDrive, type PlanItem } from '../data/servicePlan';
import { distInput, distUnit, fmtKm, parseDist } from '../format';
import { t } from '../i18n';
import { newId, today } from '../store';
import type { Reminder, Vehicle } from '../types';

interface Props {
  vehicle: Vehicle;
  odometer: number;
  reminders: Reminder[];
  onAdd: (reminders: Reminder[]) => void;
  onEditVehicle: () => void;
}

interface Row extends PlanItem {
  checked: boolean;
  km: string;
  months: string;
  lastKm: string;
}

/** Suggested maintenance for the car's engine; the owner ticks, adjusts and adds them as reminders. */
export function ServicePlanCard({ vehicle, odometer, reminders, onAdd, onEditVehicle }: Props) {
  const tracked = useMemo(() => new Set(reminders.map((r) => r.type)), [reminders]);
  const plan = useMemo(() => servicePlan(vehicle).filter((i) => !tracked.has(i.type)), [vehicle, tracked]);
  const [rows, setRows] = useState<Row[]>(() =>
    plan.map((i) => ({
      ...i,
      checked: i.recommended,
      km: distInput(i.intervalKm),
      months: i.intervalMonths?.toString() ?? '',
      lastKm: distInput(odometer),
    })),
  );
  const [open, setOpen] = useState(false);
  const drive = timingDrive(vehicle);

  const set = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const selected = rows.filter((r) => r.checked && (r.km || r.months));

  const add = () => {
    onAdd(
      selected.map((r) => ({
        id: newId(),
        vehicleId: vehicle.id,
        type: r.type,
        intervalKm: r.km ? parseDist(r.km) : undefined,
        intervalMonths: r.months ? Number(r.months) : undefined,
        lastDate: today(),
        lastOdometer: r.lastKm ? parseDist(r.lastKm) : odometer,
      })),
    );
    setOpen(false);
  };

  if (!vehicle.engine) {
    return (
      <section className="card">
        <h3>{t('Service plan')}</h3>
        <p className="muted">{t('Choose the engine of this car to get a suggested service plan.')}</p>
        <button className="btn small" onClick={onEditVehicle}>
          {t('Choose the engine')}
        </button>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="card-header">
        <h3>{t('Service plan')}</h3>
        {plan.length > 0 && !open && (
          <button className="btn small primary" onClick={() => setOpen(true)}>
            {t('Review suggestions')}
          </button>
        )}
      </div>
      <p className="muted">
        {t(vehicle.engine)} · {t(driveLabel[drive.drive])}
      </p>
      {plan.length === 0 && <p className="empty">{t('Everything in the suggested plan is already tracked.')}</p>}
      {plan.length > 0 && !open && (
        <p className="muted">{t('{n} typical maintenance items are not tracked yet.', { n: plan.length })}</p>
      )}
      {open && (
        <>
          <p className="hint">{t('Typical intervals: check your manual or garage. Set when each item was last done.')}</p>
          <ul className="list plan">
            {rows.map((r, i) => (
              <li key={r.type} className="plan-row">
                <label className="check">
                  <input type="checkbox" checked={r.checked} onChange={(e) => set(i, { checked: e.target.checked })} />
                  <strong>{t(r.type)}</strong>
                </label>
                {r.note && <span className="hint">{t(r.note)}</span>}
                {r.checked && (
                  <div className="row three">
                    <label>
                      {t('Every ({unit})', { unit: distUnit() })}
                      <input type="number" min="0" value={r.km} onChange={(e) => set(i, { km: e.target.value })} />
                    </label>
                    <label>
                      {t('Every (months)')}
                      <input type="number" min="0" value={r.months} onChange={(e) => set(i, { months: e.target.value })} />
                    </label>
                    <label>
                      {t('Last done at')}
                      <input
                        type="number"
                        min="0"
                        value={r.lastKm}
                        placeholder={fmtKm(odometer)}
                        onChange={(e) => set(i, { lastKm: e.target.value })}
                      />
                    </label>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="actions">
            <button className="btn ghost" onClick={() => setOpen(false)}>
              {t('Cancel')}
            </button>
            <button className="btn primary" onClick={add} disabled={!selected.length}>
              {t('Add {n} reminders', { n: selected.length })}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
