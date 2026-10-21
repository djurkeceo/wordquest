/**
 * Home screen: hero, daily goal ring, continue card and deck list.
 *
 * Daily counters/hearts are refreshed here by `ensureDaily()`, exactly as in
 * the single-file app (so a session kept open past midnight still waits for a
 * Home visit — reported as L15).
 */

import { deckEmoji } from '../../emoji';
import { SRS } from '../../engine/srs';
import { ensureDaily } from '../../gamification/hearts';
import { mountMascot } from '../../gamification/mascot';
import { applyI18n, t, tRand } from '../../i18n';
import { langName } from '../../language/names';
import { getState } from '../../storage/state';
import { $, esc, h } from '../dom';
import { startSession } from '../sessionFlow';
import { updateTopbar } from '../topbar';
import { renderPresetSection } from '../../presets/ui';
import { openDeck } from './deck';

export function renderHome(): void {
  ensureDaily();
  applyI18n();
  updateTopbar();
  const state = getState();
  const uiLang = state.settings.uiLang || 'en';
  const heroMsg = $('#heroMsg');
  if (heroMsg) heroMsg.textContent = tRand('home.hello');
  mountMascot('#mascot', {
    size: 'lg',
    state: state.profile.dailyXp >= state.settings.dailyGoal ? 'celebrate' : 'idle',
    label: 'Pip the fox mascot'
  });

  // Daily goal ring.
  const goal = Math.max(1, state.settings.dailyGoal);
  const pct = Math.max(0, Math.min(1, state.profile.dailyXp / goal));
  const circ = 2 * Math.PI * 32;
  const ring = $('#goalRing');
  if (ring) {
    ring.setAttribute('stroke-dasharray', circ.toFixed(1));
    ring.setAttribute('stroke-dashoffset', (circ * (1 - pct)).toFixed(1));
  }
  const ringTxt = $('#goalRingTxt');
  if (ringTxt) ringTxt.textContent = Math.round(pct * 100) + '%';
  const goalSub = $('#goalSub');
  if (goalSub) goalSub.textContent = `${state.profile.dailyXp} / ${goal} XP`;
  const goalLabel = $('#goalLabel');
  if (goalLabel) goalLabel.textContent = pct >= 1 ? t('home.done') : t('home.goal');
  const due = state.decks.reduce((n, d) => n + d.words.filter(w => !w.stats.due || w.stats.due <= Date.now()).length, 0);
  const dueSub = $('#dueSub');
  if (dueSub) {
    dueSub.textContent = due ? `${due} ${t('deck.words')} ${uiLang === 'sr' ? 'čeka ponavljanje' : 'due for review'}` : '';
  }

  // Continue card — jump straight back into the most recent deck.
  const cont = $('#continueCard');
  const recent = state.decks.slice().sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0))[0];
  if (cont) {
    if (recent && recent.words.length) {
      const m = SRS.masteredCount(recent);
      const pc = Math.round((m / recent.words.length) * 100);
      cont.classList.remove('hidden');
      cont.innerHTML = `
        <div class="continue">
          <div class="continue__top">
            <div class="grow">
              <div class="continue__label">${esc(t('home.continueLabel'))}</div>
              <div class="continue__name">${esc(recent.name)}</div>
              <div class="continue__meta">${m}/${recent.words.length} ${esc(t('deck.mastered'))} · ${pc}%</div>
            </div>
            <div class="continue__emoji" aria-hidden="true">${deckEmoji(recent)}</div>
          </div>
          <div class="bar"><i style="width:${pc}%"></i></div>
          <button class="btn btn--block continue__btn" id="btnContinue">${esc(t('home.continue'))} →</button>
        </div>`;
      $('#btnContinue')?.addEventListener('click', () => startSession(recent, 'lesson'));
    } else {
      cont.classList.add('hidden');
      cont.innerHTML = '';
    }
  }

  // Deck cards.
  const list = $('#deckList');
  const empty = $('#deckEmpty');
  if (empty) empty.classList.toggle('hidden', state.decks.length > 0);
  if (list) {
    list.innerHTML = '';
    state.decks.slice().sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0)).forEach(deck => {
      const mastered = SRS.masteredCount(deck);
      const pctDeck = deck.words.length ? Math.round((mastered / deck.words.length) * 100) : 0;
      const card = h(`<button class="deckcard" data-id="${deck.id}">
        <span class="deckcard__av" aria-hidden="true">${deckEmoji(deck)}</span>
        <span class="deckcard__body">
          <b>${esc(deck.name)}</b>
          <span class="meta">${esc(langName(deck.foreignLang, uiLang))} → ${esc(langName(deck.nativeLang, uiLang))} · ${deck.words.length} ${esc(t('deck.words'))}</span>
          <span class="bar" style="margin-top:7px;height:7px"><i style="width:${pctDeck}%"></i></span>
        </span>
        <span class="tag ${pctDeck === 100 ? 'tag--green' : ''}">${mastered}/${deck.words.length}</span>
      </button>`);
      card.addEventListener('click', () => openDeck(deck.id));
      list.appendChild(card);
    });
  }

  renderPresetSection();
}
