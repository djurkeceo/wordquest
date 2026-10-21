/**
 * The single mutable run and its grading loop.
 *
 * This module owns `session`, `answer()`, `nextExercise()`, `endSession()` and
 * `startSession()`, exactly as the legacy game engine did. Navigation, the
 * summary screen and the top bar are injected through `SessionHost`; exercise
 * renderers and the speed timer are registered by the modes layer. That keeps
 * the dependency direction one-way.
 */

import type {
  AnswerMeta,
  Deck,
  Exercise,
  GradeMode,
  MatchExercise,
  ModeId,
  SessionEndReason,
  SessionKind,
  SessionOptions,
  SessionState,
  SingleExercise,
  SummaryData,
  Word
} from '../types';
import { sound } from '../audio';
import { checkAchievements } from '../gamification/achievements';
import { showCombo } from '../gamification/combo';
import { burst } from '../gamification/confetti';
import { renderHearts, resetHeartAnimation } from '../gamification/hearts';
import { getMascotState, mountMascot, setState as setMascotState } from '../gamification/mascot';
import { t } from '../i18n';
import { SRS } from '../engine/srs';
import { levelFromXp } from '../engine/xp';
import { buildSession } from '../engine/session';
import { getState, getWord, save } from '../storage/state';
import { clamp, dayKey, daysBetween, rand } from '../util/core';
import { $ } from './dom';
import { isFeedbackOpen, resolveFeedback } from './feedback';
import { toast } from './toast';

/** The host supplies screens and chrome; it never owns session state. */
export interface SessionHost {
  showSession(): void;
  showSummary(data: SummaryData): void;
  updateTopbar(): void;
}

export type SingleRenderer = (ex: SingleExercise, word: Word) => void;

/** Registered by `modes/index.ts` once all renderers are defined. */
export interface SessionRenderers {
  match: (ex: MatchExercise) => void;
  single: Partial<Record<Exclude<ModeId, 'match'>, SingleRenderer>>;
}

/** Registered by `modes/speedRound.ts`; the flow calls it at the right times. */
export interface SpeedHooks {
  start(): void;
  render(): void;
  stop(): void;
}

let session: SessionState | null = null;
let host: SessionHost | null = null;
let renderers: SessionRenderers | null = null;
let speedHooks: SpeedHooks | null = null;

export function initSessionFlow(nextHost: SessionHost): void {
  host = nextHost;
}

export function registerSessionRenderers(next: SessionRenderers): void {
  renderers = next;
}

export function registerSpeedHooks(hooks: SpeedHooks): void {
  speedHooks = hooks;
}

export function getSession(): SessionState | null {
  return session;
}

/** Award XP and handle level-up toasts. */
export function addXp(n: number): boolean {
  if (!n) return false;
  const state = getState();
  const before = state.profile.level;
  state.profile.xp += n;
  state.profile.dailyXp += n;
  state.profile.level = levelFromXp(state.profile.xp);
  const leveled = state.profile.level > before;
  if (leveled) {
    toast(t('level.up', { n: state.profile.level }));
    burst(60, { power: 12 });
    sound.play('win');
    setMascotState('celebrate', 1800);
  }
  refreshTopbar();
  return leveled;
}

export function refreshTopbar(): void {
  if (host) host.updateTopbar();
}

