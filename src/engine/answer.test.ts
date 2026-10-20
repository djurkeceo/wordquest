import { describe, expect, it } from 'vitest';
import { checkTyped, levenshtein } from './answer';

describe('typed answer checking', () => {
  it('accepts exact answers after normalisation', () => {
    expect(checkTyped('  House! ', ['house'])).toEqual({ status: 'correct', matched: 'house' });
    expect(checkTyped('cafe', ['café'])).toEqual({ status: 'correct', matched: 'café' });
  });

  it('accepts one typo on short words and two on long words', () => {
    expect(checkTyped('hous', ['house'])).toEqual({ status: 'almost', matched: 'house' });
    expect(checkTyped('beautif', ['beautiful'])).toEqual({ status: 'almost', matched: 'beautiful' });
    expect(levenshtein('abcdefxy', 'abcdefgh')).toBe(2);
    expect(checkTyped('abcdefxy', ['abcdefgh'])).toEqual({ status: 'almost', matched: 'abcdefgh' });
  });

  it('rejects typos in very short targets, as the legacy app does', () => {
    expect(checkTyped('g', ['go'])).toEqual({ status: 'wrong', matched: 'go' });
  });

  it('reports wrong accents separately in strict mode', () => {
    expect(checkTyped('cafe', ['café'], { strict: true }))
      .toEqual({ status: 'accents', matched: 'café' });
    expect(checkTyped('cafe', ['café'], { strict: false }))
      .toEqual({ status: 'correct', matched: 'café' });
  });

  it('accepts Serbian Latin and Cyrillic in either direction', () => {
    expect(checkTyped('љубав', ['ljubav'], { bilingual: true }))
      .toEqual({ status: 'correct', matched: 'ljubav' });
    expect(checkTyped('ljubav', ['љубав'], { bilingual: true }))
      .toEqual({ status: 'correct', matched: 'ljubav' });
    expect(checkTyped('đak', ['ђак'], { bilingual: true }))
      .toEqual({ status: 'correct', matched: 'đak' });
  });

  it('returns the first accepted spelling as the fallback match', () => {
    expect(checkTyped('', ['house', 'home'])).toEqual({ status: 'wrong', matched: 'house' });
    expect(checkTyped('xxxxx', ['house', 'home'])).toEqual({ status: 'wrong', matched: 'house' });
    expect(checkTyped('x', [])).toEqual({ status: 'wrong', matched: '' });
  });

  it('caps Levenshtein distance early when lengths differ by more than two', () => {
    expect(levenshtein('a', 'abcd')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
    expect(levenshtein('same', 'same')).toBe(0);
  });
});
