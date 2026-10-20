/**
 * Screen router.
 *
 * Reproduces the legacy `showScreen()` exactly: stop speech, push unless
 * replaced, activate one section, update the back button, tab bar, pills and
 * `body.in-session`, scroll to top, then render the screen. Screens navigate
 * through `ui/nav.ts` so this module can depend on them without a cycle.
 */

import type { ScreenName, ShowScreenOptions } from '../types';
import { sound } from '../audio';
import { getUnlockedProfile } from '../storage/profiles';
import { t } from '../i18n';
import { $, $$ } from './dom';
import { getCurrentScreen, getNavStack, registerNavigator, setCurrentScreen } from './nav';
import { renderAchievements } from './screens/achievements';
import { renderDeck } from './screens/deck';
import { renderHome } from './screens/home';
import { renderLangConfirm } from './screens/lang';
import { renderLogin } from './screens/login';
import { renderPreview } from './screens/preview';
import { renderSettings } from './screens/settings';
import { endSession } from './sessionFlow';

export function showScreen(name: ScreenName, opts?: ShowScreenOptions): void {
  const o = opts || {};
  sound.stopSpeaking();   // never let a word bleed into the next screen
  if (getCurrentScreen() !== name && !o.replace) getNavStack().push(getCurrentScreen());
  setCurrentScreen(name);
  const locked = name === 'login';
  $$('.screen').forEach(s => s.classList.remove('is-active'));
  const el = $('#screen-' + name);
  if (el) el.classList.add('is-active');
  $('#btnBack')?.classList.toggle('hidden', name === 'home' || name === 'session' || locked);
  $$('#tabbar button').forEach(b => {
    const nav = b.getAttribute('data-nav');
    const active = (nav === name) || (nav === 'home' && (name === 'deck' || name === 'import' || name === 'lang' || name === 'preview'));
    if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  $('#tabbar')?.classList.toggle('hidden', name === 'session' || locked);
  document.body.classList.toggle('in-session', name === 'session');
  // Counters are meaningless before a profile is unlocked.
  $('#pillXp')?.classList.toggle('hidden', locked);
  $('#pillStreak')?.classList.toggle('hidden', locked);
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  if (locked) renderLogin();
  if (name === 'home') renderHome();
  if (name === 'deck') renderDeck();
  if (name === 'lang') renderLangConfirm();
  if (name === 'preview') renderPreview();
  if (name === 'achievements') renderAchievements();
  if (name === 'settings') renderSettings();
}

export function goBack(): void {
  const prev = getNavStack().pop() || 'home';
  showScreen(prev, { replace: true });
}

/* Home shortcut: tapping the logo always leads back to the start. */
export function bindRouter(): void {
  $('#btnBack')?.addEventListener('click', goBack);
  $('#brandHome')?.addEventListener('click', () => {
    if (getCurrentScreen() === 'session') {
      // Leaving mid-lesson still records what was answered, like Escape does.
      if (confirm(t('session.quit'))) endSession('quit');
      return;
    }
    if (!getUnlockedProfile()) { showScreen('login', { replace: true }); return; }
    getNavStack().length = 0;
    showScreen('home', { replace: true });
  });
  $$<HTMLButtonElement>('#tabbar button').forEach(b => b.addEventListener('click', () => {
    const nav = b.getAttribute('data-nav');
    if (nav === 'home') { getNavStack().length = 0; showScreen('home', { replace: true }); }
    else if (nav === 'achievements' || nav === 'settings') showScreen(nav);
  }));
}

registerNavigator(showScreen, goBack);
