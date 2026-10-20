/**
 * Appearance, motion preference and the five settings switches.
 *
 * These were `applyTheme()`, `applyMotionPreference()` and `syncToggles()` in
 * the single-file app. They live together because every one of them mirrors a
 * stored preference onto the static chrome.
 */

import { getState } from '../storage/state';
import { $ } from './dom';

/** Apply light/dark, following the OS when theme = auto. */
export function applyTheme(): void {
  const mode = getState().settings.theme;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = mode === 'dark' || (mode === 'auto' && prefersDark);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0E0E17' : '#6C4BF6');
}

/** Calm-motion override independent of the OS setting. */
export function applyMotionPreference(): void {
  document.documentElement.setAttribute('data-motion', getState().settings.calmMotion ? 'calm' : 'normal');
}

/** Live-update when the OS theme changes (the legacy listener, unchanged). */
export function bindThemeListener(): void {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
}

/** Reflect the five boolean settings on their switch buttons. */
export function syncToggles(): void {
  const settings = getState().settings;
  const map: Record<string, boolean> = {
    tgSound: settings.sound,
    tgTts: settings.tts,
    tgStrict: settings.strictAccents,
    tgHearts: settings.hearts,
    tgMotion: settings.calmMotion
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = $('#' + id);
    if (el) el.setAttribute('aria-checked', val ? 'true' : 'false');
  });
}
