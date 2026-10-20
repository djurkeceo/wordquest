import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Deck, MasteryLevel, Word, WordStats } from '../types';
import { SRS } from './srs';

const NOW = new Date('2026-10-20T00:00:00Z').getTime();

function makeWord(id: string, patch: Partial<WordStats> = {}): Word {
  return {
    id,
    f: id,
    n: ['x'],
    emoji: null,
    stats: {
      seen: 0, correct: 0, wrong: 0, streak: 0, mastery: 0,
      lastSeen: 0, due: 0, modeCorrect: {},
      ...patch
    }
  };
}

function makeDeck(words: Word[]): Deck {
  return {
    id: 'd1', name: 'Deck', createdAt: NOW,
    nativeLang: 'sr', foreignLang: 'de', words
  };
}

describe('SRS', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('uses the legacy base weights and modifiers', () => {
    expect(SRS.weight(makeWord('a'))).toBe(26);
    expect(SRS.weight(makeWord('a', { mastery: 3 as MasteryLevel }))).toBe(7);
    expect(SRS.weight(makeWord('a', { wrong: 2 }))).toBeCloseTo(30.4);
    expect(SRS.weight(makeWord('a', { wrong: 99 }))).toBe(44);
    expect(SRS.weight(makeWord('a', { streak: 5 }))).toBe(18.5);
    expect(SRS.weight(makeWord('a', { streak: 50 }))).toBe(1.2);
    expect(SRS.weight(makeWord('a', { due: NOW - 1 }))).toBe(34);
    expect(SRS.weight(makeWord('a', { lastSeen: NOW }))).toBe(6.5);
  });

  it('picks weighted words and never returns an empty pick', () => {
    const a = makeWord('a');
    const b = makeWord('b');
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(SRS.pick([a, b])).toBe(a);
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(SRS.pick([a, b])).toBe(b);
    expect(SRS.pick([])).toBeNull();
  });

  it('picks distinct words without mutating the input', () => {
    const words = ['a', 'b', 'c', 'd'].map(id => makeWord(id));
    const original = words.slice();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const picked = SRS.pickMany(words, 3);
    expect(picked.map(w => w.id)).toEqual(['a', 'b', 'c']);
    expect(words).toEqual(original);
    expect(new Set(picked.map(w => w.id)).size).toBe(3);
  });

  it('ranks trouble words by wrong answers and low mastery', () => {
    const a = makeWord('a');
    const b = makeWord('b', { wrong: 1 });
    const c = makeWord('c', { mastery: 2 as MasteryLevel });
    const d = makeWord('d', { wrong: 2, mastery: 1 as MasteryLevel });
    const e = makeWord('e', { mastery: 5 as MasteryLevel });

    expect(SRS.trouble([a, b, c, d, e]).map(w => w.id)).toEqual(['d', 'b', 'a']);
    expect(SRS.trouble([a, b, c, d, e], 2).map(w => w.id)).toEqual(['d', 'b']);
  });

  it('grades correct answers, withholds mastery 5 until two modes', () => {
    const word = makeWord('w');
    expect(SRS.grade(word, true, 'flash')).toBe(1);
    expect(word.stats).toMatchObject({
      seen: 1, correct: 1, wrong: 0, streak: 1, mastery: 1,
      lastSeen: NOW, due: NOW + 5 * 60000,
      modeCorrect: { flash: 1 }
    });

    expect(SRS.grade(word, true, 'flash')).toBe(2);
    expect(SRS.grade(word, true, 'flash')).toBe(3);
    expect(SRS.grade(word, true, 'flash')).toBe(4);
    expect(SRS.grade(word, true, 'flash')).toBe(4);
    expect(word.stats.modeCorrect).toEqual({ flash: 5 });

    expect(SRS.grade(word, true, 'choice-f2n')).toBe(5);
    expect(word.stats.due).toBe(NOW + 3 * 86400000);
  });

  it('drops two levels on a miss and schedules a short retry', () => {
    const word = makeWord('w', { mastery: 5 as MasteryLevel, streak: 4 });
    expect(SRS.grade(word, false, 'type-f2n')).toBe(3);
    expect(word.stats).toMatchObject({
      seen: 1, correct: 0, wrong: 1, streak: 0, mastery: 3,
      due: NOW + 2 * 60000
    });
    expect(word.stats.modeCorrect).toEqual({});

    expect(SRS.grade(word, false, 'type-f2n')).toBe(1);
    expect(SRS.grade(word, false, 'type-f2n')).toBe(0);
  });

  it('counts mastered words and averages mastery', () => {
    const deck = makeDeck([
      makeWord('a', { mastery: 5 as MasteryLevel }),
      makeWord('b', { mastery: 3 as MasteryLevel }),
      makeWord('c', { mastery: 1 as MasteryLevel })
    ]);
    expect(SRS.masteredCount(deck)).toBe(1);
    expect(SRS.avgMastery(deck)).toBe(3);
    expect(SRS.avgMastery(makeDeck([]))).toBe(0);
  });
});
