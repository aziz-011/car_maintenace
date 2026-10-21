import { describe, expect, it } from 'vitest';
// @ts-expect-error plain JS module used by the Node server
import { collectAlerts, reminderEmail, weeklyCheckinEmail } from './notify.mjs';
import { toIcs } from '../src/calendar';
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

  it('warns about a thirsty tank and a fuel budget running out, once each', () => {
    const fill = (id: string, date: string, odometer: number, liters: number) => ({ id, vehicleId: 'v', date, odometer, liters, totalCost: liters * 2.5, fullTank: true });
    const thirsty = {
      ...data,
      reminders: [],
      vehicles: [{ ...data.vehicles[0], fuelBudget: 250 }],
      fuel: [fill('a', '2026-09-01', 50000, 40), fill('b', '2026-09-10', 50600, 36), fill('c', '2026-09-20', 51200, 36), fill('d', '2026-10-01', 51800, 36), fill('e', '2026-10-12', 52400, 46)],
    };
    const alerts = collectAlerts(thirsty, { today: '2026-10-14', soonDays: 30, sent: {} });
    expect(alerts.map((a: { type: string; text: string }) => `${a.type}: ${a.text}`.replace(/\s/g, ' '))).toEqual([
      'Fuel consumption: The last tank used 28% more fuel than usual (7.7 instead of about 6 L/100 km).',
      'Fuel budget: Fuel this month: TND 205.000 of TND 250.000.',
    ]);
    const sent = Object.fromEntries(alerts.map((a: { key: string }) => [a.key, '2026-10-14']));
    expect(collectAlerts(thirsty, { today: '2026-10-15', soonDays: 30, sent }).some((a: { isNew: boolean }) => a.isNew)).toBe(false);
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

describe('weeklyCheckinEmail', () => {
  const car = { id: 'v', name: 'Golf', make: 'VW', model: 'Golf', initialOdometer: 120000 };
  const base = {
    vehicles: [car],
    fuel: [],
    services: [],
    reminders: [{ id: 'o', vehicleId: 'v', type: 'Oil change', intervalKm: 7500, lastDate: '2026-09-01', lastOdometer: 120000 }],
    readings: [
      { id: 'r1', vehicleId: 'v', date: '2026-09-01', odometer: 120000 },
      { id: 'r2', vehicleId: 'v', date: '2026-10-13', odometer: 122520 },
    ],
  };

  it('asks for a reading when the last one is a week old, with the oil estimate', () => {
    const mail = weeklyCheckinEmail(base, { today: '2026-10-25', appUrl: 'http://x' });
    expect(mail.subject).toBe('Odometer check-in: Golf');
    expect(mail.text).toContain('about 420 km a week');
    expect(mail.text).toContain('Due in 4,980 km (around Jan 4, 2027)');
  });

  it('does not ask when readings are recent', () => {
    expect(weeklyCheckinEmail(base, { today: '2026-10-15' }).subject).toBe('Car Maintenance: your week ahead');
  });
});

describe('calendar', () => {
  it('writes all-day events with stable ids and escaped text', () => {
    const ics = toIcs([{ key: 'k1', title: 'Insurance – Golf, red', date: '2026-11-20', estimated: false, details: 'Due; soon' }]);
    expect(ics).toContain('UID:k1@car-maintenance');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261120');
    expect(ics).toContain('DTEND;VALUE=DATE:20261121');
    expect(ics).toContain('SUMMARY:Insurance – Golf\\, red');
    expect(ics.split('\r\n').every((l) => l.length < 75 || l.startsWith('SUMMARY') || l.startsWith('DESCRIPTION'))).toBe(true);
  });
});
