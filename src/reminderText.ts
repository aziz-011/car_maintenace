import type { ReminderStatus } from './stats';
import { fmtDate, fmtKm } from './format';

export function dueText(s: ReminderStatus): string {
  const parts: string[] = [];
  if (s.kmLeft !== undefined) {
    const estimate = s.estimatedDate ? ` (around ${fmtDate(s.estimatedDate)})` : '';
    parts.push(s.kmLeft > 0 ? `Due in ${fmtKm(s.kmLeft)}${estimate}` : `${fmtKm(-s.kmLeft)} overdue`);
  }
  if (s.dueDate !== undefined && s.daysLeft !== undefined) {
    parts.push(s.daysLeft > 0 ? `Due by ${fmtDate(s.dueDate)}` : `Overdue since ${fmtDate(s.dueDate)}`);
  }
  return parts.join(' · ');
}
