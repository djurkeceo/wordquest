import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Deck, MasteryLevel, Word } from '../types';
import { loadEmojiLexicon } from '../emoji';
import {
  MODE_IDS,
  MODE_WEIGHT,
  SCRAMBLE_OK,
  buildSession,
  matchAvailable,
  modesFor,
  weightedSample,
  type SessionCapabilities
} from './session';

const NOW = new Date('2026-10-20T00:00:00Z').getTime();

function makeWord(id: string, f = id, n: string[] = ['x'], mastery: MasteryLevel = 0): Word {
  return {
    id, f, n, emoji: null,
    stats: {
      seen: 0, correct: 0, wrong: 0, streak: 0, mastery,
      lastSeen: 0, due: 0, modeCorrect: {}
    }
  };
}

function makeDeck(words: Word[]): Deck {
  return {
    id: 'd1', name: 'Deck', createdAt: NOW,
    nativeLang: 'sr', foreignLang: 'de', words
  };
}

const caps: SessionCapabilities = {
  tts: true,
  canSpeak: () => true,
  heartsEnabled: true,
  currentHearts: 3
};

const NO_TTS: Pick<SessionCapabilities, 'tts' | 'canSpeak'> = {
  tts: false,
  canSpeak: () => true
};

beforeAll(async () => {
  await loadEmojiLexicon();
});

describe('mode availability', () => {
  it('offers emoji, listen and scramble when their conditions hold', () => {
    const word = makeWord('w1', 'Haus', ['kuća']);
    const deck = makeDeck([word]);
    expect(modesFor(word, deck, caps)).toEqual([
      'flash', 'choice-f2n', 'choice-n2f', 'type-f2n', 'type-n2f',
      'emoji', 'listen', 'scramble'
    ]);
  });

  it('honours custom emoji, TTS availability and script limits', () => {
    const custom: Word = { ...makeWord('w1', 'zzz', ['zzz']), emoji: '🌟' };
    const deck = makeDeck([custom]);
    expect(modesFor(custom, deck, NO_TTS)).toContain('emoji');
    expect(modesFor(custom, deck, NO_TTS)).not.toContain('listen');
    expect(modesFor(custom, deck, { tts: true, canSpeak: () => false })).not.toContain('listen');
    expect(modesFor(custom, deck, caps)).toContain('listen');

    const hanzi = makeWord('w2', '房子', ['house']);
    expect(modesFor(hanzi, makeDeck([hanzi]), caps)).toContain('emoji');
    expect(modesFor(hanzi, makeDeck([hanzi]), caps)).not.toContain('scramble');
  });

  it('requires 3–14 alphabetic letters for scramble', () => {
    const check = (f: string): boolean => {
      const word = makeWord('w', f, ['x']);
      return modesFor(word, makeDeck([word]), caps).includes('scramble');
    };
    expect(check('ab')).toBe(false);
    expect(check('abc')).toBe(true);
    expect(check('a b c')).toBe(true);
    expect(check('abcdefghijklmn')).toBe(true);
    expect(check('abcdefghijklmno')).toBe(false);
    expect(check('abc!')).toBe(false);
    expect(check('љубав')).toBe(true);
    expect(check('γεια')).toBe(true);
    expect(SCRAMBLE_OK.test('房子')).toBe(false);
  });

  it('needs at least three words for memory match', () => {
    expect(matchAvailable(makeDeck([makeWord('a'), makeWord('b')]))).toBe(false);
    expect(matchAvailable(makeDeck([makeWord('a'), makeWord('b'), makeWord('c')]))).toBe(true);
  });
});

describe('weighted sampling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null for an empty list and respects weights', () => {
    expect(weightedSample([], () => 1)).toBeNull();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(weightedSample(['a', 'b'], () => 1)).toBe('a');
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(weightedSample(['a', 'b'], () => 1)).toBe('b');
  });
});

