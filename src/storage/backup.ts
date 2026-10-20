/**
 * JSON backup export/import and the "Reset all progress" data operation.
 *
 * These functions only touch state and storage. Theme/i18n refreshes, toasts
 * and navigation stay in the UI caller, matching the single-file app.
 */

import type { AppState } from '../types';
import { dayKey } from '../util/core';
import { defaultState, migrate } from './migration';
import { getState, save, setState } from './state';

/**
 * Browser download helper. It lives here because backup export is its first
 * caller; the sample and mnemonic downloads reuse it through `ui/dom.ts`.
 */
export function downloadFile(filename: string, content: string, mime?: string): void {
  const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
}

export function exportBackup(): void {
  downloadFile(
    'wordquest-backup-' + dayKey() + '.json',
    JSON.stringify(getState(), null, 2),
    'application/json'
  );
}

/** Validate and migrate backup JSON. Throws when the shape is not a backup. */
export function parseBackup(text: string): AppState {
  const data: unknown = JSON.parse(text);
  if (!data || typeof data !== 'object' || !Array.isArray((data as { decks?: unknown }).decks)) {
    throw new Error('bad shape');
  }
  return migrate(data as Record<string, unknown>);
}

/** Read a picked file as UTF-8 and resolve to migrated state. */
export function readBackupFile(file: File): Promise<AppState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try { resolve(parseBackup(String(reader.result || ''))); }
      catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsText(file, 'UTF-8');
  });
}

/** Install imported state and persist it immediately. */
export function applyBackup(state: AppState): void {
  setState(state);
  save(true);
}

/** Wipe decks and progress but keep the current settings object. */
export function resetProgress(): void {
  const settings = getState().settings;
  const next = defaultState();
  next.settings = settings;
  setState(next);
  save(true);
}
