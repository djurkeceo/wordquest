/**
 * Multiple-choice distractor construction.
 *
 * Copied verbatim from the legacy app, including its known limitation (H6):
 * only the same word is excluded and only `n[0]` is treated as the correct
 * native answer. A listed alternative translation can therefore appear as a
 * distractor. The test suite pins that behaviour.
 */

import type { Deck, Word } from '../types';
import { shuffle } from '../util/core';
import { normKey } from '../language/normalize';

/** Build 4 answer options, with smart distractors. */
export function buildOptions(deck: Deck, word: Word, field: 'f' | 'n', count?: number): string[] {
  const n = count || 4;
  const correct = field === 'f' ? word.f : word.n[0];
  const others = deck.words.filter(w => w.id !== word.id);
  // Score candidate distractors by similarity (starting letter / length).
  const scored = others.map(w => {
    const val = field === 'f' ? w.f : w.n[0];
    let score = 0;
    if (val && correct && val[0].toLowerCase() === correct[0].toLowerCase()) score += 4;
    if (val && Math.abs(val.length - correct.length) <= 2) score += 3;
    if (val && val.split(' ').length === correct.split(' ').length) score += 1;
    return { val, score };
  }).filter(x => x.val);
  const seen = new Set([normKey(correct)]);
  const picked: string[] = [];
  // Prefer similar-looking distractors, but keep some randomness.
  const sorted = shuffle(scored).sort((a, b) => b.score - a.score);
  for (const cand of sorted) {
    if (picked.length >= n - 1) break;
    const k = normKey(cand.val);
    if (seen.has(k)) continue;
    seen.add(k);
    picked.push(cand.val);
  }
  return shuffle([correct].concat(picked));
}
