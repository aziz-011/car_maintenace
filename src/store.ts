import { useCallback, useEffect, useState } from 'react';
import type { AppData } from './types';

const STORAGE_KEY = 'car-maintenance:v1';

const EMPTY: AppData = { vehicles: [], fuel: [], services: [], reminders: [] };

export function newId(): string {
  // randomUUID needs a secure context, which a file opened from disk may not be.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function today(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return ['vehicles', 'fuel', 'services', 'reminders'].every((k) => Array.isArray(v[k]));
}

/** All app data, persisted to localStorage on every change. */
export function useAppData() {
  const [data, setData] = useState<AppData>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage full or unavailable; data stays in memory for this session.
    }
  }, [data]);

  const update = useCallback((fn: (d: AppData) => AppData) => setData(fn), []);

  return { data, update, replace: setData };
}
