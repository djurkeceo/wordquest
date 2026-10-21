/** Result screen after a lesson, practice, boss or speed round. */

import type { SummaryData } from '../../types';
import { emojiFor } from '../../emoji';
import { countUp, $, esc } from '../dom';
import { getSession, startSession } from '../sessionFlow';
import { t } from '../../i18n';
import { getState } from '../../storage/state';
import { mountMascot } from '../../gamification/mascot';
import { openDeck } from './deck';

/** Build the summary screen. Called by the session host before it is shown. */
export function renderSummary(data: SummaryData): void {
  const session = getSession();
  const inner = $('#summaryInner');
  if (!session || !inner) return;
  const state = getState();
  const deck = session.deck;
  const isSpeed = session.kind === 'speed';
  const perfect = data.perfect && !isSpeed;
  const title = perfect ? t('summary.perfect') : data.reason === 'complete' ? t('summary.title') : t('summary.titleShort');
  const mood = data.reason === 'nohearts' ? 'sad'
    : perfect || data.newBadges.length ? 'celebrate'
    : data.accuracy >= 60 ? 'happy' : 'sad';
  const moodLabel = mood === 'celebrate' ? 'Pip the fox celebrates'
    : mood === 'sad' ? 'Pip the fox looks sad'
    : 'Pip the fox looks happy';
  const msg = data.reason === 'nohearts' ? t('session.noHearts')
    : data.reason === 'timeup' ? t('session.timeUp')
    : t('summary.nice');

  inner.innerHTML = `
    <div class="hero" style="justify-content:center;text-align:center">
      <div class="mascot-slot" id="summaryMascot" data-size="lg"></div>
      <div>
        <h1>${esc(title)}</h1>
        <p class="muted">${esc(msg)}</p>
      </div>
    </div>
    <div class="card">
      <div class="bigstat">
        <div><b>${data.accuracy}%</b><span>${esc(t('summary.accuracy'))}</span></div>
        <div><b>+${session.xp}</b><span>${esc(t('summary.xp'))}</span></div>
        <div><b>${data.newlyMastered.length}</b><span>${esc(t('summary.mastered'))}</span></div>
      </div>
      <div class="bar" style="margin-top:6px"><i style="width:${data.accuracy}%"></i></div>
      <div class="row" style="justify-content:space-between;margin-top:10px">
        <span class="small muted">${esc(deck.name)}</span>
        <span class="small muted">🔥 ${state.profile.streak} · ⚡ ${state.profile.xp}</span>
      </div>
    </div>
    ${data.newBadges.length ? `
      <div class="card" style="border-color:var(--amber)">
        <b>🏅 ${esc(t('summary.newBadges'))}</b>
        <div class="row" style="margin-top:8px">
          ${data.newBadges.map(b => `<span class="tag tag--amber">${b.emoji} ${esc(b.name)}</span>`).join('')}
        </div>
      </div>` : ''}
    ${data.review.length ? `
      <h2>${esc(t('summary.review'))}</h2>
      <p class="small muted">${esc(t('summary.reviewSub'))}</p>
      <div class="list">${data.review.map(w => `
        <div class="listitem">
          <span class="em">${emojiFor(w, w.n) || '📝'}</span>
          <div class="grow"><b>${esc(w.f)}</b><div class="small muted">${esc(w.n.join(' / '))}</div></div>
          <span class="tag ${w.stats.mastery <= 1 ? 'tag--red' : 'tag--amber'}">${w.stats.mastery}/5</span>
        </div>`).join('')}</div>` : ''}
    <div class="row" style="margin-top:18px;flex-direction:column;flex-wrap:nowrap;gap:10px">
      <button class="btn btn--primary btn--block" id="btnAgain">↻ ${esc(t('summary.again'))}</button>
      <button class="btn btn--block" id="btnToDeck">${esc(t('summary.home'))}</button>
    </div>`;

  mountMascot('#summaryMascot', { size: 'lg', state: mood, label: moodLabel });

  countUp($('#summaryInner .bigstat div:nth-child(2) b'), session.xp, '+');

  $('#btnAgain')?.addEventListener('click', () => {
    const kind = session.kind === 'speed' ? 'speed' : session.kind === 'boss' ? 'boss' : 'lesson';
    startSession(deck, kind);
  });
  $('#btnToDeck')?.addEventListener('click', () => { openDeck(deck.id); });
}
