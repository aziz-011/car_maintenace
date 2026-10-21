import { addDays, vehicleOverview } from './stats';
import type { AppData } from './types';

export interface CalendarItem {
  /** Stable per reminder, so a calendar can update the event when the date moves. */
  key: string;
  title: string;
  date: string;
  /** True when the date comes from the driving estimate rather than a fixed date. */
  estimated: boolean;
  details: string;
}

/** One all-day event per reminder that has a date: fixed deadlines, month intervals and oil change estimates. */
export function calendarItems(data: AppData, today: string): CalendarItem[] {
  const items: CalendarItem[] = [];
  for (const vehicle of data.vehicles) {
    for (const s of vehicleOverview(vehicle, data, today).statuses) {
      const candidates = [s.dueDate, s.estimatedDate].filter((d): d is string => !!d).sort();
      const date = candidates[0];
      if (!date) continue;
      const estimated = date === s.estimatedDate && date !== s.dueDate;
      const km = s.dueOdometer ? ` at ${s.dueOdometer.toLocaleString('en')} km` : '';
      items.push({
        key: `car-maintenance-${s.reminder.id}`,
        title: `${s.reminder.type} – ${vehicle.name}${estimated ? ' (estimated)' : ''}`,
        date,
        estimated,
        details: estimated
          ? `Due${km}. Estimated from your recent driving; the date moves as you add odometer readings.`
          : `Due${km || ` on ${date}`}.`,
      });
    }
  }
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

const escapeText = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
const icsDate = (d: string) => d.replace(/-/g, '');

/** An iCalendar file: import it in Google Calendar, Outlook or Apple Calendar, or subscribe to its URL. */
export function toIcs(items: CalendarItem[], now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Car Maintenance//EN',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Car maintenance',
    ...items.flatMap((item) => [
      'BEGIN:VEVENT',
      `UID:${item.key}@car-maintenance`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(item.date)}`,
      `DTEND;VALUE=DATE:${icsDate(addDays(item.date, 1))}`,
      `SUMMARY:${escapeText(item.title)}`,
      `DESCRIPTION:${escapeText(item.details)}`,
      'TRANSP:TRANSPARENT',
      // A heads-up a week before, besides the day itself.
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(item.title)}`,
      'TRIGGER:-P7D',
      'END:VALARM',
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}
