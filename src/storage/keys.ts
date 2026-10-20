/** Namespaced localStorage keys and the persisted schema version. */

export const LS_KEY = 'wordquest.state.v1';
/** Registry of local profiles — each one owns a namespaced slice of storage. */
export const PROFILES_KEY = 'wordquest.profiles.v1';
export const SCHEMA_VERSION = 1;

/** Emoji offered as profile avatars. */
export const AVATARS: readonly string[] = ['🦊', '🐼', '🐸', '🦉', '🐙', '🦄', '🐝', '🐧', '🐨', '🦁', '🐢', '🐳'];
