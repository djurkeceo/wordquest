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
