/**
 * Shared state for the import → language check → preview flow.
 *
 * The three screens are separate modules, but they edit one pending list and
 * one guessed language pair. Keeping that state here avoids screens importing
 * each other; `beginPreview()` is the single entry point from Home, paste,
 * drag-and-drop and the sample.
 */

import type { LanguageCode, PendingImport } from '../types';
import { t } from '../i18n';
import { detectPair } from '../language/detect';
import { parseWordList } from '../parser/parseWordList';
import { getCurrentScreen, navigate } from './nav';
import { toast } from './toast';

let pendingImport: PendingImport | null = null;

export function getPendingImport(): PendingImport | null {
  return pendingImport;
}

export function setPendingImport(next: PendingImport | null): void {
  pendingImport = next;
}

/** A new import replaces the previous one instead of stacking screens. */
export function beginPreview(text: string, suggestedName: string): void {
  const { pairs, errors } = parseWordList(text);
  if (!pairs.length) {
    toast(t('preview.noWords'));
    return;
  }
  const foreignText = pairs.map(p => p.f).join(' ');
  const nativeText = pairs.map(p => p.n.join(' ')).join(' ');
  const det = detectPair(foreignText, nativeText);
  pendingImport = {
    pairs: pairs.map(p => ({ f: p.f, n: p.n.slice(), emoji: null })),
    errors,
    foreign: det.foreign as LanguageCode,
    native: det.native as LanguageCode,
    confidence: Math.min(det.a.confidence, det.b.confidence),
    suggestedName: suggestedName || '',
    nameTouched: false
  };
  const current = getCurrentScreen();
  const replacing = current === 'lang' || current === 'preview';
  navigate('lang', replacing ? { replace: true } : undefined);
}
