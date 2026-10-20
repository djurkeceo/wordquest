/**
 * Auto-generated mnemonic: first letter, length, emoji, and a phonetic hook.
 * Deliberately cheap to compute and useful without external data.
 */

import type { Deck, Word } from '../types';
import { emojiFor } from '../emoji';
import { esc } from './dom';

export function mnemonicFor(word: Word, _deck?: Deck): string {
  const foreign = word.f;
  const first = foreign.charAt(0).toUpperCase();
  const letters = foreign.replace(/\s+/g, '').length;
  const em = emojiFor(word, word.n);
  const native = (word.n[0] || '');
  const parts: string[] = [];
  parts.push(`<b>${esc(first)}</b>… ${letters} letters`);
  if (em) parts.push(`${em}`);
  if (native) parts.push(`“${esc(native)}”`);
  const tip = em
    ? `Picture ${em} whenever you hear “${esc(foreign)}”.`
    : `Link “${esc(foreign)}” to “${esc(native)}” with a silly mini-story.`;
  return `<div class="mnemonic">${parts.join(' · ')}<br>${esc(tip)}</div>`;
}
