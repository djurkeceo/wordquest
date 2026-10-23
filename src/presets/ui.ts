/**
 * Ready-made packs UI: the card grid on Home and the preview modal.
 *
 * Pack text is loaded lazily on first render of the section; word counts come
 * from parsing those texts. Search and the category chips only filter the
 * in-memory list, so they stay instant after the first load.
 */

import type { LanguageCode, LoadedPreset, PresetCategory } from '../types';
import { checkAchievements } from '../gamification/achievements';
import type { MascotState } from '../gamification/mascot';
import { getMascotState, setState as setMascotState } from '../gamification/mascot';
import { applyI18n, t } from '../i18n';
import { langName } from '../language/names';
import { getState, save } from '../storage/state';
import { debounce } from '../util/core';
import { $, esc, h } from '../ui/dom';
import { getCurrentScreen, navigate } from '../ui/nav';
import { openDeck } from '../ui/screens/deck';
import { toast } from '../ui/toast';
import {
  CATEGORY_ORDER,
  categoryLabelKey,
  loadAllPresets,
  loadPreset,
  PRESETS
} from './index';
import {
  createDeckFromPreset,
  decksForPair,
  mergePresetIntoDeck,
  presetAlreadyAdded,
  presetDescription,
  presetTitle
} from './merge';

type CategoryFilter = PresetCategory | 'all';
type LanguageFilter = LanguageCode | 'all';

/** Preferred chip order; other languages are appended after these. */
const LANGUAGE_ORDER: readonly LanguageCode[] = ['de', 'en', 'it', 'es', 'fr', 'hu'];

let loaded: LoadedPreset[] | null = null;
let loadingPromise: Promise<LoadedPreset[]> | null = null;
let homeLoading = false;
let query = '';
let category: CategoryFilter = 'all';
let language: LanguageFilter = 'all';
let preview: LoadedPreset | null = null;
let lastFocused: HTMLElement | null = null;
let loadingResumeState: MascotState | null = null;

function uiLang(): string {
  return getState().settings.uiLang || 'en';
}

function byId(id: string): LoadedPreset | undefined {
  return loaded?.find(entry => entry.meta.id === id);
}

/* --------------------------------------------------------------- section -- */

/** Shared lazy loader so Home and Add words never fetch the packs twice. */
function ensurePresetsLoaded(): Promise<LoadedPreset[]> {
  if (loaded) return Promise.resolve(loaded);
  if (!loadingPromise) {
    loadingPromise = loadAllPresets().then(result => {
      loaded = result;
      return result;
    });
  }
  return loadingPromise;
}

/** Called by Home on every render. Starts the lazy load on first use. */
export function renderPresetSection(): void {
  if (loaded) {
    renderChips();
    renderGrid();
    return;
  }
  $('#presetLoading')?.classList.remove('hidden');
  $('#presetEmpty')?.classList.add('hidden');
  const grid = $('#presetGrid');
  if (grid) grid.innerHTML = '';
  if (homeLoading) return;
  homeLoading = true;
  // Only borrow an idle fox for the loading pose. If a reaction (celebrate,
  // happy, sad) is playing, leave it alone so its auto-reset is never lost.
  loadingResumeState = getMascotState() === 'idle' ? 'idle' : null;
  if (loadingResumeState) setMascotState('thinking');
  void ensurePresetsLoaded().then(() => {
    homeLoading = false;
    $('#presetLoading')?.classList.add('hidden');
    renderChips();
    renderGrid();
    if (loadingResumeState && getCurrentScreen() === 'home') setMascotState(loadingResumeState);
    loadingResumeState = null;
  });
}

/** Compact pack row shown on the "Add words" screen. */
export function renderImportPacks(): void {
  const grid = $('#importPresetGrid');
  if (!grid) return;
  const paint = (list: LoadedPreset[]): void => {
    grid.innerHTML = '';
    // Show one pack per language so the teaser advertises the full catalogue.
    const seen = new Set<string>();
    const featured: LoadedPreset[] = [];
    for (const entry of list) {
      if (seen.has(entry.meta.foreignLang)) continue;
      seen.add(entry.meta.foreignLang);
      featured.push(entry);
    }
    featured.forEach(entry => grid.appendChild(packCard(entry)));
    $('#importPresetLoading')?.classList.add('hidden');
  };
  if (loaded) { paint(loaded); return; }
  $('#importPresetLoading')?.classList.remove('hidden');
  void ensurePresetsLoaded().then(paint);
}

/** Languages that actually have at least one pack, in a stable order. */
function presentLanguages(): LanguageCode[] {
  if (!loaded) return [];
  const present = new Set(loaded.map(entry => entry.meta.foreignLang));
  const ordered = LANGUAGE_ORDER.filter(code => present.has(code));
  const extra = Array.from(present)
    .filter(code => !LANGUAGE_ORDER.includes(code))
    .sort((a, b) => langName(a, uiLang()).localeCompare(langName(b, uiLang())));
  return ordered.concat(extra);
}

