/**
 * Settings screen: sound/speech toggles, languages, goal, theme, voice engine,
 * JSON backup, reset and the profile card.
 *
 * User-facing copy, prompt()s and the hardcoded "(soon)" suffix are unchanged
 * from the single-file app (reported as M5/L3/H9/H11).
 */

import type { LanguageCode, ThemeMode, TtsEngine } from '../../types';
import { sound } from '../../audio';
import { applyI18n, I18N, t, UI_LOCALES } from '../../i18n';
import { LANGUAGES } from '../../language/languages';
import { langName } from '../../language/names';
import { applyBackup, exportBackup, readBackupFile, resetProgress } from '../../storage/backup';
import { hashPin, randomSalt } from '../../storage/pin';
import {
  getProfiles,
  getUnlockedProfile,
  renameProfileRecord,
  stateKeyFor,
  updateProfilePin
} from '../../storage/profiles';
import { getDeck, getState, save } from '../../storage/state';
import { $, esc } from '../dom';
import { languageOptions } from '../languageSelect';
import { getCurrentDeckId, getCurrentScreen, navigate } from '../nav';
import { applyMotionPreference, applyTheme, syncToggles } from '../theme';
import { toast } from '../toast';
import { updateTopbar } from '../topbar';
import { deleteProfileFlow, logoutToLogin } from './login';

export function renderSettings(): void {
  const state = getState();
  const uiLang = state.settings.uiLang || 'en';
  // Locale list — only locales we actually ship translations for are usable.
  const uiSelect = $<HTMLSelectElement>('#selUiLang');
  if (uiSelect) {
    uiSelect.innerHTML = UI_LOCALES.map(l => {
      const supported = !!I18N[l.code];
      return `<option value="${l.code}"${l.code === state.settings.uiLang ? ' selected' : ''} ${supported ? '' : 'disabled'}>${esc(l.label)}${supported ? '' : ' (soon)'}</option>`;
    }).join('');
  }
  const nativeSelect = $<HTMLSelectElement>('#selNativeLang');
  if (nativeSelect) {
    nativeSelect.innerHTML = `<option value="">—</option>` + languageOptions(state.settings.nativeLang || '', uiLang);
  }
  const goal = $<HTMLSelectElement>('#selGoal');
  if (goal) goal.value = String(state.settings.dailyGoal);
  const theme = $<HTMLSelectElement>('#selTheme');
  if (theme) theme.value = state.settings.theme;
  const voice = $<HTMLSelectElement>('#selVoice');
  if (voice) voice.value = state.settings.ttsEngine || 'auto';
  const key = $<HTMLInputElement>('#ttsKeyInput');
  if (key) key.value = state.settings.ttsKey || '';
  renderVoiceInfo();
  syncToggles();
  // Account card.
  const prof = getUnlockedProfile();
  if (prof) {
    const avatar = $('#acctAvatar');
    if (avatar) avatar.textContent = prof.emoji || '🦊';
    const name = $('#acctName');
    if (name) name.textContent = prof.name;
    const meta = $('#acctMeta');
    if (meta) {
      meta.textContent = t('settings.acctMeta', {
        decks: state.decks.length === 1 ? t('settings.deck1') : t('settings.deckN', { n: state.decks.length }),
        xp: state.profile.xp,
        pin: t(prof.pinHash ? 'settings.pinSet' : 'settings.pinNone')
      });
    }
  }
  const storage = $('#storageInfo');
  if (storage) {
    try {
      const bytes = (localStorage.getItem(stateKeyFor(getUnlockedProfile())) || '').length;
      storage.textContent = (bytes / 1024).toFixed(1) + ' KB stored';
    } catch {
      storage.textContent = '';
    }
  }
}

/** The language the voice controls act on: the first deck's foreign side. */
function voiceSampleLang(): string {
  const state = getState();
  const deck = state.decks[0] || getDeck(getCurrentDeckId());
  return (deck && deck.foreignLang) || state.settings.nativeLang || 'en';
}

/** A word to say when testing: a real one from a deck, else the language name. */
function voiceSampleText(): string {
  const lang = voiceSampleLang();
  const state = getState();
  const deck = state.decks[0] || getDeck(getCurrentDeckId());
  if (deck && deck.words[0] && deck.words[0].f) return deck.words[0].f;
  return (LANGUAGES[lang as LanguageCode] && LANGUAGES[lang as LanguageCode].native) || 'Hello';
}

/** Explain which engine will actually be used, and why. */
function renderVoiceInfo(): void {
  const el = $('#voiceInfo');
  if (!el) return;
  const state = getState();
  const lang = voiceSampleLang();
  const engine = state.settings.ttsEngine || 'auto';
  const name = langName(lang, state.settings.uiLang || 'en');
  const hasKey = !!(state.settings.ttsKey || '').trim();
  const hasLocal = sound.hasLocalVoice(lang as LanguageCode);
  if (engine === 'browser') {
    el.textContent = t(hasLocal ? 'settings.voiceInfoLocal' : 'settings.voiceInfoNoLocal', { lang: name });
    return;
  }
  if (hasKey) {
    el.textContent = navigator.onLine === false
      ? t('settings.voiceInfoOffline')
      : t('settings.voiceInfoCloud', { lang: name });
    return;
  }
  if (engine === 'online') {
    el.textContent = navigator.onLine === false
      ? t('settings.voiceInfoOffline') : t('settings.voiceInfoOnline');
    return;
  }
  if (navigator.onLine === false) {
    el.textContent = hasLocal
      ? t('settings.voiceInfoLocal', { lang: name })
      : t('settings.voiceInfoOffline');
  } else if (sound.hasNaturalLocalVoice(lang as LanguageCode)) {
    el.textContent = t('settings.voiceInfoLocal', { lang: name });
  } else if (hasLocal) {
    el.textContent = t('settings.voiceInfoAutoOnline', { lang: name });
  } else {
    el.textContent = t('settings.voiceInfoNone', { lang: name });
  }
}

