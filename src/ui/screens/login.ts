/**
 * Profile picker and lock screen.
 *
 * "Login" is local only: it picks which namespaced slice of localStorage is
 * loaded. PINs are salted hashes (never clear text) and five misses trigger a
 * five-second in-memory throttle, exactly as before.
 */

import type { ProfileRecord } from '../../types';
import { sound } from '../../audio';
import { levelFromXp } from '../../engine/xp';
import { checkAchievements } from '../../gamification/achievements';
import { ensureDaily } from '../../gamification/hearts';
import { mascotSvg } from '../../gamification/mascot';
import { applyI18n, t } from '../../i18n';
import { AVATARS } from '../../storage/keys';
import { defaultState } from '../../storage/migration';
import { hashPin, randomSalt } from '../../storage/pin';
import {
  activateProfile,
  addProfile,
  deactivateProfile,
  deleteProfileRecord,
  findProfile,
  getPinTargetId,
  getProfiles,
  mostRecentProfile,
  pinThrottle,
  setPinTargetId
} from '../../storage/profiles';
import { getState, loadState, save, setState } from '../../storage/state';
import { uid } from '../../util/core';
import { $, $$, esc } from '../dom';
import { getNavStack, navigate } from '../nav';
import { applyMotionPreference, applyTheme, syncToggles } from '../theme';
import { toast } from '../toast';
import { updateTopbar } from '../topbar';

let chosenAvatar: string = AVATARS[0];

/** Match the lock screen to the last user's language and theme. */
function loginChrome(): void {
  const recent = mostRecentProfile();
  const state = getState();
  if (recent) {
    if (recent.lang) state.settings.uiLang = recent.lang;
    if (recent.theme) state.settings.theme = recent.theme;
  }
  applyTheme();
  applyMotionPreference();
  applyI18n();
}

export function renderLogin(): void {
  loginChrome();
  const mascot = $('#loginMascot');
  if (mascot && !mascot.innerHTML) mascot.innerHTML = mascotSvg('happy');
  const sub = $('#loginSub');
  if (sub) sub.textContent = t(getProfiles().list.length ? 'login.sub' : 'login.first');
  const grid = $('#profileGrid');
  if (grid) {
    grid.innerHTML = getProfiles().list.map(p => `
      <button class="profile" data-id="${esc(p.id)}">
        ${p.pinHash ? '<span class="profile__lock" aria-hidden="true">🔒</span>' : ''}
        <span class="profile__avatar" aria-hidden="true">${esc(p.emoji || '🦊')}</span>
        <span class="profile__name">${esc(p.name)}</span>
      </button>`).join('') + `
      <button class="profile profile--add" id="btnAddProfile">
        <span class="profile__avatar" aria-hidden="true">＋</span>
        <span class="profile__name">${esc(t('login.newProfile'))}</span>
      </button>`;
    $$<HTMLButtonElement>('#profileGrid .profile[data-id]').forEach(btn =>
      btn.addEventListener('click', () => chooseProfile(btn.getAttribute('data-id'))));
    $('#btnAddProfile')?.addEventListener('click', () => openCreateForm(false));
  }
  if (!getProfiles().list.length) openCreateForm(true);
  else { $('#loginCreate')?.classList.add('hidden'); $('#loginPin')?.classList.add('hidden'); }
}

/** Show the "new profile" form (and hide the other panels). */
function openCreateForm(isFirst: boolean): void {
  $('#loginCreate')?.classList.remove('hidden');
  $('#loginPin')?.classList.add('hidden');
  // Nothing to go back to on a fresh install, so no cancel button there.
  $('#btnCreateCancel')?.classList.toggle('hidden', !!isFirst);
  const err = $('#createErr');
  if (err) err.textContent = '';
  const name = $<HTMLInputElement>('#newName');
  const pin = $<HTMLInputElement>('#newPin');
  if (name) name.value = '';
  if (pin) pin.value = '';
  chosenAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  const row = $('#avaRow');
  if (row) {
    row.innerHTML = AVATARS.map(a =>
      `<button class="avaBtn" type="button" data-av="${a}" aria-pressed="${a === chosenAvatar ? 'true' : 'false'}">${a}</button>`).join('');
    $$<HTMLButtonElement>('#avaRow .avaBtn').forEach(btn => btn.addEventListener('click', () => {
      chosenAvatar = btn.getAttribute('data-av') ?? AVATARS[0];
      $$<HTMLButtonElement>('#avaRow .avaBtn').forEach(x => x.setAttribute('aria-pressed', x === btn ? 'true' : 'false'));
    }));
  }
  name?.focus();
}

