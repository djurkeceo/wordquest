/**
 * XP and level curve.
 *
 * `xpForLevel(n)` is the amount needed to go from level n to n+1. Levels stop
 * at 99. Awarding XP and the level-up toast stay in the UI/session layer so
 * this module remains pure.
 */

/** XP needed to reach a level (simple growing curve). */
export function xpForLevel(level: number): number {
  return Math.round(60 * Math.pow(level, 1.35));
}

export function levelFromXp(xp: number): number {
  let lvl = 1;
  while (lvl < 99 && xp >= xpForLevel(lvl)) {
    xp -= xpForLevel(lvl);
    lvl++;
  }
  return lvl;
}
