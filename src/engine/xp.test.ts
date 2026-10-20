import { describe, expect, it } from 'vitest';
import { levelFromXp, xpForLevel } from './xp';

describe('XP curve', () => {
  it('matches the legacy growth curve', () => {
    expect(xpForLevel(1)).toBe(60);
    expect(xpForLevel(2)).toBe(153);
    expect(xpForLevel(3)).toBe(264);
    expect(xpForLevel(4)).toBe(390);
    expect(xpForLevel(5)).toBe(527);
  });

  it('walks cumulative thresholds and caps at level 99', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(59)).toBe(1);
    expect(levelFromXp(60)).toBe(2);
    expect(levelFromXp(212)).toBe(2);
    expect(levelFromXp(213)).toBe(3);
    expect(levelFromXp(Number.MAX_SAFE_INTEGER)).toBe(99);
    expect(levelFromXp(-100)).toBe(1);
  });
});
