// Serves the built app and stores its data in a JSON file, so every device on
// the local network sees the same data. Also emails reminders when configured.
import { createServer } from 'node:http';
import { copyFile, cp, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { homedir, networkInterfaces } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sendEmail, PROVIDERS } from './email.mjs';
import { collectAlerts, reminderEmail, weeklyCheckinEmail } from './notify.mjs';
import { calendarItems, toIcs } from '../src/calendar.ts';
import { applyOps, emptyData, isAppData, normalizeData } from './ops.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = join(ROOT, 'dist');
// Outside the project folder, so updating or re-downloading the app never touches the data.
const DATA_DIR = resolve(process.env.DATA_DIR ?? join(homedir(), 'CarMaintenance'));
const DATA_FILE = join(DATA_DIR, 'car-data.json');
const SETTINGS_FILE = join(DATA_DIR, 'settings.json');
const NOTIFY_FILE = join(DATA_DIR, 'notify-state.json');
const BACKUP_DIR = join(DATA_DIR, 'backups');
/** Receipt and document photos. */
const FILES_DIR = join(DATA_DIR, 'files');
const MAX_FILE = 15 * 1024 * 1024;
const FILE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/heic': '.heic', 'image/gif': '.gif', 'application/pdf': '.pdf' };
const OLD_DATA_DIR = join(ROOT, 'data');
const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? '0.0.0.0';
const MAX_BODY = 10 * 1024 * 1024;
const KEEP_BACKUPS = 60;
const CHECK_EVERY_MS = 60 * 60 * 1000;
/** Emails are only sent from this hour on (local time), so none arrive at night. */
const SEND_FROM_HOUR = 8;
/** The weekly odometer check-in goes out on the chosen day from this hour. */
const CHECKIN_HOUR = 18;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
};

const DEFAULT_EMAIL = {
  enabled: false,
  provider: 'resend',
  apiKey: '',
  from: 'Car Maintenance <onboarding@resend.dev>',
  to: '',
  daysBefore: 30,
  weeklyBackup: true,
  weeklyCheckin: true,
  /** Day of the week for the check-in, 0 = Sunday. */
  checkinDay: 0,
};

/** { version, updatedAt, data } — version increases on every change. */
let store = { version: 0, updatedAt: null, data: emptyData() };
let settings = { email: { ...DEFAULT_EMAIL } };
/** { sent: { [alertKey]: isoDate }, lastBackupEmail: isoDate | null, lastCheckin: 'YYYY-MM-DD' | null } */
let notifyState = { sent: {}, lastBackupEmail: null, lastCheckin: null };

async function readJson(file, fallback) {
  return existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : fallback;
}

/** Writes via a temporary file and rename, so a crash mid-write never leaves a half-written file. */
async function writeJson(file, value) {
  await writeFile(`${file}.tmp`, JSON.stringify(value, null, 2));
  await rename(`${file}.tmp`, file);
}

/** Earlier versions kept data inside the project folder; copy it to the new place once. */
async function migrateOldDataDir() {
  if (existsSync(DATA_FILE) || !existsSync(join(OLD_DATA_DIR, 'car-data.json'))) return;
  await cp(OLD_DATA_DIR, DATA_DIR, { recursive: true });
  console.log(`Moved your data from ${OLD_DATA_DIR} to ${DATA_DIR} (the old copy is left in place).`);
}

async function load() {
  await mkdir(BACKUP_DIR, { recursive: true });
  await mkdir(FILES_DIR, { recursive: true });
  await migrateOldDataDir();
  const parsed = await readJson(DATA_FILE, null);
  if (parsed) {
    if (!isAppData(parsed.data)) throw new Error(`${DATA_FILE} is not valid car data`);
    store = { ...parsed, data: normalizeData(parsed.data) };
  }
  settings = { email: { ...DEFAULT_EMAIL, ...(await readJson(SETTINGS_FILE, {})).email } };
  notifyState = { ...notifyState, ...(await readJson(NOTIFY_FILE, {})) };
}

const localDate = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

/** Keeps one backup per day, from before that day's first change, and prunes old ones. */
async function backupOncePerDay() {
  if (!existsSync(DATA_FILE)) return;
  const target = join(BACKUP_DIR, `car-data-${localDate()}.json`);
  if (existsSync(target)) return;
  await copyFile(DATA_FILE, target);
  const old = (await readdir(BACKUP_DIR)).filter((f) => f.endsWith('.json')).sort().slice(0, -KEEP_BACKUPS);
  await Promise.all(old.map((f) => rm(join(BACKUP_DIR, f))));
}

// Writes are chained so two requests never write the same file at the same time.
let writing = Promise.resolve();
const queueWrite = (fn) => (writing = writing.then(fn, fn));

function save(next) {
  store = { version: store.version + 1, updatedAt: new Date().toISOString(), data: next };
  const snapshot = store;
  return queueWrite(async () => {
    await backupOncePerDay();
    await writeJson(DATA_FILE, snapshot);
  });
}

