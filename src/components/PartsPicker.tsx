import { useState } from 'react';
import type { OptionGroup } from '../types';

const OTHER = '__other';

interface Props {
  value: string[];
  onChange: (parts: string[]) => void;
  groups: OptionGroup[];
}

/** Pick several parts from a grouped dropdown; each choice is added as a removable chip. */
export function PartsPicker({ value, onChange, groups }: Props) {
  const [custom, setCustom] = useState<string | null>(null);

  const add = (part: string) => {
    const p = part.trim();
    if (p && !value.includes(p)) onChange([...value, p]);
  };

  const addCustom = () => {
    if (custom) add(custom);
    setCustom(null);
  };

  return (
    <div className="parts-picker">
      <select
        value=""
        onChange={(e) => {
          if (e.target.value === OTHER) setCustom('');
          else add(e.target.value);
        }}
      >
        <option value="">{value.length ? 'Add another part…' : 'Add a part…'}</option>
        {groups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.options
              .filter((o) => !value.includes(o))
              .map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
          </optgroup>
        ))}
        <option value={OTHER}>Other…</option>
      </select>

      {custom !== null && (
        <div className="parts-custom">
          <input
            autoFocus
            value={custom}
            placeholder="Part name"
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
          />
          <button type="button" className="btn" onClick={addCustom}>
            Add
          </button>
        </div>
      )}

      {value.length > 0 && (
        <ul className="chips">
          {value.map((p) => (
            <li key={p} className="chip">
              {p}
              <button type="button" aria-label={`Remove ${p}`} onClick={() => onChange(value.filter((x) => x !== p))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
