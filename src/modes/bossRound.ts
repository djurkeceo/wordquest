/**
 * Boss round. The planning rules live in `startSession()` (trouble words,
 * 6-20 exercises, hearts on); this wrapper gives the deck screen a mode-level
 * entry point and exposes the win threshold used by the end screen.
 */

import type { Deck } from '../types';
import { startSession } from '../ui/sessionFlow';

export const BOSS_WIN_ACCURACY = 60;

export function startBossRound(deck: Deck): void {
  startSession(deck, 'boss');
}

export function isBossWin(accuracy: number): boolean {
  return accuracy >= BOSS_WIN_ACCURACY;
}