/** Settings as sent to the browser: the API key itself never leaves the PC. */
function publicSettings() {
  const { apiKey, ...email } = settings.email;
  return {
    email: { ...email, hasKey: !!apiKey, keyHint: apiKey ? `…${apiKey.slice(-4)}` : '' },
    providers: Object.fromEntries(Object.entries(PROVIDERS).map(([id, p]) => [id, p.label])),
  };
}

function updateSettings(body) {
  const e = body?.email;
  if (!e || typeof e !== 'object') throw new Error('Missing email settings');
  if (e.provider !== undefined && !PROVIDERS[e.provider]) throw new Error('Unknown provider');
  const days = e.daysBefore === undefined ? settings.email.daysBefore : Number(e.daysBefore);
  if (!Number.isInteger(days) || days < 1 || days > 365) throw new Error('Days before must be between 1 and 365');
  const day = e.checkinDay === undefined ? settings.email.checkinDay : Number(e.checkinDay);
  if (!Number.isInteger(day) || day < 0 || day > 6) throw new Error('Check-in day must be 0 (Sunday) to 6 (Saturday)');
  const str = (v, old) => (typeof v === 'string' ? v.trim() : old);
  settings = {
    email: {
      enabled: e.enabled === undefined ? settings.email.enabled : !!e.enabled,
      provider: e.provider ?? settings.email.provider,
      // An empty key field means "keep the saved key"; clearing it is done with removeKey.
      apiKey: e.removeKey ? '' : str(e.apiKey, '') || settings.email.apiKey,
      from: str(e.from, settings.email.from),
      to: str(e.to, settings.email.to),
      daysBefore: days,
      weeklyBackup: e.weeklyBackup === undefined ? settings.email.weeklyBackup : !!e.weeklyBackup,
      weeklyCheckin: e.weeklyCheckin === undefined ? settings.email.weeklyCheckin : !!e.weeklyCheckin,
      checkinDay: day,
    },
  };
  return queueWrite(() => writeJson(SETTINGS_FILE, settings));
}

function lanAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((a) => a && a.family === 'IPv4' && !a.internal)
    .map((a) => a.address);
}

const appUrl = () => `http://${lanAddresses()[0] ?? 'localhost'}:${PORT}`;

function backupAttachment() {
  return {
    filename: `car-maintenance-backup-${localDate()}.json`,
    base64: Buffer.from(JSON.stringify(store.data, null, 2)).toString('base64'),
  };
}

/** Sends reminder emails for anything newly due, and the weekly backup. Returns what it did. */
async function runEmailChecks({ force = false } = {}) {
  const email = settings.email;
  if (!email.enabled || !email.apiKey || !email.to) return { skipped: 'Email reminders are off' };
  if (!force && new Date().getHours() < SEND_FROM_HOUR) return { skipped: 'Too early in the day' };
  const result = { reminders: 0, backup: false, checkin: false };
  const now = new Date();

  const alerts = collectAlerts(store.data, { today: localDate(), soonDays: email.daysBefore, sent: notifyState.sent });
  const fresh = alerts.filter((a) => a.isNew);
  if (fresh.length) {
    await sendEmail(email, reminderEmail(alerts, appUrl()));
    const now = new Date().toISOString();
    for (const a of fresh) notifyState.sent[a.key] = now;
    result.reminders = fresh.length;
  }

  const weekAgo = Date.now() - 7 * 86_400_000;
  if (email.weeklyBackup && store.version > 0 && (!notifyState.lastBackupEmail || Date.parse(notifyState.lastBackupEmail) < weekAgo)) {
    await sendEmail(email, {
      subject: 'Car Maintenance: weekly backup',
      text: 'Your car data is attached. Keep this email: to restore, open the app, go to Settings and use Import JSON with the attached file.',
      html: '<p>Your car data is attached.</p><p>Keep this email: to restore, open the app, go to <strong>Settings → Import JSON</strong> and choose the attached file.</p>',
      attachments: [backupAttachment()],
    });
    notifyState.lastBackupEmail = new Date().toISOString();
    result.backup = true;
  }

  const checkinDue = now.getDay() === email.checkinDay && now.getHours() >= CHECKIN_HOUR && notifyState.lastCheckin !== localDate();
  if (email.weeklyCheckin && store.data.vehicles.length && checkinDue) {
    await sendEmail(email, weeklyCheckinEmail(store.data, { today: localDate(), appUrl: appUrl() }));
    notifyState.lastCheckin = localDate();
    result.checkin = true;
  }

  // Forget alerts older than a year so the file does not grow forever.
  const yearAgo = Date.now() - 365 * 86_400_000;
  for (const [k, v] of Object.entries(notifyState.sent)) if (Date.parse(v) < yearAgo) delete notifyState.sent[k];
  if (result.reminders || result.backup || result.checkin) await queueWrite(() => writeJson(NOTIFY_FILE, notifyState));
  return result;
}

