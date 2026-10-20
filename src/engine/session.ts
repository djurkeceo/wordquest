/**
 * Lesson planning.
 *
 * A lesson is a queue of exercise descriptors. Modes are mixed so the same
 * word is met in different contexts — which is also what unlocks mastery 5.
 *
 * The engine is DOM-free. The caller injects TTS availability and the current
 * heart state (`SessionCapabilities`) instead of this module importing audio
 * or storage.
 */

import type {
  Deck,
  Exercise,
  LanguageCode,
  ModeId,
  SessionKind,
  SessionOptions,
  SessionPlan,
  Word
} from '../types';
import { emojiFor } from '../emoji';
import { SRS } from './srs';

export const MODE_IDS: readonly ModeId[] = [
  'flash', 'choice-f2n', 'choice-n2f', 'type-f2n', 'type-n2f',
  'match', 'emoji', 'listen', 'scramble'
];

/** Relative likelihood of each mode when composing a lesson. */
export const MODE_WEIGHT: Record<ModeId, number> = {
  'flash': 0.6, 'choice-f2n': 1, 'choice-n2f': 1,
  'type-f2n': 1.15, 'type-n2f': 1, 'match': 1, 'emoji': 0.9, 'listen': 0.9, 'scramble': 0.85
};

/** Capabilities the session builder needs from the host application. */
export interface SessionCapabilities {
  /** Mirrors `settings.tts`. */
  tts: boolean;
  /** Mirrors `sound.canSpeak(lang)`; true when a voice is available. */
  canSpeak: (lang: LanguageCode) => boolean;
  /** Mirrors `settings.hearts`. */
  heartsEnabled: boolean;
  /** Mirrors `profile.hearts` at the moment the session starts. */
  currentHearts: number;
}

type SingleModeId = Exclude<ModeId, 'match'>;

/** Pick a random item with per-item weights. */
export function weightedSample<T>(items: readonly T[], weightFn: (item: T) => number): T | null {
  if (!items.length) return null;
  let total = 0;
  for (const it of items) total += Math.max(0.0001, weightFn(it));
  let r = Math.random() * total;
  for (const it of items) {
    r -= Math.max(0.0001, weightFn(it));
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

/** Re-ordering letters only tests spelling in alphabetic scripts (Latin,
 *  Greek, Cyrillic). Scrambling Han/Kana/Hangul/Arabic glyphs would not. */
export const SCRAMBLE_OK = /^[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]+$/;

/** Which modes can be used for a given word (availability rules). */
export function modesFor(
  word: Word,
  deck: Deck,
  caps: Pick<SessionCapabilities, 'tts' | 'canSpeak'>
): ModeId[] {
  const modes: ModeId[] = ['flash', 'choice-f2n', 'choice-n2f', 'type-f2n', 'type-n2f'];
  const em = emojiFor(word, word.n);
  if (em) modes.push('emoji');
  if (caps.tts && caps.canSpeak(deck.foreignLang)) modes.push('listen');
  // Scramble only makes sense for a single, reasonably short alphabetic word.
  const letters = word.f.replace(/\s+/g, '');
  if (letters.length >= 3 && letters.length <= 14 && SCRAMBLE_OK.test(letters)) modes.push('scramble');
  return modes;
}

/** Is `match` playable? Needs at least 3 distinct words. */
export function matchAvailable(deck: Deck): boolean {
  return deck.words.length >= 3;
}

/**
 * Build a lesson plan. `size` defaults to 12; callers choose 8–14 for lessons,
 * 6–12 for practice and 6–20 for boss rounds. Speed rounds discard the queue
 * and generate questions live, but the legacy app still builds one first (M12).
 */
export function buildSession(
  deck: Deck,
  opts: SessionOptions,
  caps: SessionCapabilities
): SessionPlan {
  const kind: SessionKind = opts.kind || 'lesson';
  const pool: Word[] = (opts.pool && opts.pool.length ? opts.pool : deck.words).slice();
  const size = opts.size || 12;
  const exercises: Exercise[] = [];
  let lastType: ModeId | null = null;
  const usedInMatch = new Set<string>();

  // Decide the word order up front: weighted, with repeats for tiny decks.
  const picks: Word[] = [];
  const distinct = Math.min(pool.length, size);
  picks.push(...SRS.pickMany(pool, distinct));
  while (picks.length < size && pool.length) {
    const next = SRS.pick(pool);
    if (!next) break;
    picks.push(next);
  }
  // Interleave a match round early when the deck is big enough.
  const matchAt = (matchAvailable(deck) && pool.length >= 3 && kind !== 'speed' && size >= 6) ? 2 : -1;

  for (let i = 0; i < picks.length; i++) {
    if (i === matchAt) {
      const mWords = SRS.pickMany(pool.filter(w => !usedInMatch.has(w.id)), Math.min(4, pool.length));
      if (mWords.length >= 3) {
        mWords.forEach(w => usedInMatch.add(w.id));
        exercises.push({ type: 'match', wordIds: mWords.map(w => w.id) });
        lastType = 'match';
        continue;
      }
    }
    const word = picks[i];
    let avail = modesFor(word, deck, caps)
      .filter((m): m is SingleModeId => m !== lastType && m !== 'match');
    // Don't repeat the same mode twice in a row; if impossible, allow it.
    if (!avail.length) {
      avail = modesFor(word, deck, caps).filter((m): m is SingleModeId => m !== 'match');
    }
    // Bias towards modes the word has not yet been answered in correctly.
    const unseen = avail.filter(m => !word.stats.modeCorrect[m]);
    const pool2 = (unseen.length && Math.random() < 0.65) ? unseen : avail;
    const chosen = weightedSample(pool2, m => MODE_WEIGHT[m] || 1) || avail[0];
    exercises.push({ type: chosen, wordId: word.id });
    lastType = chosen;
  }

  // A flashcard opener helps orientation. Move the last planned exercise's word
  // to the front as a card so no word is shown twice and the count is stable.
  if (exercises.length > 4) {
    const last = exercises[exercises.length - 1];
    if (last && last.type !== 'match' && last.wordId) {
      exercises.pop();
      exercises.unshift({ type: 'flash', wordId: last.wordId });
    }
  }
  return {
    deckId: deck.id,
    kind,
    queue: exercises,
    index: 0,
    correct: 0,
    wrong: 0,
    xp: 0,
    hearts: caps.heartsEnabled && kind !== 'practice' && kind !== 'speed' ? caps.currentHearts : Infinity,
    combo: 0,
    bestCombo: 0,
    startedAt: Date.now(),
    masteredBefore: new Set(deck.words.filter(w => w.stats.mastery >= 5).map(w => w.id)),
    seenWords: new Set(),
    mode: null,
    ended: false,
    speedLeft: 60
  };
}