/** Open a profile: straight in without a PIN, otherwise ask for it. */
function chooseProfile(id: string | null): void {
  if (!id) return;
  const prof = findProfile(id);
  if (!prof) return;
  if (!prof.pinHash) { unlockProfile(id); return; }
  setPinTargetId(id);
  pinThrottle.fails = 0;
  $('#loginCreate')?.classList.add('hidden');
  $('#loginPin')?.classList.remove('hidden');
  const who = $('#pinWho');
  if (who) who.textContent = (prof.emoji || '🦊') + '  ' + prof.name;
  const err = $('#pinErr');
  if (err) err.textContent = '';
  const input = $<HTMLInputElement>('#pinInput');
  if (input) { input.value = ''; input.focus(); }
}

/** Switch the active profile and boot its world. */
export function unlockProfile(id: string): void {
  const prof = activateProfile(id);
  if (!prof) return;
  loadState();
  ensureDaily();
  applyTheme();
  applyMotionPreference();
  applyI18n();
  updateTopbar();
  syncToggles();
  const state = getState();
  state.profile.level = levelFromXp(state.profile.xp);
  checkAchievements(state);
  getNavStack().length = 0;
  setPinTargetId(null);
  navigate('home', { replace: true });
  save();
}

async function submitPin(): Promise<void> {
  if (Date.now() < pinThrottle.lockUntil) return;
  const target = getPinTargetId();
  if (!target) return;
  const prof = findProfile(target);
  if (!prof) return;
  const input = $<HTMLInputElement>('#pinInput');
  const hash = await hashPin(input?.value ?? '', prof.salt);
  if (hash === prof.pinHash) {
    pinThrottle.fails = 0;
    unlockProfile(prof.id);
    return;
  }
  pinThrottle.fails++;
  sound.play('wrong');
  if (input) input.value = '';
  const err = $('#pinErr');
  const unlockBtn = $<HTMLButtonElement>('#btnUnlock');
  if (pinThrottle.fails >= 5) {
    pinThrottle.lockUntil = Date.now() + 5000;
    let left = 5;
    if (unlockBtn) unlockBtn.disabled = true;
    if (err) err.textContent = t('login.tooMany', { s: left });
    const tick = setInterval(() => {
      left--;
      if (left <= 0) {
        clearInterval(tick);
        if (unlockBtn) unlockBtn.disabled = false;
        if (err) err.textContent = '';
        pinThrottle.fails = 0;
        return;
      }
      if (err) err.textContent = t('login.tooMany', { s: left });
    }, 1000);
    return;
  }
  if (err) err.textContent = t('login.wrongPin');
  input?.focus();
}

async function createProfile(): Promise<void> {
  const nameInput = $<HTMLInputElement>('#newName');
  const pinInput = $<HTMLInputElement>('#newPin');
  const name = (nameInput?.value ?? '').trim();
  const pin = pinInput?.value ?? '';
  const err = $('#createErr');
  if (!name) { if (err) err.textContent = t('login.badName'); return; }
  if (getProfiles().list.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    if (err) err.textContent = t('login.taken');
    return;
  }
  if (pin && pin.length < 4) { if (err) err.textContent = t('login.pinShort'); return; }
  let salt: string | null = null;
  let pinHash: string | null = null;
  if (pin) { salt = randomSalt(); pinHash = await hashPin(pin, salt); }
  const state = getState();
  const prof: ProfileRecord = {
    id: uid(),
    name,
    emoji: chosenAvatar,
    pinHash,
    salt,
    createdAt: Date.now(),
    lastSeen: Date.now(),
    lang: state.settings.uiLang,
    theme: state.settings.theme
  };
  addProfile(prof);
  setState(defaultState());                 // a new profile starts with a clean slate
  getState().settings.uiLang = prof.lang || 'en';
  unlockProfile(prof.id);
  toast(t('toast.profileCreated'));
}

/** Return to the lock screen. The in-memory settings are kept on purpose. */
export function logoutToLogin(): void {
  save(true);
  deactivateProfile();
  getNavStack().length = 0;
  setPinTargetId(null);
  navigate('login', { replace: true });
}

/** Erase a profile and everything it owns. */
export function deleteProfileFlow(id: string): void {
  const prof = deleteProfileRecord(id);
  if (!prof) return;
  toast(t('toast.profileDeleted'));
  navigate('login', { replace: true });
}

/** Bind the static login controls once, when the shell markup exists. */
export function bindLoginScreen(): void {
  $('#btnUnlock')?.addEventListener('click', () => { void submitPin(); });
  $('#pinInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') void submitPin(); });
  $('#btnCreateProfile')?.addEventListener('click', () => { void createProfile(); });
  $('#btnCreateCancel')?.addEventListener('click', () => { navigate('login', { replace: true }); });
  $('#btnPinBack')?.addEventListener('click', () => { setPinTargetId(null); navigate('login', { replace: true }); });
  $('#newPin')?.addEventListener('keydown', e => { if (e.key === 'Enter') void createProfile(); });
  $('#newName')?.addEventListener('keydown', e => { if (e.key === 'Enter') $<HTMLInputElement>('#newPin')?.focus(); });
}