async function scheduledCheck() {
  try {
    const r = await runEmailChecks();
    if (r.reminders || r.backup || r.checkin)
      console.log(`${new Date().toLocaleString()}: emailed ${r.reminders} reminder(s)${r.backup ? ', the weekly backup' : ''}${r.checkin ? ', the weekly check-in' : ''}.`);
  } catch (e) {
    console.error(`${new Date().toLocaleString()}: could not send email: ${e.message}`);
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readRaw(req, max) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw Object.assign(new Error('File too large (15 MB at most)'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('Body too large'), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid JSON'), { status: 400 });
  }
}

const routes = {
  'GET /api/data': async () => [200, store],
  'POST /api/ops': async (req) => {
    const body = await readBody(req);
    await save(applyOps(store.data, body.ops));
    return [200, store];
  },
  'POST /api/files': async (req) => {
    const type = (req.headers['content-type'] ?? '').split(';')[0].trim();
    const ext = FILE_TYPES[type];
    if (!ext) throw new Error('Only photos (JPEG, PNG, WebP, HEIC) and PDFs can be attached');
    const body = await readRaw(req, MAX_FILE);
    const id = randomBytes(12).toString('hex');
    await writeFile(join(FILES_DIR, id + ext), body);
    return [200, { id, url: `/files/${id}${ext}` }];
  },
  'GET /api/settings': async () => [200, publicSettings()],
  'PUT /api/settings': async (req) => {
    await updateSettings(await readBody(req));
    return [200, publicSettings()];
  },
  'POST /api/email/test': async () => {
    await sendEmail(settings.email, {
      subject: 'Car Maintenance: test email',
      text: `Email reminders work. You will get an email when a reminder is ${settings.email.daysBefore} days away, a week before, and when it is overdue.\n\nOpen the app: ${appUrl()}`,
      html: `<p>Email reminders work.</p><p>You will get an email when a reminder is ${settings.email.daysBefore} days away, a week before, and when it is overdue.</p><p><a href="${appUrl()}">Open the app</a></p>`,
    });
    return [200, { ok: true }];
  },
  'POST /api/email/check': async () => [200, await runEmailChecks({ force: true })],
  // Sends this week's check-in now, as a preview; it does not change the weekly schedule.
  'POST /api/email/checkin': async () => {
    await sendEmail(settings.email, weeklyCheckinEmail(store.data, { today: localDate(), appUrl: appUrl() }));
    return [200, { ok: true }];
  },
};

async function handleApi(req, res, path) {
  const route = routes[`${req.method} ${path}`];
  if (!route) return sendJson(res, 404, { error: 'Not found' });
  try {
    const [status, body] = await route(req);
    sendJson(res, status, body);
  } catch (e) {
    // Validation and provider errors are shown to the user as-is.
    sendJson(res, e.status ?? 400, { error: e.message });
  }
}

async function serveStatic(res, path) {
  const file = normalize(join(DIST, decodeURIComponent(path)));
  // Unknown paths fall back to the app; never serve anything outside dist/.
  const target = file.startsWith(DIST + sep) && existsSync(file) && extname(file) ? file : join(DIST, 'index.html');
  try {
    const body = await readFile(target);
    const isAsset = target.includes(`${sep}assets${sep}`);
    res.writeHead(200, {
      'Content-Type': MIME[extname(target)] ?? 'application/octet-stream',
      'Cache-Control': isAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('The app is not built yet. Run "npm run build" first.');
  }
}

const server = createServer(async (req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  try {
    // Calendar apps subscribe to this URL; it always reflects the current data.
    if (path === '/calendar.ics') {
      res.writeHead(200, { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(toIcs(calendarItems(store.data, localDate())));
    }
    const file = /^\/files\/([a-f0-9]{24}\.(?:jpg|png|webp|heic|gif|pdf))$/.exec(path);
    if (file) {
      try {
        const body = await readFile(join(FILES_DIR, file[1]));
        res.writeHead(200, { 'Content-Type': MIME[extname(file[1])], 'Cache-Control': 'private, max-age=31536000, immutable' });
        return res.end(body);
      } catch {
        return sendJson(res, 404, { error: 'File not found' });
      }
    }
    if (path.startsWith('/api/')) await handleApi(req, res, path);
    else await serveStatic(res, path);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) sendJson(res, 500, { error: 'Server error' });
  }
});

await load();
if (!existsSync(join(DIST, 'index.html'))) console.warn('Warning: dist/ is missing. Run "npm run build" first.');

server.listen(PORT, HOST, () => {
  console.log('\nCar Maintenance is running.\n');
  console.log(`  On this PC:        http://localhost:${PORT}`);
  for (const ip of lanAddresses()) console.log(`  On your network:   http://${ip}:${PORT}`);
  console.log(`\n  Your data:         ${DATA_DIR}`);
  console.log(`  Email reminders:   ${settings.email.enabled ? `on, to ${settings.email.to}` : 'off (turn on in Settings)'}`);
  console.log('\n  Keep this window open. Press Ctrl+C to stop.\n');
  setTimeout(scheduledCheck, 30_000);
  setInterval(scheduledCheck, CHECK_EVERY_MS);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`Port ${PORT} is already in use. Is the server already running?`);
  else console.error(e);
  process.exit(1);
});
