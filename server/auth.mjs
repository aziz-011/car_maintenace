// Optional password for the app's own address (APP_PASSWORD). Without one,
// anyone who can reach the address can use the app, as before. Home
// Assistant's sidebar (Ingress) is already behind Home Assistant's login, so
// requests coming through it are let in without asking again.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const COOKIE = 'cm_session';
const YEAR = 365 * 24 * 3600;
/** Home Assistant's Supervisor, the only address Ingress requests come from. */
const INGRESS_ADDRESSES = new Set(['172.30.32.2', '::ffff:172.30.32.2']);
const MAX_TRIES = 10;
const TRY_WINDOW_MS = 15 * 60 * 1000;

const password = process.env.APP_PASSWORD ?? '';
let secret = Buffer.alloc(0);
const tries = new Map();

/** Keeps a random secret next to the data, so logins survive restarts; changing the password logs everyone out. */
export async function loadAuth(dataDir) {
  if (!password) return;
  const file = join(dataDir, 'auth-secret');
  if (existsSync(file)) secret = Buffer.from(await readFile(file, 'utf8'), 'hex');
  if (secret.length < 32) {
    secret = randomBytes(32);
    await writeFile(file, secret.toString('hex'), { mode: 0o600 });
  }
}

export const passwordSet = () => !!password;

const sign = (what) => createHmac('sha256', secret).update(`${what}:${password}`).digest('hex');
const same = (a, b) => typeof a === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** For the calendar feed, which calendar apps fetch without logging in: part of its address. */
export const feedKey = () => (password ? sign('feed').slice(0, 32) : null);

function cookieOf(req) {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return v.join('=');
  }
  return undefined;
}

export const viaIngress = (req) => !!process.env.SUPERVISOR_TOKEN && INGRESS_ADDRESSES.has(req.socket.remoteAddress ?? '');

/** Whether this request may use the app. */
export function allowed(req, url) {
  if (!password || viaIngress(req)) return true;
  if (same(cookieOf(req), sign('session'))) return true;
  return url.pathname === '/calendar.ics' && same(url.searchParams.get('key'), feedKey());
}

const secure = (req) => req.headers['x-forwarded-proto'] === 'https';
const cookie = (req, value, maxAge) =>
  `${COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure(req) ? '; Secure' : ''}`;

async function readForm(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 4096) break;
  }
  return new URLSearchParams(body);
}

/** Handles POST /login and GET /logout; returns false for any other request. */
export async function handleAuth(req, res, url, language) {
  if (url.pathname === '/logout') {
    res.writeHead(303, { 'Set-Cookie': cookie(req, '', 0), Location: './' });
    res.end();
    return true;
  }
  if (url.pathname !== '/login' || req.method !== 'POST') return false;
  const ip = req.socket.remoteAddress ?? '';
  const now = Date.now();
  const recent = (tries.get(ip) ?? []).filter((t) => now - t < TRY_WINDOW_MS);
  const form = await readForm(req);
  const next = form.get('next')?.startsWith('?') ? form.get('next') : '';
  if (recent.length >= MAX_TRIES) {
    return sendLogin(res, language, 429, language === 'fr' ? 'Trop d’essais. Réessayez dans 15 minutes.' : 'Too many tries. Try again in 15 minutes.');
  }
  if (!same(form.get('password') ?? '', password)) {
    tries.set(ip, [...recent, now]);
    // A short pause makes guessing slow without bothering a person.
    await new Promise((r) => setTimeout(r, 800));
    return sendLogin(res, language, 401, language === 'fr' ? 'Mot de passe incorrect.' : 'Wrong password.', next);
  }
  tries.delete(ip);
  res.writeHead(303, { 'Set-Cookie': cookie(req, sign('session'), YEAR), Location: `./${next}` });
  res.end();
  return true;
}

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** A small page of its own, so nothing of the app loads before the password is given. */
export function sendLogin(res, language, status = 200, error = '', next = '') {
  const fr = language === 'fr';
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(`<!doctype html>
<html lang="${fr ? 'fr' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${fr ? 'Entretien Auto' : 'Car Maintenance'}</title><link rel="icon" href="icon.svg"><meta name="theme-color" content="#2a78d6">
<style>
:root{--bg:#eef1f3;--surface:#fbfcfd;--border:#dbe0e5;--text:#13181c;--muted:#6f7882;--accent:#0c6a89;--accent-text:#fff;--critical:#d03b3b;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#0e1215;--surface:#161b1f;--border:#2a3239;--text:#eef1f3;--muted:#8d97a0;--accent:#3fa6c8;--accent-text:#061317;color-scheme:dark}}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--text);font:16px/1.45 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;padding:16px;box-sizing:border-box}
form{width:100%;max-width:340px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:24px;display:flex;flex-direction:column;gap:14px}
h1{margin:0;font-size:1.4rem;display:flex;align-items:center;gap:10px}h1 img{width:32px;height:32px}
label{display:flex;flex-direction:column;gap:6px;font-size:.9rem;color:var(--muted)}
input{padding:10px 12px;border:1px solid var(--border);border-radius:9px;background:var(--bg);color:var(--text);font-size:1rem}
button{padding:11px;border:0;border-radius:9px;background:var(--accent);color:var(--accent-text);font-weight:600;font-size:1rem;cursor:pointer}
.err{margin:0;color:var(--critical);font-size:.9rem}
</style></head><body>
<form method="post" action="login">
<h1><img src="icon.svg" alt="">${fr ? 'Entretien Auto' : 'Car Maintenance'}</h1>
<label>${fr ? 'Mot de passe' : 'Password'}<input type="password" name="password" autocomplete="current-password" autofocus required></label>
<input type="hidden" name="next" value="${escape(next)}">
${error ? `<p class="err" role="alert">${escape(error)}</p>` : ''}
<button>${fr ? 'Ouvrir' : 'Open'}</button>
</form></body></html>`);
}
