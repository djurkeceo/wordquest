/** Speed round: 60 seconds of live four-option questions. */

import type { Word } from '../types';
import { buildOptions } from '../engine/options';
import { SRS } from '../engine/srs';
import { t } from '../i18n';
import { normKey } from '../language/normalize';
import { getState } from '../storage/state';
import { shuffle } from '../util/core';
import { esc, $, $$, stage } from '../ui/dom';
import {
  answer,
  endSession,
  getSession,
  registerSpeedHooks,
  updateSessionProgress
} from '../ui/sessionFlow';

let speedTimer: ReturnType<typeof setInterval> | null = null;

export function startSpeedTimer(): void {
  if (speedTimer !== null) clearInterval(speedTimer);
  const s = getSession();
  if (!s) return;
  s.speedLeft = 60;
  s.speedPool = shuffle(s.deck.words);
  s.speedIdx = 0;
  const tick = (): void => {
    const current = getSession();
    if (!current || current.kind !== 'speed') {
      stopSpeedTimer();
      return;
    }
    current.speedLeft--;
    const el = $<HTMLElement>('#timer');
    if (el) {
      el.textContent = Math.max(0, current.speedLeft) + 's';
      el.classList.toggle('low', current.speedLeft <= 10);
    }
    updateSessionProgress();
    if (current.speedLeft <= 0) {
      stopSpeedTimer();
      endSession('timeup');
    }
  };
  const el = $<HTMLElement>('#timer');
  if (el) el.textContent = '60s';
  speedTimer = setInterval(tick, 1000);
}

export function stopSpeedTimer(): void {
  if (speedTimer !== null) {
    clearInterval(speedTimer);
    speedTimer = null;
  }
}

export function renderSpeedQuestion(): void {
  const s = getSession();
  if (!s || s.kind !== 'speed') return;
  // Recycle words indefinitely; weight the pool occasionally.
  if (!s.speedPool || !s.speedPool.length) s.speedPool = shuffle(s.deck.words);
  if (s.speedIdx == null) s.speedIdx = 0;
  if (s.speedIdx >= s.speedPool.length) {
    s.speedPool = shuffle(s.deck.words);
    s.speedIdx = 0;
  }
  const word = s.speedPool[s.speedIdx] || SRS.pick(s.deck.words);
  if (!word) return;
  s.speedIdx++;
  s.queue.push({ type: 'speed', wordId: word.id });
  s.index = s.queue.length - 1;
  s.locked = false;
  renderSpeedChoice(word);
}

function renderSpeedChoice(word: Word): void {
  const s = getSession();
  if (!s) return;
  const f2n = Math.random() < 0.5;
  const options = buildOptions(s.deck, word, f2n ? 'n' : 'f', 4);
  const prompt = f2n ? word.f : word.n[0];
  stage().innerHTML = `
    <div class="qcard" style="padding:16px">
      <div class="qcard__eyebrow">${esc(t('q.speedPrompt'))} · ${esc(t('q.combo'))} ${s.combo}</div>
      <div class="qword ${prompt.length > 18 ? 'qword--sm' : ''}">${esc(prompt)}</div>
    </div>
    <div class="opts" id="speedOpts">
      ${options.map((opt, i) => `<button class="opt" data-val="${esc(opt)}"><span class="kbd">${i + 1}</span><span>${esc(opt)}</span></button>`).join('')}
    </div>`;
  const buttons = $$<HTMLButtonElement>('#speedOpts .opt');
  const correctKey = normKey(f2n ? word.n[0] : word.f);
  const choose = (btn: HTMLElement): void => {
    const current = getSession();
    if (!current || current.locked) return;
    const ok = normKey(btn.getAttribute('data-val') ?? '') === correctKey;
    buttons.forEach(b => {
      b.disabled = true;
      if (normKey(b.getAttribute('data-val') ?? '') === correctKey) b.classList.add('correct');
    });
    if (!ok) btn.classList.add('wrong');
    answer(ok, { mode: 'speed', noHeart: true, noRequeue: true });
    const state = getState();
    state.profile.bestSpeed = Math.max(state.profile.bestSpeed || 0, current.correct);
    // Tiny pause so the player sees the result, then straight on.
    setTimeout(() => {
      const latest = getSession();
      if (!latest || latest.kind !== 'speed') return;
      latest.locked = false;
      renderSpeedQuestion();
    }, ok ? 260 : 620);
  };
  buttons.forEach(b => b.addEventListener('click', () => choose(b)));
  s.choiceHandler = n => { const b = buttons[n - 1]; if (b) choose(b); };
  s.flipHandler = null;
}

registerSpeedHooks({
  start: startSpeedTimer,
  render: renderSpeedQuestion,
  stop: stopSpeedTimer
});
