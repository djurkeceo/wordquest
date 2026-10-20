import { describe, expect, it } from 'vitest';
import type { Deck, ProfileRecord, Word } from '../types';
import { hashPin, weakHash } from './pin';
import { LS_KEY, SCHEMA_VERSION } from './keys';
import { defaultState, migrate, normalizeDeck, normalizeWord } from './migration';
import { stateKeyFor } from './profiles';

describe('phase 2 storage contract', () => {
  it('default state matches the legacy shape', () => {
    const s = defaultState();
    expect(s.version).toBe(SCHEMA_VERSION);
    expect(s.settings).toEqual({
      sound: true, tts: true, ttsEngine: 'auto', strictAccents: false, hearts: true,
      calmMotion: false, theme: 'auto', uiLang: 'en', nativeLang: null, dailyGoal: 50
    });
    expect(s.profile).toEqual({
      xp: 0, level: 1, streak: 0, lastLessonDay: null, dailyDay: null, dailyXp: 0,
      hearts: 5, maxHearts: 5, achievements: [], lessons: 0, perfectLessons: 0,
      totalCorrect: 0, totalWrong: 0
    });
    expect('lastHeartDay' in s.profile).toBe(false);
    expect('lastOpened' in s).toBe(false);
    expect(s.decks).toEqual([]);
  });

  it('merges partial saves and keeps the legacy deck field list', () => {
    const data = {
      settings: { uiLang: 'sr' },
      profile: { xp: 42 },
      decks: [{
        id: 'd1', name: 'Deck', nativeLang: 'en', foreignLang: 'de', lastOpened: 123,
        words: [
          { f: ' Haus ', n: 'kuća', emoji: null, stats: { mastery: 9 } },
          { f: '', n: ['x'], stats: {} },
          { f: 'Hund', n: ['pas', 'ker'], stats: { seen: 2, mastery: 3 } }
        ]
      }]
    } as unknown as Record<string, unknown>;
    const state = migrate(data);
    expect(state.settings.sound).toBe(true);
    expect(state.settings.uiLang).toBe('sr');
    expect(state.profile.xp).toBe(42);
    expect(state.profile.hearts).toBe(5);
    expect(state.decks).toHaveLength(1);
    const deck = state.decks[0];
    expect(deck.name).toBe('Deck');
    expect('lastOpened' in deck).toBe(false);
    expect(deck.words).toHaveLength(2);
    expect(deck.words[0].f).toBe('Haus');
    expect(deck.words[0].n).toEqual(['kuća']);
    expect(deck.words[0].stats.mastery).toBe(5);
    expect(deck.words[1].n).toEqual(['pas', 'ker']);
  });

  it('normalizes single-word decks and defaults', () => {
    const deck = normalizeDeck({ words: [{ f: 'Haus', n: ['kuća'], stats: {} }] } as Partial<Deck>);
    expect(deck.name).toBe('Untitled deck');
    expect(deck.nativeLang).toBe('en');
    expect(deck.foreignLang).toBe('de');
    expect(deck.words).toHaveLength(1);
    expect(deck.words[0].stats).toEqual({
      seen: 0, correct: 0, wrong: 0, streak: 0, mastery: 0,
      lastSeen: 0, due: 0, modeCorrect: {}
    });
    expect(normalizeWord({ f: '  x  ', n: [], stats: {} } as unknown as Partial<Word>).f).toBe('x');
  });

  it('uses the legacy key only for adopted profiles', () => {
    const base: ProfileRecord = {
      id: 'p1', name: 'P', emoji: '🦊', pinHash: null, salt: null, createdAt: 1
    };
    expect(stateKeyFor(base)).toBe(LS_KEY + '::p1');
    expect(stateKeyFor({ ...base, legacy: true })).toBe(LS_KEY);
    expect(stateKeyFor(null)).toBe(LS_KEY);
  });

  it('hashes PINs with the same salted SHA-256 input', async () => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('salt|1234'));
    const expected = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    await expect(hashPin('1234', 'salt')).resolves.toBe(expected);
    expect(weakHash('salt|1234')).toMatch(/^w[0-9a-f]+$/);
    expect(weakHash('salt|1234')).toBe(weakHash('salt|1234'));
  });
});
