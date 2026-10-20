/**
 * Serbian display names for the 34 supported languages. The Serbian UI uses
 * Latin script, so these are deliberately not Cyrillic.
 */

import type { LanguageCode, LanguageNames } from '../types';
import { LANGUAGES } from './languages';

export const LANG_NAMES_SR: LanguageNames = {
  en: 'Engleski',
  de: 'Nemački',
  fr: 'Francuski',
  es: 'Španski',
  it: 'Italijanski',
  pt: 'Portugalski',
  nl: 'Holandski',
  sv: 'Švedski',
  da: 'Danski',
  no: 'Norveški',
  fi: 'Finski',
  pl: 'Poljski',
  cs: 'Češki',
  sk: 'Slovački',
  sl: 'Slovenački',
  sr: 'Srpski',
  ro: 'Rumunski',
  hu: 'Mađarski',
  tr: 'Turski',
  ru: 'Ruski',
  uk: 'Ukrajinski',
  bg: 'Bugarski',
  mk: 'Makedonski',
  el: 'Grčki',
  ar: 'Arapski',
  he: 'Hebrejski',
  fa: 'Persijski',
  hi: 'Hindski',
  th: 'Tajlandski',
  ko: 'Korejski',
  ja: 'Japanski',
  zh: 'Kineski',
  vi: 'Vijetnamski',
  id: 'Indonežanski'
};

/** Human label for a language code, in the current UI language. */
export function langName(code: string, uiLang: string): string {
  if (!Object.prototype.hasOwnProperty.call(LANGUAGES, code)) return code;
  const typed = code as LanguageCode;
  if (uiLang === 'sr' && LANG_NAMES_SR[typed]) return LANG_NAMES_SR[typed];
  return LANGUAGES[typed].name;
}
