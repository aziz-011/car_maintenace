import type { AppData } from './types';

const STORAGE_KEY = 'car-maintenance:v1';

export const EMPTY: AppData = { vehicles: [], fuel: [], services: [], reminders: [] };

export function newId(): string {
  // randomUUID needs a secure context, which a file opened from disk or a LAN address is not.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function today(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function loadLocal(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function saveLocal(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable; data stays in memory for this session.
  }
}

export function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return ['vehicles', 'fuel', 'services', 'reminders'].every((k) => Array.isArray(v[k]));
}

/**
 * - local: no server (e.g. the single HTML file); data lives in this browser.
 * - loading / unreachable: waiting for the server, or it never answered.
 * - synced / saving / offline: data lives on the server or in the claude.ai database; offline means changes are not saved yet.
 */
export type SyncStatus = 'local' | 'loading' | 'unreachable' | 'synced' | 'saving' | 'offline';
