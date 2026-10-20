/** Emoji link: choose the foreign word that matches the picture. */

import type { SingleExercise, Word } from '../types';
import { sound } from '../audio';
import { emojiFor } from '../emoji';
import { buildOptions } from '../engine/options';
import { t, tRand } from '../i18n';
import { normKey } from '../language/normalize';
import { esc, $$, stage } from '../ui/dom';
import { showFeedback } from '../ui/feedback';
import { mnemonicFor } from '../ui/mnemonic';
import { answer, getSession, nextExercise } from '../ui/sessionFlow';

export function renderEmoji(_ex: SingleExercise, word: Word): void {
  const s = getSession();
  if (!s) return;
  const em = emojiFor(word, word.n);
  if (!em) { nextExercise(); return; }
  // Ask: which foreign word matches this emoji? Options are foreign words.
  const options = buildOptions(s.deck, word, 'f', 4);
  stage().innerHTML = `
    <div class="qcard">
      <div class="qcard__eyebrow">${esc(t('q.emojiPrompt'))}</div>
      <div class="qemoji" style="font-size:5rem">${em}</div>
      <div class="qsub">${esc(word.n[0])}</div>
    </div>
    <div class="opts" id="emojiOpts">
      ${options.map((opt, i) => `<button class="opt" data-val="${esc(opt)}"><span class="kbd">${i + 1}</span><span>${esc(opt)}</span></button>`).join('')}
    </div>`;
  const buttons = $$<HTMLButtonElement>('#emojiOpts .opt');
  const correctKey = normKey(word.f);
  const choose = (btn: HTMLElement): void => {
    const current = getSession();
    if (!current || current.locked) return;
    const ok = normKey(btn.getAttribute('data-val') ?? '') === correctKey;
    buttons.forEach(b => {
      b.disabled = true;
      if (normKey(b.getAttribute('data-val') ?? '') === correctKey) b.classList.add('correct');
    });
    if (!ok) btn.classList.add('wrong');
    answer(ok, { mode: 'emoji' });
    showFeedback({
      ok,
      title: ok ? tRand('fb.correct') : t('fb.wrong'),
      msg: ok ? `${em} ${esc(word.f)} = ${esc(word.n[0])}` : `${esc(word.f)} = ${esc(word.n[0])}`,
      extra: ok ? '' : mnemonicFor(word, current.deck),
      then: nextExercise
    });
    sound.speak(word.f, current.deck.foreignLang);
  };
  buttons.forEach(b => b.addEventListener('click', () => choose(b)));
  s.choiceHandler = n => { const b = buttons[n - 1]; if (b) choose(b); };
  s.flipHandler = null;
}