/** Start a new session on a deck. */
export function startSession(deck: Deck, kind: SessionKind, opts?: SessionOptions): void {
  const state = getState();
  const o: SessionOptions = Object.assign({ kind }, opts || {});
  let pool = deck.words;
  if (kind === 'boss') {
    pool = SRS.trouble(deck.words, 10);
    if (pool.length < 2) pool = deck.words;
    o.pool = pool;
    o.size = Math.min(20, Math.max(6, pool.length * 2));
  }
  if (kind === 'speed') { o.size = 10; o.pool = deck.words; }

  const plan = buildSession(deck, o, {
    tts: state.settings.tts,
    canSpeak: sound.canSpeak,
    heartsEnabled: state.settings.hearts,
    currentHearts: state.profile.hearts
  });
  session = {
    ...plan,
    deck,
    hintUsed: 0,
    answers: 0,
    requeued: 0
  };
  session.mode = null;
  resetHeartAnimation();

  if (!host) throw new Error('Session host has not been registered.');
  host.showSession();
  $<HTMLElement>('#timer')?.classList.toggle('hidden', kind !== 'speed');
  if (kind === 'speed') {
    // The speed round generates questions on the fly rather than walking a plan.
    if (!speedHooks) throw new Error('Speed hooks have not been registered.');
    session.queue = [];
    session.index = -1;
    speedHooks.start();
    speedHooks.render();
  } else {
    renderExercise();
  }
  if (kind === 'boss') setMascotState('thinking', 1600);
  save();
}

/** Current exercise's word, or null for match (which has several words). */
export function currentWord(): Word | null {
  if (!session) return null;
  const ex = session.queue[session.index];
  if (!ex || ex.type === 'match') return null;
  return getWord(session.deck, ex.wordId);
}

/** Push a word back into the queue a few exercises later (wrong answers). */
function requeue(wordId: string | null): void {
  if (!session) return;
  const at = Math.min(session.queue.length, session.index + 3 + rand(2));
  const current = session.queue[session.index];
  const mode: GradeMode = current ? current.type : 'flash';
  const type = mode === 'match' ? 'flash' : mode;
  session.queue.splice(at, 0, { type, wordId });
  session.requeued++;
}

/** Central grading entry point. */
export function answer(ok: boolean, meta?: AnswerMeta): void {
  const m = meta || {};
  if (!session || session.locked) return;
  session.locked = true;
  const word = currentWord();
  const ex = session.queue[session.index];
  const mode: GradeMode = m.mode || (ex ? ex.type : 'flash');
  session.answers++;

  if (word) {
    session.seenWords.add(word.id);
    SRS.grade(word, ok, mode);
  }

  const state = getState();
  if (ok) {
    session.correct++;
    session.combo++;
    session.bestCombo = Math.max(session.bestCombo, session.combo);
    state.profile.totalCorrect++;
    state.profile.bestCombo = Math.max(state.profile.bestCombo || 0, session.combo);
    let gain = 10;
    if (session.kind === 'speed') {
      const mult = clamp(1 + Math.floor(session.combo / 3), 1, 4);
      gain = 5 * mult;
    }
    session.xp += gain;
    const leveledUp = addXp(gain);
    sound.play('correct');
    if (!leveledUp) setMascotState('happy');
    if (session.combo >= 3) {
      showCombo(session.combo);
      sound.play('combo');
    }
  } else {
    session.wrong++;
    session.combo = 0;
    state.profile.totalWrong++;
    if (!m.noHeart && isFinite(session.hearts)) session.hearts = Math.max(0, session.hearts - 1);
    sound.play('wrong');
    setMascotState('sad');
    if (!m.noRequeue) requeue(word ? word.id : null);
  }
  updateSessionProgress();
  renderHearts(session);
  save();
}

/** Advance to the next exercise, or end the session. */
export function nextExercise(): void {
  if (!session) return;
  session.locked = false;
  session.index++;
  if (session.kind === 'speed') {
    if (speedHooks) speedHooks.render();
    return;
  }
  if (session.index >= session.queue.length) {
    endSession('complete');
    return;
  }
  renderExercise();
}

/** Update the session progress bar and hearts. */
export function updateSessionProgress(): void {
  if (!session) return;
  const pct = session.kind === 'speed'
    ? (session.speedLeft / 60) * 100
    : (session.index / Math.max(1, session.queue.length)) * 100;
  const bar = $<HTMLElement>('#sessionProgress');
  if (bar) bar.style.width = clamp(pct, 0, 100) + '%';
  renderHearts(session);
}

