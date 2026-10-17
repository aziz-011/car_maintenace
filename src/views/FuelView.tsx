import { consumptionSegments } from '../stats';
import { fmtDate, fmtKm, fmtMoney, fmtNum } from '../format';
import type { FuelEntry } from '../types';

interface Props {
  entries: FuelEntry[];
  onAdd: () => void;
  onEdit: (e: FuelEntry) => void;
  onDelete: (e: FuelEntry) => void;
}

export function FuelView({ entries, onAdd, onEdit, onDelete }: Props) {
  const consumption = new Map(consumptionSegments(entries).map((s) => [s.entryId, s.litersPer100km]));
  const sorted = [...entries].sort((a, b) => b.odometer - a.odometer || b.date.localeCompare(a.date));

  return (
    <section className="card">
      <div className="card-header">
        <h3>Fuel log</h3>
        <button className="btn primary" onClick={onAdd}>
          + Fill-up
        </button>
      </div>
      {sorted.length === 0 ? (
        <p className="empty">No fill-ups yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th className="num">Odometer</th>
                <th className="num">Liters</th>
                <th className="num">Price/L</th>
                <th className="num">Total</th>
                <th className="num">L/100 km</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.id}>
                  <td>
                    {fmtDate(e.date)}
                    {!e.fullTank && <span className="tag">partial</span>}
                    {e.station && <div className="muted">{e.station}</div>}
                  </td>
                  <td className="num">{fmtKm(e.odometer)}</td>
                  <td className="num">{fmtNum(e.liters)}</td>
                  <td className="num">{fmtMoney(e.totalCost / e.liters)}</td>
                  <td className="num">{fmtMoney(e.totalCost)}</td>
                  <td className="num">{fmtNum(consumption.get(e.id))}</td>
                  <td className="row-actions">
                    <button className="link" onClick={() => onEdit(e)}>
                      Edit
                    </button>
                    <button className="link danger" onClick={() => onDelete(e)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
