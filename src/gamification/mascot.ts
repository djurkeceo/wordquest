/**
 * The animated WordQuest fox.
 *
 * The SVG paths, colours and animation timings are copied from the reference
 * `wordquest_animated_fox.html`. One SVG is created once and moved between
 * screen slots, so the DOM never holds several animated copies.
 */

export type MascotState = 'idle' | 'happy' | 'celebrate' | 'sad' | 'thinking';
export type MascotSize = 'xs' | 'sm' | 'md' | 'lg' | 'deck';

export interface MascotOptions {
  state?: MascotState;
  size?: MascotSize;
  /** Give the fox an accessible name when it is the only meaningful visual. */
  label?: string;
  /** Return to idle after this many milliseconds (e.g. a one-off celebration). */
  autoResetMs?: number;
}

const FOX_MARKUP = `
<svg class="wq-fox" viewBox="0 0 400 420" data-state="idle" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="wq-fur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFA24D"/><stop offset="1" stop-color="#F2701B"/></linearGradient>
    <clipPath id="wq-tailClip"><path id="wq-tailShape" d="M286 372 Q404 352 388 236 Q380 176 330 146 Q352 214 304 276 Z"/></clipPath>
  </defs>
  <ellipse cx="200" cy="408" rx="120" ry="9" fill="#000" opacity=".12"/>
  <g class="rig">
    <g class="tail">
      <path d="M286 372 Q404 352 388 236 Q380 176 330 146 Q352 214 304 276 Z" fill="url(#wq-fur)"/>
      <g clip-path="url(#wq-tailClip)"><ellipse cx="364" cy="170" rx="62" ry="52" fill="#FFF4E6"/></g>
    </g>
    <path d="M84 420 Q88 352 150 340 L250 340 Q312 352 316 420 Z" fill="#F2701B"/>
    <path d="M168 342 Q200 392 232 342 L240 420 L160 420 Z" fill="#FFF4E6"/>
    <path class="fox-scarf" d="M112 334 Q200 384 288 334 L298 360 Q200 412 102 360 Z" fill="#6C4BF6"/>
    <path d="M122 350 Q200 396 278 350" fill="none" stroke="#A793FF" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 16"/>
    <path class="fox-scarf-knot" d="M248 372 L282 412 L254 418 L232 382 Z" fill="#5A38E8"/>
    <g class="head">
      <g class="ear-l">
        <path d="M92 66 L172 130 L98 196 Q72 134 92 66 Z" fill="url(#wq-fur)"/>
        <path d="M104 112 L148 144 L106 178 Q96 144 104 112 Z" fill="#4A2310"/>
      </g>
      <g class="ear-r">
        <path d="M310 84 L228 130 L302 196 Q332 140 310 84 Z" fill="url(#wq-fur)"/>
        <path d="M296 112 L252 144 L294 178 Q306 146 296 112 Z" fill="#4A2310"/>
        <path d="M310 84 L336 104 L320 128 Z" fill="#D9570C"/>
      </g>
      <path d="M200 118 Q292 118 324 196 Q340 232 308 264 Q272 340 200 344 Q128 340 92 264 Q60 232 76 196 Q108 118 200 118 Z" fill="url(#wq-fur)"/>
      <path d="M80 238 L124 248 L92 262 L132 272 L110 292 Q142 338 200 350 Q258 338 290 292 L268 272 L308 262 L276 248 L320 238 Q200 300 80 238 Z" fill="#FFF4E6"/>
      <circle cx="132" cy="280" r="3" fill="#E0966A"/><circle cx="144" cy="288" r="3" fill="#E0966A"/><circle cx="268" cy="280" r="3" fill="#E0966A"/>
      <g class="eyes-open"><g class="lids"><g class="look">
        <ellipse cx="155" cy="232" rx="16" ry="21" fill="#24120A"/><circle cx="161" cy="223" r="6" fill="#fff"/><circle cx="150" cy="240" r="2.5" fill="#fff"/>
        <ellipse cx="246" cy="232" rx="16" ry="21" fill="#24120A"/><circle cx="252" cy="223" r="6" fill="#fff"/><circle cx="241" cy="240" r="2.5" fill="#fff"/>
      </g></g></g>
      <g class="happy-eyes" fill="none" stroke="#24120A" stroke-width="8" stroke-linecap="round">
        <path d="M136 238 Q155 214 174 238"/><path d="M227 238 Q246 214 265 238"/>
      </g>
      <path class="brow-l" d="M134 202 Q155 190 176 200" fill="none" stroke="#4A2310" stroke-width="7" stroke-linecap="round"/>
      <path class="brow-r" d="M226 194 Q250 176 270 190" fill="none" stroke="#4A2310" stroke-width="7" stroke-linecap="round"/>
      <ellipse cx="116" cy="284" rx="14" ry="9" fill="#FF8FA3" opacity=".5"/><ellipse cx="286" cy="284" rx="14" ry="9" fill="#FF8FA3" opacity=".5"/>
      <path d="M184 306 Q200 296 216 306 Q214 322 200 330 Q186 322 184 306 Z" fill="#24120A"/>
      <ellipse cx="195" cy="305" rx="5" ry="2.5" fill="#fff" opacity=".6"/>
      <g class="mouth m-idle"><path d="M200 330 Q200 344 182 346 M200 330 Q200 344 218 346" fill="none" stroke="#24120A" stroke-width="6" stroke-linecap="round"/></g>
      <g class="mouth m-happy"><path d="M174 334 Q200 376 226 334 Q200 342 174 334 Z" fill="#8C1F2E" stroke="#24120A" stroke-width="5" stroke-linejoin="round"/><path d="M186 354 Q200 346 214 354 Q200 366 186 354 Z" fill="#FF7A8A"/></g>
      <g class="mouth m-sad"><path d="M182 346 Q200 330 218 346" fill="none" stroke="#24120A" stroke-width="6" stroke-linecap="round"/></g>
      <g class="mouth m-think"><path d="M186 342 Q206 338 224 330" fill="none" stroke="#24120A" stroke-width="6" stroke-linecap="round"/></g>
      <path class="tear" d="M170 258 Q160 276 170 284 Q180 276 170 258 Z" fill="#7CC8FF"/>
    </g>
    <g class="sparkles" fill="#FFC83D">
      <path class="sp" d="M60 90 L68 112 L90 120 L68 128 L60 150 L52 128 L30 120 L52 112 Z"/>
      <path class="sp" d="M340 70 L346 86 L362 92 L346 98 L340 114 L334 98 L318 92 L334 86 Z"/>
      <path class="sp" d="M200 20 L206 36 L222 42 L206 48 L200 64 L194 48 L178 42 L194 36 Z"/>
      <path class="sp" d="M370 200 L375 212 L387 217 L375 222 L370 234 L365 222 L353 217 L365 212 Z" fill="#9B84FF"/>
      <path class="sp" d="M34 230 L39 242 L51 247 L39 252 L34 264 L29 252 L17 247 L29 242 Z" fill="#58D68D"/>
    </g>
    <g class="bubble">
      <circle cx="330" cy="70" r="36" fill="#fff" stroke="#6C4BF6" stroke-width="5"/>
      <circle cx="288" cy="116" r="8" fill="#fff" stroke="#6C4BF6" stroke-width="4"/><circle cx="274" cy="134" r="5" fill="#fff" stroke="#6C4BF6" stroke-width="3"/>
      <text x="330" y="86" text-anchor="middle" font-size="46" font-weight="800" fill="#6C4BF6" font-family="Baloo 2,Trebuchet MS,sans-serif">?</text>
    </g>
  </g>
</svg>`;

