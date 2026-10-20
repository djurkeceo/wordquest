import { describe, expect, it } from 'vitest';
import { parseWordList } from './parseWordList';
import { SAMPLE_TEXT } from './sample';

describe('parseWordList', () => {
  it('accepts every legacy separator, strongest first', () => {
    const { pairs, errors } = parseWordList([
      'Haus\tkuća',
      'Hund = pas',
      'Katze= mačka',
      'Vogel — ptica',
      'Fisch – riba',
      'Brot - hleb',
      'Milch : mleko',
      'Wasser ; voda',
      'Apfel, jabuka'
    ].join('\n'));

    expect(errors).toEqual([]);
    expect(pairs.map(p => p.f)).toEqual([
      'Haus', 'Hund', 'Katze', 'Vogel', 'Fisch', 'Brot', 'Milch', 'Wasser', 'Apfel'
    ]);
    expect(pairs.map(p => p.n)).toEqual([
      ['kuća'], ['pas'], ['mačka'], ['ptica'], ['riba'], ['hleb'], ['mleko'], ['voda'], ['jabuka']
    ]);
  });

  it('does not split hyphenated words, and uses the first usable separator', () => {
    const { pairs } = parseWordList([
      'well-known - dobro poznato',
      'a = b = c',
      'x: y; z'
    ].join('\n'));

    expect(pairs[0]).toMatchObject({ f: 'well-known', n: ['dobro poznato'], line: 1 });
    // The second "=" stays on the right side; it is not a translation separator.
    expect(pairs[1]).toMatchObject({ f: 'a', n: ['b = c'], line: 2 });
    // A stronger separator wins over the semicolon, which then separates n.
    expect(pairs[2]).toMatchObject({ f: 'x', n: ['y', 'z'], line: 3 });
  });

  it('keeps comma-separated translations only after a stronger separator', () => {
    const { pairs } = parseWordList([
      'Haus - kuća, dom',
      'Hund, kuća, dom',
      'Katze - kuća; dom / stan',
      'Vogel - kuća, kuća'
    ].join('\n'));

    expect(pairs[0].n).toEqual(['kuća', 'dom']);
    // A comma-separated line has exactly one native side, commas included.
    expect(pairs[1].n).toEqual(['kuća, dom']);
    expect(pairs[2].n).toEqual(['kuća', 'dom', 'stan']);
    expect(pairs[3].n).toEqual(['kuća']);
  });

  it('merges duplicate foreign words case- and diacritic-insensitively', () => {
    const { pairs } = parseWordList([
      'Haus - kuća',
      'haus - kuca, dom',
      'HAUS - dom, stan'
    ].join('\n'));

    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({ f: 'Haus', n: ['kuća', 'dom', 'stan'], line: 1 });
  });

  it('strips BOM, normalises CRLF and ignores the three comment styles', () => {
    const { pairs, errors } = parseWordList(
      '\uFEFF# hash\r\n// slash\r\n;; semicolon\r\n\r\nHaus - kuća\r\nHund - pas'
    );

    expect(errors).toEqual([]);
    expect(pairs.map(p => p.f)).toEqual(['Haus', 'Hund']);
    expect(pairs.map(p => p.line)).toEqual([5, 6]);
  });

  it('reports every malformed line with its original line number', () => {
    const { pairs, errors } = parseWordList([
      'Haus - kuća',
      'this line has no separator',
      '123 - broj',
      'word = ,',
      'Hund - pas'
    ].join('\n'));

    expect(pairs.map(p => p.f)).toEqual(['Haus', 'Hund']);
    expect(errors).toEqual([
      { line: 2, text: 'this line has no separator', reason: 'no separator' },
      { line: 3, text: '123 - broj', reason: 'no letters' },
      { line: 4, text: 'word = ,', reason: 'empty side' }
    ]);
  });

  it('handles an absent input without throwing', () => {
    expect(parseWordList(null)).toEqual({ pairs: [], errors: [] });
    expect(parseWordList(undefined)).toEqual({ pairs: [], errors: [] });
  });

  it('parses the bundled 40-pair sample', () => {
    const { pairs, errors } = parseWordList(SAMPLE_TEXT);
    expect(errors).toEqual([]);
    expect(pairs).toHaveLength(40);
    expect(pairs[0]).toMatchObject({ f: 'das Haus', n: ['kuća'] });
    expect(pairs[4]).toMatchObject({ f: 'das Brot', n: ['hleb', 'kruh'] });
    expect(pairs[39]).toMatchObject({ f: 'das Herz', n: ['srce'] });
  });
});
