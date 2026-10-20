/** Flashcard: flip once, then grade yourself. */

import type { SingleExercise, Word } from '../types';
import { sound } from '../audio';
import { emojiFor } from '../emoji';
import { t, tRand } from '../i18n';
import { esc, $, stage } from '../ui/dom';
import { showFeedback } from '../ui/feedback';
import { mnemonicFor } from '../ui/mnemonic';
import { answer, getSession, nextExercise } from '../ui/sessionFlow';

export function renderFlash(_ex: SingleExercise, word: Word): void {
  const s = getSession();
  if (!s) return;
  const em = emojiFor(word, word.n);
  stage().innerHTML = `
    <div class="qcard" style="padding-bottom:10px">
      <div class="qcard__eyebrow">${esc(t('q.translate'))}</div>
      <div class="flip" id="flipCard" role="button" tabindex="0" aria-label="${esc(t('q.flipHint'))}">
        <div class="flip__inner">
          <div class="flip__face">
            ${em ? `<div class="qemoji" aria-hidden="true">${em}</div>` : ''}
            <div>
              <div class="qword">${esc(word.f)}</div>
              <div class="qsub">${esc(t('q.flipHint'))}</div>
            </div>
          </div>
          <div class="flip__face flip__back">
            <div>
              <div class="qword qword--sm">${word.n.map(esc).join(' · ')}</div>
              <div class="qsub">${esc(word.f)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="opts" style="grid-template-columns:1fr 1fr" id="flashBtns">
      <button class="btn btn--danger" id="btnLearning" disabled>😅 ${esc(t('q.learning'))}</button>
      <button class="btn btn--teal" id="btnKnew" disabled>✅ ${esc(t('q.knew'))}</button>
    </div>`;

  const card = $<HTMLElement>('#flipCard')!;
  const flip = (): void => {
    card.classList.add('flipped');
    sound.play('flip');
    $<HTMLButtonElement>('#btnKnew')!.disabled = false;
    $<HTMLButtonElement>('#btnLearning')!.disabled = false;
  };
  card.addEventListener('click', flip);
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
  });
  $<HTMLButtonElement>('#btnKnew')!.addEventListener('click', () => {
    answer(true, { mode: 'flash' });
    const w = word;
    showFeedback({
      ok: true, title: tRand('fb.correct'), msg: `${esc(w.f)} = ${esc(w.n[0])}`,
      then: nextExercise
    });
  });
  $<HTMLButtonElement>('#btnLearning')!.addEventListener('click', () => {
    answer(false, { mode: 'flash', noHeart: true });
    showFeedback({
      ok: false, title: t('fb.wrong'),
      msg: `${esc(word.f)} = ${esc(word.n.join(' / '))}`,
      extra: mnemonicFor(word, s.deck) + `<div class="small muted">${esc(t('fb.reviewNote'))}</div>`,
      then: nextExercise
    });
  });
  s.flipHandler = flip;
}
