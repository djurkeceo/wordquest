/**
 * Offline language detection.
 *
 * Strategy (unchanged from the single-file app):
 *   1. Count characters by Unicode script. A dominant non-Latin script wins
 *      outright and is refined with script-specific "marker" letters.
 *   2. For Latin text, score each language with stopword hits, diacritic
 *      hits and characteristic n-grams.
 *   3. Pick the best two candidates; the UI always asks for confirmation.
 *
 * `detectPair()` takes the remembered native language as an argument instead
 * of reading global state, so the module stays pure. Callers pass
 * `getState().settings.nativeLang` in phase 5.
 */

import type {
  DetectionResult,
  DetectionScores,
  LanguageCode,
  LatinProfile,
  PairDetection,
  TextScript
} from '../types';
import { clamp } from '../util/core';
import { LATIN_PROFILES } from './latinProfiles';
import { scriptCounts } from './scripts';

/** Score Latin-script languages for one column. */
export function scoreLatin(text: string): DetectionScores {
  const lower = ' ' + text.toLowerCase().replace(/[^\p{L}\s'-]/gu, ' ').replace(/\s+/g, ' ') + ' ';
  const scores: DetectionScores = {};
  const profiles = Object.entries(LATIN_PROFILES) as Array<[LanguageCode, LatinProfile]>;
  for (const [code, p] of profiles) {
    let score = 0;
    // Stopword hits (whole words), weighted heavily.
    for (const w of p.stop) {
      const hits = lower.split(' ' + w + ' ').length - 1;
      if (hits) score += Math.min(hits, 6) * 3;
    }
    // Diacritic signal.
    for (const ch of p.chars) {
      const n = (lower.split(ch).length - 1);
      if (n) score += Math.min(n, 10) * 1.6;
    }
    // Character n-grams (frequency, capped).
    for (const g of p.ngrams) {
      let from = 0, n = 0;
      while (n < 12) {
        const i = lower.indexOf(g, from);
        if (i < 0) break;
        n++; from = i + g.length;
      }
      score += n * 0.7;
    }
    scores[code] = score;
  }
  return scores;
}

/** Refine a dominant non-Latin script into a specific language. */
export function refineScript(script: TextScript, text: string): LanguageCode | null {
  const has = (ch: string): boolean => text.includes(ch);
  if (script === 'cyrillic') {
    if (/[іїєґ]/.test(text)) return 'uk';
    if (/[ђћљњџј]/.test(text)) return 'sr';
    if (/[ѓќѕ]/.test(text)) return 'mk';
    if (/[ъ]/.test(text) && !/[ыэё]/.test(text)) return 'bg';
    if (/[ыэё]/.test(text)) return 'ru';
    return 'ru';
  }
  if (script === 'arabic') return has('پ') || has('چ') || has('ژ') || has('گ') ? 'fa' : 'ar';
  if (script === 'greek') return 'el';
  if (script === 'hebrew') return 'he';
  if (script === 'devanagari') return 'hi';
  if (script === 'thai') return 'th';
  if (script === 'hangul') return 'ko';
  if (script === 'kana') return 'ja';
  if (script === 'hanzi') return 'zh';
  return null;
}

/**
 * Detect the language of one column.
 * The script path returns an empty `scores` object, exactly like the legacy
 * app; only the Latin path exposes per-language scores.
 */
export function detectLanguage(text: unknown): DetectionResult {
  const clean = String(text || '');
  const counts = scriptCounts(clean);
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  // Find dominant non-Latin script (Latin is handled by profiles).
  let bestScript: TextScript | null = null, bestCount = 0;
  const names = Object.keys(counts) as TextScript[];
  for (const name of names) {
    if (name === 'latin') continue;
    const n = counts[name];
    if (n > bestCount) { bestCount = n; bestScript = name; }
  }
  if (bestScript && bestCount / total > 0.28) {
    const code = refineScript(bestScript, clean);
    const confidence = clamp(bestCount / total, 0.55, 0.99);
    return { code: code || 'en', confidence, scores: {} };
  }
  // Latin path.
  const scores = scoreLatin(clean);
  const ranked = (Object.entries(scores) as Array<[LanguageCode, number]>)
    .sort((a, b) => b[1] - a[1]);
  const top = ranked[0] || (['en', 0] as [LanguageCode, number]);
  const second = ranked[1] || (['en', 0] as [LanguageCode, number]);
  let code = top[0];
  // Not enough evidence: fall back to English rather than guessing wildly.
  if (top[1] < 4) code = 'en';
  const totalScore = top[1] + second[1];
  const confidence = totalScore
    ? clamp((top[1] - second[1] * 0.55) / totalScore + 0.35, 0.3, 0.98)
    : 0.3;
  return { code, confidence, scores };
}

/**
 * Decide which parsed column is foreign and which is native.
 *
 * @param foreignText concatenated first column
 * @param nativeText  concatenated second column
 * @param rememberedNative the profile's remembered native language, if any
 */
export function detectPair(
  foreignText: unknown,
  nativeText: unknown,
  rememberedNative?: LanguageCode | null
): PairDetection {
  const a = detectLanguage(foreignText);
  const b = detectLanguage(nativeText);
  const remembered = rememberedNative || null;
  let native: LanguageCode = b.code;
  let foreign: LanguageCode = a.code;

  if (remembered && (a.code === remembered || b.code === remembered)) {
    native = remembered;
    foreign = a.code === remembered ? b.code : a.code;
  } else if (a.code === b.code) {
    // Same guess for both: assume the first column is the foreign one.
    native = b.code; foreign = a.code;
  } else if (a.code === 'en') {
    // Files are usually foreign -> native, and English is the common native.
    native = 'en'; foreign = b.code;
  } else if (b.code === 'en') {
    native = 'en'; foreign = a.code;
  } else {
    // No remembered language and no English column: trust the file's own
    // convention (foreign first, translation second). The user can override.
    foreign = a.code; native = b.code;
  }
  if (foreign === native) foreign = a.code !== native ? a.code : b.code;
  return { foreign, native, a, b };
}
