/** Transient toast message (2600 ms, one at a time). */

import { $ } from './dom';

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function toast(msg: string): void {
  const el = $<HTMLElement>('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  if (toastTimer !== null) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastTimer = null;
    el.classList.remove('show');
  }, 2600);
}
