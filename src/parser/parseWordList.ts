/**
 * Parse a pasted/uploaded word list into pairs and line-level errors.
 *
 * Accepted shapes (one pair per line):
 *   house - kuća              (spaced hyphen, en/em dash, equals, colon, semicolon)
 *   house\tkuća               (tab)
 *   house, kuća               (comma — only when no stronger separator exists)
 *   house - kuća, dom         (multiple translations, comma-separated)
 *   # comment                 (ignored; also // and ;;)
 *
 * Duplicate foreign words are merged, keeping every distinct translation. The
 * merge key is `normKey()`, so case and diacritics do not create duplicates.
 */

import type { ParseError, ParseErrorReason, ParsedPair, ParseResult, SeparatorName } from '../types';
import { normKey } from '../language/normalize';
import { SEPARATORS } from './separators';

interface SplitLine {
  left: string;
  right: string;
  name: SeparatorName;
}

/**
 * Parse raw text into `{ pairs, errors }`.
 * `pairs` keeps the original spelling and the line where it was first seen.
 * `errors` keeps the trimmed line and a stable reason code.
 */
export function parseWordList(raw: unknown): ParseResult {
  const text = String(raw || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  const pairs: ParsedPair[] = [];
  const errors: ParseError[] = [];
  const byKey = new Map<string, ParsedPair>();

  lines.forEach((original, idx) => {
    const lineNo = idx + 1;
    const line = original.trim();
    if (!line) return;
    // Comments: #, //, ;  (but a lone ";"-separated pair is still parsed below)
    if (/^#/.test(line) || /^\/\//.test(line) || /^;;/.test(line)) return;

    // Find the first usable separator.
    let split: SplitLine | null = null;
    for (const sep of SEPARATORS) {
      const m = sep.re.exec(line);
      if (m && m.index > 0) {
        const left = line.slice(0, m.index).trim();
        const right = line.slice(m.index + m[0].length).trim();
        if (left && right) {
          split = { left, right, name: sep.name };
          break;
        }
      }
    }
    if (!split) {
      const reason: ParseErrorReason = 'no separator';
      errors.push({ line: lineNo, text: line, reason });
      return;
    }
    const f = split.left.replace(/\s+/g, ' ').trim();
    // Right side: split into translations. Commas only mean "more translations"
    // when the line itself was separated by something stronger than a comma.
    let natives: string[];
    if (split.name === 'comma') {
      natives = [split.right.trim()];
    } else {
      natives = split.right.split(/\s*[,;]\s*|\s+\/\s+/).map(s => s.trim()).filter(Boolean);
    }
    natives = Array.from(new Set(natives));
    if (!f || !natives.length) {
      const reason: ParseErrorReason = 'empty side';
      errors.push({ line: lineNo, text: line, reason });
      return;
    }
    // Sanity check: a "pair" that is only punctuation or numbers is malformed.
    if (!/[A-Za-zÀ-ÖØ-öø-ÿ\u0400-\u04FF\u0370-\u03FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/.test(f)) {
      const reason: ParseErrorReason = 'no letters';
      errors.push({ line: lineNo, text: line, reason });
      return;
    }

    const key = normKey(f);
    const existing = byKey.get(key);
    if (existing) {
      natives.forEach(n => {
        if (!existing.n.some(x => normKey(x) === normKey(n))) existing.n.push(n);
      });
    } else {
      const pair: ParsedPair = { f, n: natives, line: lineNo };
      byKey.set(key, pair);
      pairs.push(pair);
    }
  });

  return { pairs, errors };
}