/** Language chips (All + every language with a pack). */
function renderLanguageChips(): void {
  const host = $('#presetLangChips');
  if (!host || !loaded) return;
  const mkChip = (value: LanguageFilter, label: string): string =>
    `<button class="chip${language === value ? ' is-on' : ''}" data-lang="${value}" role="tab" aria-selected="${language === value ? 'true' : 'false'}">${esc(label)}</button>`;
  host.innerHTML = mkChip('all', t('preset.langAll')) +
    presentLanguages().map(code => mkChip(code, langName(code, uiLang()))).join('');
}

/** Language and category chips, limited to combinations that actually exist. */
function renderChips(): void {
  const host = $('#presetChips');
  if (!host || !loaded) return;
  renderLanguageChips();
  const pool = language === 'all'
    ? loaded
    : loaded.filter(entry => entry.meta.foreignLang === language);
  const present = CATEGORY_ORDER.filter(cat =>
    pool.some(entry => entry.meta.category === cat));
  // Switching to a language without the selected subject should not leave an
  // invisible filter active: fall back to "All" for that language.
  if (category !== 'all' && !present.includes(category)) category = 'all';
  const mkChip = (value: CategoryFilter, label: string): string =>
    `<button class="chip${category === value ? ' is-on' : ''}" data-cat="${value}" role="tab" aria-selected="${category === value ? 'true' : 'false'}">${esc(label)}</button>`;
  host.innerHTML = mkChip('all', t('preset.category.all')) +
    present.map(cat => mkChip(cat, t(categoryLabelKey(cat)))).join('');
}

/** Does one pack match the current search text? */
function matches(entry: LoadedPreset): boolean {
  if (language !== 'all' && entry.meta.foreignLang !== language) return false;
  if (category !== 'all' && entry.meta.category !== category) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    presetTitle(entry, uiLang()),
    presetDescription(entry, uiLang()),
    entry.meta.title.en,
    entry.meta.title.sr,
    entry.meta.id,
    entry.meta.level,
    t(categoryLabelKey(entry.meta.category)),
    langName(entry.meta.foreignLang, uiLang()),
    langName(entry.meta.nativeLang, uiLang())
  ].join(' ').toLowerCase();
  return hay.includes(q);
}

function renderGrid(): void {
  const grid = $('#presetGrid');
  if (!grid || !loaded) return;
  const visible = loaded.filter(matches);
  const empty = $('#presetEmpty');
  if (empty) empty.classList.toggle('hidden', visible.length > 0);
  if (!visible.length) {
    grid.innerHTML = '';
    return;
  }
  grid.innerHTML = '';
  for (const entry of visible) grid.appendChild(packCard(entry));
}

/** One pack card, shared by the Home grid and the Add words teaser. */
function packCard(entry: LoadedPreset): HTMLElement {
  return h(`<button class="packcard" data-preset="${esc(entry.meta.id)}">
    <span class="packcard__top">
      <b>${esc(presetTitle(entry, uiLang()))}</b>
      <span class="tag">${esc(entry.meta.level)}</span>
    </span>
    <span class="muted small">${esc(presetDescription(entry, uiLang()))}</span>
    <span class="packcard__meta">
      <span>${esc(langName(entry.meta.foreignLang, uiLang()))} → ${esc(langName(entry.meta.nativeLang, uiLang()))}</span>
      <span>${entry.wordCount} ${esc(t('deck.words'))}</span>
    </span>
    <span class="packcard__foot">
      <span class="tag tag--soft">${esc(t(categoryLabelKey(entry.meta.category)))}</span>
      ${presetAlreadyAdded(entry.meta.id) ? `<span class="tag tag--green">✓ ${esc(t('preset.added'))}</span>` : ''}
    </span>
  </button>`);
}

/* --------------------------------------------------------------- preview -- */

/** Open the preview modal for one pack, loading its text if needed. */
export async function openPresetPreview(id: string): Promise<void> {
  const modal = $('#presetModal');
  if (!modal) return;
  const entry = byId(id) || await loadPreset(PRESETS.find(meta => meta.id === id) || PRESETS[0]);
  const all = loaded || (await loadAllPresets());
  if (!loaded) loaded = all;
  preview = entry;
  lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  renderPreview();
  modal.classList.remove('hidden');
  $('#presetClose')?.focus();
}

