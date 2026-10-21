// Decides which reminder emails are due. Pure functions, so they can be unit tested.
import { calendarItems } from '../src/calendar.ts';
import { applyPrefs, fmtDate, fmtKm } from '../src/format.ts';
import { setLanguage, t } from '../src/i18n.ts';
import { dueText } from '../src/reminderText.ts';
import { daysBetween, vehicleOverview } from '../src/stats.ts';
import { normalizeData, prefsOf } from '../src/types.ts';

/** Emails use the owner's language, currency and units, like the app. */
export function useDataPrefs(data) {
  const prefs = prefsOf(normalizeData(data));
  applyPrefs(prefs);
  setLanguage(prefs.language);
}

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Each reminder can trigger up to three emails: when it becomes due soon, a
 * week before a date, and when overdue. The key includes the due point, so
 * renewing a reminder (new date or new service) starts over.
 */
function stageOf(status) {
  if (status.state === 'overdue') return 'overdue';
  if (status.daysLeft !== undefined && status.daysLeft <= 7) return 'week';
  if (status.state === 'soon') return 'soon';
  return null;
}

export function collectAlerts(data, { today, soonDays, sent }) {
  const alerts = [];
  data = normalizeData(data);
  useDataPrefs(data);
  for (const vehicle of data.vehicles) {
    for (const status of vehicleOverview(vehicle, data, today, soonDays).statuses) {
      const reminder = status.reminder;
      const stage = stageOf(status);
      if (!stage) continue;
      const key = [reminder.id, stage, status.dueDate ?? '', status.dueOdometer ?? ''].join('|');
      alerts.push({ key, isNew: !(key in sent), vehicle: vehicle.name, type: t(reminder.type), state: status.state, text: dueText(status) });
    }
  }
  return alerts;
}

export function reminderEmail(alerts, appUrl) {
  const fresh = alerts.filter((a) => a.isNew);
  const overdue = fresh.filter((a) => a.state === 'overdue').length;
  const subject =
    fresh.length === 1
      ? `${fresh[0].type} (${fresh[0].vehicle}): ${fresh[0].state === 'overdue' ? t('overdue') : t('coming up')}`
      : overdue
        ? t('{n} car reminders, {overdue} overdue', { n: fresh.length, overdue })
        : t('{n} car reminders', { n: fresh.length });
  const line = (a) => `${a.vehicle} · ${a.type}: ${a.text}`;
  const others = alerts.filter((a) => !a.isNew);
  const text = [
    t('Car Maintenance reminder'),
    '',
    ...fresh.map((a) => `- ${line(a)}`),
    ...(others.length ? ['', t('Still pending:'), ...others.map((a) => `- ${line(a)}`)] : []),
    ...(appUrl ? ['', t('Open the app: {url}', { url: appUrl })] : []),
  ].join('\n');
  const li = (a) =>
    `<li><strong>${escape(a.type)}</strong> (${escape(a.vehicle)}): <span style="color:${a.state === 'overdue' ? '#d03b3b' : '#52514e'}">${escape(a.text)}</span></li>`;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5">
<h2 style="margin:0 0 8px">${escape(t('Car Maintenance reminder'))}</h2>
<ul>${fresh.map(li).join('')}</ul>
${others.length ? `<p style="margin-bottom:0">${escape(t('Still pending:'))}</p><ul>${others.map(li).join('')}</ul>` : ''}
${appUrl ? `<p><a href="${escape(appUrl)}">${escape(t('Open the app'))}</a></p>` : ''}
</div>`;
  return { subject, text, html };
}

/** Days after which a car's odometer is considered out of date in the weekly email. */
const STALE_DAYS = 7;
/** The weekly email lists dated items coming up within this many days. */
const UPCOMING_DAYS = 60;

/**
 * The end-of-week email: asks for each car's odometer reading and lists what
 * is coming up, so the estimates stay current.
 */
export function weeklyCheckinEmail(data, { today, appUrl }) {
  data = normalizeData(data);
  useDataPrefs(data);
  const upcoming = calendarItems(data, today).filter((i) => daysBetween(today, i.date) <= UPCOMING_DAYS);
  const cars = data.vehicles.map((vehicle) => {
    const o = vehicleOverview(vehicle, data, today);
    const oil = o.statuses.find((s) => s.reminder.type === 'Oil change' && !s.reminder.dueDate);
    const age = o.lastOdometerDate ? daysBetween(o.lastOdometerDate, today) : undefined;
    return {
      name: vehicle.name,
      odometer: o.lastOdometerDate ? t('{km} on {date}', { km: fmtKm(o.odometer), date: fmtDate(o.lastOdometerDate) }) : fmtKm(o.odometer),
      stale: age === undefined || age >= STALE_DAYS,
      perWeek: o.driving ? t('{km} a week', { km: fmtKm(o.driving.kmPerDay * 7) }) : null,
      oil: oil ? t('Next oil change at {km}: {due}', { km: fmtKm(oil.dueOdometer), due: dueText(oil) }) : null,
    };
  });
  const asks = cars.filter((c) => c.stale).map((c) => c.name);
  const subject = asks.length ? t('Odometer check-in: {cars}', { cars: asks.join(', ') }) : t('Car Maintenance: your week ahead');
  const carLines = cars.flatMap((c) => [
    `${c.name}: ${t('last reading {odometer}', { odometer: c.odometer })}${c.perWeek ? `, ${t('about {perWeek}', { perWeek: c.perWeek })}` : ''}`,
    ...(c.oil ? [`  ${c.oil}`] : []),
  ]);
  const text = [
    asks.length
      ? t("Please add this week's odometer reading for {cars}: open the app and tap Update odometer.", { cars: asks.join(' & ') })
      : t('Your odometer readings are up to date.'),
    '',
    ...carLines,
    '',
    upcoming.length ? t('Coming up in the next {n} days:', { n: UPCOMING_DAYS }) : t('Nothing due in the next {n} days.', { n: UPCOMING_DAYS }),
    ...upcoming.map((i) => `- ${fmtDate(i.date)}: ${i.title}`),
    ...(appUrl ? ['', t('Open the app: {url}', { url: appUrl })] : []),
  ].join('\n');
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5">
<p><strong>${escape(asks.length ? t("Please add this week's odometer reading for {cars}: open the app and tap Update odometer.", { cars: asks.join(' & ') }) : t('Your odometer readings are up to date.'))}</strong></p>
${cars
  .map(
    (c) =>
      `<p style="margin:12px 0 0"><strong>${escape(c.name)}</strong><br>${escape(t('last reading {odometer}', { odometer: c.odometer }))}${c.perWeek ? `, ${escape(t('about {perWeek}', { perWeek: c.perWeek }))}` : ''}${c.oil ? `<br>${escape(c.oil)}` : ''}</p>`,
  )
  .join('')}
<p style="margin:16px 0 4px">${escape(upcoming.length ? t('Coming up in the next {n} days:', { n: UPCOMING_DAYS }) : t('Nothing due in the next {n} days.', { n: UPCOMING_DAYS }))}</p>
${upcoming.length ? `<ul style="margin:0">${upcoming.map((i) => `<li>${escape(fmtDate(i.date))}: ${escape(i.title)}</li>`).join('')}</ul>` : ''}
${appUrl ? `<p><a href="${escape(appUrl)}">${escape(t('Open the app'))}</a></p>` : ''}
</div>`;
  return { subject, text, html };
}
