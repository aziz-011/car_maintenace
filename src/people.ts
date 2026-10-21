import { useCallback, useEffect, useState } from 'react';
import type { Backend } from './files';
import { t } from './i18n';

/**
 * Who logged an entry. On claude.ai that is the person's id ("u_…"), shown
 * with their current name; with the home server or the single file it is the
 * name typed in Settings on that device.
 */

const DRIVER_KEY = 'car-maintenance:driver';

const isPersonId = (d: string) => /^u_[A-Za-z0-9_-]{6,}$/.test(d);

function deviceName(): string {
  try {
    return localStorage.getItem(DRIVER_KEY) ?? '';
  } catch {
    return '';
  }
}

export function useDrivers(backend: Backend, drivers: string[]) {
  const [name, setName] = useState(deviceName);
  const [personId, setPersonId] = useState<string | undefined>();
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (backend !== 'cloud') return;
    let off = false;
    void (async () => {
      const id = await (await window.claude?.use('user'))?.id();
      if (!off && id) setPersonId(id);
    })();
    return () => {
      off = true;
    };
  }, [backend]);

  const ids = [...new Set(drivers.filter(isPersonId))].sort().join(',');
  useEffect(() => {
    if (!ids) return;
    let off = false;
    void (async () => {
      const user = await window.claude?.use('user');
      if (!user) return;
      const profiles = await user.profiles(ids.split(','));
      if (!off) setNames(Object.fromEntries(Object.values(profiles).map((p) => [p.id, p.isMe ? t('You') : p.name])));
    })();
    return () => {
      off = true;
    };
  }, [ids]);

  const saveName = useCallback((value: string) => {
    const v = value.trim();
    setName(v);
    try {
      if (v) localStorage.setItem(DRIVER_KEY, v);
      else localStorage.removeItem(DRIVER_KEY);
    } catch {
      // Only a convenience.
    }
  }, []);

  /** The tag new entries get from this device, if any. */
  const me = backend === 'cloud' ? personId : name || undefined;
  const nameOf = useCallback((d?: string) => (!d ? '' : isPersonId(d) ? names[d] || t('Someone') : d), [names]);
  return { me, name, saveName, nameOf };
}
