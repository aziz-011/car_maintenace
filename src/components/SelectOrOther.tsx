import { useState } from 'react';
import type { OptionGroup } from '../types';
import { t } from '../i18n';

const OTHER = '__other';

interface Props {
  value: string;
  onChange: (value: string) => void;
  options?: readonly string[];
  /** Options shown under headings instead of a flat list. */
  groups?: OptionGroup[];
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
export function SelectOrOther({ value, onChange, options = [], groups, required, placeholder, otherPlaceholder }: Props) {
  const all = groups ? groups.flatMap((g) => g.options) : options;
  const known = all.includes(value);
  const [custom, setCustom] = useState(value !== '' && !known);
  const showInput = all.length === 0 || custom || (value !== '' && !known);

  return (
    <>
      {all.length > 0 && (
        <select
          required={required && !showInput}
          value={showInput ? OTHER : value}
          onChange={(e) => {
            const v = e.target.value;
            setCustom(v === OTHER);
            onChange(v === OTHER ? '' : v);
          }}
        >
          <option value="">{placeholder ?? t('Choose…')}</option>
          {groups
            ? groups.map((g) => (
                <optgroup key={g.label} label={t(g.label)}>
                  {g.options.map((o) => (
                    <option key={o} value={o}>
                      {t(o)}
                    </option>
                  ))}
                </optgroup>
              ))
            : options.map((o) => (
                <option key={o} value={o}>
                  {t(o)}
                </option>
              ))}
          <option value={OTHER}>{t('Other…')}</option>
        </select>
      )}
      {showInput && (
        <input
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={otherPlaceholder}
          autoFocus={all.length > 0}
          autoComplete="off"
        />
      )}
    </>
  );
}
