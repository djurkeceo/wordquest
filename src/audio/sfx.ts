/**
 * Web Audio sound effects. Frequencies, envelopes and the lazy AudioContext
 * are copied from the single-file app; audio is always optional.
 */

import type { SfxName } from '../types';
import { getState } from '../storage/state';

let ctx: AudioContext | null = null;

/** Lazily create the AudioContext (must follow a user gesture). */
function context(): AudioContext | null {
  if (!getState().settings.sound) return null;
  try {
    if (!ctx) {
      // Safari exposes the constructor under a legacy name.
      const legacy = window as Window & { webkitAudioContext?: typeof AudioContext };
      const AC = window.AudioContext || legacy.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** One shaped tone. */
function tone(freq: number, start: number, dur: number, type?: OscillatorType, gain?: number): void {
  const c = context();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(gain == null ? 0.12 : gain, c.currentTime + start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + dur + 0.02);
}

const SFX: Record<SfxName, () => void> = {
  correct() { tone(660, 0, .12, 'triangle', .1); tone(880, .08, .16, 'triangle', .09); },
  wrong()   { tone(190, 0, .18, 'sawtooth', .06); tone(150, .1, .24, 'sawtooth', .05); },
  flip()    { tone(520, 0, .05, 'sine', .05); },
  tap()     { tone(440, 0, .04, 'sine', .04); },
  combo()   { [523, 659, 784].forEach((f, i) => tone(f, i * .05, .1, 'square', .05)); },
  win()     { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * .09, .22, 'triangle', .1)); },
  lose()    { [392, 330, 262].forEach((f, i) => tone(f, i * .11, .2, 'triangle', .08)); },
  hint()    { tone(760, 0, .06, 'sine', .05); tone(980, .05, .08, 'sine', .04); }
};

export function play(name: SfxName): void {
  if (!getState().settings.sound) return;
  try { (SFX[name] || SFX.tap)(); } catch { /* audio is optional */ }
}