/** Render the current exercise through the registered mode renderers. */
export function renderExercise(): void {
  if (!session) return;
  const ex: Exercise | undefined = session.queue[session.index];
  if (!ex) { endSession('complete'); return; }
  session.locked = false;
  mountMascot('#sessionMascot', { size: 'xs' });
  if (getMascotState() !== 'celebrate') setMascotState('idle');
  updateSessionProgress();
  if (!renderers) throw new Error('Session renderers have not been registered.');
  // Match exercises reference several words at once, so they bypass the
  // single-word lookup used by every other mode.
  if (ex.type === 'match') {
    session.mode = 'match';
    renderers.match(ex);
    return;
  }
  if (ex.type === 'speed') { nextExercise(); return; }
  const word = getWord(session.deck, ex.wordId);
  if (!word) { nextExercise(); return; }
  const render = renderers.single[ex.type];
  if (!render) { nextExercise(); return; }
  render(ex, word);
  session.mode = ex.type;
}

/** Finish the session and hand the summary data to the screen layer. */
export function endSession(reason: SessionEndReason): void {
  if (!session || session.ended) return;
  session.ended = true;
  if (speedHooks) speedHooks.stop();
  session.choiceHandler = null;
  session.flipHandler = null;
  $<HTMLElement>('#feedback')?.classList.remove('show');
  const state = getState();
  const deck = session.deck;
  const total = session.correct + session.wrong;
  const accuracy = total ? Math.round((session.correct / total) * 100) : 0;
  const perfect = total > 0 && session.wrong === 0;

  // Profile bookkeeping.
  state.profile.lessons++;
  if (perfect) state.profile.perfectLessons++;
  if (session.kind === 'boss' && accuracy >= 60) state.profile.bossWins = (state.profile.bossWins || 0) + 1;
  if (new Date().getHours() >= 0 && new Date().getHours() < 5) state.profile.nightOwl = true;
  state.profile.hearts = Math.min(state.profile.maxHearts, session.hearts === Infinity ? state.profile.maxHearts : session.hearts);
  touchStreak();

  const masteredBefore = session.masteredBefore;
  const seenWords = session.seenWords;
  const newlyMastered = deck.words.filter(w => w.stats.mastery >= 5 && !masteredBefore.has(w.id));
  const review = SRS.trouble(seenWords.size
    ? deck.words.filter(w => seenWords.has(w.id))
    : deck.words, 6);
  const newBadges = checkAchievements(state);
  save(true);
  refreshTopbar();
  if (host) host.showSummary({ reason, accuracy, perfect, newlyMastered, review, newBadges });
  if (perfect) { burst(140, { power: 14 }); sound.play('win'); }
  else if (accuracy >= 60) { burst(50); sound.play('win'); }
  else sound.play('lose');
}

/** Update the daily streak counter. */
function touchStreak(): void {
  const state = getState();
  const today = dayKey();
  const last = state.profile.lastLessonDay;
  if (last === today) return;
  if (!last) state.profile.streak = 1;
  else {
    const gap = daysBetween(last, today);
    if (gap === 1) state.profile.streak++;
    else if (gap > 1) state.profile.streak = 1;
  }
  state.profile.lastLessonDay = today;
  if (state.profile.streak > 1) toast(t('streak.kept', { n: state.profile.streak }));
}

/* Keyboard: Enter/space handled per-mode; expose a global hook. */
document.addEventListener('keydown', e => {
  if (!session || !$<HTMLElement>('#screen-session')?.classList.contains('is-active')) return;
  if (isFeedbackOpen()) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      resolveFeedback();
    }
    return;
  }
  if (e.key === ' ' && session.flipHandler && session.mode === 'flash') {
    e.preventDefault();
    session.flipHandler();
  }
  if (/^[1-4]$/.test(e.key) && session.choiceHandler) {
    e.preventDefault();
    session.choiceHandler(Number(e.key));
  }
});
