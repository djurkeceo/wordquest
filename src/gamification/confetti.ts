/**
 * Confetti canvas. Physics, colours, DPR scaling and the reduced-motion guard
 * are copied from the single-file app.
 */

import type { ParticleOptions } from '../types';
import { getState } from '../storage/state';
import { sample } from '../util/core';
import { $ } from '../ui/dom';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  color: string;
  life: number;
  decay: number;
}

const canvas = $<HTMLCanvasElement>('#fxcanvas');
const ctx2d = canvas ? canvas.getContext('2d') : null;
let parts: Particle[] = [];
let raf: number | null = null;
const COLORS = ['#6C4BF6', '#00C2A8', '#FFB020', '#FF4D6D', '#22C55E', '#8B70FF'];

function size(): void {
  if (!canvas || !ctx2d) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
}
size();
window.addEventListener('resize', size, { passive: true });

function reduced(): boolean {
  return getState().settings.calmMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function burst(count: number, opts?: ParticleOptions): void {
  if (reduced() || !canvas || !ctx2d) return;
  const o = opts || {};
  const originX = o.x == null ? window.innerWidth / 2 : o.x;
  const originY = o.y == null ? window.innerHeight * 0.35 : o.y;
  for (let i = 0; i < count; i++) {
    const angle = (o.angle == null ? -Math.PI / 2 : o.angle) + (Math.random() - 0.5) * (o.spread || Math.PI);
    const speed = 4 + Math.random() * (o.power || 9);
    parts.push({
      x: originX, y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      g: 0.18 + Math.random() * 0.12,
      w: 4 + Math.random() * 7,
      h: 6 + Math.random() * 9,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: sample(COLORS),
      life: 1,
      decay: 0.006 + Math.random() * 0.006
    });
  }
  if (!raf) loop();
}

function loop(): void {
  if (!canvas || !ctx2d) return;
  raf = requestAnimationFrame(loop);
  ctx2d.clearRect(0, 0, window.innerWidth, window.innerHeight);
  parts = parts.filter(p => p.life > 0 && p.y < window.innerHeight + 60);
  for (const p of parts) {
    p.vy += p.g;
    p.vx *= 0.995;
    p.x += p.vx; p.y += p.vy;
    p.rot += p.vr;
    p.life -= p.decay;
    ctx2d.save();
    ctx2d.globalAlpha = Math.max(0, p.life);
    ctx2d.translate(p.x, p.y);
    ctx2d.rotate(p.rot);
    ctx2d.fillStyle = p.color;
    ctx2d.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx2d.restore();
  }
  if (!parts.length) {
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null;
    ctx2d.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

export function clear(): void {
  parts = [];
  if (raf !== null) {
    cancelAnimationFrame(raf);
    raf = null;
  }
  if (canvas && ctx2d) ctx2d.clearRect(0, 0, window.innerWidth, window.innerHeight);
}
