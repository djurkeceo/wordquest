/**
 * State defaults and the tolerant loader/merger.
 *
 * The field lists below deliberately match the single-file app exactly. New
 * runtime fields are *not* added to `defaultState()`: the legacy app writes
 * them lazily, and adding defaults here would change the JSON that older saves
 * produce. `normalizeDeck()` also keeps its current field list, which means it
 * still drops `lastOpened` and any unknown deck field (reported as H1).
 */

import type { AppState, Deck, MasteryLevel, Word, WordStats } from '../types';
import { clamp, uid } from '../util/core';
import { SCHEMA_VERSION } from './keys';

/** Default state factory — keeps the shape explicit and migration-friendly. */
export function defaultState(): AppState {
  return {
    version: SCHEMA_VERSION,
    settings: {
      sound: true,
      tts: true,
      ttsEngine: 'auto',      // 'auto' | 'browser' | 'online'
      strictAccents: false,   // false = diacritic-insensitive matching
      hearts: true,
      calmMotion: false,
      theme: 'auto',
      uiLang: 'en',
      nativeLang: null,       // remembered across decks
      dailyGoal: 50
    },
    profile: {
      xp: 0,
      level: 1,
      streak: 0,
      lastLessonDay: null,
      dailyDay: null,
      dailyXp: 0,
      hearts: 5,
      maxHearts: 5,
      achievements: [],
      lessons: 0,
      perfectLessons: 0,
      totalCorrect: 0,
      totalWrong: 0
    },
    decks: []
  };
}

/** Merge loaded data onto defaults so new fields always exist. */
export function migrate(data: Record<string, unknown>): AppState {
  const base = defaultState();
  const input = data as Partial<AppState>;
  // Copy into fresh objects — assigning onto `base` would let a partial
  // `profile` (hand-edited backup) replace the defaults instead of merging.
  const merged = Object.assign({}, base, input);
  merged.settings = Object.assign({}, base.settings, input.settings || {});
  merged.profile = Object.assign({}, base.profile, input.profile || {});
  merged.decks = Array.isArray(input.decks) ? input.decks.map(normalizeDeck) : [];
  merged.version = SCHEMA_VERSION;
  return merged;
}

/** Ensure a deck has every expected field (older saves / imported JSON). */
export function normalizeDeck(d: Partial<Deck>): Deck {
  const deck: Deck = {
    id: d.id || uid(),
    name: d.name || 'Untitled deck',
    createdAt: d.createdAt || Date.now(),
    nativeLang: d.nativeLang || 'en',
    foreignLang: d.foreignLang || 'de',
    words: Array.isArray(d.words) ? d.words : []
  };
  deck.words = deck.words.map(w => normalizeWord(w)).filter(w => w.f && w.n && w.n.length);
  return deck;
}

export function normalizeWord(w: Partial<Word>): Word {
  const st: Partial<WordStats> = w.stats || {};
  return {
    id: w.id || uid(),
    f: String(w.f || '').trim(),
    n: Array.isArray(w.n) ? w.n.map(String) : [String(w.n || '')].filter(Boolean),
    emoji: w.emoji || null,
    stats: {
      seen: st.seen || 0,
      correct: st.correct || 0,
      wrong: st.wrong || 0,
      streak: st.streak || 0,
      mastery: clamp(st.mastery || 0, 0, 5) as MasteryLevel,
      lastSeen: st.lastSeen || 0,
      due: st.due || 0,
      modeCorrect: st.modeCorrect || {}
    }
  };
}
