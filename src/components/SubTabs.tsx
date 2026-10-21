import { t } from '../i18n';

interface Props<T extends string> {
  value: T;
  options: { id: T; label: string; count?: number }[];
  onChange: (id: T) => void;
  label: string;
}

/** Switches between the parts of a tab, e.g. services, faults and garages. */
export function SubTabs<T extends string>({ value, options, onChange, label }: Props<T>) {
  return (
    <div className="segmented subtabs" role="tablist" aria-label={t(label)}>
      {options.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={value === o.id} onClick={() => onChange(o.id)}>
          {t(o.label)}
          {o.count ? <span className="count">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
