/**
 * Text normalisation shared by duplicate detection, emoji lookup, answer
 * checking and Serbian transliteration.
 *
 * These functions are copied from the single-file app. `normKey()` is
 * deliberately more aggressive than `normalizeAnswer()`: it removes every
 * diacritic so "Kuća" and "kuca" merge as duplicates, while answer checking
 * keeps accents unless the user turned strict mode off.
 */

/** Normalised key for duplicate detection (case/diacritic-insensitive). */
export function normKey(s: string): string {
  return String(s).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').trim();
}

/** Serbian Cyrillic -> Latin transliteration for tolerant matching. */
export const SR_CYR_TO_LAT: Readonly<Record<string, string>> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'ђ': 'đ', 'е': 'e',
  'ж': 'ž', 'з': 'z', 'и': 'i', 'ј': 'j', 'к': 'k', 'л': 'l', 'љ': 'lj',
  'м': 'm', 'н': 'n', 'њ': 'nj', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's',
  'т': 't', 'ћ': 'ć', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'č',
  'џ': 'dž', 'ш': 'š'
};

/** Latin -> Cyrillic (digraphs first) so typed Cyrillic can match Latin decks. */
export const SR_LAT_TO_CYR: Readonly<Record<string, string>> = {
  'lj': 'љ', 'nj': 'њ', 'dž': 'џ',
  'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'đ': 'ђ', 'e': 'е',
  'ž': 'ж', 'z': 'з', 'i': 'и', 'j': 'ј', 'k': 'к', 'l': 'л', 'm': 'м',
  'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р', 's': 'с', 't': 'т', 'ć': 'ћ',
  'u': 'у', 'f': 'ф', 'h': 'х', 'c': 'ц', 'č': 'ч', 'š': 'ш'
};

export function toLatin(s: string): string {
  return String(s).toLowerCase().split('').map(ch => SR_CYR_TO_LAT[ch] || ch).join('');
}

export function toCyrillic(s: string): string {
  const low = String(s).toLowerCase();
  let out = '';
  for (let i = 0; i < low.length; i++) {
    const two = low.slice(i, i + 2);
    const digraph = SR_LAT_TO_CYR[two];
    if (digraph) {
      out += digraph;
      i++;
      continue;
    }
    out += SR_LAT_TO_CYR[low[i]] || low[i];
  }
  return out;
}

/**
 * Answer normalisation: lowercase, trim, remove punctuation and collapse
 * whitespace. In loose mode it also strips accents, folds đ -> d and ß -> ss.
 * The Serbian script conversion happens before this in `checkTyped()`.
 */
export function normalizeAnswer(s: string, strict?: boolean): string {
  let out = String(s || '').toLowerCase().trim()
    .replace(/[.,!?¡¿;:"'`´’‘“”()\[\]{}]/g, '')
    .replace(/\s+/g, ' ');
  if (!strict) {
    out = out.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Serbian/Croatian/Bosnian Latin-Cyrillic equivalence is handled by
    // transliteration before this point; here we also fold đ/đ and ß/ss.
    out = out.replace(/đ/g, 'd').replace(/ß/g, 'ss');
  }
  return out;
}
