import { describe, expect, it } from 'vitest';
import { CAR_MAKES, modelsFor } from './vehicles';
import { enginesFor, generationLabel, generationsFor, GENERATIONS } from './generations';

describe('generations', () => {
  it('lists the Golf IV with its petrol and diesel engines', () => {
    const golf4 = generationsFor('Volkswagen', 'Golf').find((g) => g.name === 'Golf IV (Mk4)')!;
    expect(generationLabel(golf4)).toBe('Golf IV (Mk4) (1997–2003)');
    const [petrol, diesel] = enginesFor(golf4);
    expect(petrol.label).toBe('Petrol (essence)');
    expect(petrol.options).toContain('1.4 16V petrol · 75 hp');
    expect(diesel.options).toEqual(expect.arrayContaining(['1.9 SDI diesel · 68 hp', '1.9 TDI diesel · 110 hp', '1.9 TDI diesel · 150 hp']));
  });

  it('only describes makes and models that the make and model lists offer', () => {
    for (const [make, models] of Object.entries(GENERATIONS)) {
      expect(CAR_MAKES).toContain(make);
      for (const model of Object.keys(models)) expect(modelsFor(make)).toContain(model);
    }
  });

  it('has nothing for unknown cars', () => {
    expect(generationsFor('Nope', 'Car')).toEqual([]);
    expect(enginesFor(undefined)).toEqual([]);
  });
});
