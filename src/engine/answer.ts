/**
 * Typed-answer checking, including typo tolerance and Serbian bilingual input.
 *
 * The order matters: exact match first, then the strict-accent diagnosis, then
 * Levenshtein tolerance. The distance is capped early when lengths differ by
 * more than two, exactly as in the legacy app.
 */

import type { TypedCheckOptions, TypedCheckResult } from '../types';
import { normalizeAnswer, toCyrillic, toLatin } from '../language/normalize';

/** Levenshtein distance, capped for performance on long strings. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  if (Math.abs(a.length - b.length) > 2) return 3;
  const prev = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev.splice(0, prev.length, ...cur);
  }
  return prev[b.length];
}

/**
 * Check a typed answer against a list of accepted strings.
 *
 * `bilingual` adds the other Serbian script as an accepted candidate. `strict`
 * keeps accents significant and returns the special `accents` verdict when the
 * letters are right but the diacritics are not.
 */
export function checkTyped(
  input: string,
  accepted: readonly string[],
  opts?: TypedCheckOptions
): TypedCheckResult {
  const strict = opts && opts.strict;
  const bilingual = !!(opts && opts.bilingual);
  const candidates = accepted.slice();
  // Serbian: accept both scripts in either direction.
  if (bilingual) {
    candidates.forEach(c => {
      if (/[\u0400-\u04FF]/.test(c)) candidates.push(toLatin(c));
      else if (/[čćžšđ]/.test(c)) candidates.push(toCyrillic(c));
    });
  }
  let user = normalizeAnswer(input, strict);
  if (bilingual && /[\u0400-\u04FF]/.test(input)) user = normalizeAnswer(toLatin(input), strict);
  if (!user) return { status: 'wrong', matched: candidates[0] || '' };
  for (const c of candidates) {
    if (normalizeAnswer(c, strict) === user) return { status: 'correct', matched: c };
  }
  // Strict ("accents matter") mode: the right letters with the wrong accents is
  // still an error, but we say so specifically instead of a generic miss.
  if (strict) {
    const loose = normalizeAnswer(input, false);
    for (const c of candidates) {
      if (normalizeAnswer(c, false) === loose) return { status: 'accents', matched: c };
    }
  }
  // Typo tolerance (Levenshtein <= 1 on short words, <= 2 on long ones).
  for (const c of candidates) {
    const target = normalizeAnswer(c, strict);
    const d = levenshtein(user, target);
    const allowed = target.length >= 8 ? 2 : 1;
    if (d <= allowed && target.length > 2) return { status: 'almost', matched: c };
  }
  return { status: 'wrong', matched: candidates[0] || '' };
}
