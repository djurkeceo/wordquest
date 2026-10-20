/**
 * Language-confirmation screen.
 *
 * The guess is never applied silently: this screen shows both sides, three
 * sample pairs and the confidence note, and lets the user fix or swap them.
 */

import { t } from '../../i18n';
import { langName } from '../../language/names';
import { getState } from '../../storage/state';
import { $ } from '../dom';
import { getPendingImport, setPendingImport } from '../importFlow';
import { languageOptions } from '../languageSelect';
import { goBack, navigate } from '../nav';
import { toast } from '../toast';
import type { LanguageCode } from '../../types';

/** Fill the language-confirmation screen from the pending import. */
export function renderLangConfirm(): void {
  const pi = getPendingImport();
  if (!pi) { navigate('home', { replace: true }); return; }
  const uiLang = getState().settings.uiLang || 'en';
  const foreign = $<HTMLSelectElement>('#selForeignLang');
  const native = $<HTMLSelectElement>('#selNativeLangPick');
  if (foreign) foreign.innerHTML = languageOptions(pi.foreign, uiLang);
  if (native) native.innerHTML = languageOptions(pi.native, uiLang);
  const sampleForeign = $('#sampleForeign');
  const sampleNative = $('#sampleNative');
  if (sampleForeign) sampleForeign.textContent = pi.pairs.slice(0, 3).map(p => p.f).join(' · ');
  if (sampleNative) sampleNative.textContent = pi.pairs.slice(0, 3).map(p => p.n.join(' / ')).join(' · ');

  const sure = pi.confidence > 0.32;
  const lead = $('#langLead');
  if (lead) lead.textContent = t(sure ? 'lang.lead' : 'lang.leadUnsure');
  const note = $<HTMLElement>('#langConfidence');
  if (note) {
    note.textContent = t(sure ? 'lang.confident' : 'lang.unsure');
    note.className = 'langpair__note ' + (sure ? 'is-sure' : 'is-unsure');
  }
}

/** Accept the guessed pair (or the user's correction) and show the word list. */
function confirmLanguages(): void {
  const pi = getPendingImport();
  if (!pi) return;
  const foreign = $<HTMLSelectElement>('#selForeignLang')?.value ?? pi.foreign;
  const native = $<HTMLSelectElement>('#selNativeLangPick')?.value ?? pi.native;
  if (foreign === native) { toast(t('lang.same')); return; }
  pi.foreign = foreign as LanguageCode;
  pi.native = native as LanguageCode;
  if (!pi.nameTouched) {
    const nameInput = $<HTMLInputElement>('#deckNameInput');
    if (nameInput) {
      nameInput.value = pi.suggestedName ||
        `${langName(foreign, getState().settings.uiLang || 'en')} → ${langName(native, getState().settings.uiLang || 'en')}`;
    }
  }
  navigate('preview');
}

/**
 * Swap the two columns. Word lists are usually foreign first, but plenty of
 * people write the translation first; this fixes both the pair and the words.
 */
function swapImportSides(): void {
  const pi = getPendingImport();
  if (!pi) return;
  const f = pi.foreign;
  pi.foreign = pi.native;
  pi.native = f;
  pi.pairs = pi.pairs.map(p => p.n.length
    ? { f: p.n[0], n: [p.f, ...p.n.slice(1)], emoji: null }
    : p);
  renderLangConfirm();
}

/** Bind the static controls once, when the shell markup exists. */
export function bindLangScreen(): void {
  $('#btnLangConfirm')?.addEventListener('click', confirmLanguages);
  $('#btnSwapLang')?.addEventListener('click', swapImportSides);
  $('#btnLangCancel')?.addEventListener('click', () => {
    setPendingImport(null);
    goBack();
  });
}