let fox: SVGSVGElement | null = null;
let state: MascotState = 'idle';
let resetTimer: ReturnType<typeof setTimeout> | null = null;
let resetAt = 0;
let bound = false;
let frame = 0;
let pointerX = 0;
let pointerY = 0;

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const desktopPointer = window.matchMedia('(min-width: 720px) and (hover: hover) and (pointer: fine)');

function calmMotion(): boolean {
  return document.documentElement.getAttribute('data-motion') === 'calm';
}

function resetLook(): void {
  if (!fox) return;
  if (state === 'thinking') {
    fox.style.setProperty('--lx', '7px');
    fox.style.setProperty('--ly', '-8px');
  } else if (state === 'sad') {
    fox.style.setProperty('--lx', '0px');
    fox.style.setProperty('--ly', '7px');
  } else {
    fox.style.setProperty('--lx', '0px');
    fox.style.setProperty('--ly', '0px');
  }
}

/** Set the fox state, optionally returning to idle after `autoResetMs`. */
export function setState(next: MascotState, autoResetMs?: number): void {
  state = next;
  if (fox) {
    fox.setAttribute('data-state', next);
    resetLook();
  }
  if (resetTimer !== null) {
    clearTimeout(resetTimer);
    resetTimer = null;
    resetAt = 0;
  }
  if (autoResetMs && autoResetMs > 0) {
    resetAt = Date.now() + autoResetMs;
    resetTimer = setTimeout(() => {
      resetTimer = null;
      resetAt = 0;
      setState('idle');
    }, autoResetMs);
  }
}

