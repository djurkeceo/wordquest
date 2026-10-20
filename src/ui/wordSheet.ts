/**
 * Word detail sheet: stats, pronunciation and the 30-emoji picker.
 *
 * Inserted right after `#deckStats`, exactly like the single-file app (which
 * also means a stale sheet can survive a re-render — reported as M4).
 */

import type { Deck, Word } from '../types';
import { sound } from '../audio';
import { emojiFor } from '../emoji';
import { t } from '../i18n';
import { save } from '../storage/state';
import { humanDue } from '../util/core';
import { $, $$, esc, h } from './dom';
import { toast } from './toast';

/** Emoji offered in the manual picker (unchanged order). */
const CHOICES: readonly string[] = ['📝', '🍎', '🐶', '🏠', '🌳', '💧', '❤️', '⭐', '🎵', '🚗', '📚', '☀️', '🌙', '🔥', '🎁', '🏃', '🍞', '👩', '👨', '🎓', '🧠', '💡', '🗺️', '🎯', '🌍', '🕐', '😊', '😢', '🔑', '🛏️'];

/**
 * Open the sheet for one word.
 * `onChanged` re-renders the deck after a manual emoji is stored.
 */
export function openWordSheet(deck: Deck, w: Word, onChanged: () => void): void {
  const em = emojiFor(w, w.n);
  const sheet = h(`<div class="card" role="dialog" aria-modal="true" aria-label="${esc(w.f)}" style="border-color:var(--brand)">
    <div class="row">
      <div class="grow">
        <h2 style="margin:0">${esc(w.f)}</h2>
        <div class="muted small">${esc(w.n.join(' / '))}</div>
      </div>
      <button class="icon-btn" id="wsClose" aria-label="Close">✕</button>
    </div>
    <p class="tiny muted" style="margin-top:10px">
      seen ${w.stats.seen} · ✓ ${w.stats.correct} · ✕ ${w.stats.wrong} · mastery ${w.stats.mastery}/5
      ${w.stats.due ? ' · due ' + humanDue(w.stats.due) : ''}
    </p>
    <div class="row" style="margin-top:8px">
      <button class="btn btn--sm" id="wsSpeak">🔊 Pronounce</button>
      <button class="btn btn--sm btn--ghost" id="wsEmoji">${em || '🙂'} Emoji</button>
    </div>
    <div id="wsPicker" class="hidden" style="margin-top:12px">
      <div class="muted small" style="margin-bottom:6px">${esc(t('deck.pickEmoji', { w: w.f }))}</div>
      <div class="row">${CHOICES.map(c => `<button class="btn btn--sm" data-em="${c}" style="font-size:1.2rem;padding:8px 10px">${c}</button>`).join('')}</div>
    </div>
  </div>`);
  const host = $('#deckStats');
  if (!host || !host.parentNode) return;
  const existing = $('#wordSheet');
  if (existing) existing.remove();
  sheet.id = 'wordSheet';
  host.parentNode.insertBefore(sheet, host.nextSibling);
  $('#wsClose')?.addEventListener('click', () => sheet.remove());
  $('#wsSpeak')?.addEventListener('click', () => {
    if (!sound.speak(w.f, deck.foreignLang)) toast(t('toast.ttsOff'));
  });
  $('#wsEmoji')?.addEventListener('click', () => $('#wsPicker')?.classList.toggle('hidden'));
  $$<HTMLButtonElement>('[data-em]', sheet).forEach(btn => {
    btn.addEventListener('click', () => {
      w.emoji = btn.getAttribute('data-em');
      save(true);
      toast(t('toast.emojiSet'));
      sheet.remove();
      onChanged();
    });
  });
  sheet.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
