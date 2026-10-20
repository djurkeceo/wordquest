/** Listen & pick: hear the foreign word, choose its native meaning. */

import type { SingleExercise, Word } from '../types';
import { sound } from '../audio';
import { buildOptions } from '../engine/options';
import { t, tRand } from '../i18n';
import { langName } from '../language/names';
import { normKey } from '../language/normalize';
import { getState } from '../storage/state';
import { esc, $, $$, stage } from '../ui/dom';
import { showFeedback } from '../ui/feedback';
import { mnemonicFor } from '../ui/mnemonic';
import { answer, getSession, nextExercise } from '../ui/sessionFlow';
import { toast } from '../ui/toast';

export function renderListen(_ex: SingleExercise, word: Word): void {
  const s = getSession();
  if (!s) return;
  const options = buildOptions(s.deck, word, 'n', 4);
  stage().innerHTML = `
    <div class="qcard">
      <div class="qcard__eyebrow">${esc(t('q.listenPrompt'))}</div>
      <button class="btn btn--primary playbtn" id="btnPlay" aria-label="Play word">🔊</button>
      <div class="qsub">${esc(langName(s.deck.foreignLang, getState().settings.uiLang))}</div>
    </div>
    <div class="opts" id="listenOpts">
      ${options.map((opt, i) => `<button class="opt" data-val="${esc(opt)}"><span class="kbd">${i + 1}</span><span>${esc(opt)}</span></button>`).join('')}
    </div>`;
  const play = (): void => {
    const ok = sound.speak(word.f, s.deck.foreignLang);
    if (!ok) toast(t('toast.ttsOff'));
  };
  $<HTMLButtonElement>('#btnPlay')!.addEventListener('click', play);
  setTimeout(play, 260);
  const buttons = $$<HTMLButtonElement>('#listenOpts .opt');
  const correctKey = normKey(word.n[0]);
  const choose = (btn: HTMLElement): void => {
    const current = getSession();
    if (!current || current.locked) return;
    const ok = normKey(btn.getAttribute('data-val') ?? '') === correctKey;
    buttons.forEach(b => {
      b.disabled = true;
      if (normKey(b.getAttribute('data-val') ?? '') === correctKey) b.classList.add('correct');
    });
    if (!ok) btn.classList.add('wrong');
    answer(ok, { mode: 'listen' });
    showFeedback({
      ok,
      title: ok ? tRand('fb.correct') : t('fb.wrong'),
      msg: `${esc(word.f)} = ${esc(word.n.join(' / '))}`,
      extra: ok ? '' : mnemonicFor(word, current.deck),
      then: nextExercise
    });
    if (!ok) sound.speak(word.f, current.deck.foreignLang);
  };
  buttons.forEach(b => b.addEventListener('click', () => choose(b)));
  s.choiceHandler = n => { const b = buttons[n - 1]; if (b) choose(b); };
  s.flipHandler = null;
}
