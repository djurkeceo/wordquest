/** Streak and XP pills in the sticky top bar. */

import { getState } from '../storage/state';
import { $ } from './dom';

export function updateTopbar(): void {
  const profile = getState().profile;
  const xp = $<HTMLElement>('#pillXp');
  const streak = $<HTMLElement>('#pillStreak');
  if (xp) {
    xp.innerHTML = `⚡ <b>${profile.xp}</b>`;
    xp.setAttribute('aria-label', profile.xp + ' total XP');
  }
  if (streak) {
    streak.innerHTML = `🔥 <b>${profile.streak}</b>`;
    streak.setAttribute('aria-label', profile.streak + ' day streak');
  }
}
