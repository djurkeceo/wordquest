/** Type the answer, with an optional letter-by-letter hint. */

import type { SingleExercise, Word } from '../types';
import { sound } from '../audio';
import { emojiFor } from '../emoji';
import { checkTyped } from '../engine/answer';
import { setState as setMascotState } from '../gamification/mascot';
import { t, tRand } from '../i18n';
import { getState } from '../storage/state';
import { esc, $, stage } from '../ui/dom';
import { showFeedback } from '../ui/feedback';
import { mnemonicFor } from '../ui/mnemonic';
import { answer, endSession, getSession, nextExercise, refreshTopbar } from '../ui/sessionFlow';
import { toast } from '../ui/toast';

export function renderType(ex: SingleExercise, word: Word): void {
  const s = getSession();
  if (!s) return;
  const f2n = ex.type === 'type-f2n';
  const prompt = f2n ? word.f : word.n[0];
  const target = f2n ? word.n[0] : word.f;
  const em = emojiFor(word, word.n);
  let hintCount = 0;
  let finished = false;

  stage().innerHTML = `
    <div class="qcard">
      <div class="qcard__eyebrow">${esc(f2n ? t('q.typeTranslation') : t('q.typeWord'))}</div>
      ${!f2n && em ? `<div class="qemoji" aria-hidden="true">${em}</div>` : ''}
      <div class="qword ${prompt.length > 20 ? 'qword--sm' : ''}">${esc(prompt)}</div>
      <div class="row" style="justify-content:center;margin-top:12px">
        <button class="btn btn--sm btn--ghost" id="btnSpeak">🔊 ${esc(t('q.replay'))}</button>
      </div>
    </div>
    <div class="card" style="margin:0">
      <input type="text" id="typeInput" autocomplete="off" autocapitalize="off" spellcheck="false"
        aria-label="${esc(f2n ? t('q.typeTranslation') : t('q.typeWord'))}"
        placeholder="${esc(f2n ? t('q.typeTranslation') : t('q.typeWord'))}">
      <div class="row" style="margin-top:10px">
        <button class="btn btn--sm" id="btnHint">💡 ${esc(t('q.hint'))}</button>
        <span class="grow"></span>
        <button class="btn btn--primary" id="btnCheck">${esc(t('q.check'))}</button>
      </div>
      <div id="hintBox" class="mnemonic hidden" style="margin:12px 0 0"></div>
    </div>`;

  const input = $<HTMLInputElement>('#typeInput')!;
  input.focus({ preventScroll: true });
  $<HTMLButtonElement>('#btnSpeak')!.addEventListener('click', () => sound.speak(word.f, s.deck.foreignLang));

  const check = (): void => {
    if (finished) return;
    const val = input.value.trim();
    if (!val) { input.focus(); return; }
    finished = true;
    const settings = getState().settings;
    const res = checkTyped(val, f2n ? word.n : [word.f], {
      strict: settings.strictAccents,
      bilingual: s.deck.nativeLang === 'sr' || s.deck.foreignLang === 'sr'
    });
    const ok = res.status === 'correct' || res.status === 'almost';
    answer(ok, { mode: ex.type });
    const current = getSession();
    if (!ok && current && current.hearts === 0 && isFinite(current.hearts)) {
      showFeedback({
        ok: false, title: t('fb.wrong'),
        msg: `${esc(word.f)} = ${esc(word.n.join(' / '))}`,
        extra: mnemonicFor(word, s.deck),
        then: () => endSession('nohearts')
      });
      return;
    }
    showFeedback({
      ok,
      title: res.status === 'correct' ? tRand('fb.correct')
        : res.status === 'almost' ? t('fb.almost')
        : res.status === 'accents' ? t('fb.accents')
        : t('fb.wrong'),
      msg: res.status === 'almost'
        ? `${esc(t('fb.typoMsg'))} ${esc(word.f)} = ${esc(res.matched)}`
        : ok ? `${esc(word.f)} = ${esc(word.n.join(' / '))}` : `${esc(word.f)} = ${esc(word.n.join(' / '))}`,
      extra: ok ? '' : mnemonicFor(word, s.deck),
      then: nextExercise
    });
    if (ok) sound.speak(word.f, s.deck.foreignLang);
  };

  $<HTMLButtonElement>('#btnCheck')!.addEventListener('click', check);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); check(); } });

  // Hint: reveal one more letter each time, costing 2 XP.
  $<HTMLButtonElement>('#btnHint')!.addEventListener('click', () => {
    if (finished) return;
    if (hintCount >= target.length) return;
    hintCount++;
    const current = getSession();
    const state = getState();
    if (current) current.xp = Math.max(0, current.xp - 2);
    state.profile.xp = Math.max(0, state.profile.xp - 2);
    refreshTopbar();
    sound.play('hint');
    setMascotState('thinking', 1200);
    const shown = target.slice(0, hintCount);
    const masked = shown + '·'.repeat(Math.max(0, target.length - hintCount));
    const box = $<HTMLElement>('#hintBox')!;
    box.classList.remove('hidden');
    box.innerHTML = `<b>${esc(shown)}</b>${esc(masked.slice(shown.length))} <span class="tiny muted">(${hintCount}/${target.length})</span>`;
    input.value = shown;
    input.focus({ preventScroll: true });
    toast(t('q.hintCost'));
  });
}
