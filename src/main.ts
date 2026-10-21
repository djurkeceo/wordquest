/**
 * WordQuest entry point.
 *
 * Boot order mirrors the single-file app: profiles → theme/motion → unlock or
 * lock screen → top bar/toggles → level repair → achievements → save → audio
 * unlock → keyboard/unload hooks. The emoji lexicon is the one new async step;
 * it is awaited before the first screen renders (the code-split chunk is the
 * only planned behaviour difference).
 */

import './styles/index.css';
import './modes/index';
import { sound } from './audio';
import { loadEmojiLexicon } from './emoji';
import { levelFromXp } from './engine/xp';
import { checkAchievements } from './gamification/achievements';
import { t } from './i18n';
import { activeProfile, loadProfiles } from './storage/profiles';
import { getState, save } from './storage/state';
import { bindPresets } from './presets/ui';
import { bindFeedback } from './ui/feedback';
import { getCurrentScreen } from './ui/nav';
import { bindRouter, showScreen } from './ui/router';
import { bindImportScreen } from './ui/screens/import';
import { bindLangScreen } from './ui/screens/lang';
import { bindLoginScreen, unlockProfile } from './ui/screens/login';
import { bindPreviewScreen } from './ui/screens/preview';
import { bindDeckScreen } from './ui/screens/deck';
import { bindSessionScreen } from './ui/screens/session';
import { bindSettingsScreen } from './ui/screens/settings';
import { renderSummary } from './ui/screens/summary';
import { endSession, initSessionFlow } from './ui/sessionFlow';
import { applyMotionPreference, applyTheme, bindThemeListener, syncToggles } from './ui/theme';
import { updateTopbar } from './ui/topbar';

/** Persist on unload so a debounced save is never lost. */
function bindUnloadHooks(): void {
  window.addEventListener('beforeunload', () => save(true));
  window.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });
}

/** Escape quits a session after confirmation. */
function bindEscape(): void {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && getCurrentScreen() === 'session') {
      if (confirm(t('session.quit'))) endSession('quit');
    }
  });
}

async function boot(): Promise<void> {
  // Apply theme/motion before the (async) lexicon so the native browser chrome
  // and the fox are correct on the very first paint.
  loadProfiles();
  applyTheme();
  applyMotionPreference();

  // The lexicon is a separate chunk; wait for it so Home can render emoji.
  await loadEmojiLexicon();

  const prof = activeProfile();
  if (prof && !prof.pinHash) {
    // A single profile without a PIN needs no ceremony — go straight in.
    unlockProfile(prof.id);
  } else {
    showScreen('login', { replace: true });
  }
  updateTopbar();
  syncToggles();
  // Level is derived, so repair it if a backup was hand-edited.
  getState().profile.level = levelFromXp(getState().profile.xp);
  checkAchievements(getState());
  save();

  // Unlock audio on the first gesture (browser autoplay policy).
  const unlockAudio = (): void => {
    if (getState().settings.sound) sound.play('tap');
    window.removeEventListener('pointerdown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { once: true });

  // Warn if no engine can pronounce anything, but keep everything else working.
  if (!sound.canSpeak('en')) {
    console.info('WordQuest: no speech available — listen mode will be skipped.');
  }
  bindEscape();
  bindUnloadHooks();
}

/* Static markup is parsed before this module runs, so every binding is safe. */
bindFeedback();
bindRouter();
bindLoginScreen();
bindImportScreen();
bindLangScreen();
bindPreviewScreen();
bindDeckScreen();
bindSessionScreen();
bindSettingsScreen();
bindPresets();
bindThemeListener();

initSessionFlow({
  showSession: () => showScreen('session'),
  showSummary: data => {
    renderSummary(data);
    showScreen('summary');
  },
  updateTopbar
});

void boot();
