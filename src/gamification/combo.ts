/** Combo popup. */

import { $ } from '../ui/dom';

export function showCombo(n: number): void {
  const el = $<HTMLElement>('#combo');
  if (!el) return;
  el.textContent = '×' + n;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}
