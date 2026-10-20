/**
 * Pure helpers shared by storage, the engine and the UI.
 *
 * Every function here is copied from the single-file app's utility block. The
 * only deliberate difference is that `uid()` reads WebCrypto from `globalThis`
 * instead of `window`, so the same function also works in the Vitest Node
 * environment. In a browser those are the same object.
 */

import type { DayKey, Timestamp } from '../types';

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function rand(n: number): number {
  return Math.floor(Math.random() * n);
}

/** Random item. Callers only use this with non-empty arrays, as in the legacy app. */
export function sample<T>(items: readonly T[]): T {
  return items[rand(items.length)];
}

/**
 * Collision-resistant id. Mixes WebCrypto entropy with a per-session counter,
 * so ids stay unique even where Math.random is seeded deterministically.
 */
let uidSeq = 0;
export function uid(): string {
  uidSeq++;
  const c: Crypto | undefined = globalThis.crypto;
  const rnd = c && typeof c.getRandomValues === 'function'
    ? Array.from(c.getRandomValues(new Uint32Array(2))).map(n => n.toString(36)).join('')
    : Math.random().toString(36).slice(2, 10);
  return rnd + Date.now().toString(36) + uidSeq.toString(36);
}

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(items: readonly T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Today's date key, e.g. "2026-10-19" (local time). */
export function dayKey(d?: Timestamp | Date | string): DayKey {
  const x = d ? new Date(d) : new Date();
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
}

export function daysBetween(aKey: DayKey, bKey: DayKey): number {
  const a = new Date(aKey + 'T00:00:00'), b = new Date(bKey + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** Short SRS "due" label: minutes, hours or days. */
export function humanDue(ms: Timestamp): string {
  if (!ms || ms <= Date.now()) return '';
  const min = Math.round((ms - Date.now()) / 60000);
  if (min < 60) return min + 'm';
  const hr = Math.round(min / 60);
  if (hr < 24) return hr + 'h';
  return Math.round(hr / 24) + 'd';
}

/** Debounce helper for text inputs. */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return function (this: unknown, ...args: A): void {
    clearTimeout(timer);
    const self = this;
    timer = setTimeout(() => fn.apply(self, args), wait);
  };
}
