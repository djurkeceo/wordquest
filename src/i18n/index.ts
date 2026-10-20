/**
 * UI translation. Fallback order is unchanged: active locale → English → the
 * key itself. Only `en` and `sr` have catalogues today; other persisted
 * `uiLang` values fall back to English exactly as before.
 */

import type { I18nDict, I18nValue, I18nVars, UiLocale } from '../types';
import { getState } from '../storage/state';
import { sample } from '../util/core';
import { en } from './en';
import { sr } from './sr';

/** Catalogues by locale code. Kept as a plain record so unknown codes fall back. */
export const I18N: Record<string, I18nDict> = { en, sr };

/** Languages the UI has been translated into (Serbian is written in Latin script). */
export const UI_LOCALES: readonly UiLocale[] = [
  { code: 'en', label: 'English' },
  { code: 'sr', label: 'Srpski' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ru', label: 'Русский' }
];

/**
 * Translate a key. Falls back: active locale → English → key itself.
 *
 * The return type is `string` because every current call site uses a string
 * key. Array-valued keys (`home.hello`, `fb.correct`) go through `tRand()`.
 */
export function t(key: string, vars?: I18nVars): string {
  const loc = getState().settings.uiLang || 'en';
  const table = I18N[loc];
  let v: I18nValue = (table && table[key]) || I18N.en[key] || key;
  if (vars) v = String(v).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  // Legacy `t()` returned arrays unchanged when called without vars; no current
  // call site does that, and the overload contract is string for all of them.
  return v as string;
}

/** Pick a random item from a localised array string. */
export function tRand(key: string): string {
  const loc = getState().settings.uiLang || 'en';
  const table = I18N[loc];
  const v: I18nValue | undefined = (table && table[key]) || I18N.en[key];
  if (Array.isArray(v)) return sample(v as readonly string[]);
  return (v as string) || key;
}

/** Re-render all static [data-i18n] nodes after a language change. */
export function applyI18n(): void {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(node => {
    // Never clobber elements that contain markup (e.g. <span> counters inside).
    if (node.children.length) return;
    const key = node.getAttribute('data-i18n') ?? '';
    const val = t(key);
    if (typeof val === 'string' && !val.includes('<')) node.textContent = val;
  });
  // Elements whose label lives in an attribute rather than in the text.
  document.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach(node => {
    const key = node.getAttribute('data-i18n-aria') ?? '';
    node.setAttribute('aria-label', t(key));
  });
  document.documentElement.lang = getState().settings.uiLang || 'en';
}
