/**
 * Localised `<option>` markup for the two language pickers (import + settings).
 *
 * A shared helper is needed because the lang and settings screens must not
 * import each other. Sorting and labels match the legacy `languageOptions()`.
 */

import { LANGUAGE_CODES } from '../language/languages';
import { langName } from '../language/names';
import { esc } from './dom';

export function languageOptions(selected: string, uiLang: string): string {
  return LANGUAGE_CODES
    .slice()
    .sort((a, b) => langName(a, uiLang).localeCompare(langName(b, uiLang)))
    .map(code => `<option value="${code}"${code === selected ? ' selected' : ''}>${esc(langName(code, uiLang))}</option>`)
    .join('');
}
