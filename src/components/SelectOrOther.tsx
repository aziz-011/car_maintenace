import { useState } from 'react';

const OTHER = '__other';

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  required?: boolean;
  /** Label of the empty first option. */
  placeholder?: string;
  /** Placeholder of the free-text input shown for "Other…". */
  otherPlaceholder?: string;
}

/**
 * A dropdown of known options with an "Other…" entry that reveals a text input.
 * Unlike a datalist, the full list opens on every browser, including phones.
 */
export function SelectOrOther({ value, onChange, options, required, placeholder = 'Choose…', otherPlaceholder }: Props) {
  const known = options.includes(value);
  const [custom, setCustom] = useState(value !== '' && !known);
  const showInput = options.length === 0 || custom || (value !== '' && !known);

  return (
    <>
      {options.length > 0 && (
        <select
          required={required && !showInput}
          value={showInput ? OTHER : value}
          onChange={(e) => {
            const v = e.target.value;
            setCustom(v === OTHER);
            onChange(v === OTHER ? '' : v);
          }}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          <option value={OTHER}>Other…</option>
        </select>
      )}
      {showInput && (
        <input
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={otherPlaceholder}
          autoFocus={options.length > 0}
          autoComplete="off"
        />
      )}
    </>
  );
}
