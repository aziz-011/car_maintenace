import { FR } from './i18n.fr';
import type { Prefs } from './types';

/**
 * Translations keyed by the English text, so screens read naturally and a
 * missing translation simply shows English. Placeholders look like {name}.
 * Stored values (service types, parts, reminder names) stay in English and
 * are translated when shown, so data and reminders work in every language.
 */
let dict: Record<string, string> = {};

export function setLanguage(language: Prefs['language']) {
  dict = language === 'fr' ? FR : {};
  if (typeof document !== 'undefined') document.documentElement.lang = language;
}

/** Engine names from the catalogue ("1.9 TDI diesel · 110 hp") read naturally in French too. */
function localizeEngine(text: string): string {
  return text.replace(/ petrol · (\d+) hp$/, ' essence · $1 ch').replace(/ · (\d+) hp$/, ' · $1 ch');
}

export function t(text: string, vars?: Record<string, string | number>): string {
  const template = dict[text] ?? (dict === FR ? localizeEngine(text) : text);
  return vars ? template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : template;
}

/** "1 fill-up" / "3 fill-ups", translated. */
export const plural = (n: number, one: string, many: string) => t(n === 1 ? one : many, { n });
