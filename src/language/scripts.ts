/**
 * Unicode script ranges and counting for offline language detection.
 *
 * `latin` includes Latin-1 letters and Latin Extended-A. Hanzi includes the
 * common CJK block and Extension A. Kana is intentionally separate from Hanzi
 * so Japanese text containing kana is not classified as Chinese.
 */

import type { ScriptCounts, TextScript } from '../types';

export const SCRIPT_RANGES: Record<TextScript, RegExp> = {
  latin:      /[A-Za-zÀ-ÖØ-öø-ÿĀ-ſ]/g,
  cyrillic:   /[\u0400-\u04FF]/g,
  greek:      /[\u0370-\u03FF]/g,
  arabic:     /[\u0600-\u06FF\u0750-\u077F]/g,
  hebrew:     /[\u0590-\u05FF]/g,
  devanagari: /[\u0900-\u097F]/g,
  thai:       /[\u0E00-\u0E7F]/g,
  hangul:     /[\uAC00-\uD7AF\u1100-\u11FF]/g,
  kana:       /[\u3040-\u30FF]/g,
  hanzi:      /[\u4E00-\u9FFF\u3400-\u4DBF]/g
};

/** Count letters per script for a chunk of text. */
export function scriptCounts(text: string): ScriptCounts {
  const out = {} as ScriptCounts;
  const names = Object.keys(SCRIPT_RANGES) as TextScript[];
  for (const name of names) {
    out[name] = (text.match(SCRIPT_RANGES[name]) || []).length;
  }
  return out;
}
