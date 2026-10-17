import { describe, expect, it } from 'vitest';
import { CAR_MAKES, CAR_MODELS, FUEL_STATIONS, modelsFor } from './vehicles';

describe('vehicle lists', () => {
  it('finds models case-insensitively', () => {
    expect(modelsFor(' peugeot ')).toContain('208');
    expect(modelsFor('Unknown brand')).toEqual([]);
  });

  it('has no duplicate entries', () => {
    for (const make of CAR_MAKES) expect(new Set(CAR_MODELS[make]).size).toBe(CAR_MODELS[make].length);
    expect(new Set(FUEL_STATIONS).size).toBe(FUEL_STATIONS.length);
  });
});
