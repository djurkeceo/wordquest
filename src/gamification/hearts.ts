/**
 * Daily counters and the five-heart display.
 *
 * As in the legacy app, the daily reset runs when Home renders, not on a timer.
 * `lastHearts` is animation memory only; it never affects graded hearts.
 */

import type { SessionState } from '../types';
import { getState } from '../storage/state';
import { dayKey } from '../util/core';
import { $ } from '../ui/dom';

let lastHearts: number | null = null;

/** Reset the daily goal and regenerate hearts on the first visit of a day. */
export function ensureDaily(): void {
  const state = getState();
  const today = dayKey();
  if (state.profile.dailyDay !== today) {
    state.profile.dailyDay = today;
    state.profile.dailyXp = 0;
  }
  // Hearts regenerate daily (simple, forgiving model).
  if (state.profile.lastHeartDay !== today) {
    state.profile.lastHeartDay = today;
    state.profile.hearts = state.profile.maxHearts;
  }
}

/** Forget the previous heart count so the next render does not animate a loss. */
export function resetHeartAnimation(): void {
  lastHearts = null;
}

/** Re-render the session heart row, including the single break animation. */
export function renderHearts(session: SessionState | null): void {
  const wrap = $<HTMLElement>('#hearts');
  if (!wrap) return;
  if (!session || !isFinite(session.hearts)) {
    wrap.innerHTML = '';
    lastHearts = null;
    return;
  }
  const state = getState();
  const lost = lastHearts !== null && session.hearts < lastHearts;
  let html = '';
  for (let i = 0; i < state.profile.maxHearts; i++) {
    const cls = [
      i < session.hearts ? '' : 'heart--lost',
      lost && i === session.hearts ? 'heart--break' : ''
    ].filter(Boolean).join(' ');
    html += `<span class="${cls}">❤️</span>`;
  }
  wrap.innerHTML = html;
  wrap.setAttribute('aria-label', session.hearts + ' hearts left');
  lastHearts = session.hearts;
}
