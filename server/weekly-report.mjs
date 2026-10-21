// Used by the weekly Claude task for the claude.ai version: turns the page's
// stored records into the check-in email and the calendar events, with the
// same calculations as the app.
//
//   node dist-server/weekly-report.mjs <folder of record JSON files> [YYYY-MM-DD]
//
// The folder is what the artifact database tool writes with `out_dir`: one
// JSON file per record, either the stored body ({kind, item}) or a document
// wrapper around it ({id, data: {kind, item}}). Prints JSON to stdout.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { calendarItems } from '../src/calendar.ts';
import { emptyData } from '../src/types.ts';
import { collectAlerts, weeklyCheckinEmail } from './notify.mjs';

const APP_URL = 'https://claude.ai/artifact/D1eAVvzCYyEhfd9KmmMVQB';

function jsonFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return jsonFiles(path);
    return name.endsWith('.json') ? [path] : [];
  });
}

export function loadRecords(dir) {
  const data = emptyData();
  const rows = jsonFiles(dir)
    .map((f) => JSON.parse(readFileSync(f, 'utf8')))
    .map((doc) => (doc?.data?.kind ? doc.data : doc))
    .filter((row) => row && Array.isArray(data[row.kind]) && typeof row.item?.id === 'string')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const row of rows) data[row.kind].push(row.item);
  return data;
}

const [dir, date] = process.argv.slice(2);
if (!dir) {
  console.error('Usage: node dist-server/weekly-report.mjs <records folder> [YYYY-MM-DD]');
  process.exit(1);
}
const today = date ?? new Date().toISOString().slice(0, 10);
const data = loadRecords(dir);

console.log(
  JSON.stringify(
    {
      today,
      vehicles: data.vehicles.length,
      email: weeklyCheckinEmail(data, { today, appUrl: APP_URL }),
      // Everything due soon or overdue, for the email's subject line or an extra nudge.
      alerts: collectAlerts(data, { today, soonDays: 30, sent: {} }).map(({ vehicle, type, state, text }) => ({ vehicle, type, state, text })),
      // One all-day event per item; `key` is stable, so put it in the event description to find the event next week.
      calendar: calendarItems(data, today),
    },
    null,
    2,
  ),
);
