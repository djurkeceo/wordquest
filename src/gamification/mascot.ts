/**
 * Pip the fox. The SVG, classes and aria label are copied verbatim from the
 * single-file app; tests and screenshots pin the markup.
 */

import { $ } from '../ui/dom';

/** Render the fox mascot with a mood class. */
export function mascotSvg(mood?: string): string {
  return `<svg class="mascot mascot--${mood || 'happy'}" viewBox="0 0 120 120" role="img" aria-label="Pip the fox">
    <ellipse class="m-tail" cx="20" cy="92" rx="16" ry="9" fill="#F97316" opacity=".9"/>
    <path class="m-ear" d="M32 34 L28 8 L54 24 Z" fill="#F97316"/>
    <path class="m-ear" d="M88 34 L92 8 L66 24 Z" fill="#F97316"/>
    <path d="M35 32 L33 17 L49 27 Z" fill="#3B1E0B"/><path d="M85 32 L87 17 L71 27 Z" fill="#3B1E0B"/>
    <ellipse cx="60" cy="62" rx="42" ry="38" fill="#F97316"/>
    <path d="M60 100 a42 38 0 0 1 -34 -18 a44 26 0 0 0 68 0 a42 38 0 0 1 -34 18 Z" fill="#fff" opacity=".92"/>
    <ellipse cx="60" cy="74" rx="26" ry="22" fill="#FFF3E6"/>
    <circle class="m-eye" cx="45" cy="58" r="6.5" fill="#2A1A12"/><circle class="m-eye" cx="75" cy="58" r="6.5" fill="#2A1A12"/>
    <circle cx="47" cy="55.5" r="2.3" fill="#fff"/><circle cx="77" cy="55.5" r="2.3" fill="#fff"/>
    <ellipse cx="60" cy="70" rx="5" ry="4" fill="#2A1A12"/>
    <path class="m-mouth" d="M52 80 q8 8 16 0" stroke="#2A1A12" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="36" cy="72" r="6" fill="#FF8FA3" opacity=".55"/><circle cx="84" cy="72" r="6" fill="#FF8FA3" opacity=".55"/>
  </svg>`;
}

/** Swap the home mascot's mood (cheap: replace the element's class). */
export function setMascotMood(mood: string): void {
  const el = $<HTMLElement>('#mascot');
  if (!el) return;
  el.classList.remove('mascot--happy', 'mascot--sad', 'mascot--party');
  el.classList.add('mascot--' + mood);
}
