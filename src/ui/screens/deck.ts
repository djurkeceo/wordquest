/**
 * Deck screen: stats, mastery map, trouble words and the four run buttons.
 *
 * The word sheet lives in `ui/wordSheet.ts`; it reports back here so the deck
 * can re-render after a manual emoji choice.
 */

import { t } from '../../i18n';
import { langName } from '../../language/names';
import { emojiFor } from '../../emoji';
import { SRS } from '../../engine/srs';
import { sound } from '../../audio';
import { downloadFile } from '../../storage/backup';
import { getDeck, save } from '../../storage/state';
import { getState } from '../../storage/state';
import { $, $$, esc, h } from '../dom';
import { getCurrentDeckId, navigate, setCurrentDeckId } from '../nav';
import { startSession } from '../sessionFlow';
import { toast } from '../toast';
import { openWordSheet } from '../wordSheet';

/** Show a deck (and remember it as the "continue" target). */
export function openDeck(id: string): void {
  const deck = getDeck(id);
  if (!deck) { navigate('home'); return; }
  setCurrentDeckId(id);
  deck.lastOpened = Date.now();
  navigate('deck');
}

/** Render the current deck, or fall back to Home when the id is gone. */
export function renderDeck(): void {
  const deck = getDeck(getCurrentDeckId());
  if (!deck) { navigate('home'); return; }
  const uiLang = getState().settings.uiLang || 'en';
  const mastered = SRS.masteredCount(deck);
  const avg = SRS.avgMastery(deck);
  const trouble = SRS.trouble(deck.words, 8);
  const title = $('#deckTitle');
  if (title) title.textContent = deck.name;
  const meta = $('#deckMeta');
  if (meta) {
    meta.textContent = `${langName(deck.foreignLang, uiLang)} → ${langName(deck.nativeLang, uiLang)} · ${deck.words.length} ${t('deck.words')}`;
  }
  const stats = $('#deckStats');
  if (stats) {
    stats.innerHTML = `
      <div class="bigstat" style="margin:0">
        <div><b>${mastered}</b><span>${esc(t('deck.mastered'))}</span></div>
        <div><b>${avg.toFixed(1)}</b><span>avg / 5</span></div>
        <div><b>${trouble.length}</b><span>${esc(t('deck.trouble'))}</span></div>
      </div>
      <div class="bar" style="margin-top:12px"><i style="width:${deck.words.length ? (mastered / deck.words.length) * 100 : 0}%"></i></div>`;
  }
  const legend = $('#bubbleLegend');
  if (legend) legend.textContent = t('deck.masteryLegend');
  const boss = $<HTMLButtonElement>('#btnBoss');
  if (boss) boss.disabled = trouble.length < 2;

  // Mastery bubbles: colour encodes mastery, size encodes confidence.
  const grid = $('#bubbleGrid');
  if (grid) {
    grid.innerHTML = '';
    deck.words.forEach(w => {
      const m = w.stats.mastery;
      const colors = ['#CBD5E1', '#FF9AA8', '#FFC24D', '#FFE08A', '#9BE7A8', '#4ADE80'];
      const b = h(`<button class="bubble" style="background:${colors[m]}" data-id="${w.id}"
        aria-label="${esc(w.f)} — mastery ${m} of 5">${esc(w.f)}${w.emoji ? ' ' + w.emoji : ''}<small>${m}</small></button>`);
      b.addEventListener('click', () => openWordSheet(deck, w, renderDeck));
      grid.appendChild(b);
    });
  }

  // Trouble list.
  const list = $('#troubleList');
  if (!list) return;
  if (!trouble.length) {
    list.innerHTML = `<div class="emptystate" style="padding:18px"><div class="big" aria-hidden="true">🎉</div><p>${esc(t('deck.noTrouble'))}</p></div>`;
  } else {
    list.innerHTML = trouble.map(w => `
      <div class="listitem">
        <span class="em">${emojiFor(w, w.n) || '📝'}</span>
        <div class="grow"><b>${esc(w.f)}</b><div class="small muted">${esc(w.n.join(' / '))}</div></div>
        <span class="tag ${w.stats.wrong > w.stats.correct ? 'tag--red' : 'tag--amber'}">${w.stats.wrong}✕ / ${w.stats.correct}✓</span>
        <button class="icon-btn" data-speak="${esc(w.f)}" aria-label="Pronounce ${esc(w.f)}" style="width:34px;height:34px;flex-basis:34px">🔊</button>
      </div>`).join('');
    $$<HTMLButtonElement>('[data-speak]', list).forEach(btn => btn.addEventListener('click', () => {
      if (!sound.speak(btn.getAttribute('data-speak') ?? '', deck.foreignLang)) toast(t('toast.ttsOff'));
    }));
  }
}

/** Bind the static deck controls once, when the shell markup exists. */
export function bindDeckScreen(): void {
  $('#btnStartLesson')?.addEventListener('click', () => {
    const deck = getDeck(getCurrentDeckId());
    if (!deck || !deck.words.length) return;
    startSession(deck, 'lesson', { size: Math.min(14, Math.max(8, deck.words.length * 2)) });
  });
  $('#btnPractice')?.addEventListener('click', () => {
    const deck = getDeck(getCurrentDeckId());
    if (!deck || !deck.words.length) return;
    startSession(deck, 'practice', { size: Math.min(12, Math.max(6, deck.words.length)) });
  });
  $('#btnSpeed')?.addEventListener('click', () => {
    const deck = getDeck(getCurrentDeckId());
    if (!deck || deck.words.length < 2) return;
    startSession(deck, 'speed');
  });
  $('#btnBoss')?.addEventListener('click', () => {
    const deck = getDeck(getCurrentDeckId());
    if (!deck) return;
    startSession(deck, 'boss');
  });

  $('#btnRenameDeck')?.addEventListener('click', () => {
    const deck = getDeck(getCurrentDeckId());
    if (!deck) return;
    const name = prompt(t('preview.deckName'), deck.name);
    if (name && name.trim()) { deck.name = name.trim().slice(0, 60); save(true); renderDeck(); }
  });
  $('#btnDeleteDeck')?.addEventListener('click', () => {
    const deck = getDeck(getCurrentDeckId());
    if (!deck) return;
    if (!confirm(`${t('deck.delete')}: “${deck.name}”?`)) return;
    const state = getState();
    state.decks = state.decks.filter(d => d.id !== deck.id);
    save(true);
    toast(t('toast.deckDeleted'));
    navigate('home');
  });
  $('#btnExportGem')?.addEventListener('click', () => {
    const deck = getDeck(getCurrentDeckId());
    if (!deck) return;
    const lines = deck.words.map(w => `${w.f} = ${w.n.join(', ')}${emojiFor(w, w.n) ? ' ' + emojiFor(w, w.n) : ''}`);
    downloadFile(deck.name.replace(/[^\w\-]+/g, '_') + '_mnemonics.txt', lines.join('\n'));
  });
}
