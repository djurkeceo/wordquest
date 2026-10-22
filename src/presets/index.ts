/**
 * Registry of the ready-made packs.
 *
 * Adding a pack means adding one `.txt` under `data/` and one entry here.
 * `load()` is a Vite `?raw` dynamic import, so neither the pack text nor its
 * word count is in the initial bundle: the cards render first, then each file
 * is fetched and parsed. `wordCount` is therefore computed, never hardcoded.
 *
 * German and English starter lists keep the 300-word count; themed packs are
 * deliberately 40-80 pairs so they are quick to add or merge.
 */

import type {
  LoadedPreset,
  PresetCategory,
  PresetMeta,
  PresetText
} from '../types';
import { parseWordList } from '../parser/parseWordList';

/** Chip order in the packs section. */
export const CATEGORY_ORDER: readonly PresetCategory[] = [
  'top', 'food', 'travel', 'home', 'health', 'nature', 'work', 'city',
  'feelings', 'verbs', 'phrases'
];

/** i18n key for a category chip label. */
export function categoryLabelKey(category: PresetCategory): string {
  return 'preset.category.' + category;
}

function text(en: string, sr: string): PresetText {
  return { en, sr };
}

export const PRESETS: readonly PresetMeta[] = [
  {
    id: 'de-sr-top300',
    title: text('German top 300', 'Nemački: 300 najčešćih'),
    description: text('The 300 most useful everyday German words.', '300 najkorisnijih nemačkih reči za svakodnevni govor.'),
    foreignLang: 'de',
    nativeLang: 'sr',
    category: 'top',
    level: 'A1',
    load: () => import('./data/de-sr-top300.txt?raw')
  },
  {
    id: 'de-sr-food',
    title: text('Food & drink', 'Hrana i piće'),
    description: text('Shopping, cooking and ordering food.', 'Kupovina, kuvanje i naručivanje hrane.'),
    foreignLang: 'de',
    nativeLang: 'sr',
    category: 'food',
    level: 'A1',
    load: () => import('./data/de-sr-food.txt?raw')
  },
  {
    id: 'de-sr-travel',
    title: text('Travel & transport', 'Putovanje i prevoz'),
    description: text('Tickets, directions and holidays.', 'Karte, snalaženje i odmor.'),
    foreignLang: 'de',
    nativeLang: 'sr',
    category: 'travel',
    level: 'A2',
    load: () => import('./data/de-sr-travel.txt?raw')
  },
  {
    id: 'de-sr-home',
    title: text('Home & furniture', 'Kuća i nameštaj'),
    description: text('Rooms, furniture and everyday objects.', 'Sobe, nameštaj i predmeti za svaki dan.'),
    foreignLang: 'de',
    nativeLang: 'sr',
    category: 'home',
    level: 'A1',
    load: () => import('./data/de-sr-home.txt?raw')
  },
  {
    id: 'de-sr-health',
    title: text('Body & health', 'Telo i zdravlje'),
    description: text('Body parts, illness and the doctor.', 'Delovi tela, bolesti i lekar.'),
    foreignLang: 'de',
    nativeLang: 'sr',
    category: 'health',
    level: 'A2',
    load: () => import('./data/de-sr-health.txt?raw')
  },
  {
    id: 'de-sr-nature',
    title: text('Nature & animals', 'Priroda i životinje'),
    description: text('Weather, plants, animals and landscapes.', 'Vreme, biljke, životinje i predeli.'),
    foreignLang: 'de',
    nativeLang: 'sr',
    category: 'nature',
    level: 'A1',
    load: () => import('./data/de-sr-nature.txt?raw')
  },
  {
    id: 'de-sr-work',
    title: text('Work & school', 'Posao i škola'),
    description: text('Jobs, the office and the classroom.', 'Zanimanja, kancelarija i učionica.'),
    foreignLang: 'de',
    nativeLang: 'sr',
    category: 'work',
    level: 'A2',
    load: () => import('./data/de-sr-work.txt?raw')
  },
  {
    id: 'de-sr-city',
    title: text('City & shopping', 'Grad i kupovina'),
    description: text('Places in town, shops and services.', 'Mesta u gradu, prodavnice i usluge.'),
    foreignLang: 'de',
    nativeLang: 'sr',
    category: 'city',
    level: 'A2',
    load: () => import('./data/de-sr-city.txt?raw')
  },
  {
    id: 'de-sr-feelings',
    title: text('Feelings & character', 'Osećanja i karakter'),
    description: text('Moods, emotions and describing people.', 'Raspoloženja, emocije i opisivanje ljudi.'),
    foreignLang: 'de',
    nativeLang: 'sr',
    category: 'feelings',
    level: 'B1',
    load: () => import('./data/de-sr-feelings.txt?raw')
  },
  {
    id: 'de-sr-verbs',
    title: text('Everyday verbs', 'Svakodnevni glagoli'),
    description: text('The German verbs you use all day long.', 'Nemački glagoli koje koristiš svakog dana.'),
    foreignLang: 'de',
    nativeLang: 'sr',
    category: 'verbs',
    level: 'A2',
    load: () => import('./data/de-sr-verbs.txt?raw')
  },
  {
    id: 'en-sr-top300',
    title: text('English top 300', 'Engleski: 300 najčešćih'),
    description: text('The 300 most useful everyday English words.', '300 najkorisnijih engleskih reči za svakodnevni govor.'),
    foreignLang: 'en',
    nativeLang: 'sr',
    category: 'top',
    level: 'A1',
    load: () => import('./data/en-sr-top300.txt?raw')
  },
  {
    id: 'en-sr-phrases',
    title: text('Everyday phrases', 'Svakodnevne fraze'),
    description: text('Greetings, polite phrases and small talk.', 'Pozdravi, učtive fraze i mali razgovori.'),
    foreignLang: 'en',
    nativeLang: 'sr',
    category: 'phrases',
    level: 'A1',
    load: () => import('./data/en-sr-phrases.txt?raw')
  },
  {
    id: 'en-sr-verbs',
    title: text('Everyday verbs', 'Svakodnevni glagoli'),
    description: text('The English verbs you use all day long.', 'Engleski glagoli koje koristiš svakog dana.'),
    foreignLang: 'en',
    nativeLang: 'sr',
    category: 'verbs',
    level: 'A1',
    load: () => import('./data/en-sr-verbs.txt?raw')
  },
  {
    id: 'en-sr-food',
    title: text('English food & drink', 'Engleski: hrana i piće'),
    description: text('Shopping, cooking and ordering food.', 'Kupovina, kuvanje i naručivanje hrane.'),
    foreignLang: 'en',
    nativeLang: 'sr',
    category: 'food',
    level: 'A1',
    load: () => import('./data/en-sr-food.txt?raw')
  },
  {
    id: 'en-sr-travel',
    title: text('English travel & transport', 'Engleski: putovanje i prevoz'),
    description: text('Tickets, directions and holidays.', 'Karte, snalaženje i odmor.'),
    foreignLang: 'en',
    nativeLang: 'sr',
    category: 'travel',
    level: 'A2',
    load: () => import('./data/en-sr-travel.txt?raw')
  },
  {
    id: 'en-sr-home',
    title: text('English home & furniture', 'Engleski: kuća i nameštaj'),
    description: text('Rooms, furniture and everyday objects.', 'Sobe, nameštaj i predmeti za svaki dan.'),
    foreignLang: 'en',
    nativeLang: 'sr',
    category: 'home',
    level: 'A1',
    load: () => import('./data/en-sr-home.txt?raw')
  },
  {
    id: 'it-sr-food',
    title: text('Italian food & drink', 'Italijanski: hrana i piće'),
    description: text('Shopping, cooking and ordering food.', 'Kupovina, kuvanje i naručivanje hrane.'),
    foreignLang: 'it',
    nativeLang: 'sr',
    category: 'food',
    level: 'A1',
    load: () => import('./data/it-sr-food.txt?raw')
  },
  {
    id: 'it-sr-travel',
    title: text('Italian travel & transport', 'Italijanski: putovanje i prevoz'),
    description: text('Tickets, directions and holidays.', 'Karte, snalaženje i odmor.'),
    foreignLang: 'it',
    nativeLang: 'sr',
    category: 'travel',
    level: 'A2',
    load: () => import('./data/it-sr-travel.txt?raw')
  },
  {
    id: 'it-sr-home',
    title: text('Italian home & furniture', 'Italijanski: kuća i nameštaj'),
    description: text('Rooms, furniture and everyday objects.', 'Sobe, nameštaj i predmeti za svaki dan.'),
    foreignLang: 'it',
    nativeLang: 'sr',
    category: 'home',
    level: 'A1',
    load: () => import('./data/it-sr-home.txt?raw')
  },
  {
    id: 'it-sr-verbs',
    title: text('Italian everyday verbs', 'Italijanski: svakodnevni glagoli'),
    description: text('The Italian verbs you use all day long.', 'Italijanski glagoli koje koristiš svakog dana.'),
    foreignLang: 'it',
    nativeLang: 'sr',
    category: 'verbs',
    level: 'A2',
    load: () => import('./data/it-sr-verbs.txt?raw')
  },
  {
    id: 'it-sr-phrases',
    title: text('Italian everyday phrases', 'Italijanski: svakodnevne fraze'),
    description: text('Greetings, polite phrases and small talk.', 'Pozdravi, učtive fraze i mali razgovori.'),
    foreignLang: 'it',
    nativeLang: 'sr',
    category: 'phrases',
    level: 'A1',
    load: () => import('./data/it-sr-phrases.txt?raw')
  },
  {
    id: 'es-sr-food',
    title: text('Spanish food & drink', 'Španski: hrana i piće'),
    description: text('Shopping, cooking and ordering food.', 'Kupovina, kuvanje i naručivanje hrane.'),
    foreignLang: 'es',
    nativeLang: 'sr',
    category: 'food',
    level: 'A1',
    load: () => import('./data/es-sr-food.txt?raw')
  },
  {
    id: 'es-sr-travel',
    title: text('Spanish travel & transport', 'Španski: putovanje i prevoz'),
    description: text('Tickets, directions and holidays.', 'Karte, snalaženje i odmor.'),
    foreignLang: 'es',
    nativeLang: 'sr',
    category: 'travel',
    level: 'A2',
    load: () => import('./data/es-sr-travel.txt?raw')
  },
  {
    id: 'es-sr-home',
    title: text('Spanish home & furniture', 'Španski: kuća i nameštaj'),
    description: text('Rooms, furniture and everyday objects.', 'Sobe, nameštaj i predmeti za svaki dan.'),
    foreignLang: 'es',
    nativeLang: 'sr',
    category: 'home',
    level: 'A1',
    load: () => import('./data/es-sr-home.txt?raw')
  },
  {
    id: 'es-sr-verbs',
    title: text('Spanish everyday verbs', 'Španski: svakodnevni glagoli'),
    description: text('The Spanish verbs you use all day long.', 'Španski glagoli koje koristiš svakog dana.'),
    foreignLang: 'es',
    nativeLang: 'sr',
    category: 'verbs',
    level: 'A2',
    load: () => import('./data/es-sr-verbs.txt?raw')
  },
  {
    id: 'es-sr-phrases',
    title: text('Spanish everyday phrases', 'Španski: svakodnevne fraze'),
    description: text('Greetings, polite phrases and small talk.', 'Pozdravi, učtive fraze i mali razgovori.'),
    foreignLang: 'es',
    nativeLang: 'sr',
    category: 'phrases',
    level: 'A1',
    load: () => import('./data/es-sr-phrases.txt?raw')
  },
  {
    id: 'fr-sr-food',
    title: text('French food & drink', 'Francuski: hrana i piće'),
    description: text('Shopping, cooking and ordering food.', 'Kupovina, kuvanje i naručivanje hrane.'),
    foreignLang: 'fr',
    nativeLang: 'sr',
    category: 'food',
    level: 'A1',
    load: () => import('./data/fr-sr-food.txt?raw')
  },
  {
    id: 'fr-sr-travel',
    title: text('French travel & transport', 'Francuski: putovanje i prevoz'),
    description: text('Tickets, directions and holidays.', 'Karte, snalaženje i odmor.'),
    foreignLang: 'fr',
    nativeLang: 'sr',
    category: 'travel',
    level: 'A2',
    load: () => import('./data/fr-sr-travel.txt?raw')
  },
  {
    id: 'fr-sr-home',
    title: text('French home & furniture', 'Francuski: kuća i nameštaj'),
    description: text('Rooms, furniture and everyday objects.', 'Sobe, nameštaj i predmeti za svaki dan.'),
    foreignLang: 'fr',
    nativeLang: 'sr',
    category: 'home',
    level: 'A1',
    load: () => import('./data/fr-sr-home.txt?raw')
  },
  {
    id: 'fr-sr-verbs',
    title: text('French everyday verbs', 'Francuski: svakodnevni glagoli'),
    description: text('The French verbs you use all day long.', 'Francuski glagoli koje koristiš svakog dana.'),
    foreignLang: 'fr',
    nativeLang: 'sr',
    category: 'verbs',
    level: 'A2',
    load: () => import('./data/fr-sr-verbs.txt?raw')
  },
  {
    id: 'fr-sr-phrases',
    title: text('French everyday phrases', 'Francuski: svakodnevne fraze'),
    description: text('Greetings, polite phrases and small talk.', 'Pozdravi, učtive fraze i mali razgovori.'),
    foreignLang: 'fr',
    nativeLang: 'sr',
    category: 'phrases',
    level: 'A1',
    load: () => import('./data/fr-sr-phrases.txt?raw')
  }
];

const cache = new Map<string, LoadedPreset>();

/**
 * Load and parse one pack. The result is cached, so opening the same preview
 * twice neither re-fetches nor re-parses.
 */
export async function loadPreset(meta: PresetMeta): Promise<LoadedPreset> {
  const hit = cache.get(meta.id);
  if (hit) return hit;
  const module = await meta.load();
  const { pairs } = parseWordList(module.default);
  const loaded: LoadedPreset = {
    meta,
    text: module.default,
    pairs,
    wordCount: pairs.length
  };
  cache.set(meta.id, loaded);
  return loaded;
}

/** Load every pack for the card grid. Failures leave that card at zero words. */
export async function loadAllPresets(): Promise<LoadedPreset[]> {
  const results = await Promise.allSettled(PRESETS.map(loadPreset));
  return results.map((result, index) => result.status === 'fulfilled'
    ? result.value
    : { meta: PRESETS[index], text: '', pairs: [], wordCount: 0 });
}

/** Testing hook: drop the parsed-pack cache. */
export function clearPresetCache(): void {
  cache.clear();
}
