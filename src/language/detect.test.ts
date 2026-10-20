import { describe, expect, it } from 'vitest';
import type { LanguageCode } from '../types';
import { detectLanguage, detectPair, refineScript, scoreLatin } from './detect';
import { LANGUAGES, LANGUAGE_CODES, ttsTag } from './languages';
import { LANG_NAMES_SR, langName } from './names';
import { LATIN_PROFILES } from './latinProfiles';
import { SCRIPT_RANGES, scriptCounts } from './scripts';

const LATIN_SAMPLES: Array<[LanguageCode, string]> = [
  ['en', 'the house and the dog'],
  ['de', 'das Haus und die Katze'],
  ['fr', 'la maison et le chien'],
  ['es', 'el perro y la casa'],
  ['it', 'il cane e la casa'],
  ['pt', 'o cão e a casa'],
  ['nl', 'het huis en de hond'],
  ['sv', 'huset och hunden'],
  ['fi', 'talo ja koira'],
  ['pl', 'dom i pies'],
  ['cs', 'dům a pes'],
  ['sk', 'dom a pes'],
  ['sl', 'hiša in pes'],
  ['sr', 'kuća i pas'],
  ['ro', 'casa și câine'],
  ['hu', 'ház és kutya'],
  ['tr', 'ev ve köpek'],
  ['vi', 'ngôi nhà và con chó'],
  ['id', 'rumah dan anjing']
];

const SCRIPT_SAMPLES: Array<[LanguageCode, string]> = [
  ['ru', 'привет мир'],
  ['uk', 'привіт світ'],
  ['sr', 'љубав'],
  ['mk', 'ќерка'],
  ['bg', 'къща'],
  ['el', 'γεια σου'],
  ['ar', 'مرحبا'],
  ['fa', 'پارسی'],
  ['he', 'שלום'],
  ['hi', 'नमस्ते'],
  ['th', 'สวัสดี'],
  ['ko', '안녕'],
  ['ja', 'こんにちは'],
  ['zh', '你好']
];

describe('language registry', () => {
  it('contains all 34 languages and 21 Latin profiles', () => {
    expect(LANGUAGE_CODES).toHaveLength(34);
    expect(Object.keys(LANGUAGES)).toHaveLength(34);
    expect(Object.keys(LATIN_PROFILES)).toHaveLength(21);
    expect(Object.keys(SCRIPT_RANGES)).toEqual([
      'latin', 'cyrillic', 'greek', 'arabic', 'hebrew',
      'devanagari', 'thai', 'hangul', 'kana', 'hanzi'
    ]);
    expect(Object.keys(LANG_NAMES_SR)).toHaveLength(34);
  });

  it('keeps the legacy metadata and display names', () => {
    expect(LANGUAGES.sr).toEqual({
      name: 'Serbian', native: 'Srpskohrvatski', tts: 'sr-RS', script: 'both'
    });
    expect(ttsTag('de')).toBe('de-DE');
    expect(ttsTag('xx' as LanguageCode)).toBe('en-US');
    expect(langName('de', 'en')).toBe('German');
    expect(langName('de', 'sr')).toBe('Nemački');
    expect(langName('xx', 'sr')).toBe('xx');
    expect(LANG_NAMES_SR.sr).toBe('Srpski');
  });
});

describe('script counting and detection', () => {
  it('counts Latin and Cyrillic separately', () => {
    expect(scriptCounts('abcПривет')).toEqual({
      latin: 3, cyrillic: 6, greek: 0, arabic: 0, hebrew: 0,
      devanagari: 0, thai: 0, hangul: 0, kana: 0, hanzi: 0
    });
  });

  it('maps every non-Latin script to its language', () => {
    for (const [code, text] of SCRIPT_SAMPLES) {
      expect(detectLanguage(text).code).toBe(code);
    }
  });

  it('refines Cyrillic and Arabic marker letters', () => {
    expect(refineScript('cyrillic', 'ї')).toBe('uk');
    expect(refineScript('cyrillic', 'љ')).toBe('sr');
    expect(refineScript('cyrillic', 'ѓ')).toBe('mk');
    expect(refineScript('cyrillic', 'ъ')).toBe('bg');
    expect(refineScript('cyrillic', 'ы')).toBe('ru');
    expect(refineScript('cyrillic', 'привет')).toBe('ru');
    expect(refineScript('arabic', 'پ')).toBe('fa');
    expect(refineScript('arabic', 'مرحبا')).toBe('ar');
    expect(refineScript('kana', '')).toBe('ja');
    expect(refineScript('hanzi', '')).toBe('zh');
  });

  it('detects representative Latin-script languages', () => {
    for (const [code, text] of LATIN_SAMPLES) {
      expect(detectLanguage(text).code).toBe(code);
    }
    // The legacy scorer cannot distinguish these fingerprints; Danish wins by
    // registry order. This is pinned rather than fixed.
    expect(detectLanguage('huset og hunden').code).toBe('da');
  });

  it('returns English with low confidence for empty or weak input', () => {
    const empty = detectLanguage('');
    expect(empty.code).toBe('en');
    expect(empty.confidence).toBe(0.3);
    expect(Object.keys(empty.scores)).toHaveLength(21);
    expect(Object.values(empty.scores).every(v => v === 0)).toBe(true);

    const weak = detectLanguage('zzzzz');
    expect(weak.code).toBe('en');
    expect(weak.confidence).toBe(0.3);
  });

  it('uses script confidence bounds and the 28% dominance rule', () => {
    expect(detectLanguage('привет').confidence).toBe(0.99);
    // Enough Latin letters around the Cyrillic snippet pushes detection to Latin.
    expect(detectLanguage('hello world this is a test при').code).toBe('en');
    expect(scoreLatin('the house').en).toBeGreaterThan(0);
    expect(scoreLatin('das Haus').de).toBeGreaterThan(0);
  });
});

describe('detectPair orientation', () => {
  it('trusts the remembered native language', () => {
    const pair = detectPair('das Haus', 'kuća', 'de');
    expect(pair).toMatchObject({ foreign: 'sr', native: 'de' });
    expect(pair.a.code).toBe('de');
    expect(pair.b.code).toBe('sr');
  });

  it('treats an English column as the native side', () => {
    const pair = detectPair('the house', 'das Haus', null);
    expect(pair).toMatchObject({ foreign: 'de', native: 'en' });
  });

  it('assumes foreign-first when neither column is English', () => {
    const pair = detectPair('das Haus', 'la maison', null);
    expect(pair).toMatchObject({ foreign: 'de', native: 'fr' });
  });

  it('keeps the foreign-first convention when both guesses match', () => {
    const pair = detectPair('hello world', 'hello there', null);
    expect(pair).toMatchObject({ foreign: 'en', native: 'en' });
    expect(pair.foreign).toBe(pair.native);
  });

  it('ignores a remembered language that is not present', () => {
    const pair = detectPair('das Haus', 'kuća', 'fr');
    expect(pair).toMatchObject({ foreign: 'de', native: 'sr' });
  });
});
