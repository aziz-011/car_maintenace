// Serves the built app and stores its data in a JSON file, so every device on
// the local network sees the same data. No dependencies beyond Node itself.
import { createServer } from 'node:http';
import { copyFile, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyOps, emptyData, isAppData } from './ops.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = join(ROOT, 'dist');
const DATA_DIR = resolve(process.env.DATA_DIR ?? join(ROOT, 'data'));
const DATA_FILE = join(DATA_DIR, 'car-data.json');
const BACKUP_DIR = join(DATA_DIR, 'backups');
const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? '0.0.0.0';
const MAX_BODY = 10 * 1024 * 1024;
const KEEP_BACKUPS = 30;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

/** { version, updatedAt, data } — version increases on every change. */
let store = { version: 0, updatedAt: null, data: emptyData() };

async function loadStore() {
  await mkdir(BACKUP_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) return;
  const parsed = JSON.parse(await readFile(DATA_FILE, 'utf8'));
  if (!isAppData(parsed.data)) throw new Error(`${DATA_FILE} is not valid car data`);
  store = parsed;
}

/** Keeps one backup per day, from before that day's first change, and prunes old ones. */
async function backupOncePerDay() {
  if (!existsSync(DATA_FILE)) return;
  const target = join(BACKUP_DIR, `car-data-${new Date().toISOString().slice(0, 10)}.json`);
  if (existsSync(target)) return;
  await copyFile(DATA_FILE, target);
  const old = (await readdir(BACKUP_DIR)).filter((f) => f.endsWith('.json')).sort().slice(0, -KEEP_BACKUPS);
  await Promise.all(old.map((f) => rm(join(BACKUP_DIR, f))));
}

// Writes are chained so two requests never write the file at the same time.
let writing = Promise.resolve();
function save(next) {
  store = { version: store.version + 1, updatedAt: new Date().toISOString(), data: next };
  const snapshot = JSON.stringify(store, null, 2);
  writing = writing.then(async () => {
    await backupOncePerDay();
    await writeFile(`${DATA_FILE}.tmp`, snapshot);
    await rename(`${DATA_FILE}.tmp`, DATA_FILE);
  });
  return writing;
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('Body too large'), { status: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function handleApi(req, res, path) {
  if (path === '/api/data' && req.method === 'GET') return sendJson(res, 200, store);
  if (path === '/api/ops' && req.method === 'POST') {
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      return sendJson(res, e.status ?? 400, { error: e.status ? e.message : 'Invalid JSON' });
    }
    let next;
    try {
      next = applyOps(store.data, body.ops);
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
    await save(next);
    return sendJson(res, 200, store);
  }
  sendJson(res, 404, { error: 'Not found' });
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
    if (path.startsWith('/api/')) await handleApi(req, res, path);
    else await serveStatic(res, path);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) sendJson(res, 500, { error: 'Server error' });
  }
});

function lanAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((a) => a && a.family === 'IPv4' && !a.internal)
    .map((a) => a.address);
}

await loadStore();
if (!existsSync(join(DIST, 'index.html'))) console.warn('Warning: dist/ is missing. Run "npm run build" first.');

server.listen(PORT, HOST, () => {
  console.log('\nCar Maintenance is running.\n');
  console.log(`  On this PC:        http://localhost:${PORT}`);
  for (const ip of lanAddresses()) console.log(`  On your network:   http://${ip}:${PORT}`);
  console.log(`\n  Data file: ${DATA_FILE}`);
  console.log('  Keep this window open. Press Ctrl+C to stop.\n');
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`Port ${PORT} is already in use. Is the server already running?`);
  else console.error(e);
  process.exit(1);
});
