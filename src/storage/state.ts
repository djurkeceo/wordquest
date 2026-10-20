/**
 * The live application state and its debounced persistence.
 *
 * `S` was a module-level `let` in the single-file app. It is intentionally not
 * exported as a mutable binding: every caller reads `getState()` at call time,
 * so profile switches, JSON imports and resets are visible everywhere.
 */

import type { AppState, Deck, Settings, Word } from '../types';
import { defaultState, migrate } from './migration';
import { getUnlockedProfile, saveProfiles, stateKeyFor } from './profiles';

let current: AppState = defaultState();

export function getState(): AppState {
  return current;
}

export function setState(next: AppState): void {
  current = next;
}

/** Reset progress while keeping the same settings object (Reset all progress). */
export function resetState(keepSettings?: Settings): void {
  current = defaultState();
  if (keepSettings) current.settings = keepSettings;
}

/** Load the active profile's state from localStorage, tolerating corruption. */
export function loadState(): void {
  try {
    const raw = localStorage.getItem(stateKeyFor(getUnlockedProfile()));
    if (!raw) { current = defaultState(); return; }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    current = migrate(parsed as Record<string, unknown>);
  } catch (err) {
    console.warn('WordQuest: could not read saved state, starting fresh.', err);
    current = defaultState();
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced persist so rapid answer grading does not thrash localStorage. */
export function save(immediate = false): void {
  if (saveTimer !== null) clearTimeout(saveTimer);
  const write = (): void => {
    saveTimer = null;
    const prof = getUnlockedProfile();
    if (!prof) return;   // locked — never write over data nobody opened
    // Keep the login screen on the same theme and language as the last user.
    if (prof.lang !== current.settings.uiLang || prof.theme !== current.settings.theme) {
      prof.lang = current.settings.uiLang;
      prof.theme = current.settings.theme;
      saveProfiles();
    }
    try {
      localStorage.setItem(stateKeyFor(prof), JSON.stringify(current));
    } catch (err) {
      console.warn('WordQuest: save failed (storage full or blocked).', err);
    }
  };
  if (immediate) write();
  else saveTimer = setTimeout(write, 220);
}

export function getDeck(id: string | null | undefined): Deck | null {
  return current.decks.find(d => d.id === id) || null;
}

export function getWord(deck: Deck, id: string | null | undefined): Word | null {
  return deck.words.find(w => w.id === id) || null;
}
