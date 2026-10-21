// Decides which reminder emails are due. Pure functions, so they can be unit tested.
import { calendarItems } from '../src/calendar.ts';
import { fmtDate, fmtKm } from '../src/format.ts';
import { dueText } from '../src/reminderText.ts';
import { daysBetween, vehicleOverview } from '../src/stats.ts';
import { normalizeData } from '../src/types.ts';

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
  for (const vehicle of data.vehicles) {
    for (const status of vehicleOverview(vehicle, data, today, soonDays).statuses) {
      const reminder = status.reminder;
      const stage = stageOf(status);
      if (!stage) continue;
      const key = [reminder.id, stage, status.dueDate ?? '', status.dueOdometer ?? ''].join('|');
      alerts.push({ key, isNew: !(key in sent), vehicle: vehicle.name, type: reminder.type, state: status.state, text: dueText(status) });
    }
  }
  return alerts;
}

export function reminderEmail(alerts, appUrl) {
  const fresh = alerts.filter((a) => a.isNew);
  const overdue = fresh.filter((a) => a.state === 'overdue').length;
  const subject =
    fresh.length === 1
      ? `${fresh[0].type} (${fresh[0].vehicle}): ${fresh[0].state === 'overdue' ? 'overdue' : 'coming up'}`
      : `${fresh.length} car reminders${overdue ? `, ${overdue} overdue` : ''}`;
  const line = (a) => `${a.vehicle} · ${a.type}: ${a.text}`;
  const others = alerts.filter((a) => !a.isNew);
  const text = [
    'Car Maintenance reminder',
    '',
    ...fresh.map((a) => `- ${line(a)}`),
    ...(others.length ? ['', 'Still pending:', ...others.map((a) => `- ${line(a)}`)] : []),
    ...(appUrl ? ['', `Open the app: ${appUrl}`] : []),
  ].join('\n');
  const li = (a) =>
    `<li><strong>${escape(a.type)}</strong> (${escape(a.vehicle)}): <span style="color:${a.state === 'overdue' ? '#d03b3b' : '#52514e'}">${escape(a.text)}</span></li>`;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5">
<h2 style="margin:0 0 8px">Car Maintenance reminder</h2>
<ul>${fresh.map(li).join('')}</ul>
${others.length ? `<p style="margin-bottom:0">Still pending:</p><ul>${others.map(li).join('')}</ul>` : ''}
${appUrl ? `<p><a href="${escape(appUrl)}">Open the app</a></p>` : ''}
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
  const upcoming = calendarItems(data, today).filter((i) => daysBetween(today, i.date) <= UPCOMING_DAYS);
  const cars = data.vehicles.map((vehicle) => {
    const o = vehicleOverview(vehicle, data, today);
    const oil = o.statuses.find((s) => s.reminder.type === 'Oil change' && !s.reminder.dueDate);
    const age = o.lastOdometerDate ? daysBetween(o.lastOdometerDate, today) : undefined;
    return {
      name: vehicle.name,
      odometer: `${fmtKm(o.odometer)}${o.lastOdometerDate ? ` on ${fmtDate(o.lastOdometerDate)}` : ''}`,
      stale: age === undefined || age >= STALE_DAYS,
      perWeek: o.driving ? `${fmtKm(Math.round(o.driving.kmPerDay * 7))} a week` : null,
      oil: oil ? `Next oil change at ${fmtKm(oil.dueOdometer)}: ${dueText(oil)}` : null,
    };
  });
  const asks = cars.filter((c) => c.stale).map((c) => c.name);
  const subject = asks.length ? `Odometer check-in: ${asks.join(', ')}` : 'Car Maintenance: your week ahead';
  const carLines = cars.flatMap((c) => [
    `${c.name}: last reading ${c.odometer}${c.perWeek ? `, about ${c.perWeek}` : ''}`,
    ...(c.oil ? [`  ${c.oil}`] : []),
  ]);
  const text = [
    asks.length
      ? `Please add this week's odometer reading for ${asks.join(' and ')}: open the app and tap Update odometer.`
      : 'Your odometer readings are up to date.',
    '',
    ...carLines,
    '',
    upcoming.length ? `Coming up in the next ${UPCOMING_DAYS} days:` : `Nothing due in the next ${UPCOMING_DAYS} days.`,
    ...upcoming.map((i) => `- ${fmtDate(i.date)}: ${i.title}`),
    ...(appUrl ? ['', `Open the app: ${appUrl}`] : []),
  ].join('\n');
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5">
<p><strong>${asks.length ? `Please add this week's odometer reading for ${escape(asks.join(' and '))}.` : 'Your odometer readings are up to date.'}</strong>${asks.length ? ' Open the app and tap <em>Update odometer</em>.' : ''}</p>
${cars
  .map(
    (c) =>
      `<p style="margin:12px 0 0"><strong>${escape(c.name)}</strong><br>Last reading ${escape(c.odometer)}${c.perWeek ? `, about ${escape(c.perWeek)}` : ''}${c.oil ? `<br>${escape(c.oil)}` : ''}</p>`,
  )
  .join('')}
<p style="margin:16px 0 4px">${upcoming.length ? `Coming up in the next ${UPCOMING_DAYS} days:` : `Nothing due in the next ${UPCOMING_DAYS} days.`}</p>
${upcoming.length ? `<ul style="margin:0">${upcoming.map((i) => `<li>${escape(fmtDate(i.date))}: ${escape(i.title)}</li>`).join('')}</ul>` : ''}
${appUrl ? `<p><a href="${escape(appUrl)}">Open the app</a></p>` : ''}
</div>`;
  return { subject, text, html };
}
