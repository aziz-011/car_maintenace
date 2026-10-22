import { Icon } from '../components/Icon';
import { ServicePlanCard } from '../components/ServicePlanCard';
import { fileUrl, isImage } from '../files';
import { daysBetween, type ReminderStatus } from '../stats';
import { fmtDate, fmtKm, fmtNum } from '../format';
import { t } from '../i18n';
import { today } from '../store';
import { TIRE_SEASON_LABEL, type CarDocument, type Reminder, type TireSet, type Vehicle } from '../types';
import { RemindersView } from './RemindersView';

interface Props {
  vehicle: Vehicle;
  odometer: number;
  documents: CarDocument[];
  tires: TireSet[];
  statuses: ReminderStatus[];
  onEditVehicle: () => void;
  onAddDocument: () => void;
  onEditDocument: (d: CarDocument) => void;
  onDeleteDocument: (d: CarDocument) => void;
  onFitTires: () => void;
  onEditTires: (t: TireSet) => void;
  onDeleteTires: (t: TireSet) => void;
  onAddPlan: (reminders: Reminder[]) => void;
  onAddReminder: () => void;
  onEditReminder: (r: Reminder) => void;
  onRenewReminder: (r: Reminder) => void;
  onDeleteReminder: (r: Reminder) => void;
}

/** The car's paperwork and equipment: details, service plan, documents, tires and reminders. */
export function CarView(props: Props) {
  const { vehicle, odometer, documents, tires, statuses } = props;
  const now = today();
  const docs = [...documents].sort((a, b) => (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999'));
  const sets = [...tires].sort((a, b) => b.fittedDate.localeCompare(a.fittedDate));
  const fitted = sets.filter((s) => !s.removedDate);
  const removed = sets.filter((s) => s.removedDate);
  const subtitle = [vehicle.year, vehicle.make, vehicle.generation ?? vehicle.model].filter(Boolean).join(' ');

  const expiry = (d: CarDocument) => {
    if (!d.expiryDate) return null;
    const days = daysBetween(now, d.expiryDate);
    const state = days <= 0 ? 'overdue' : days <= 30 ? 'soon' : 'ok';
    const label = days <= 0 ? t('✕ Expired') : days <= 30 ? t('! Expires soon') : t('✓ Valid');
    return { state, label };
  };

  const tireLine = (s: TireSet) => {
    const endKm = s.removedOdometer ?? odometer;
    const endDate = s.removedDate ?? now;
    const years = daysBetween(s.fittedDate, endDate) / 365.25;
    return t('{km} driven · {years} years', { km: fmtKm(Math.max(0, endKm - s.fittedOdometer)), years: fmtNum(Math.round(years * 10) / 10) });
  };

  return (
    <div className="stack">
      <section className="card car-card">
        <div className="card-header">
          <div>
            <h3>{vehicle.name}</h3>
            <span className="muted">
              {subtitle}
              {vehicle.engine && ` · ${t(vehicle.engine)}`}
            </span>
          </div>
          <button className="btn small" onClick={props.onEditVehicle}>
            {t('Edit')}
          </button>
        </div>
        <dl className="facts">
          <div>
            <dt>{t('Odometer')}</dt>
            <dd>{fmtKm(odometer)}</dd>
          </div>
          {vehicle.plate && (
            <div>
              <dt>{t('Plate')}</dt>
              <dd>{vehicle.plate}</dd>
            </div>
          )}
          {fitted[0] && (
            <div>
              <dt>{t('Tires')}</dt>
              <dd>{[fitted[0].brand, fitted[0].size].filter(Boolean).join(' · ')}</dd>
            </div>
          )}
        </dl>
      </section>

      <ServicePlanCard
        key={`${vehicle.id}|${vehicle.engine}|${statuses.length}`}
        vehicle={vehicle}
        odometer={odometer}
        reminders={statuses.map((s) => s.reminder)}
        onAdd={props.onAddPlan}
        onEditVehicle={props.onEditVehicle}
      />

      <section className="card">
        <div className="card-header">
          <h3>{t('Documents')}</h3>
          <button className="btn small primary" onClick={props.onAddDocument}>
            <Icon name="plus" size={14} /> {t('Document')}
          </button>
        </div>
        {docs.length === 0 ? (
          <p className="empty">{t('Keep photos of the carte grise, insurance certificate and inspection report here.')}</p>
        ) : (
          <ul className="list">
            {docs.map((d) => {
              const e = expiry(d);
              const thumbs = (d.attachments ?? []).filter(isImage).slice(0, 3);
              return (
                <li key={d.id} className="list-item">
                  <div>
                    <strong>{t(d.type)}</strong>
                    <span className="muted">
                      {[d.number, d.expiryDate && t('expires {date}', { date: fmtDate(d.expiryDate) })].filter(Boolean).join(' · ') ||
                        t('No expiry date')}
                    </span>
                    {thumbs.length > 0 && (
                      <div className="thumbs">
                        {thumbs.map((a) => (
                          <a key={a.id} href={fileUrl(a)} target="_blank" rel="noreferrer">
                            <img src={fileUrl(a)} alt={a.name} loading="lazy" />
                          </a>
                        ))}
                        {(d.attachments?.length ?? 0) > thumbs.length && <span className="muted">+{(d.attachments?.length ?? 0) - thumbs.length}</span>}
                      </div>
                    )}
                  </div>
                  <div className="list-end">
                    {e && <span className={`badge ${e.state}`}>{e.label}</span>}
                    <span className="row-actions">
                      <button className="link" onClick={() => props.onEditDocument(d)}>
                        {t('Edit')}
                      </button>
                      <button className="link danger" onClick={() => props.onDeleteDocument(d)}>
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

      <section className="card">
        <div className="card-header">
          <h3>{t('Tires')}</h3>
          <button className="btn small primary" onClick={props.onFitTires}>
            <Icon name="plus" size={14} /> {t('Fit new tires')}
          </button>
        </div>
        {sets.length === 0 && <p className="empty">{t('Add the tires on the car to follow their distance and age.')}</p>}
        <ul className="list">
          {[...fitted, ...removed].map((s) => (
            <li key={s.id} className="list-item">
              <div>
                <strong>
                  {[s.brand, s.model].filter(Boolean).join(' ')} <span className="tag">{t(TIRE_SEASON_LABEL[s.season])}</span>
                  {!s.removedDate && <span className="tag on">{t('On the car')}</span>}
                </strong>
                <span className="muted">
                  {[s.size, t('fitted {date} at {km}', { date: fmtDate(s.fittedDate), km: fmtKm(s.fittedOdometer) })].filter(Boolean).join(' · ')}
                </span>
                <span className="muted">
                  {tireLine(s)}
                  {s.removedDate && ` · ${t('removed {date}', { date: fmtDate(s.removedDate) })}`}
                </span>
              </div>
              <span className="row-actions">
                <button className="link" onClick={() => props.onEditTires(s)}>
                  {t('Edit')}
                </button>
                <button className="link danger" onClick={() => props.onDeleteTires(s)}>
                  {t('Delete')}
                </button>
              </span>
            </li>
          ))}
        </ul>
        {fitted.length > 0 && <p className="hint">{t('Fitting a new set marks the current one as removed today.')}</p>}
      </section>

      <RemindersView
        statuses={statuses}
        onAdd={props.onAddReminder}
        onEdit={props.onEditReminder}
        onRenew={props.onRenewReminder}
        onDelete={props.onDeleteReminder}
      />
    </div>
  );
}
