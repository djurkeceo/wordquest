/**
 * Small DOM helpers copied from the single-file app.
 *
 * Renderers query the document on every render; no node is cached across
 * renders, because the legacy app replaces `innerHTML` freely.
 */

/** Query one element. The generic default is the common HTML case. */
export function $<T extends Element = HTMLElement>(sel: string, root?: ParentNode): T | null {
  return (root || document).querySelector<T>(sel);
}

/** Query every matching element as a real array. */
export function $$<T extends Element = HTMLElement>(sel: string, root?: ParentNode): T[] {
  return Array.from((root || document).querySelectorAll<T>(sel));
}

/** Build an element from an HTML string (first child). */
export function h(html: string): HTMLElement {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild as HTMLElement;
}

/** Escape untrusted text before interpolating into HTML. */
export function esc(value: unknown): string {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** The exercise render target. Missing markup is a programming error. */
export function stage(): HTMLElement {
  const el = $<HTMLElement>('#stage');
  if (!el) throw new Error('Missing #stage');
  return el;
}

/** Animate a number inside an element (used for the XP tally). */
export function countUp(el: Element | null, to: number, prefix?: string): void {
  if (!el) return;
  const calm = document.documentElement.getAttribute('data-motion') === 'calm'
    || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (calm || !isFinite(to) || to <= 0) { el.textContent = (prefix || '') + to; return; }
  const started = performance.now();
  const dur = 900;
  const tick = (now: number): void => {
    const p = Math.max(0, Math.min(1, (now - started) / dur));
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = (prefix || '') + Math.round(to * eased);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
