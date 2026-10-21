import { useState, type FormEvent } from 'react';
import { enginesFor, generationLabel, generationsFor } from '../data/generations';
import { CAR_MAKES, modelsFor } from '../data/vehicles';
import { newId } from '../store';
import { DEFAULT_OIL_INTERVAL_KM, type Vehicle } from '../types';
import { Modal } from './Modal';
import { SelectOrOther } from './SelectOrOther';

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
  const [odometer, setOdometer] = useState(vehicle?.initialOdometer.toString() ?? '');
  const [oilKm, setOilKm] = useState(DEFAULT_OIL_INTERVAL_KM.toString());

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
        initialOdometer: Number(odometer) || 0,
      },
      vehicle ? undefined : Number(oilKm) || undefined,
    );
  };

  return (
    <Modal title={vehicle ? 'Edit vehicle' : 'Add vehicle'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>
          Nickname
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My car" />
        </label>
        <div className="row">
          <label>
            Make
            <SelectOrOther required value={make} onChange={changeMake} options={CAR_MAKES} otherPlaceholder="Make" />
          </label>
          <label>
            Model
            {make === '' ? (
              <select disabled>
                <option>Pick a make</option>
              </select>
            ) : (
              <SelectOrOther
                key={make}
                required
                value={model}
                onChange={changeModel}
                options={modelsFor(make)}
                otherPlaceholder="Model"
              />
            )}
          </label>
        </div>
        {model && (
          <label>
            Generation
            <SelectOrOther
              key={`${make}|${model}`}
              value={gen ? generationLabel(gen) : generation}
              onChange={changeGeneration}
              options={generations.map(generationLabel)}
              placeholder="Choose the generation…"
              otherPlaceholder="e.g. Mk4, phase 2"
            />
          </label>
        )}
        {model && (
          <label>
            Engine
            <SelectOrOther
              key={generation}
              value={engine}
              onChange={setEngine}
              groups={engineGroups.length ? engineGroups : undefined}
              placeholder={gen ? 'Choose the engine…' : undefined}
              otherPlaceholder="e.g. 1.6 TDI diesel · 105 hp"
            />
            {!gen && generations.length > 0 && <span className="hint">Choose the generation first to see its engines.</span>}
          </label>
        )}
        <div className="row">
          <label>
            Year
            <input type="number" min="1900" max="2100" value={year} onChange={(e) => setYear(e.target.value)} />
            {yearOutside && (
              <span className="hint">
                {gen.name} was mostly sold {gen.from}–{gen.to ?? 'today'}. Check the year or the generation.
              </span>
            )}
          </label>
          <label>
            Plate
            <input value={plate} onChange={(e) => setPlate(e.target.value)} />
          </label>
        </div>
        <label>
          Current odometer (km)
          <input type="number" min="0" required value={odometer} onChange={(e) => setOdometer(e.target.value)} />
        </label>
        {!vehicle && (
          <label>
            Oil change every (km)
            <input type="number" min="1000" step="500" value={oilKm} onChange={(e) => setOilKm(e.target.value)} />
            <span className="hint">
              The next oil change is counted from the odometer above. Leave empty for no reminder.
            </span>
          </label>
        )}
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">Save</button>
        </div>
      </form>
    </Modal>
  );
}
