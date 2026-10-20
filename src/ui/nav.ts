/**
 * Router state shared by screens and the session controller.
 *
 * The actual `showScreen()` implementation lives in `ui/router.ts` (phase 5).
 * Keeping the mutable values here lets the session flow read them without
 * importing a screen or the router.
 */

import type { ScreenName, ShowScreenOptions } from '../types';

let currentScreen: ScreenName = 'home';
let currentDeckId: string | null = null;
const navStack: ScreenName[] = [];

/**
 * The router registers itself here. Screens call `navigate()`/`goBack()`
 * instead of importing `ui/router.ts` back, which keeps the dependency
 * direction router → screens while still letting every screen navigate.
 */
export type ScreenNavigator = (name: ScreenName, opts?: ShowScreenOptions) => void;

let navigator: ScreenNavigator | null = null;
let backHandler: (() => void) | null = null;

export function registerNavigator(show: ScreenNavigator, back: () => void): void {
  navigator = show;
  backHandler = back;
}

export function navigate(name: ScreenName, opts?: ShowScreenOptions): void {
  if (!navigator) throw new Error('The screen router has not been registered.');
  navigator(name, opts);
}

export function goBack(): void {
  if (!backHandler) throw new Error('The screen router has not been registered.');
  backHandler();
}

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
