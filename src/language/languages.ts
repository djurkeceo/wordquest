/**
 * Language registry copied verbatim from the single-file app.
 *
 * Adding a language here also requires a `LANG_NAMES_SR` entry (and, for a
 * Latin-script language, a `LATIN_PROFILES` fingerprint) so detection and the
 * pickers keep working. TTS tags are BCP-47.
 */

import type { LanguageCode, LanguageMeta } from '../types';

export const LANGUAGES: Record<LanguageCode, LanguageMeta> = {
  en: { name: 'English', native: 'English', tts: 'en-US', script: 'latin' },
  de: { name: 'German', native: 'Deutsch', tts: 'de-DE', script: 'latin' },
  fr: { name: 'French', native: 'Français', tts: 'fr-FR', script: 'latin' },
  es: { name: 'Spanish', native: 'Español', tts: 'es-ES', script: 'latin' },
  it: { name: 'Italian', native: 'Italiano', tts: 'it-IT', script: 'latin' },
  pt: { name: 'Portuguese', native: 'Português', tts: 'pt-PT', script: 'latin' },
  nl: { name: 'Dutch', native: 'Nederlands', tts: 'nl-NL', script: 'latin' },
  sv: { name: 'Swedish', native: 'Svenska', tts: 'sv-SE', script: 'latin' },
  da: { name: 'Danish', native: 'Dansk', tts: 'da-DK', script: 'latin' },
  no: { name: 'Norwegian', native: 'Norsk', tts: 'nb-NO', script: 'latin' },
  fi: { name: 'Finnish', native: 'Suomi', tts: 'fi-FI', script: 'latin' },
  pl: { name: 'Polish', native: 'Polski', tts: 'pl-PL', script: 'latin' },
  cs: { name: 'Czech', native: 'Čeština', tts: 'cs-CZ', script: 'latin' },
  sk: { name: 'Slovak', native: 'Slovenčina', tts: 'sk-SK', script: 'latin' },
  sl: { name: 'Slovenian', native: 'Slovenščina', tts: 'sl-SI', script: 'latin' },
  sr: { name: 'Serbian', native: 'Srpskohrvatski', tts: 'sr-RS', script: 'both' },
  ro: { name: 'Romanian', native: 'Română', tts: 'ro-RO', script: 'latin' },
  hu: { name: 'Hungarian', native: 'Magyar', tts: 'hu-HU', script: 'latin' },
  tr: { name: 'Turkish', native: 'Türkçe', tts: 'tr-TR', script: 'latin' },
  ru: { name: 'Russian', native: 'Русский', tts: 'ru-RU', script: 'cyrillic' },
  uk: { name: 'Ukrainian', native: 'Українська', tts: 'uk-UA', script: 'cyrillic' },
  bg: { name: 'Bulgarian', native: 'Български', tts: 'bg-BG', script: 'cyrillic' },
  mk: { name: 'Macedonian', native: 'Македонски', tts: 'mk-MK', script: 'cyrillic' },
  el: { name: 'Greek', native: 'Ελληνικά', tts: 'el-GR', script: 'greek' },
  ar: { name: 'Arabic', native: 'العربية', tts: 'ar-SA', script: 'arabic' },
  he: { name: 'Hebrew', native: 'עברית', tts: 'he-IL', script: 'hebrew' },
  fa: { name: 'Persian', native: 'فارسی', tts: 'fa-IR', script: 'arabic' },
  hi: { name: 'Hindi', native: 'हिन्दी', tts: 'hi-IN', script: 'devanagari' },
  th: { name: 'Thai', native: 'ไทย', tts: 'th-TH', script: 'thai' },
  ko: { name: 'Korean', native: '한국어', tts: 'ko-KR', script: 'hangul' },
  ja: { name: 'Japanese', native: '日本語', tts: 'ja-JP', script: 'kana' },
  zh: { name: 'Chinese', native: '中文', tts: 'zh-CN', script: 'hanzi' },
  vi: { name: 'Vietnamese', native: 'Tiếng Việt', tts: 'vi-VN', script: 'latin' },
  id: { name: 'Indonesian', native: 'Bahasa Indonesia', tts: 'id-ID', script: 'latin' }
};

export const LANGUAGE_CODES = Object.keys(LANGUAGES) as LanguageCode[];

/** BCP-47 tag for speech synthesis. */
export function ttsTag(code: LanguageCode): string {
  return LANGUAGES[code] ? LANGUAGES[code].tts : 'en-US';
}