/** Fill the modal from `preview`. */
function renderPreview(): void {
  const entry = preview;
  if (!entry) return;
  const title = $('#presetModalTitle');
  if (title) title.textContent = presetTitle(entry, uiLang());
  const desc = $('#presetModalDesc');
  if (desc) desc.textContent = presetDescription(entry, uiLang());
  const pair = $('#presetModalPair');
  if (pair) pair.textContent = `${langName(entry.meta.foreignLang, uiLang())} → ${langName(entry.meta.nativeLang, uiLang())}`;
  const count = $('#presetModalCount');
  if (count) count.textContent = `${entry.wordCount} ${t('deck.words')}`;
  const level = $('#presetModalLevel');
  if (level) level.textContent = entry.meta.level;

  const list = $('#presetPreviewList');
  if (list) {
    list.innerHTML = entry.pairs.slice(0, 10).map(pair2 => `
      <div class="listitem">
        <div class="grow"><b>${esc(pair2.f)}</b><div class="small muted">${esc(pair2.n.join(' / '))}</div></div>
      </div>`).join('');
    list.appendChild(h(`<p class="tiny muted" style="padding:2px 4px 0">${esc(t('preset.more', { n: Math.max(0, entry.wordCount - 10) }))}</p>`));
  }

  const existing = decksForPair(entry.meta.foreignLang, entry.meta.nativeLang);
  const wrap = $('#presetExistingWrap');
  const select = $<HTMLSelectElement>('#presetExistingDeck');
  if (wrap && select) {
    if (existing.length) {
      wrap.classList.remove('hidden');
      select.innerHTML = existing.map(deck =>
        `<option value="${esc(deck.id)}">${esc(deck.name)} · ${deck.words.length} ${esc(t('deck.words'))}</option>`).join('');
    } else {
      wrap.classList.add('hidden');
      select.innerHTML = '';
    }
  }
}

function closePreview(): void {
  $('#presetModal')?.classList.add('hidden');
  preview = null;
  if (lastFocused) lastFocused.focus();
  lastFocused = null;
}

/* ------------------------------------------------------------------ add -- */

/** Mirror the pack's languages onto settings, then save and open the deck. */
function adoptLanguages(entry: LoadedPreset): void {
  const state = getState();
  state.settings.nativeLang = entry.meta.nativeLang;
  if (!state.settings.uiLangSet && entry.meta.nativeLang === 'sr') {
    // The UI has a Serbian catalogue, so a Serbian-native pack may switch to it.
    state.settings.uiLang = 'sr';
    state.settings.uiLangSet = true;
    applyI18n();
  }
}

function addAsNewDeck(): void {
  const entry = preview;
  if (!entry) return;
  const state = getState();
  const baseName = presetTitle(entry, uiLang());
  let name = baseName;
  let n = 2;
  while (state.decks.some(deck => deck.name === name)) {
    name = `${baseName} (${n})`;
    n++;
  }
  const deck = createDeckFromPreset(entry, uiLang());
  deck.name = name;
  state.decks.push(deck);
  adoptLanguages(entry);
  save(true);
  checkAchievements(state);
  closePreview();
  toast(t('preset.addedNew', { n: deck.words.length }));
  openDeck(deck.id);
}

function addToExistingDeck(): void {
  const entry = preview;
  const select = $<HTMLSelectElement>('#presetExistingDeck');
  if (!entry || !select) return;
  const deck = getState().decks.find(item => item.id === select.value);
  if (!deck) return;
  const added = mergePresetIntoDeck(deck, entry);
  adoptLanguages(entry);
  save(true);
  if (!added) {
    toast(t('preset.allThere'));
    return;
  }
  checkAchievements(getState());
  closePreview();
  toast(t('preset.addedExisting', { n: added }));
  openDeck(deck.id);
}

/* ---------------------------------------------------------------- binding -- */

/** Bind the packs controls once, when the shell markup exists. */
export function bindPresets(): void {
  $('#presetSearch')?.addEventListener('input', debounce(e => {
    query = (e.target as HTMLInputElement).value;
    renderGrid();
  }, 120));

  $('#presetLangChips')?.addEventListener('click', e => {
    const btn = (e.target as Element).closest<HTMLElement>('[data-lang]');
    if (!btn) return;
    language = (btn.getAttribute('data-lang') || 'all') as LanguageFilter;
    renderChips();
    renderGrid();
  });

  $('#presetChips')?.addEventListener('click', e => {
    const btn = (e.target as Element).closest<HTMLElement>('[data-cat]');
    if (!btn) return;
    category = (btn.getAttribute('data-cat') || 'all') as CategoryFilter;
    renderChips();
    renderGrid();
  });

  const openFromGrid = (e: Event): void => {
    const btn = (e.target as Element).closest<HTMLElement>('[data-preset]');
    if (!btn) return;
    void openPresetPreview(btn.getAttribute('data-preset') || '');
  };
  $('#presetGrid')?.addEventListener('click', openFromGrid);
  $('#importPresetGrid')?.addEventListener('click', openFromGrid);

  $('#presetAddNew')?.addEventListener('click', addAsNewDeck);
  $('#presetAddExisting')?.addEventListener('click', addToExistingDeck);
  $('#presetClose')?.addEventListener('click', closePreview);
  $('#presetBackdrop')?.addEventListener('click', closePreview);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && preview) {
      e.preventDefault();
      closePreview();
    }
  });

  // Empty-state and import-screen shortcuts: jump to the packs section.
  const jumpToPacks = (): void => {
    if (getCurrentScreen() !== 'home') navigate('home');
    $('#packsSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $<HTMLInputElement>('#presetSearch')?.focus({ preventScroll: true });
  };
  $('#btnBrowsePacks')?.addEventListener('click', jumpToPacks);
  $('#btnPacksFromImport')?.addEventListener('click', jumpToPacks);
}
