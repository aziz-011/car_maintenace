// Decides which reminder emails are due. Pure functions, so they can be unit tested.
import { currentOdometer, reminderStatus } from '../src/stats.ts';
import { dueText } from '../src/reminderText.ts';

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
  for (const vehicle of data.vehicles) {
    const fuel = data.fuel.filter((f) => f.vehicleId === vehicle.id);
    const services = data.services.filter((s) => s.vehicleId === vehicle.id);
    const odometer = currentOdometer(vehicle.initialOdometer, fuel, services);
    for (const reminder of data.reminders.filter((r) => r.vehicleId === vehicle.id)) {
      const status = reminderStatus(reminder, services, odometer, today, soonDays);
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