export function getMascotState(): MascotState {
  return state;
}

/**
 * True while a reaction is still inside its auto-reset window. The session
 * renderer uses this so a level-up celebration survives the next exercise but
 * a summary celebration can never leak into the following lesson.
 */
export function isCelebrating(): boolean {
  return state === 'celebrate' && resetTimer !== null && Date.now() < resetAt;
}

function ensureFox(): SVGSVGElement {
  if (fox) return fox;
  const template = document.createElement('template');
  template.innerHTML = FOX_MARKUP.trim();
  fox = template.content.firstElementChild as SVGSVGElement;
  fox.setAttribute('data-paused', document.hidden ? 'true' : 'false');
  bindGlobalListeners();
  return fox;
}

/** Move the one fox SVG into a screen slot. */
export function mountMascot(
  target: string | HTMLElement,
  options: MascotOptions = {}
): SVGSVGElement | null {
  const host = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (!host) return null;
  const svg = ensureFox();
  if (svg.parentElement !== host) host.replaceChildren(svg);

  const size = options.size || (host.getAttribute('data-size') as MascotSize | null) || 'md';
  host.setAttribute('data-size', size);
  svg.setAttribute('data-size', size);

  svg.setAttribute('aria-hidden', 'true');
  svg.removeAttribute('role');
  svg.removeAttribute('aria-label');
  if (options.label) {
    svg.removeAttribute('aria-hidden');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', options.label);
  }

  if (options.state) setState(options.state, options.autoResetMs);
  return svg;
}

/**
 * Re-apply the current motion preference (called when "Calm motion" changes).
 * CSS handles the freeze itself; this also clears a pointer-follow offset so a
 * static fox never stays tilted after the setting is switched on.
 */
export function refreshMotionPreference(): void {
  if (!fox) return;
  fox.setAttribute('data-paused', document.hidden ? 'true' : 'false');
  if (reduceMotion.matches || calmMotion()) resetLook();
}

function trackPointer(x: number, y: number): void {
  if (!fox || document.hidden || reduceMotion.matches || calmMotion() || !desktopPointer.matches) return;
  if (state !== 'idle' && state !== 'happy') return;
  const r = fox.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const cx = r.left + r.width * 0.5;
  const cy = r.top + r.height * 0.55;
  const dx = (x - cx) / r.width;
  const dy = (y - cy) / r.height;
  const k = 14;
  fox.style.setProperty('--lx', Math.max(-6, Math.min(6, dx * k)) + 'px');
  fox.style.setProperty('--ly', Math.max(-6, Math.min(6, dy * k)) + 'px');
}

function bindGlobalListeners(): void {
  if (bound) return;
  bound = true;

  window.addEventListener('pointermove', event => {
    if (!fox || document.hidden) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      trackPointer(pointerX, pointerY);
    });
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', () => {
    if (state === 'idle' || state === 'happy') resetLook();
  });

  document.addEventListener('visibilitychange', () => {
    if (!fox) return;
    fox.setAttribute('data-paused', document.hidden ? 'true' : 'false');
    if (document.hidden) {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    }
  });

  // The OS preference can change while the app is open. The CSS media query
  // updates on its own; this listener clears any look offset immediately.
  reduceMotion.addEventListener('change', refreshMotionPreference);
  desktopPointer.addEventListener('change', () => {
    if (!desktopPointer.matches) resetLook();
  });
}