type ToggleKey = 'sound' | 'tts' | 'strictAccents' | 'hearts' | 'calmMotion';

/** Wire one toggle button to a settings key. */
function wireToggle(id: string, key: ToggleKey, after?: (value: boolean) => void): void {
  $('#' + id)?.addEventListener('click', () => {
    const settings = getState().settings;
    settings[key] = !settings[key];
    syncToggles();
    save();
    if (after) after(settings[key]);
  });
}

/** Bind all static settings controls once, when the shell markup exists. */
export function bindSettingsScreen(): void {
  wireToggle('tgSound', 'sound', v => { if (v) sound.play('tap'); });
  wireToggle('tgTts', 'tts', v => {
    if (v) {
      if (!sound.canSpeak(voiceSampleLang() as LanguageCode)) toast(t('toast.ttsOff'));
      else sound.speak(voiceSampleText(), voiceSampleLang() as LanguageCode);
    }
  });
  wireToggle('tgStrict', 'strictAccents');
  wireToggle('tgHearts', 'hearts');
  wireToggle('tgMotion', 'calmMotion', () => applyMotionPreference());

  $('#selVoice')?.addEventListener('change', e => {
    const settings = getState().settings;
    settings.ttsEngine = (e.target as HTMLSelectElement).value as TtsEngine;
    save(true);
    renderVoiceInfo();
    sound.speak(voiceSampleText(), voiceSampleLang() as LanguageCode);   // immediate A/B feedback
  });
  $('#btnVoiceTest')?.addEventListener('click', () => {
    if (!sound.canSpeak(voiceSampleLang() as LanguageCode)) { toast(t('toast.ttsOff')); return; }
    sound.speak(voiceSampleText(), voiceSampleLang() as LanguageCode);
  });

  $('#ttsKeyInput')?.addEventListener('change', e => {
    const settings = getState().settings;
    settings.ttsKey = (e.target as HTMLInputElement).value.trim();
    sound.resetCloud();
    save(true);
    renderVoiceInfo();
    if (settings.ttsKey) sound.speak(voiceSampleText(), voiceSampleLang() as LanguageCode);
  });

  $('#selUiLang')?.addEventListener('change', e => {
    getState().settings.uiLang = (e.target as HTMLSelectElement).value;
    save(true);
    applyI18n();
    navigate(getCurrentScreen(), { replace: true });
  });
  $('#selNativeLang')?.addEventListener('change', e => {
    const value = (e.target as HTMLSelectElement).value;
    getState().settings.nativeLang = value ? value as LanguageCode : null;
    save(true);
  });
  $('#selGoal')?.addEventListener('change', e => {
    getState().settings.dailyGoal = Number((e.target as HTMLSelectElement).value) || 50;
    save(true);
  });
  $('#selTheme')?.addEventListener('change', e => {
    getState().settings.theme = (e.target as HTMLSelectElement).value as ThemeMode;
    applyTheme();
    save(true);
  });

  /* Export / import / reset. */
  $('#btnExport')?.addEventListener('click', () => { exportBackup(); });
  $('#btnImport')?.addEventListener('click', () => $<HTMLInputElement>('#importFile')?.click());
  $('#importFile')?.addEventListener('change', e => {
    const input = e.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    readBackupFile(file).then(next => {
      applyBackup(next);
      applyTheme();
      applyI18n();
      updateTopbar();
      navigate('home', { replace: true });
      toast(t('settings.imported'));
    }).catch(() => {
      toast(t('settings.importBad'));
    });
    input.value = '';
  });
  $('#btnReset')?.addEventListener('click', () => {
    if (!confirm(t('settings.resetConfirm'))) return;
    resetProgress();
    updateTopbar();
    navigate('home', { replace: true });
    toast(t('settings.reset'));
  });

  /* Profile card. */
  $('#btnSwitchProfile')?.addEventListener('click', () => logoutToLogin());
  $('#btnRenameProfile')?.addEventListener('click', () => {
    const prof = getUnlockedProfile();
    if (!prof) return;
    const name = prompt(t('settings.renamePrompt'), prof.name);
    if (name == null) return;
    const clean = name.trim();
    if (!clean) return;
    if (getProfiles().list.some(p => p.id !== prof.id && p.name.toLowerCase() === clean.toLowerCase())) {
      toast(t('login.taken'));
      return;
    }
    renameProfileRecord(prof.id, clean.slice(0, 20));
    renderSettings();
    toast(t('toast.renamed'));
  });
  $('#btnChangePin')?.addEventListener('click', () => { void changePin(); });
  $('#btnDeleteProfile')?.addEventListener('click', () => {
    const prof = getUnlockedProfile();
    if (!prof) return;
    if (!confirm(t('settings.deleteProfileConfirm'))) return;
    deleteProfileFlow(prof.id);
  });
}

/** Prompt for a new PIN (clear text, as before — reported as H11). */
async function changePin(): Promise<void> {
  const prof = getUnlockedProfile();
  if (!prof) return;
  const pin = prompt(t('settings.newPinPrompt'), '');
  if (pin == null) return;
  const clean = pin.trim();
  if (clean && clean.length < 4) { toast(t('login.pinShort')); return; }
  if (clean) {
    const salt = randomSalt();
    const hash = await hashPin(clean, salt);
    updateProfilePin(prof.id, hash, salt);
    toast(t('toast.pinChanged'));
  } else {
    updateProfilePin(prof.id, null, null);
    toast(t('toast.pinRemoved'));
  }
  renderSettings();
}
