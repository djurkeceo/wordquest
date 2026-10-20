/**
 * Local profile registry and the in-memory gate that protects writes.
 *
 * A profile is a name, an avatar, an optional salted PIN hash and its own
 * state key. Nothing leaves the device; "logging in" just picks which slice of
 * localStorage the app reads and writes.
 */

import type { ProfileRecord, ProfileRegistry } from '../types';
import { uid } from '../util/core';
import { LS_KEY, PROFILES_KEY } from './keys';

let profiles: ProfileRegistry = { activeId: null, list: [] };

/**
 * The profile whose data is actually in memory. Null while the lock screen is
 * up, which is what stops `save()` from overwriting a profile that has not
 * been unlocked yet (activeId alone is not proof of access).
 */
let unlockedProfile: ProfileRecord | null = null;

/** Storage key for a profile (the legacy key is reused by the migrated one). */
export function stateKeyFor(prof: ProfileRecord | null = null): string {
  if (!prof) return LS_KEY;
  return prof.legacy ? LS_KEY : LS_KEY + '::' + prof.id;
}

export function getProfiles(): ProfileRegistry {
  return profiles;
}

export function getUnlockedProfile(): ProfileRecord | null {
  return unlockedProfile;
}

export function activeProfile(): ProfileRecord | null {
  return profiles.list.find(p => p.id === profiles.activeId) || null;
}

export function findProfile(id: string): ProfileRecord | null {
  return profiles.list.find(p => p.id === id) || null;
}

/** Read the registry, adopting a pre-profiles save so upgrade loses nothing. */
export function loadProfiles(): void {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') {
      const input = parsed as Partial<ProfileRegistry>;
      if (Array.isArray(input.list)) {
        profiles = {
          activeId: input.activeId || null,
          list: input.list.filter(p => p && p.id && p.name)
        };
      }
    }
  } catch (err) {
    console.warn('WordQuest: could not read profiles, starting fresh.', err);
    profiles = { activeId: null, list: [] };
  }
  // A save from the single-user version becomes the first profile, still stored
  // under the old key so that nothing has to be copied or re-encoded.
  if (!profiles.list.length && localStorage.getItem(LS_KEY)) {
    const adopted: ProfileRecord = {
      id: uid(),
      name: 'Player',
      emoji: '🦊',
      pinHash: null,
      salt: null,
      createdAt: Date.now(),
      legacy: true
    };
    profiles.list.push(adopted);
    profiles.activeId = adopted.id;
    saveProfiles();
  }
}

export function saveProfiles(): void {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch (err) {
    console.warn('WordQuest: could not save profiles.', err);
  }
}

/** Add a profile and make it current. The caller still has to unlock it. */
export function addProfile(prof: ProfileRecord): void {
  profiles.list.push(prof);
  profiles.activeId = prof.id;
  saveProfiles();
}

/** Mark a profile as unlocked and remember when it was last used. */
export function activateProfile(id: string): ProfileRecord | null {
  const prof = findProfile(id);
  if (!prof) return null;
  profiles.activeId = id;
  unlockedProfile = prof;
  prof.lastSeen = Date.now();
  saveProfiles();
  return prof;
}

/** Return to the lock screen without erasing anything. */
export function deactivateProfile(): void {
  profiles.activeId = null;
  unlockedProfile = null;
  saveProfiles();
}

/** Erase a profile and its namespaced state. */
export function deleteProfileRecord(id: string): ProfileRecord | null {
  const prof = findProfile(id);
  if (!prof) return null;
  try { localStorage.removeItem(stateKeyFor(prof)); } catch { /* ignore */ }
  profiles.list = profiles.list.filter(p => p.id !== id);
  if (profiles.activeId === id) profiles.activeId = null;
  if (unlockedProfile && unlockedProfile.id === id) unlockedProfile = null;
  saveProfiles();
  return prof;
}

export function renameProfileRecord(id: string, name: string): boolean {
  const prof = findProfile(id);
  if (!prof) return false;
  prof.name = name;
  saveProfiles();
  return true;
}

export function updateProfilePin(id: string, pinHash: string | null, salt: string | null): boolean {
  const prof = findProfile(id);
  if (!prof) return false;
  prof.pinHash = pinHash;
  prof.salt = salt;
  saveProfiles();
  return true;
}

export function touchProfile(id: string): void {
  const prof = findProfile(id);
  if (!prof) return;
  prof.lastSeen = Date.now();
  saveProfiles();
}

/** Last-used profile, used to match the lock screen's language and theme. */
export function mostRecentProfile(): ProfileRecord | null {
  return activeProfile() ||
    profiles.list.slice().sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))[0] ||
    null;
}

/* Transient PIN-panel state. It is deliberately not persisted: closing the
 * tab clears a lockout, exactly like the single-file app. */
let pinTargetId: string | null = null;
export const pinThrottle: { fails: number; lockUntil: number } = { fails: 0, lockUntil: 0 };

export function getPinTargetId(): string | null {
  return pinTargetId;
}

export function setPinTargetId(id: string | null): void {
  pinTargetId = id;
}
