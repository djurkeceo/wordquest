/** Multiple choice in both directions. */

import type { SingleExercise, Word } from '../types';
import { sound } from '../audio';
import { emojiFor } from '../emoji';
import { buildOptions } from '../engine/options';
import { t, tRand } from '../i18n';
import { langName } from '../language/names';
import { normKey } from '../language/normalize';
import { getState } from '../storage/state';
import { esc, $, $$, stage } from '../ui/dom';
import { showFeedback } from '../ui/feedback';
import { mnemonicFor } from '../ui/mnemonic';
import { answer, endSession, getSession, nextExercise } from '../ui/sessionFlow';

export function renderChoice(ex: SingleExercise, word: Word): void {
  const s = getSession();
  if (!s) return;
  const f2n = ex.type === 'choice-f2n';
  const prompt = f2n ? word.f : word.n[0];
  const field = f2n ? 'n' : 'f';
  const options = buildOptions(s.deck, word, field, 4);
  const em = emojiFor(word, word.n);
  const isSmall = prompt.length > 22;

  stage().innerHTML = `
    <div class="qcard">
      <div class="qcard__eyebrow">${esc(f2n ? t('q.pickTranslation') : t('q.tapWord'))}</div>
      ${!f2n && em ? `<div class="qemoji" aria-hidden="true">${em}</div>` : ''}
      <div class="qword ${isSmall ? 'qword--sm' : ''}">${esc(prompt)}</div>
      ${f2n ? `<div class="qsub">${esc(langName(s.deck.foreignLang, getState().settings.uiLang))} → ${esc(langName(s.deck.nativeLang, getState().settings.uiLang))}</div>` : ''}
      <div class="row" style="justify-content:center;margin-top:12px">
        <button class="btn btn--sm btn--ghost" id="btnSpeak" aria-label="Pronounce ${esc(word.f)}">🔊 ${esc(t('q.replay'))}</button>
      </div>
    </div>
    <div class="opts" id="choiceOpts">
      ${options.map((opt, i) => `<button class="opt" data-val="${esc(opt)}"><span class="kbd">${i + 1}</span><span>${esc(opt)}</span></button>`).join('')}
    </div>`;

  $<HTMLButtonElement>('#btnSpeak')!.addEventListener('click', () => sound.speak(word.f, s.deck.foreignLang));
  const buttons = $$<HTMLButtonElement>('#choiceOpts .opt');
  const correctKey = normKey(f2n ? word.n[0] : word.f);

  const choose = (btn: HTMLElement): void => {
    const current = getSession();
    if (!current || current.locked) return;
    const val = btn.getAttribute('data-val') ?? '';
    const ok = normKey(val) === correctKey || word.n.some(n => normKey(n) === normKey(val));
    buttons.forEach(b => { b.disabled = true; });
    buttons.forEach(b => {
      const isCorrect = normKey(b.getAttribute('data-val') ?? '') === correctKey;
      if (isCorrect) b.classList.add('correct');
    });
    if (!ok) btn.classList.add('wrong');
    answer(ok, { mode: ex.type });
    showFeedback({
      ok,
      title: ok ? tRand('fb.correct') : t('fb.wrong'),
      msg: ok ? '' : `${esc(word.f)} = ${esc(word.n.join(' / '))}`,
      extra: ok ? '' : mnemonicFor(word, current.deck) + (isFinite(current.hearts) ? `<div class="small muted">${esc(t('fb.reviewNote'))}</div>` : ''),
      then: () => {
        const latest = getSession();
        if (!latest) return;
        if (!ok && latest.hearts === 0 && isFinite(latest.hearts)) endSession('nohearts');
        else nextExercise();
      }
    });
    sound.speak(word.f, current.deck.foreignLang);
  };
  buttons.forEach(btn => btn.addEventListener('click', () => choose(btn)));
  s.choiceHandler = n => { const b = buttons[n - 1]; if (b) choose(b); };
}
