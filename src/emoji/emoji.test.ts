import { beforeAll, describe, expect, it } from 'vitest';
import { EMOJI_LEXICON } from './lexicon';
import {
  buildEmojiIndex,
  emojiFor,
  getEmojiIndex,
  isEmojiLexiconLoaded,
  loadEmojiLexicon
} from './index';

describe('emoji lexicon', () => {
  beforeAll(async () => {
    await loadEmojiLexicon();
  });

  it('contains the legacy 412 entries', () => {
    expect(EMOJI_LEXICON).toHaveLength(412);
    expect(EMOJI_LEXICON[0]).toEqual([
      '🐶',
      'dog|hund|pas|perro|chien|cane|cão|hond|pies|pes|köpek|köpek|собака|пёс|كلب|כלב|कुत्ता|หมา|개|犬|狗'
    ]);
    expect(EMOJI_LEXICON[411][0]).toBe('🌈');
    expect(isEmojiLexiconLoaded()).toBe(true);
    expect(getEmojiIndex().size).toBeGreaterThan(300);
  });

  it('keeps the first entry for a duplicate keyword', () => {
    const map = buildEmojiIndex([
      ['🅰️', 'x|y'],
      ['🅱️', 'x']
    ] as const);
    expect(map.get('x')).toBe('🅰️');
    expect(map.get('y')).toBe('🅰️');
    // "fish" appears later under 🎣 but 🐟 is first in the real lexicon.
    expect(getEmojiIndex().get('fish')).toBe('🐟');
  });

  it('looks up exact keywords, strips articles and checks containment', () => {
    expect(emojiFor({ f: 'Haus', n: ['kuća'], emoji: null })).toBe('🏠');
    expect(emojiFor({ f: 'der Hund', n: ['pas'], emoji: null })).toBe('🐶');
    expect(emojiFor({ f: 'to run fast', n: ['brzo'], emoji: null })).toBe('🏃');
    expect(emojiFor({ f: 'Kuća', n: [], emoji: null })).toBe('🏠');
    expect(emojiFor(null, ['Haus'])).toBe('🏠');
  });

  it('prefers a custom emoji and returns null for unknown words', () => {
    expect(emojiFor({ f: 'Haus', n: ['kuća'], emoji: '🌟' })).toBe('🌟');
    expect(emojiFor({ f: 'qwertyuiop', n: ['qwertyuiop'], emoji: null })).toBeNull();
    expect(emojiFor({ f: '', n: [], emoji: null })).toBeNull();
    expect(emojiFor(null)).toBeNull();
  });
});
