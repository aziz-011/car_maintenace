import type { ReminderStatus } from './stats';
import { fmtDate, fmtKm } from './format';
import { t } from './i18n';

export function dueText(s: ReminderStatus): string {
  const parts: string[] = [];
  if (s.kmLeft !== undefined) {
    if (s.kmLeft > 0) {
      parts.push(
        s.estimatedDate
          ? t('Due in {km} (around {date})', { km: fmtKm(s.kmLeft), date: fmtDate(s.estimatedDate) })
          : t('Due in {km}', { km: fmtKm(s.kmLeft) }),
      );
    } else {
      parts.push(t('{km} overdue', { km: fmtKm(-s.kmLeft) }));
    }
  }
  if (s.dueDate !== undefined && s.daysLeft !== undefined) {
    parts.push(s.daysLeft > 0 ? t('Due by {date}', { date: fmtDate(s.dueDate) }) : t('Overdue since {date}', { date: fmtDate(s.dueDate) }));
  }
  return parts.join(' · ');
}
