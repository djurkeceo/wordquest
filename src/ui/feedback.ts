/**
 * The bottom feedback sheet. Content, classes, focus handling and the single
 * resolver are unchanged.
 */

import type { FeedbackOptions } from '../types';
import { t } from '../i18n';
import { mountMascot } from '../gamification/mascot';
import { $ } from './dom';

let feedbackResolver: (() => void) | null = null;

export function showFeedback(opts: FeedbackOptions): void {
  const fb = $<HTMLElement>('#feedback');
  if (!fb) return;
  fb.classList.toggle('ok', !!opts.ok);
  fb.classList.toggle('bad', !opts.ok);
  const title = $<HTMLElement>('#fbTitle');
  const msg = $<HTMLElement>('#fbMsg');
  const extra = $<HTMLElement>('#fbExtra');
  const next = $<HTMLElement>('#fbNext');
  if (title) title.textContent = opts.title;
  if (msg) msg.textContent = opts.msg || '';
  if (extra) extra.innerHTML = opts.extra || '';
  mountMascot('#fbMascot', { size: 'sm' });
  if (next) next.textContent = t('fb.continue');
  fb.classList.add('show');
  if (next) next.focus({ preventScroll: true });
  feedbackResolver = () => {
    fb.classList.remove('show');
    const fn = opts.then;
    feedbackResolver = null;
    if (fn) fn();
    if ($<HTMLElement>('#screen-session')?.classList.contains('is-active')) {
      mountMascot('#sessionMascot', { size: 'xs' });
    }
  };
}

/** Run the pending Continue callback, as Enter/Space and the button do. */
export function resolveFeedback(): void {
  if (feedbackResolver) feedbackResolver();
}

/** True while the sheet is visible (keyboard shortcuts depend on this). */
export function isFeedbackOpen(): boolean {
  return !!$<HTMLElement>('#feedback')?.classList.contains('show');
}

let feedbackBound = false;

/** Attach the Continue click once the markup exists (idempotent). */
export function bindFeedback(): void {
  if (feedbackBound) return;
  const next = $<HTMLElement>('#fbNext');
  if (!next) return;
  next.addEventListener('click', () => {
    if (feedbackResolver) feedbackResolver();
  });
  feedbackBound = true;
}

bindFeedback();
