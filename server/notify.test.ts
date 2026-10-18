import { describe, expect, it } from 'vitest';
// @ts-expect-error plain JS module used by the Node server
import { collectAlerts, reminderEmail } from './notify.mjs';
// @ts-expect-error plain JS module used by the Node server
import { parseAddress } from './email.mjs';

const data = {
  vehicles: [{ id: 'v', name: 'Clio', make: 'Renault', model: 'Clio', initialOdometer: 50000 }],
  fuel: [],
  services: [],
  reminders: [
    { id: 'ins', vehicleId: 'v', type: 'Insurance', dueDate: '2026-11-10', lastDate: '2026-01-01', lastOdometer: 0 },
    { id: 'vt', vehicleId: 'v', type: 'Technical inspection (visite technique)', dueDate: '2027-06-01', lastDate: '2026-01-01', lastOdometer: 0 },
    { id: 'oil', vehicleId: 'v', type: 'Oil change', intervalKm: 10000, lastDate: '2026-01-01', lastOdometer: 40500 },
  ],
};

describe('collectAlerts', () => {
  it('flags due-soon dates and overdue distances, not distant ones', () => {
    const alerts = collectAlerts(data, { today: '2026-10-20', soonDays: 30, sent: {} });
    expect(alerts.map((a: { type: string; state: string }) => `${a.type}:${a.state}`)).toEqual(['Insurance:soon', 'Oil change:soon']);
  });

  it('does not repeat an alert already sent, but sends the next stage', () => {
    const first = collectAlerts(data, { today: '2026-10-20', soonDays: 30, sent: {} });
    const sent = Object.fromEntries(first.map((a: { key: string }) => [a.key, '2026-10-20']));
    expect(collectAlerts(data, { today: '2026-10-21', soonDays: 30, sent }).filter((a: { isNew: boolean }) => a.isNew)).toEqual([]);
    const weekBefore = collectAlerts(data, { today: '2026-11-05', soonDays: 30, sent }).filter((a: { isNew: boolean }) => a.isNew);
    expect(weekBefore.map((a: { type: string }) => a.type)).toEqual(['Insurance']);
  });

  it('starts over after renewing', () => {
    const first = collectAlerts(data, { today: '2026-10-20', soonDays: 30, sent: {} });
    const sent = Object.fromEntries(first.map((a: { key: string }) => [a.key, '2026-10-20']));
    const renewed = { ...data, reminders: data.reminders.map((r) => (r.id === 'ins' ? { ...r, dueDate: '2027-11-10' } : r)) };
    const later = collectAlerts(renewed, { today: '2027-10-20', soonDays: 30, sent });
    expect(later.find((a: { type: string }) => a.type === 'Insurance')?.isNew).toBe(true);
  });
});

describe('reminderEmail', () => {
  it('summarises new alerts and escapes text in HTML', () => {
    const mail = reminderEmail(
      [{ key: 'k', isNew: true, vehicle: 'My <car>', type: 'Insurance', state: 'soon', text: 'Due by Nov 10, 2026' }],
      'http://192.168.1.20:8080',
    );
    expect(mail.subject).toBe('Insurance (My <car>): coming up');
    expect(mail.html).toContain('My &#60;car&#62;');
    expect(mail.text).toContain('http://192.168.1.20:8080');
  });
});

describe('parseAddress', () => {
  it('splits a name and an address', () => {
    expect(parseAddress('Car Maintenance <me@x.com>')).toEqual({ name: 'Car Maintenance', email: 'me@x.com' });
    expect(parseAddress('me@x.com')).toEqual({ email: 'me@x.com' });
  });
});
