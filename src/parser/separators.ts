/**
 * Line separators, strongest first.
 *
 * Hyphen/dash separators must be surrounded by whitespace so hyphenated words
 * such as "well-known" are not split accidentally. A comma is only used when
 * no stronger separator exists on the line.
 */

import type { SeparatorRule } from '../types';

export const SEPARATORS: readonly SeparatorRule[] = [
  { re: /\t+/,            name: 'tab' },
  { re: /\s+[=]\s*/,      name: '=' },
  { re: /\s*[=]\s+/,      name: '=' },
  { re: /\s*[—–]\s+/,     name: 'dash' },
  { re: /\s+[—–]\s*/,     name: 'dash' },
  { re: /\s+[-]\s+/,      name: 'hyphen' },
  { re: /\s*[:;]\s+/,     name: 'colon' },
  { re: /\s+[:;]\s*/,     name: 'colon' },
  { re: /,\s*/,           name: 'comma' }
];
