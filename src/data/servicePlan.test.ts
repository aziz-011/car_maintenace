import { describe, expect, it } from 'vitest';
import { fuelOf, servicePlan, timingDrive } from './servicePlan';

describe('servicePlan', () => {
  it('gives the Golf IV 1.9 TDI a timing belt every 90,000 km or 5 years', () => {
    const golf = { make: 'Volkswagen', engine: '1.9 TDI diesel · 110 hp' };
    expect(timingDrive(golf)).toEqual({ drive: 'belt', intervalKm: 90000, intervalMonths: 60 });
    expect(fuelOf(golf)).toBe('diesel');
    const belt = servicePlan(golf).find((i) => i.type === 'Timing belt');
    expect(belt).toMatchObject({ intervalKm: 90000, intervalMonths: 60, recommended: true });
    expect(servicePlan(golf).map((i) => i.type)).toContain('Glow plugs');
  });

  it('knows chains and belts in oil', () => {
    expect(timingDrive({ make: 'Renault', engine: '1.2 TCe petrol · 120 hp' }).drive).toBe('chain');
    expect(timingDrive({ make: 'Peugeot', engine: '1.2 PureTech petrol · 110 hp' })).toEqual({ drive: 'wet-belt', intervalKm: 100000, intervalMonths: 72 });
    const chain = servicePlan({ make: 'Hyundai', engine: '1.4 petrol · 100 hp' });
    expect(chain.some((i) => i.type === 'Timing belt')).toBe(false);
    expect(chain.map((i) => i.type)).toContain('Spark plugs');
  });

  it('asks the garage when the engine is not known, and skips engine items on electric cars', () => {
    expect(servicePlan({ make: 'Lada', engine: '1.7 petrol · 80 hp' }).find((i) => i.type === 'Timing belt')?.recommended).toBe(false);
    const ev = servicePlan({ make: 'Renault', engine: 'electric · 136 hp' }).map((i) => i.type);
    expect(ev).not.toContain('Air filter');
    expect(ev).not.toContain('Timing belt');
    expect(ev).toContain('Brake fluid');
  });
});
