/**
 * Ready-made packs UI: the card grid on Home and the preview modal.
 *
 * Pack text is loaded lazily on first render of the section; word counts come
 * from parsing those texts. Search and the category chips only filter the
 * in-memory list, so they stay instant after the first load.
 */

import type { LoadedPreset, PresetCategory } from '../types';
import { checkAchievements } from '../gamification/achievements';
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

let loaded: LoadedPreset[] | null = null;
let loadingPromise: Promise<void> | null = null;
let query = '';
let category: CategoryFilter = 'all';
let preview: LoadedPreset | null = null;
let lastFocused: HTMLElement | null = null;

function uiLang(): string {
  return getState().settings.uiLang || 'en';
}

function byId(id: string): LoadedPreset | undefined {
  return loaded?.find(entry => entry.meta.id === id);
}

/* --------------------------------------------------------------- section -- */

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
  if (!loadingPromise) {
    loadingPromise = loadAllPresets().then(result => {
      loaded = result;
      $('#presetLoading')?.classList.add('hidden');
      renderChips();
      renderGrid();
    });
  }
}

/** Category chips, limited to categories that actually exist. */
function renderChips(): void {
  const host = $('#presetChips');
  if (!host || !loaded) return;
  const present = CATEGORY_ORDER.filter(cat =>
    loaded!.some(entry => entry.meta.category === cat));
  const mkChip = (value: CategoryFilter, label: string): string =>
    `<button class="chip${category === value ? ' is-on' : ''}" data-cat="${value}" role="tab" aria-selected="${category === value ? 'true' : 'false'}">${esc(label)}</button>`;
  host.innerHTML = mkChip('all', t('preset.category.all')) +
    present.map(cat => mkChip(cat, t(categoryLabelKey(cat)))).join('');
}

/** Does one pack match the current search text? */
function matches(entry: LoadedPreset): boolean {
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
  for (const entry of visible) {
    const card = h(`<button class="packcard" data-preset="${esc(entry.meta.id)}">
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
    grid.appendChild(card);
  }
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

  $('#presetChips')?.addEventListener('click', e => {
    const btn = (e.target as Element).closest<HTMLElement>('[data-cat]');
    if (!btn) return;
    category = (btn.getAttribute('data-cat') || 'all') as CategoryFilter;
    renderChips();
    renderGrid();
  });

  $('#presetGrid')?.addEventListener('click', e => {
    const btn = (e.target as Element).closest<HTMLElement>('[data-preset]');
    if (!btn) return;
    void openPresetPreview(btn.getAttribute('data-preset') || '');
  });

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
