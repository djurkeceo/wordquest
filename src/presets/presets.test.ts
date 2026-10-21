import { afterEach, describe, expect, it } from 'vitest';
import type { Deck, LoadedPreset, ParsedPair } from '../types';
import { normKey } from '../language/normalize';
import { normalizeDeck } from '../storage/migration';
import { clearPresetCache, loadAllPresets, loadPreset, PRESETS } from './index';
import {
  createDeckFromPreset,
  mergePresetIntoDeck,
  presetAlreadyAdded,
  wordsFromPreset
} from './merge';

function pair(f: string, n: string): ParsedPair {
  return { f, n: [n], line: 1 };
}

function packed(pairs: ParsedPair[], id = 'test-pack'): LoadedPreset {
  return {
    meta: {
      id,
      title: { en: 'Test', sr: 'Test' },
      description: { en: 'Test pack', sr: 'Test paket' },
      foreignLang: 'de',
      nativeLang: 'sr',
      category: 'top',
      level: 'A1',
      load: () => Promise.resolve({ default: '' })
    },
    text: '',
    pairs,
    wordCount: pairs.length
  };
}

afterEach(() => clearPresetCache());

describe('ready-made pack registry', () => {
  it('ships thirteen unique packs: ten German and three English', () => {
    expect(PRESETS).toHaveLength(13);
    expect(new Set(PRESETS.map(p => p.id)).size).toBe(13);
    expect(PRESETS.filter(p => p.foreignLang === 'de' && p.nativeLang === 'sr')).toHaveLength(10);
    expect(PRESETS.filter(p => p.foreignLang === 'en' && p.nativeLang === 'sr')).toHaveLength(3);
    expect(new Set(PRESETS.map(p => p.category))).toEqual(new Set([
      'top', 'food', 'travel', 'home', 'health', 'nature', 'work', 'city',
      'feelings', 'verbs', 'phrases'
    ]));
  });

  it('has complete localised metadata for every card', () => {
    for (const meta of PRESETS) {
      expect(meta.id).toMatch(/^(de|en)-sr-[a-z0-9-]+$/);
      expect(meta.title.en.length).toBeGreaterThan(0);
      expect(meta.title.sr.length).toBeGreaterThan(0);
      expect(meta.description.en.length).toBeGreaterThan(0);
      expect(meta.description.sr.length).toBeGreaterThan(0);
      expect(['A1', 'A2', 'B1']).toContain(meta.level);
      expect(typeof meta.load).toBe('function');
    }
  });

  it('loads every pack, computes counts from text and has no duplicate words', async () => {
    const loaded = await loadAllPresets();
    expect(loaded).toHaveLength(13);
    for (const pack of loaded) {
      expect(pack.text.length).toBeGreaterThan(0);
      expect(pack.wordCount).toBe(pack.pairs.length);
      expect(pack.wordCount).toBeGreaterThanOrEqual(40);
      expect(pack.pairs.every(p => p.f.length > 0 && p.n.length > 0)).toBe(true);
      const keys = pack.pairs.map(p => normKey(p.f));
      expect(new Set(keys).size).toBe(keys.length);
    }
    const top = loaded.filter(p => p.meta.category === 'top');
    expect(top).toHaveLength(2);
    for (const pack of top) expect(pack.wordCount).toBe(300);
    const themes = loaded.filter(p => p.meta.category !== 'top');
    expect(themes).toHaveLength(11);
    for (const pack of themes) {
      expect(pack.wordCount).toBeGreaterThanOrEqual(40);
      expect(pack.wordCount).toBeLessThanOrEqual(80);
    }
  });

  it('caches a loaded pack instead of re-parsing it', async () => {
    const meta = PRESETS[0];
    const first = await loadPreset(meta);
    const second = await loadPreset(meta);
    expect(second).toBe(first);
  });
});

describe('preset merge behaviour', () => {
  it('creates a deck with the pack languages, title and presetId', () => {
    const pack = packed([pair('Haus', 'kuća'), pair('Hund', 'pas')]);
    const deck = createDeckFromPreset(pack, 'sr');
    expect(deck.name).toBe('Test');
    expect(deck.foreignLang).toBe('de');
    expect(deck.nativeLang).toBe('sr');
    expect(deck.presetId).toBe('test-pack');
    expect(deck.words).toHaveLength(2);
    expect(deck.words[0].f).toBe('Haus');
    expect(deck.words[0].n).toEqual(['kuća']);
  });

  it('skips duplicates by normalized foreign word when merging', () => {
    const pack = packed([
      pair('Haus', 'kuća'),
      pair('HAUS', 'dom'),
      pair('hund', 'pas'),
      pair('Katze', 'mačka')
    ]);
    const deck = createDeckFromPreset(packed([pair('haus', 'kuća')]), 'en');
    const before = deck.words.length;
    const added = mergePresetIntoDeck(deck, pack);
    expect(added).toBe(2);
    expect(deck.words).toHaveLength(before + 2);
    expect(deck.words.map(w => w.f)).toEqual(['haus', 'hund', 'Katze']);
    expect(deck.presetId).toBe('test-pack');
  });

  it('reports zero when every word is already there and leaves the deck untouched', () => {
    const pack = packed([pair('Haus', 'kuća'), pair('Hund', 'pas')]);
    const deck = createDeckFromPreset(pack, 'en');
    const snapshot = JSON.stringify(deck.words);
    const added = mergePresetIntoDeck(deck, pack);
    expect(added).toBe(0);
    expect(JSON.stringify(deck.words)).toBe(snapshot);
  });

  it('starts every word with fresh progress', () => {
    const words = wordsFromPreset(packed([pair('Haus', 'kuća')]));
    expect(words).toHaveLength(1);
    expect(words[0].stats.mastery).toBe(0);
    expect(words[0].emoji).toBeNull();
    expect(words[0].id.length).toBeGreaterThan(0);
  });

  it('detects whether any deck remembers a pack', () => {
    // No decks are loaded in the node test environment, so this exercises the
    // empty-state path; the populated path is covered by the UI flow.
    expect(presetAlreadyAdded('de-sr-top300')).toBe(false);
  });

  it('normalizeDeck keeps presetId and still drops lastOpened (H1)', () => {
    const deck: Deck = normalizeDeck({
      name: 'Preset deck',
      presetId: 'de-sr-food',
      lastOpened: 123,
      words: [{ f: 'Brot', n: ['hleb'] }]
    });
    expect(deck.presetId).toBe('de-sr-food');
    expect('lastOpened' in deck).toBe(false);
  });
});
