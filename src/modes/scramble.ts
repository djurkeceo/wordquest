/** Scramble: rebuild the foreign word from a letter bank. */

import type { SingleExercise, Word } from '../types';
import { sound } from '../audio';
import { t, tRand } from '../i18n';
import { normalizeAnswer } from '../language/normalize';
import { getState } from '../storage/state';
import { shuffle } from '../util/core';
import { esc, $, $$, stage } from '../ui/dom';
import { showFeedback } from '../ui/feedback';
import { mnemonicFor } from '../ui/mnemonic';
import { answer, getSession, nextExercise } from '../ui/sessionFlow';

export function renderScramble(_ex: SingleExercise, word: Word): void {
  const s = getSession();
  if (!s) return;
  const target = word.f;
  // Keep diacritics intact but scramble by grapheme-ish characters.
  const chars = Array.from(target.replace(/\s+/g, ''));
  let scrambled = shuffle(chars);
  // Avoid presenting the answer already solved.
  let guard = 0;
  while (scrambled.join('').toLowerCase() === chars.join('').toLowerCase() && guard++ < 12) scrambled = shuffle(chars);

  stage().innerHTML = `
    <div class="qcard">
      <div class="qcard__eyebrow">${esc(t('q.scramblePrompt'))}</div>
      <div class="qword qword--sm" style="margin:2px 0 18px">${esc(word.n.join(' / '))}</div>
      <div class="scramble-target" id="scTarget" aria-live="polite"></div>
      <div class="letterbank" id="scBank">
        ${scrambled.map((ch, i) => `<button class="letter" data-i="${i}" data-ch="${esc(ch)}">${esc(ch)}</button>`).join('')}
      </div>
      <div class="row" style="margin-top:18px;flex-wrap:nowrap">
        <button class="btn grow" id="scClear">↺ ${esc(t('q.clear'))}</button>
        <button class="btn btn--primary grow" id="scCheck">${esc(t('q.check'))}</button>
      </div>
    </div>`;

  const targetEl = $<HTMLElement>('#scTarget')!;
  const bank = $$<HTMLButtonElement>('#scBank .letter');
  let picked: { ch: string; btn: HTMLButtonElement }[] = [];

  const draw = (): void => {
    targetEl.innerHTML = chars.map((_ch, i) => {
      const p = picked[i];
      return p
        ? `<button class="scramble-slot filled" data-i="${i}" aria-label="Remove ${esc(p.ch)}">${esc(p.ch)}</button>`
        : `<span class="scramble-slot" aria-hidden="true"></span>`;
    }).join('');
    $$<HTMLButtonElement>('.scramble-slot.filled', targetEl).forEach(slot => {
      slot.addEventListener('click', () => {
        const i = Number(slot.getAttribute('data-i'));
        const item = picked.splice(i, 1)[0];
        if (item) item.btn.classList.remove('used');
        draw();
      });
    });
  };
  draw();

  bank.forEach(btn => {
    btn.addEventListener('click', () => {
      if (s.locked || btn.classList.contains('used')) return;
      btn.classList.add('used');
      picked.push({ ch: btn.getAttribute('data-ch') ?? '', btn });
      sound.play('tap');
      draw();
    });
  });

  $<HTMLButtonElement>('#scClear')!.addEventListener('click', () => {
    const current = getSession();
    if (!current || current.locked) return;
    picked.forEach(p => p.btn.classList.remove('used'));
    picked = [];
    draw();
  });

  $<HTMLButtonElement>('#scCheck')!.addEventListener('click', () => {
    const current = getSession();
    if (!current || current.locked) return;
    const attempt = picked.map(p => p.ch).join('');
    // The letter bank drops spaces, so compare against the compact form.
    const compact = target.replace(/\s+/g, '');
    const strict = getState().settings.strictAccents;
    const ok = normalizeAnswer(attempt, strict) === normalizeAnswer(compact, strict);
    answer(ok, { mode: 'scramble' });
    showFeedback({
      ok,
      title: ok ? tRand('fb.correct') : t('fb.wrong'),
      msg: `${esc(word.f)} = ${esc(word.n[0])}`,
      extra: ok ? '' : mnemonicFor(word, current.deck),
      then: nextExercise
    });
    if (ok) sound.speak(word.f, current.deck.foreignLang);
  });
  s.flipHandler = null;
  s.choiceHandler = null;
}
