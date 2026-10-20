/** Memory match: pair one foreign card with one native card. */

import type { MatchExercise, Word } from '../types';
import { sound } from '../audio';
import { SRS } from '../engine/srs';
import { t } from '../i18n';
import { getWord } from '../storage/state';
import { esc, $, $$, stage } from '../ui/dom';
import { addXp, getSession, nextExercise } from '../ui/sessionFlow';

interface MemCard {
  id: string;
  side: 'f' | 'n';
  text: string;
  w: Word;
}

export function renderMatch(ex: MatchExercise): void {
  const s = getSession();
  if (!s) return;
  const words = ex.wordIds
    .map(id => getWord(s.deck, id))
    .filter((w): w is Word => w !== null);
  if (words.length < 3) { nextExercise(); return; }
  // Build a deck of cards: one foreign, one native per word.
  const cards: MemCard[] = [];
  words.forEach(w => {
    cards.push({ id: w.id, side: 'f', text: w.f, w });
    cards.push({ id: w.id, side: 'n', text: w.n[0], w });
  });
  const shuffled = shuffleCards(cards);
  let first: { btn: HTMLButtonElement; card: MemCard } | null = null;
  let matched = 0, mistakes = 0, busy = false;

  stage().innerHTML = `
    <div class="qcard" style="padding:16px 12px 12px">
      <div class="qcard__eyebrow">${esc(t('q.matchPrompt'))}</div>
      <div class="memgrid" id="memGrid">
        ${shuffled.map((_c, i) => `
          <button class="mem" data-i="${i}" aria-label="Card ${i + 1}">
            <span class="back" aria-hidden="true">❓</span>
          </button>`).join('')}
      </div>
      <div class="qsub" id="memStatus" style="margin-top:12px"></div>
    </div>`;
  const grid = $<HTMLElement>('#memGrid')!;
  const buttons = $$<HTMLButtonElement>('.mem', grid);

  const reveal = (btn: HTMLButtonElement, card: MemCard): void => {
    btn.classList.add('up');
    btn.innerHTML = `<span>${esc(card.text)}</span>`;
  };
  const hide = (btn: HTMLButtonElement): void => {
    btn.classList.remove('up');
    btn.innerHTML = `<span class="back" aria-hidden="true">❓</span>`;
  };
  const status = (): void => {
    const el = $<HTMLElement>('#memStatus');
    if (el) el.textContent = `${matched}/${words.length} · ${mistakes} ${t('fb.wrong').toLowerCase()}`;
  };
  status();

  buttons.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      if (busy || btn.classList.contains('matched') || btn.classList.contains('up')) return;
      const card = shuffled[i];
      reveal(btn, card);
      sound.play('tap');
      if (!first) { first = { btn, card }; return; }
      if (first.card.id === card.id && first.card.side !== card.side) {
        // Match
        btn.classList.add('matched');
        first.btn.classList.add('matched');
        matched++;
        first = null;
        sound.play('correct');
        status();
        // Every matched pair counts as a correct answer for both sides.
        if (matched === words.length) {
          words.forEach(w => { SRS.grade(w, true, 'match'); });
          const current = getSession();
          if (current) {
            current.correct += words.length;
            current.xp += 5 * words.length;
          }
          addXp(5 * words.length);
          if (current) words.forEach(w => current.seenWords.add(w.id));
          setTimeout(nextExercise, 520);
        }
      } else {
        busy = true;
        mistakes++;
        btn.classList.add('wrong');
        first.btn.classList.add('wrong');
        sound.play('wrong');
        const a = first;
        setTimeout(() => {
          hide(btn); hide(a.btn);
          btn.classList.remove('wrong'); a.btn.classList.remove('wrong');
          first = null; busy = false;
          status();
        }, 620);
      }
    });
  });
  s.locked = false;
  s.flipHandler = null;
  s.choiceHandler = null;
}

/** Fisher-Yates over cards; kept local so the random call order is explicit. */
function shuffleCards(cards: readonly MemCard[]): MemCard[] {
  const a = cards.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
