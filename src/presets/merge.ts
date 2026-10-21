/**
 * Turning a ready-made pack into deck words.
 *
 * Merging is by `normKey(f)` — the same key the parser uses for duplicates —
 * so adding the same pack twice, or two packs that overlap, never creates two
 * rows for one foreign word. `presetId` is singular on a deck: when a second
 * pack is merged in, the deck remembers the latest one (documented
 * limitation).
 */

import type { Deck, LanguageCode, LoadedPreset, Word } from '../types';
import { normKey } from '../language/normalize';
import { normalizeDeck } from '../storage/migration';
import { uid } from '../util/core';
import { getState } from '../storage/state';

/** The pack title in the current UI language. */
export function presetTitle(preset: LoadedPreset, uiLang: string): string {
  return uiLang === 'sr' ? preset.meta.title.sr : preset.meta.title.en;
}

/** The pack description in the current UI language. */
export function presetDescription(preset: LoadedPreset, uiLang: string): string {
  return uiLang === 'sr' ? preset.meta.description.sr : preset.meta.description.en;
}

/** Convert parsed pairs into deck words (progress starts fresh). */
export function wordsFromPreset(preset: LoadedPreset): Word[] {
  return normalizeDeck({
    words: preset.pairs.map(pair => ({ id: uid(), f: pair.f, n: pair.n.slice(), emoji: null }))
  }).words;
}

/** Build a brand-new deck from a pack. */
export function createDeckFromPreset(preset: LoadedPreset, uiLang: string): Deck {
  return normalizeDeck({
    id: uid(),
    name: presetTitle(preset, uiLang),
    nativeLang: preset.meta.nativeLang,
    foreignLang: preset.meta.foreignLang,
    words: preset.pairs.map(pair => ({ id: uid(), f: pair.f, n: pair.n.slice(), emoji: null })),
    presetId: preset.meta.id
  });
}

/**
 * Append a pack's words to a deck, skipping any foreign word already present.
 * Returns how many words were added.
 */
export function mergePresetIntoDeck(deck: Deck, preset: LoadedPreset): number {
  const seen = new Set(deck.words.map(word => normKey(word.f)));
  let added = 0;
  for (const pair of preset.pairs) {
    const key = normKey(pair.f);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deck.words.push(normalizeDeck({ words: [{ id: uid(), f: pair.f, n: pair.n.slice(), emoji: null }] }).words[0]);
    added++;
  }
  if (added) deck.presetId = preset.meta.id;
  return added;
}

/** Decks that share the pack's exact language pair, newest first. */
export function decksForPair(foreignLang: LanguageCode, nativeLang: LanguageCode): Deck[] {
  return getState().decks
    .filter(deck => deck.foreignLang === foreignLang && deck.nativeLang === nativeLang)
    .slice()
    .sort((a, b) => (b.lastOpened || b.createdAt) - (a.lastOpened || a.createdAt));
}

/** Is this pack already the remembered origin of any deck? */
export function presetAlreadyAdded(presetId: string): boolean {
  return getState().decks.some(deck => deck.presetId === presetId);
}
