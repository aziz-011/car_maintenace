import { useState, type FormEvent } from 'react';
import { newId } from '../store';
import type { Vehicle } from '../types';
import { Modal } from './Modal';

interface Props {
  vehicle?: Vehicle;
  onSave: (v: Vehicle) => void;
  onClose: () => void;
}

export function VehicleForm({ vehicle, onSave, onClose }: Props) {
  const [name, setName] = useState(vehicle?.name ?? '');
  const [make, setMake] = useState(vehicle?.make ?? '');
  const [model, setModel] = useState(vehicle?.model ?? '');
  const [year, setYear] = useState(vehicle?.year?.toString() ?? '');
  const [plate, setPlate] = useState(vehicle?.plate ?? '');
  const [odometer, setOdometer] = useState(vehicle?.initialOdometer.toString() ?? '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      id: vehicle?.id ?? newId(),
      name: name.trim() || `${make} ${model}`.trim(),
      make: make.trim(),
      model: model.trim(),
      year: year ? Number(year) : undefined,
      plate: plate.trim() || undefined,
      initialOdometer: Number(odometer) || 0,
    });
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
            <input required value={make} onChange={(e) => setMake(e.target.value)} placeholder="Toyota" />
          </label>
          <label>
            Model
            <input required value={model} onChange={(e) => setModel(e.target.value)} placeholder="Corolla" />
          </label>
        </div>
        <div className="row">
          <label>
            Year
            <input type="number" min="1900" max="2100" value={year} onChange={(e) => setYear(e.target.value)} />
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
