/** Achievements screen: lifetime counters and the fifteen-badge grid. */

import { BADGES, totalSeen } from '../../gamification/achievements';
import { t } from '../../i18n';
import { getState } from '../../storage/state';
import { $, esc } from '../dom';

export function renderAchievements(): void {
  const state = getState();
  const stats = $('#globalStats');
  if (stats) {
    stats.innerHTML = `
      <div><b>${state.profile.xp}</b><span>${esc(t('ach.totalXp'))}</span></div>
      <div><b>${totalSeen(state)}</b><span>${esc(t('ach.words'))}</span></div>
      <div><b>${state.profile.lessons}</b><span>${esc(t('ach.lessons'))}</span></div>`;
  }
  const grid = $('#badgeGrid');
  if (!grid) return;
  grid.innerHTML = BADGES.map(b => {
    const on = state.profile.achievements.includes(b.id);
    return `<div class="badge ${on ? 'on' : ''}" title="${esc(b.desc)}">
      <span class="bem" aria-hidden="true">${on ? b.emoji : '🔒'}</span>
      <span class="bname">${esc(b.name)}</span>
      <div class="tiny muted" style="margin-top:3px">${esc(b.desc)}</div>
    </div>`;
  }).join('');
}
