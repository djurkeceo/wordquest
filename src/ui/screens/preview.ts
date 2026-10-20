/**
 * Editable preview of the parsed word list.
 *
 * Rows can be edited and deleted; the deck name and language pair stay visible
 * until "Save deck". Parse errors are reported separately (first 30).
 */

import { t, I18N } from '../../i18n';
import { normalizeDeck } from '../../storage/migration';
import { getState, save } from '../../storage/state';
import { checkAchievements } from '../../gamification/achievements';
import { debounce, uid } from '../../util/core';
import { $, $$, esc } from '../dom';
import { getPendingImport, setPendingImport } from '../importFlow';
import { getNavStack, goBack, navigate } from '../nav';
import { toast } from '../toast';
import { langName } from '../../language/names';
import { openDeck } from './deck';

/** Render the editable parsed-pairs table. */
export function renderPreviewTable(): void {
  const pi = getPendingImport();
  if (!pi) return;
  const uiLang = getState().settings.uiLang || 'en';
  const pair = $('#prevLangPair');
  if (pair) pair.textContent = `${langName(pi.foreign, uiLang)} → ${langName(pi.native, uiLang)}`;
  const body = $<HTMLTableSectionElement>('#previewBody');
  if (!body) return;
  body.innerHTML = pi.pairs.map((p, i) => `
    <tr data-i="${i}">
      <td><input type="text" value="${esc(p.f)}" data-field="f" aria-label="Foreign word ${i + 1}"></td>
      <td><input type="text" value="${esc(p.n.join(', '))}" data-field="n" aria-label="Translations ${i + 1}"></td>
      <td><button class="del" data-del="${i}" aria-label="Delete row ${i + 1}">✕</button></td>
    </tr>`).join('');
  const count = $('#pairCount');
  if (count) count.textContent = String(pi.pairs.length);

  $$<HTMLInputElement>('input[data-field]', body).forEach(inp => {
    inp.addEventListener('input', debounce(() => {
      const tr = inp.closest('tr');
      if (!tr) return;
      const i = Number(tr.getAttribute('data-i'));
      const field = inp.getAttribute('data-field');
      const current = getPendingImport();
      if (!current || !current.pairs[i]) return;
      if (field === 'f') current.pairs[i].f = inp.value.trim();
      else current.pairs[i].n = inp.value.split(',').map(s => s.trim()).filter(Boolean);
    }, 180));
  });
  $$<HTMLButtonElement>('button[data-del]', body).forEach(btn => {
    btn.addEventListener('click', () => {
      const current = getPendingImport();
      if (!current) return;
      const i = Number(btn.getAttribute('data-del'));
      current.pairs.splice(i, 1);
      renderPreviewTable();
    });
  });
}

/** Report lines the parser could not use (first 30, as before). */
export function renderParseErrors(): void {
  const pi = getPendingImport();
  if (!pi) return;
  const box = $('#parseErrors');
  if (!box) return;
  if (!pi.errors.length) { box.innerHTML = ''; return; }
  box.innerHTML = `<div class="card" style="border-color:var(--amber)">
    <b>⚠️ ${esc(t('preview.errorTitle', { n: pi.errors.length }))}</b>
    <div class="small muted" style="margin-top:8px;max-height:120px;overflow:auto">
      ${pi.errors.slice(0, 30).map(e => `Line ${e.line}: ${esc(e.text)}`).join('<br>')}
    </div></div>`;
}

/** The preview is rendered when the router enters it. */
export function renderPreview(): void {
  renderPreviewTable();
  renderParseErrors();
}

/** Bind the static preview controls once, when the shell markup exists. */
export function bindPreviewScreen(): void {
  // Going back to fix the languages keeps the words the user already edited.
  $('#btnChangeLang')?.addEventListener('click', () => {
    const stack = getNavStack();
    if (stack[stack.length - 1] === 'lang') goBack();
    else navigate('lang');
  });

  $('#deckNameInput')?.addEventListener('input', () => {
    const pi = getPendingImport();
    if (pi) pi.nameTouched = true;
  });

  $('#btnCancelPreview')?.addEventListener('click', () => {
    setPendingImport(null);
    getNavStack().length = 0;
    navigate('home', { replace: true });
  });

  $('#btnSaveDeck')?.addEventListener('click', () => {
    const pi = getPendingImport();
    if (!pi) return;
    const valid = pi.pairs.filter(p => p.f && p.n.length);
    if (!valid.length) { toast(t('preview.noWords')); return; }
    const state = getState();
    const nameInput = $<HTMLInputElement>('#deckNameInput');
    const deck = normalizeDeck({
      id: uid(),
      name: (nameInput?.value ?? '').trim() || 'Untitled deck',
      nativeLang: pi.native,
      foreignLang: pi.foreign,
      words: valid.map(p => ({ id: uid(), f: p.f, n: p.n, emoji: p.emoji || null }))
    });
    state.decks.push(deck);
    state.settings.nativeLang = pi.native;
    // Default UI language to the native one when we have a translation.
    if (!state.settings.uiLangSet) {
      state.settings.uiLang = I18N[pi.native] ? pi.native : 'en';
      state.settings.uiLangSet = true;
    }
    setPendingImport(null);
    save(true);
    checkAchievements(state);
    toast(t('toast.deckSaved'));
    openDeck(deck.id);
  });
}
