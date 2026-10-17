import type { ReminderStatus } from '../stats';

const LABEL = { ok: '✓ OK', soon: '! Due soon', overdue: '✕ Overdue' } as const;

export function ReminderBadge({ state }: { state: ReminderStatus['state'] }) {
  return <span className={`badge ${state}`}>{LABEL[state]}</span>;
}
