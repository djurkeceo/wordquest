/**
 * Emoji lookup and the lazy lexicon loader.
 *
 * The 412-entry lexicon is imported dynamically so Vite emits it as a separate
 * chunk. `main.ts` awaits `loadEmojiLexicon()` before the first screen render;
 * every UI call to `emojiFor()` after that is synchronous, as before.
 *
 * Lookup order is intentionally unchanged: word.emoji, exact keyword, article
 * stripping, per-word containment, then whole-string containment. Duplicate
 * keywords keep the first lexicon entry (bug M13, pinned by tests).
 */

import type { EmojiIndex, EmojiLexiconEntry, Word } from '../types';
import { normKey } from '../language/normalize';

/** Build a keyword -> emoji map. The first entry for a keyword wins. */
export function buildEmojiIndex(lexicon: readonly EmojiLexiconEntry[]): EmojiIndex {
  const map: EmojiIndex = new Map();
  for (const [emoji, words] of lexicon) {
    for (const kw of words.split('|')) {
      const k = normKey(kw).trim();
      if (!k) continue;
      if (!map.has(k)) map.set(k, emoji);
    }
  }
  return map;
}

let index: EmojiIndex | null = null;
let loading: Promise<EmojiIndex> | null = null;

/** Load and index the lexicon once. Safe to call repeatedly. */
export function loadEmojiLexicon(): Promise<EmojiIndex> {
  if (index) return Promise.resolve(index);
  if (!loading) {
    loading = import('./lexicon').then(({ EMOJI_LEXICON }) => {
      index = buildEmojiIndex(EMOJI_LEXICON);
      return index;
    });
  }
  return loading;
}

export function isEmojiLexiconLoaded(): boolean {
  return index !== null;
}

/**
 * Synchronous index access for renderers. Throws if called before the boot
 * preload finishes, which is a programming error rather than a user state.
 */
export function getEmojiIndex(): EmojiIndex {
  if (!index) throw new Error('Emoji lexicon has not been loaded yet.');
  return index;
}

/**
 * Find an emoji for a word/translation pair.
 * Tries exact keyword match first, then containment for longer words.
 */
export function emojiFor(
  word: Pick<Word, 'emoji' | 'f' | 'n'> | null,
  natives?: readonly string[]
): string | null {
  if (word && word.emoji) return word.emoji;
  const map = index;
  if (!map) return null;
  const candidates: readonly string[] = word
    ? [word.f, ...(natives || word.n)]
    : (natives || []);
  for (const raw of candidates) {
    const s = normKey(raw);
    if (!s) continue;
    const exact = map.get(s);
    if (exact) return exact;
    // Strip articles / common prefixes: "das haus" -> "haus"
    const stripped = s.replace(/^(the|a|an|der|die|das|den|dem|le|la|les|el|los|las|il|lo|gli|o|a|os|as|de|het|een|un|una|une|to)\s+/i, '');
    const strippedExact = map.get(stripped);
    if (strippedExact) return strippedExact;
    // Containment: "to run fast" -> "run"; require 4+ chars to avoid noise.
    const words = stripped.split(/[\s\-_]+/);
    for (const w of words) {
      if (w.length >= 4) {
        const em = map.get(w);
        if (em) return em;
      }
    }
    if (s.length >= 4) {
      for (const [kw, em] of map) {
        if (kw.length >= 4 && (s === kw || s.startsWith(kw + ' ') || s.endsWith(' ' + kw))) return em;
      }
    }
  }
  return null;
}
