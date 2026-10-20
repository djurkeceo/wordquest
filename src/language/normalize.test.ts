import { describe, expect, it } from 'vitest';
import { normKey, normalizeAnswer, toCyrillic, toLatin } from './normalize';

describe('language normalisation', () => {
  it('folds case, diacritics and whitespace for duplicate keys', () => {
    expect(normKey('  Die  Kuća  ')).toBe('die kuca');
    expect(normKey('Straße')).toBe('straße');
    expect(normKey('ŠČ')).toBe('sc');
  });

  it('normalises answers and removes sentence punctuation', () => {
    expect(normalizeAnswer('  ¡Hola,  mundo!  ')).toBe('hola mundo');
    expect(normalizeAnswer('"Kuća";')).toBe('kuca');
  });

  it('keeps accents in strict mode and folds đ/ß in loose mode', () => {
    expect(normalizeAnswer('café', true)).toBe('café');
    expect(normalizeAnswer('café', false)).toBe('cafe');
    expect(normalizeAnswer('Straße', false)).toBe('strasse');
    expect(normalizeAnswer('Straße', true)).toBe('straße');
    expect(normalizeAnswer('đak', false)).toBe('dak');
    expect(normalizeAnswer('đak', true)).toBe('đak');
  });

  it('transliterates Serbian in both directions, digraphs first', () => {
    expect(toLatin('Љубав')).toBe('ljubav');
    expect(toLatin('ЊЕГО' )).toBe('njego');
    expect(toLatin('Џак')).toBe('džak');
    expect(toCyrillic('ljubav')).toBe('љубав');
    expect(toCyrillic('NJEGO')).toBe('њего');
    expect(toCyrillic('džak')).toBe('џак');
    expect(toCyrillic('đak')).toBe('ђак');
    expect(toLatin('đak')).toBe('đak');
  });
});
