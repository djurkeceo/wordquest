import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Deck, Word } from '../types';
import { buildOptions } from './options';

const NOW = 1;

function makeWord(id: string, f: string, n: string[]): Word {
  return {
    id, f, n, emoji: null,
    stats: {
      seen: 0, correct: 0, wrong: 0, streak: 0, mastery: 0,
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

describe('buildOptions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds four unique options including the correct native answer', () => {
    const target = makeWord('w1', 'Haus', ['kuća', 'dom']);
    const deck = makeDeck([
      target,
      makeWord('w2', 'Hund', ['pas']),
      makeWord('w3', 'Katze', ['mačka']),
      makeWord('w4', 'Vogel', ['ptica']),
      makeWord('w5', 'Fisch', ['riba'])
    ]);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const options = buildOptions(deck, target, 'n');
    expect(options).toHaveLength(4);
    expect(new Set(options).size).toBe(4);
    expect(options).toContain('kuća');
    expect(options).not.toContain('dom');
  });

  it('uses the foreign side when field is f', () => {
    const target = makeWord('w1', 'Haus', ['kuća']);
    const deck = makeDeck([
      target,
      makeWord('w2', 'Hund', ['pas']),
      makeWord('w3', 'Katze', ['mačka'])
    ]);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const options = buildOptions(deck, target, 'f', 2);
    expect(options).toHaveLength(2);
    expect(options).toContain('Haus');
  });

  it('removes normalized duplicates and accepts tiny decks', () => {
    const target = makeWord('w1', 'Haus', ['kuća']);
    const deck = makeDeck([
      target,
      makeWord('w2', 'Haus', ['KUĆA']),
      makeWord('w3', 'Hund', ['pas'])
    ]);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const options = buildOptions(deck, target, 'n');
    expect(options).toHaveLength(2);
    expect(options).toContain('kuća');
    expect(options).toContain('pas');
  });

  it('treats a zero count as the default four (legacy ||)', () => {
    const target = makeWord('w1', 'a', ['a1']);
    const deck = makeDeck([
      target,
      makeWord('w2', 'b', ['b1']),
      makeWord('w3', 'c', ['c1']),
      makeWord('w4', 'd', ['d1']),
      makeWord('w5', 'e', ['e1'])
    ]);
    expect(buildOptions(deck, target, 'n', 0)).toHaveLength(4);
  });

  it('pins H6: an alternative translation can appear as a distractor', () => {
    const target = makeWord('w1', 'edifice', ['house', 'home']);
    const deck = makeDeck([
      target,
      makeWord('w2', 'residence', ['home']),
      makeWord('w3', 'abode', ['dom']),
      makeWord('w4', 'dwelling', ['stan'])
    ]);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const options = buildOptions(deck, target, 'n');
    expect(options).toContain('house');
    // "home" is a valid translation of the target but still offered as a choice.
    expect(options).toContain('home');
  });
});
