/**
 * Leitner-style spaced repetition.
 *
 * Mastery rises only when a word is answered correctly in a *new* mode; it
 * falls on a miss. Weighted selection favours weak words. The numbers and the
 * grade rules are copied from the single-file app; the tests pin them so a
 * future tuning change is deliberate.
 */

import type { Deck, GradeMode, MasteryLevel, Word } from '../types';
import { clamp } from '../util/core';

export const SRS = {
  MAX_MASTERY: 5 as MasteryLevel,
  /** Intervals (ms) until a mastered word is considered due again. */
  INTERVALS: [0, 5 * 60000, 30 * 60000, 6 * 3600000, 24 * 3600000, 3 * 86400000],
  /** Base selection weight per mastery level (0 = new/shaky). */
  WEIGHTS: [26, 20, 12, 7, 4, 2],

  /** Selection weight: higher = shown sooner. */
  weight(w: Word): number {
    const st = w.stats;
    let wt = this.WEIGHTS[clamp(st.mastery, 0, 5)];
    // Struggle bonus: recent wrong answers dominate.
    wt += Math.min(st.wrong * 2.2, 18);
    // Streak slightly reduces urgency (but never to zero).
    wt = Math.max(1.2, wt - st.streak * 1.5);
    // Due date: overdue words get a boost.
    if (st.due && st.due < Date.now()) wt += 8;
    // Very recently seen words step back a little to avoid immediate repeats.
    if (st.lastSeen && Date.now() - st.lastSeen < 25000) wt *= 0.25;
    return wt;
  },

  /** Weighted random pick from a list of words. */
  pick(words: readonly Word[]): Word | null {
    if (!words.length) return null;
    const total = words.reduce((sum, w) => sum + this.weight(w), 0);
    let r = Math.random() * total;
    for (const w of words) {
      r -= this.weight(w);
      if (r <= 0) return w;
    }
    return words[words.length - 1];
  },

  /** Pick `n` distinct words, weighted. */
  pickMany(words: readonly Word[], n: number): Word[] {
    const pool = words.slice();
    const out: Word[] = [];
    while (out.length < n && pool.length) {
      const w = this.pick(pool);
      if (!w) break;
      out.push(w);
      pool.splice(pool.indexOf(w), 1);
    }
    return out;
  },

  /** Words that deserve review: low mastery or a bad correct/wrong ratio. */
  trouble(words: readonly Word[], limit?: number): Word[] {
    return words
      .filter(w => w.stats.wrong > 0 || w.stats.mastery <= 1)
      .sort((a, b) => {
        const sa = a.stats, sb = b.stats;
        const scoreA = sa.wrong * 3 - sa.correct + (5 - sa.mastery) * 2;
        const scoreB = sb.wrong * 3 - sb.correct + (5 - sb.mastery) * 2;
        return scoreB - scoreA;
      })
      .slice(0, limit || 12);
  },

  /**
   * Record an answer.
   * `mode` is the exercise id (`match`, `flash`, etc.) or `speed` for a live
   * speed-round question.
   */
  grade(word: Word, ok: boolean, mode: GradeMode): MasteryLevel {
    const st = word.stats;
    st.seen++;
    st.lastSeen = Date.now();
    if (ok) {
      st.correct++;
      st.streak++;
      // Track distinct modes answered correctly — required for top mastery.
      st.modeCorrect[mode] = (st.modeCorrect[mode] || 0) + 1;
      const distinctModes = Object.keys(st.modeCorrect).length;
      // Every correct answer promotes the word one Leitner level, but level 5
      // stays out of reach until the word is known in at least two modes.
      let target = Math.min(this.MAX_MASTERY, st.mastery + 1);
      if (target >= this.MAX_MASTERY && distinctModes < 2) target = 4;
      st.mastery = target as MasteryLevel;
      st.due = Date.now() + this.INTERVALS[st.mastery];
    } else {
      st.wrong++;
      st.streak = 0;
      st.mastery = Math.max(0, st.mastery - 2) as MasteryLevel;
      st.due = Date.now() + 2 * 60000;
    }
    return st.mastery;
  },

  /** Mastered count for a deck. */
  masteredCount(deck: Deck): number {
    return deck.words.filter(w => w.stats.mastery >= 5).length;
  },

  /** Average mastery 0..5. */
  avgMastery(deck: Deck): number {
    if (!deck.words.length) return 0;
    return deck.words.reduce((s, w) => s + w.stats.mastery, 0) / deck.words.length;
  }
};