describe('buildSession', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps the nine mode ids and their weights', () => {
    expect(MODE_IDS).toEqual([
      'flash', 'choice-f2n', 'choice-n2f', 'type-f2n', 'type-n2f',
      'match', 'emoji', 'listen', 'scramble'
    ]);
    expect(MODE_WEIGHT).toMatchObject({
      flash: 0.6, 'choice-f2n': 1, 'type-f2n': 1.15, emoji: 0.9, scramble: 0.85
    });
  });

  it('builds a lesson with a match round and a flashcard opener', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const words = Array.from({ length: 10 }, (_, i) => makeWord(`w${i + 1}`, `Haus${i + 1}`, ['kuća']));
    const deck = makeDeck(words);
    const plan = buildSession(deck, { kind: 'lesson', size: 6 }, caps);

    expect(plan.deckId).toBe('d1');
    expect(plan.kind).toBe('lesson');
    expect(plan.queue).toHaveLength(6);
    expect(plan.queue[0]).toMatchObject({ type: 'flash', wordId: 'w6' });
    const matches = plan.queue.filter(ex => ex.type === 'match');
    expect(matches).toHaveLength(1);
    expect(plan.queue[3]).toMatchObject({ type: 'match' });
    expect(matches[0].type).toBe('match');
    if (matches[0].type === 'match') {
      expect(matches[0].wordIds).toEqual(['w1', 'w2', 'w3', 'w4']);
    }
    expect(plan).toMatchObject({
      index: 0, correct: 0, wrong: 0, xp: 0, hearts: 3,
      combo: 0, bestCombo: 0, startedAt: NOW, mode: null, ended: false, speedLeft: 60
    });
    expect(plan.masteredBefore.size).toBe(0);
    expect(plan.seenWords.size).toBe(0);
    vi.useRealTimers();
  });

  it('omits match for short plans and speed rounds', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const deck = makeDeck(Array.from({ length: 8 }, (_, i) => makeWord(`w${i + 1}`)));
    const short = buildSession(deck, { kind: 'lesson', size: 4 }, caps);
    expect(short.queue).toHaveLength(4);
    expect(short.queue.some(ex => ex.type === 'match')).toBe(false);

    const speed = buildSession(deck, { kind: 'speed', size: 10 }, caps);
    expect(speed.queue).toHaveLength(10);
    expect(speed.queue.some(ex => ex.type === 'match')).toBe(false);
    expect(speed.hearts).toBe(Infinity);
  });

  it('uses the practice/speed heart exception and respects disabled hearts', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const deck = makeDeck(Array.from({ length: 4 }, (_, i) => makeWord(`w${i + 1}`)));
    expect(buildSession(deck, { kind: 'lesson' }, caps).hearts).toBe(3);
    expect(buildSession(deck, { kind: 'boss' }, caps).hearts).toBe(3);
    expect(buildSession(deck, { kind: 'practice' }, caps).hearts).toBe(Infinity);
    expect(buildSession(deck, { kind: 'speed' }, caps).hearts).toBe(Infinity);
    expect(buildSession(deck, { kind: 'lesson' }, { ...caps, heartsEnabled: false }).hearts)
      .toBe(Infinity);
  });

  it('defaults to 12 exercises and repeats words for tiny decks', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const big = makeDeck(Array.from({ length: 20 }, (_, i) => makeWord(`w${i + 1}`)));
    expect(buildSession(big, { kind: 'lesson' }, caps).queue).toHaveLength(12);
    expect(buildSession(big, { kind: 'lesson', size: 0 }, caps).queue).toHaveLength(12);

    const one = makeDeck([makeWord('w1', 'Haus', ['kuća'])]);
    const tiny = buildSession(one, { kind: 'lesson', size: 5 }, caps);
    expect(tiny.queue).toHaveLength(5);
    expect(tiny.queue.every(ex => ex.type !== 'match')).toBe(true);
    expect(tiny.queue.every(ex => ex.type === 'match' || ex.wordId === 'w1')).toBe(true);
  });

  it('limits the word pool without using match when the pool is tiny', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const deck = makeDeck(Array.from({ length: 10 }, (_, i) => makeWord(`w${i + 1}`)));
    const plan = buildSession(deck, { kind: 'lesson', size: 6, pool: deck.words.slice(0, 2) }, caps);
    expect(plan.queue.some(ex => ex.type === 'match')).toBe(false);
    expect(plan.queue.every(ex => ex.type === 'match' || ex.wordId === 'w1' || ex.wordId === 'w2'))
      .toBe(true);
  });

  it('biases towards modes the word has not answered correctly', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const word = makeWord('w1', 'Haus', ['kuća']);
    word.stats.modeCorrect = {
      flash: 1, 'choice-f2n': 1, 'choice-n2f': 1, 'type-f2n': 1,
      'type-n2f': 1, emoji: 1, listen: 1
    };
    const plan = buildSession(makeDeck([word]), { kind: 'lesson', size: 1 }, caps);
    expect(plan.queue[0]).toMatchObject({ type: 'scramble', wordId: 'w1' });
  });

  it('records the mastered-before set', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const deck = makeDeck([
      makeWord('w1', 'Haus', ['kuća'], 5),
      makeWord('w2', 'Hund', ['pas'], 4),
      makeWord('w3', 'Katze', ['mačka'], 5)
    ]);
    const plan = buildSession(deck, { kind: 'lesson', size: 3 }, caps);
    expect([...plan.masteredBefore]).toEqual(['w1', 'w3']);
  });
});
