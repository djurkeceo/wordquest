/**
 * The fifteen badges and their threshold checks.
 *
 * Badge names and descriptions remain hardcoded English exactly as in the
 * single-file app (reported as M5 in docs/PLAN.md); translating them would be a
 * user-visible change outside this refactor.
 */

import type { AppState, Badge } from '../types';
import { SRS } from '../engine/srs';

/** Total number of times any word has been seen (not distinct words; L6). */
export function totalSeen(state: AppState): number {
  return state.decks.reduce((n, d) => n + d.words.reduce((m, w) => m + w.stats.seen, 0), 0);
}

/** Total mastered words across every deck. */
export function totalMastered(state: AppState): number {
  return state.decks.reduce((n, d) => n + SRS.masteredCount(d), 0);
}

export const BADGES: readonly Badge[] = [
  { id: 'first10', emoji: '🌱', name: 'First steps',   desc: 'See 10 words',            test: s => totalSeen(s) >= 10 },
  { id: 'firstdeck', emoji: '📚', name: 'Collector',    desc: 'Create a deck',           test: s => s.decks.length >= 1 },
  { id: 'perfect', emoji: '💎', name: 'Flawless',       desc: 'Perfect lesson',          test: s => s.profile.perfectLessons >= 1 },
  { id: 'streak3', emoji: '🔥', name: 'On fire',        desc: '3-day streak',            test: s => s.profile.streak >= 3 },
  { id: 'streak7', emoji: '☄️', name: 'Week warrior',   desc: '7-day streak',            test: s => s.profile.streak >= 7 },
  { id: 'streak30', emoji: '🏆', name: 'Unstoppable',   desc: '30-day streak',           test: s => s.profile.streak >= 30 },
  { id: 'master25', emoji: '🌟', name: 'Word hoarder',  desc: '25 words mastered',       test: s => totalMastered(s) >= 25 },
  { id: 'master100', emoji: '👑', name: 'Lexicon',      desc: '100 words mastered',      test: s => totalMastered(s) >= 100 },
  { id: 'xp500', emoji: '⚡', name: 'Charged',         desc: 'Earn 500 XP',             test: s => s.profile.xp >= 500 },
  { id: 'xp2000', emoji: '🚀', name: 'Rocket',          desc: 'Earn 2000 XP',            test: s => s.profile.xp >= 2000 },
  { id: 'lessons10', emoji: '🎯', name: 'Regular',      desc: 'Finish 10 lessons',       test: s => s.profile.lessons >= 10 },
  { id: 'combo10', emoji: '🎸', name: 'In the zone',    desc: '10-answer combo',         test: s => (s.profile.bestCombo || 0) >= 10 },
  { id: 'speed30', emoji: '💨', name: 'Quickdraw',      desc: '30 answers in one speed round', test: s => (s.profile.bestSpeed || 0) >= 30 },
  { id: 'boss', emoji: '👾', name: 'Boss slayer',       desc: 'Win a boss round',        test: s => (s.profile.bossWins || 0) >= 1 },
  { id: 'nightowl', emoji: '🦉', name: 'Night owl',     desc: 'Study after midnight',    test: s => !!s.profile.nightOwl }
];

/** Evaluate badges; returns the list of newly unlocked ones. */
export function checkAchievements(state: AppState): Badge[] {
  const unlocked: Badge[] = [];
  // A hand-edited or partially restored save might miss the array entirely.
  if (!Array.isArray(state.profile.achievements)) state.profile.achievements = [];
  for (const badge of BADGES) {
    if (state.profile.achievements.includes(badge.id)) continue;
    let ok = false;
    try { ok = badge.test(state); } catch { ok = false; }
    if (ok) {
      state.profile.achievements.push(badge.id);
      unlocked.push(badge);
    }
  }
  return unlocked;
}
