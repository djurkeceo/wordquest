/**
 * Router state shared by screens and the session controller.
 *
 * The actual `showScreen()` implementation lives in `ui/router.ts` (phase 5).
 * Keeping the mutable values here lets the session flow read them without
 * importing a screen or the router.
 */

import type { ScreenName } from '../types';

let currentScreen: ScreenName = 'home';
let currentDeckId: string | null = null;
const navStack: ScreenName[] = [];

export function getCurrentScreen(): ScreenName {
  return currentScreen;
}

export function setCurrentScreen(name: ScreenName): void {
  currentScreen = name;
}

export function getCurrentDeckId(): string | null {
  return currentDeckId;
}

export function setCurrentDeckId(id: string | null): void {
  currentDeckId = id;
}

/** The live back stack. Callers may push/pop it exactly as the legacy router. */
export function getNavStack(): ScreenName[] {
  return navStack;
}

/** Clear navigation history after unlocking or switching profiles. */
export function resetNav(): void {
  navStack.length = 0;
  currentScreen = 'home';
  currentDeckId = null;
}
