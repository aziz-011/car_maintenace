import { useState, type FormEvent } from 'react';
import { enginesFor, generationLabel, generationsFor } from '../data/generations';
import { CAR_MAKES, modelsFor } from '../data/vehicles';
import { distInput, distUnit, parseDist } from '../format';
import { newId } from '../store';
import { DEFAULT_OIL_INTERVAL_KM, type Vehicle } from '../types';
import { Modal } from './Modal';
import { SelectOrOther } from './SelectOrOther';
import { t } from '../i18n';

interface Props {
  vehicle?: Vehicle;
  /** oilIntervalKm is set for a new car, to create its oil change reminder. */
  onSave: (v: Vehicle, oilIntervalKm?: number) => void;
  onClose: () => void;
}

export function VehicleForm({ vehicle, onSave, onClose }: Props) {
  const [name, setName] = useState(vehicle?.name ?? '');
  const [make, setMake] = useState(vehicle?.make ?? '');
  const [model, setModel] = useState(vehicle?.model ?? '');
  const [generation, setGeneration] = useState(vehicle?.generation ?? '');
  const [engine, setEngine] = useState(vehicle?.engine ?? '');
  const [year, setYear] = useState(vehicle?.year?.toString() ?? '');
  const [plate, setPlate] = useState(vehicle?.plate ?? '');
  const [odometer, setOdometer] = useState(distInput(vehicle?.initialOdometer));
  const [oilKm, setOilKm] = useState(distInput(DEFAULT_OIL_INTERVAL_KM));

  const generations = generationsFor(make, model);
  const gen = generations.find((g) => g.name === generation);
  const engineGroups = enginesFor(gen);
  const yearNum = Number(year);
  const yearOutside = gen && yearNum > 1900 && (yearNum < gen.from || (gen.to !== undefined && yearNum > gen.to));

  // Choices that belonged to the previous make, model or generation no longer apply.
  const changeMake = (value: string) => {
    if (!modelsFor(value).includes(model)) changeModel('');
    setMake(value);
  };
  const changeModel = (value: string) => {
    setModel(value);
    setGeneration('');
    setEngine('');
  };
  const changeGeneration = (label: string) => {
    const next = generations.find((g) => generationLabel(g) === label);
    setGeneration(next?.name ?? label);
    if (!enginesFor(next).some((group) => group.options.includes(engine))) setEngine('');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave(
      {
        id: vehicle?.id ?? newId(),
        name: name.trim() || `${make} ${generation.trim() || model}`.trim(),
        make: make.trim(),
        model: model.trim(),
        generation: generation.trim() || undefined,
        engine: engine.trim() || undefined,
        year: year ? Number(year) : undefined,
        plate: plate.trim() || undefined,
        initialOdometer: parseDist(odometer),
      },
      vehicle ? undefined : parseDist(oilKm) || undefined,
    );
  };

  return (
    <Modal title={vehicle ? 'Edit vehicle' : 'Add vehicle'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>
          {t('Nickname')}
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('My car')} />
        </label>
        <div className="row">
          <label>
            {t('Make')}
            <SelectOrOther required value={make} onChange={changeMake} options={CAR_MAKES} otherPlaceholder={t('Make')} />
          </label>
          <label>
            {t('Model')}
            {make === '' ? (
              <select disabled>
                <option>{t('Pick a make')}</option>
              </select>
            ) : (
              <SelectOrOther
                key={make}
                required
                value={model}
                onChange={changeModel}
                options={modelsFor(make)}
                otherPlaceholder={t('Model')}
              />
            )}
          </label>
        </div>
        {model && (
          <label>
            {t('Generation')}
            <SelectOrOther
              key={`${make}|${model}`}
              value={gen ? generationLabel(gen) : generation}
              onChange={changeGeneration}
              options={generations.map(generationLabel)}
              placeholder={t('Choose the generation…')}
              otherPlaceholder={t('e.g. Mk4, phase 2')}
            />
          </label>
        )}
        {model && (
          <label>
            {t('Engine')}
            <SelectOrOther
              key={generation}
              value={engine}
              onChange={setEngine}
              groups={engineGroups.length ? engineGroups : undefined}
              placeholder={gen ? 'Choose the engine…' : undefined}
              otherPlaceholder={t('e.g. 1.6 TDI diesel · 105 hp')}
            />
            {!gen && generations.length > 0 && <span className="hint">{t('Choose the generation first to see its engines.')}</span>}
          </label>
        )}
        <div className="row">
          <label>
            {t('Year')}
            <input type="number" min="1900" max="2100" value={year} onChange={(e) => setYear(e.target.value)} />
            {yearOutside && (
              <span className="hint">
                {t('{name} was mostly sold {from}–{to}. Check the year or the generation.', { name: gen.name, from: gen.from, to: gen.to ?? t('today') })}
              </span>
            )}
          </label>
          <label>
            {t('Plate')}
            <input value={plate} onChange={(e) => setPlate(e.target.value)} />
          </label>
        </div>
        <label>
          {t('Current odometer ({unit})', { unit: distUnit() })}
          <input type="number" min="0" required value={odometer} onChange={(e) => setOdometer(e.target.value)} />
        </label>
        {!vehicle && (
          <label>
            {t('Oil change every ({unit})', { unit: distUnit() })}
            <input type="number" min="1000" step="500" value={oilKm} onChange={(e) => setOilKm(e.target.value)} />
            <span className="hint">
              {t('The next oil change is counted from the odometer above. Leave empty for no reminder.')}
            </span>
          </label>
        )}
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            {t('Cancel')}
          </button>
          <button className="btn primary">{t('Save')}</button>
        </div>
      </form>
    </Modal>
  );
}
