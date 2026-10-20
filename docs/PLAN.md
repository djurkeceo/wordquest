# WordQuest — refactor analysis and plan (phase 1)

Baseline: the single-file app at `index.html` (5,373 lines, ~300.8 KB, commit
`ae85840`). It is the only behavioural reference. The refactor keeps the UI,
copy, mascot, emoji, CSS look, DOM ids/classes, timing constants and storage
keys unchanged. No runtime dependency is added; only Vite, TypeScript and
Vitest are dev dependencies.

**Hard rules**

- One Vite + TypeScript app, no UI framework, no backend, offline-first.
- `strict: true`; no `any` (if ever unavoidable, one line explains why).
- No TODO, no stub, no “rest unchanged”: every file is complete.
- All existing localStorage keys and shapes keep loading unchanged.
- No schema version bump in phases 2–5. Phase 6 adds one optional deck field
  (`presetId`); it is additive, does not change old saves and will be called
  out explicitly.
- Bugs found are reported below and are **not fixed** during the refactor.
  Only bugs that block the preset feature are touched, in phase 6.

Interim strategy: the root `index.html` stays untouched through phase 4, so
`npm run build` keeps producing the current app while the `src/` tree is built
and unit-tested. Phase 5 replaces it with the Vite shell and wires `main.ts`.
This gives a clean before/after comparison and keeps every phase runnable.

---

## 1. Feature inventory

### 1.1 Boot, profiles and local accounts

- Local-only profiles: name (≤20), one of 12 emoji avatars, optional PIN
  (4–12 chars), per-profile storage namespace. No server, no real auth.
- First run: profile creation form is opened; “Cancel” is hidden.
- Profile picker: avatar, lock icon, “New profile” tile; profile names are
  unique case-insensitively.
- PIN: salted SHA-256 via WebCrypto, 32-bit FNV-1a fallback, 5 failed attempts
  → 5 s in-memory throttle with countdown.
- Pre-profiles save (`wordquest.state.v1`) is adopted as a `legacy` profile
  named “Player”, so upgrading loses nothing.
- Auto-unlock: if the active profile has no PIN, boot goes straight to Home;
  otherwise the lock screen is shown.
- Unlock: `lastSeen`, load state, daily reset/hearts, theme/motion/i18n,
  level repair, achievement check, nav reset, Home, save.
- Switch profile: flush save, clear active id, lock screen (settings stay in
  memory for the login chrome).
- Rename profile (prompt, ≤20, uniqueness), change PIN (prompt, empty removes),
  delete profile (its state key is removed).
- Each profile remembers its UI language and theme; login chrome uses the last
  profile’s language/theme.

### 1.2 Import, parsing and preview

- Entry points: Home “New deck”, Home “Sample”, Add-words drop zone, file
  picker (`.txt/.csv/.tsv/text/*`), paste box, “Download sample” button.
- Reader: UTF-8, BOM stripped, CRLF→LF, any file type attempted as text.
- Line grammar: one pair per line; separators strongest-first:
  tab, `=`, `—`/`–`, spaced `-`, `:`/`;`, comma.
- Left side is the foreign word; right side may contain several translations
  separated by `,`, `;` or ` / ` when the line used a stronger separator.
- Ignored: blank lines, `#`, `//`, `;;`; lines with no usable separator or no
  letters on the foreign side become errors with line number and text.
- Duplicate foreign words (case/diacritic-insensitive via `normKey`) merge
  translations, preserving first-seen order.
- Preview: editable foreign and native cells (native comma-separated), row
  delete, live pair count, deck name (≤60), language-pair summary, error card
  (first 30 errors), Save deck.
- Save: drops empty rows, creates ids/stats through `normalizeDeck`, stores the
  native language in settings, defaults UI language to the native one once
  (if a catalogue exists), checks achievements, toasts, opens the deck.
- 40-pair German→Serbian sample (comment wrongly says “20-word”).

### 1.3 Offline language detection and confirmation

- Script counting for Latin, Cyrillic, Greek, Arabic, Hebrew, Devanagari, Thai,
  Hangul, Kana, Hanzi. A dominant non-Latin script (>28 %) wins and is refined
  by marker letters (uk/sr/mk/bg/ru, fa/ar, and the single-language scripts).
- Latin scoring against 21 profiles: stopword hits ×3 (capped), diacritic
  hits ×1.6 (capped), n-gram hits ×0.7 (capped).
- Confidence: script path 0.55–0.99; Latin path 0.3–0.98. Pair confidence is
  `min(a, b)`; “sure” when `> 0.32`.
- Pair orientation: remembered native language wins; otherwise English is
  treated as native when present; otherwise foreign-first is assumed.
- Confirmation screen: two language selects (34 languages, localized names),
  three sample words per side, confidence note, swap sides, cancel, confirm.
  Same-language selection is blocked; the guess is never applied silently.
- Swap sides transforms the pending pairs too, not only the labels.
- “Change” on preview returns to the language screen without losing edits.

### 1.4 SRS, lesson planning and session composition

- Leitner mastery 0–5; intervals 0 / 5 min / 30 min / 6 h / 24 h / 3 days.
- Selection weights 26/20/12/7/4/2, plus `wrong × 2.2` (cap 18), minus
  `streak × 1.5` (floor 1.2), +8 when overdue, ×0.25 if seen <25 s ago.
- Correct answer: seen++, correct++, streak++, record mode, mastery +1, but
  mastery 5 is withheld until at least two distinct modes were answered
  correctly. Wrong: wrong++, streak 0, mastery −2 (floor 0), due in 2 min.
- `trouble()`: words with wrong > 0 or mastery ≤ 1, ranked by
  `wrong×3 − correct + (5−mastery)×2`.
- Lesson builder: 9 mode ids with weights; 8–14 exercises for lessons, 6–12 for
  practice, 6–20 for boss, 60 s for speed. Weighted picks with repeats for tiny
  decks; a memory-match round interleaved at index 2 when the plan has ≥6
  exercises and the pool has ≥3 words (never in speed); no mode twice in a row;
  65 % bias toward modes not yet correct for that word; with
  more than four exercises, the last single-word exercise is moved to the front
  as a flashcard opener (a trailing match is skipped).
- Mode availability: emoji only if a mnemonic exists; listen only when TTS is
  on and `canSpeak(deck.foreignLang)`; scramble only for 3–14 alphabetic
  letters (Latin/Greek/Cyrillic); match only for ≥3 words.
- Hearts: 5/day (configurable off), not used in practice/speed. Boss uses
  hearts.

### 1.5 Exercise modes

- **Flashcard**: 3D flip card, “Still learning” / “I knew it” enabled only after
  flip; learning does not cost a heart but grades the word wrong.
- **Multiple choice, both directions**: 4 options, smart distractors
  (same initial +4, similar length +3, same word count +1), 1–4 keys.
- **Type it, both directions**: text input, progressive hint reveals one letter
  at a time for −2 XP, Enter/Check, typo tolerance ≤1 (≤2 for 8+ letters),
  strict-accent status, Serbian Latin↔Cyrillic equivalence.
- **Memory match**: 4 words (8 cards) or the whole pool when smaller, flip,
  match/mismatch animation, status count; on completion all words are graded
  correct and 5 XP each.
- **Emoji link**: big emoji, pick the foreign word.
- **Listen & pick**: auto-plays after 260 ms, replay button, pick the native
  meaning; toast when no voice is available.
- **Scramble**: full-length slots, letter bank, first empty slot fills in order,
  filled slots clickable to remove, Clear, Check; spaces removed; diacritics
  preserved; replay-safe shuffle guard.
- **Speed round**: 60 s, 4-option questions generated on the fly, combo
  multiplier 1–4 (5 XP × multiplier), no hearts/requeue, best-speed statistic,
  timer turns low at ≤10 s.
- **Boss round**: trouble words (or the whole deck when <2), 6–20 exercises,
  win at ≥60 % accuracy.

### 1.6 Session flow, feedback and results

- Central `answer()` grades the word, updates combo/xp/hearts, saves; wrong
  answers requeue the same mode 3–4 exercises later.
- Full-width feedback sheet (green/red), 52 px Pip mascot, title/message/extra,
  Continue button focused; Enter/Space advances.
- Keyboard: Space flips, 1–4 chooses, Enter checks/advances, Esc quits with
  confirmation.
- Session screen: quit, progress bar, hearts, timer; topbar/tabbar hidden.
- Summary: mascot mood, accuracy/XP/mastered stats, accuracy bar, deck + streak
  + total XP, new badges, review words with mastery tags, Play again, Back to
  decks; XP count-up; confetti/sounds by result.
- End reasons: complete, no hearts, time up, quit.

### 1.7 Gamification

- XP: 10 per correct answer, 5×combo multiplier in speed, −2 per hint.
- Level curve `round(60 × level^1.35)`, max display level 99; level-up toast,
  confetti and win sound.
- Daily goal options 20/50/100/200 XP; SVG ring, percentage, “goal reached”
  mascot mood; due-for-review count.
- Daily streak by local day, with toast at ≥2 days.
- Hearts regenerate on the first visit of a new day.
- 15 badges: first steps, collector, flawless, 3/7/30-day streak, 25/100
  mastered, 500/2000 XP, 10 lessons, 10-combo, 30-speed, boss slayer, night owl.
- Combo popup at ≥3; best combo; best speed; boss wins; perfect lessons;
  night-owl flag.
- Confetti canvas with DPR scaling and reduced-motion guard; Pip mascot with
  happy/sad/party moods and idle bob.

### 1.8 Audio and speech

- Web Audio SFX generated in code: correct, wrong, flip, tap, combo, win, lose,
  hint. AudioContext created on demand after a gesture; suspended contexts
  resumed.
- TTS engines: `auto` (local voice when installed, then online), `browser`
  (Web Speech only), `online` (keyless Google Translate endpoint), plus an
  optional Google Cloud key (voice discovery, quality ranking, MP3 data cache,
  abort handling, broken-key flag).
- TTS mute is independent of SFX; speech stops on every screen change.
- Settings shows the effective engine for the first deck’s foreign language,
  a test button, and a key field; key rejection toasts.
- `canSpeak()` gates listen mode.

### 1.9 Screens and navigation

- 10 screens: login, home, import, lang, preview, deck, session, summary,
  achievements, settings.
- Topbar: back button, fox-badge logo/wordmark (always Home, quit prompt in a
  session), streak/XP pills.
- Tabbar: Home, Badges, Settings; hidden in session/login; Home is highlighted
  for deck/import/lang/preview.
- Back stack, `replace` option, scroll-to-top, `body.in-session`.
- Home: hero + Pip, daily goal ring, due count, continue card (most recently
  opened deck), deck cards with progress, empty state, New deck/Sample.
- Deck: stats, mastery bubbles (colour by mastery), trouble list with TTS,
  lesson/practice/speed/boss buttons, rename/export mnemonics/delete, word
  detail sheet with stats, pronounce and 30-emoji picker.
- Settings: five toggles, UI/native language, goal, theme, voice engine/test/
  key/info, JSON export/import, reset, profile card (switch/rename/PIN/delete),
  storage size.
- Summary and Achievements as described above.
- Theme auto/light/dark, `theme-color` meta, calm motion override, OS
  `prefers-reduced-motion`.

### 1.10 i18n and accessibility

- English + Serbian (Latin) catalogues, 198 keys each, fallback
  locale→English→key, interpolation `{name}`, random arrays via `tRand`,
  `data-i18n`/`data-i18n-aria` re-application, `<html lang>` update.
- UI locale list also names 9 not-yet-translated languages (disabled, “soon”).
- Language names localized to Serbian; TTS tags from the language registry.
- ARIA: landmarks, `aria-label`, `aria-current`, `aria-live`, `role="switch"`,
  `aria-checked`, `aria-pressed`, `aria-modal`, visually hidden headings,
  labelled inputs, focus management in feedback and PIN forms.
- Contrast, dark mode, 390 px layout, reduced motion, no keyboard traps.

### 1.11 Data, export and offline

- JSON export of the whole profile state; import validates only
  `object + Array.isArray(decks)`, migrates onto defaults, saves, re-themes.
- Reset keeps settings, wipes progress/decks.
- Mnemonics export as `word = translations emoji` lines.
- Storage size display in KB.
- Offline-first: only Google Fonts, keyless TTS and optional Cloud TTS use the
  network; the app shell and all learning data are local.

---

## 2. Persisted data

Only two keys (three physical forms) are used:

| Key | Written by | Shape |
| --- | --- | --- |
| `wordquest.profiles.v1` | `saveProfiles()` | `ProfileRegistry` |
| `wordquest.state.v1` | legacy/adopted profile only | `AppState` |
| `wordquest.state.v1::<profileId>` | every normal profile | `AppState` |

`stateKeyFor(profile)` returns the legacy key when `profile.legacy` is true,
otherwise the namespaced key. There is no separate theme/key/streak storage.

```jsonc
// wordquest.profiles.v1
{
  "activeId": "m1abc…",              // string | null
  "list": [{
    "id": "m1abc…",
    "name": "Filip",                 // ≤20
    "emoji": "🦊",                   // one of 12
    "pinHash": "hex…",               // SHA-256 hex, "w…" FNV fallback, or null
    "salt": "hex…",                  // 12 random bytes as hex, or null
    "createdAt": 1760000000000,
    "lastSeen": 1760000000000,       // optional, on unlock
    "lang": "en",                    // optional, mirrored from settings
    "theme": "auto",                 // optional, mirrored from settings
    "legacy": true                   // optional, adopted pre-profile save only
  }]
}
```

```jsonc
// wordquest.state.v1  OR  wordquest.state.v1::<profileId>
{
  "version": 1,
  "settings": {
    "sound": true,
    "tts": true,
    "ttsEngine": "auto",             // "auto" | "browser" | "online"
    "strictAccents": false,
    "hearts": true,
    "calmMotion": false,
    "theme": "auto",                 // "auto" | "light" | "dark"
    "uiLang": "en",                  // any string; only en/sr have catalogues
    "nativeLang": null,              // language code | null
    "dailyGoal": 50,                 // 20 | 50 | 100 | 200 in the UI
    "ttsKey": "AIza…",               // OPTIONAL: absent until saved; plain text
    "uiLangSet": true                // OPTIONAL: absent until first deck save
  },
  "profile": {
    "xp": 0,
    "level": 1,                      // derived from xp
    "streak": 0,
    "lastLessonDay": null,           // "YYYY-MM-DD" | null
    "dailyDay": null,                // "YYYY-MM-DD" | null
    "dailyXp": 0,
    "hearts": 5,
    "maxHearts": 5,
    "achievements": [],              // BadgeId[]
    "lessons": 0,
    "perfectLessons": 0,
    "totalCorrect": 0,
    "totalWrong": 0,
    "lastHeartDay": "2026-10-20",    // OPTIONAL: added by ensureDaily()
    "bestCombo": 0,                  // OPTIONAL: added on first ≥10 combo
    "bestSpeed": 0,                  // OPTIONAL: added after a speed round
    "bossWins": 0,                   // OPTIONAL: added after a boss win
    "nightOwl": true                 // OPTIONAL: added after 00:00–04:59
  },
  "decks": [{
    "id": "m1abc…",
    "name": "Deutsch → Srpski",
    "createdAt": 1760000000000,
    "nativeLang": "sr",
    "foreignLang": "de",
    "lastOpened": 1760000000000,     // OPTIONAL: written, but lost on load (H1)
    "words": [{
      "id": "m1abc…",
      "f": "der Hund",
      "n": ["pas"],
      "emoji": null,                 // custom emoji | null
      "stats": {
        "seen": 0,
        "correct": 0,
        "wrong": 0,
        "streak": 0,
        "mastery": 0,                // 0..5
        "lastSeen": 0,               // epoch ms
        "due": 0,                    // epoch ms
        "modeCorrect": {}            // Partial<Record<ModeId|"speed", number>>
      }
    }]
  }]
}
```

Lifecycle:

1. `loadProfiles()` reads the registry, drops entries without id/name, adopts a
   legacy state if the list is empty and the old key exists.
2. Unlock selects the state key, `loadState()` → `migrate()` merges onto
   `defaultState()` and normalises every deck/word.
3. `save(immediate?)` debounces 220 ms, is a no-op while locked, mirrors
   `settings.uiLang/theme` onto the profile record, then writes the full state.
   `beforeunload` and `visibilitychange` force a write.
4. Export writes `wordquest-backup-YYYY-MM-DD.json` from `S`; import replaces
   `S` with `migrate(parsed)` after a minimal shape check.
5. Reset keeps the settings object and replaces everything else with defaults.
6. Deleting a profile removes its state key. The legacy key is only removed if
   the adopted profile is deleted.

Phase 6 adds one optional, additive field: `decks[].presetId?: string`, and
`normalizeDeck()` must carry it through. No version bump is needed; old saves
have no such field and load unchanged.

---

## 3. Global mutable state

| State | Current type | Owner after refactor | Notes |
| --- | --- | --- | --- |
| `S` | `AppState` (`let`, reassigned) | `storage/state.ts` via `getState/setState` | Reassigned by profile switch, JSON import, reset. Never cache across calls. |
| `PROFILES` | `{activeId, list}` | `storage/profiles.ts` | Registry; mutated and persisted. |
| `unlockedProfile` | `ProfileRecord \| null` | `storage/profiles.ts` | Gates every write. |
| `session` | `SessionState \| null` | `ui/sessionFlow.ts` | One run at a time. |
| `currentScreen` | `ScreenName` | `ui/nav.ts` | Router state. |
| `currentDeckId` | `string \| null` | `ui/nav.ts` | Deck screen target. |
| `navStack` | `ScreenName[]` | `ui/nav.ts` | Unbounded today (M20). |
| `pendingImport` | `PendingImport \| null` | `ui/importFlow.ts` | Survives lang↔preview. |
| `lastHearts` | `number \| null` | `gamification/hearts.ts` | Animation comparison only. |
| `feedbackResolver` | `(() => void) \| null` | `ui/feedback.ts` | One sheet at a time. |
| `speedTimer` | `number \| null` | `modes/speedRound.ts` | Interval id. |
| `saveTimer` | `number \| null` | `storage/state.ts` | Debounce. |
| `toastTimer` | `number \| null` | `ui/toast.ts` | 2600 ms. |
| `pinTargetId` | `string \| null` | `storage/profiles.ts` (UI reads) | PIN panel target. |
| `pinFails`, `pinLockUntil` | number | `storage/profiles.ts` | In-memory throttle. |
| `chosenAvatar` | `string` | `ui/screens/login.ts` | Create form. |
| `uidSeq` | number | `util/core.ts` | Id counter. |
| Audio caches | ctx, voices, cloudVoices, cloudCache, cloudBroken, cloudAbort, onlineEl | `audio/tts.ts` + `audio/sfx.ts` | Reset on key change. |
| FX caches | particles, rAF, canvas | `gamification/confetti.ts` | Resize listener. |
| `EMOJI_INDEX` | `Map<string,string>` | `emoji/index.ts` | Lazy-loadable. |

DOM elements are not held globally; every render queries by id/class, exactly
as today. The refactor must not cache nodes across renders (the legacy app
replaces `innerHTML`).

---

## 4. Bugs and risks (report only)

Severity: **H** = data loss / broken flow, **M** = wrong behaviour or fragile,
**L** = cleanup / semantics. None of these are fixed in phases 2–5.

| ID | Sev | Location | Finding | Impact / suggested fix |
| --- | --- | --- | --- | --- |
| H1 | H | `normalizeDeck` 1672–1682 | Rebuilds decks with a fixed field list and drops `lastOpened` (and any future field). | After every reload all decks tie at 0, so “Continue learning” opens the first deck, not the last. Preserve unknown fields or add `lastOpened` explicitly. Phase 6 must at least preserve `presetId`. |
| H2 | H | `endSession` 4425 + `showScreen` 4519 | Summary is pushed with `navStack` still holding `session`. | Back from the summary re-opens the finished session screen with a stale question. Push summary with `replace`, or drop `session` from the stack. Also causes stack growth. |
| H3 | H | `endSession` 4414 | `session.hearts === Infinity` is converted to `maxHearts`. | Finishing/quitting **practice or speed** refills all hearts. Persist the previous hearts for heart-free runs. |
| H4 | H | speed `setTimeout` 4381–4385 | Callback checks `session.kind` but not `session.ended`. | Quitting within 260/620 ms of an answer can render a new speed question over the summary. Clear timeouts in `endSession`. |
| H5 | H | hint 4041–4043 | Subtracts 2 XP from profile/session but never recomputes `profile.level`. | XP can fall below the current level threshold while the level badge stays high until the next `addXp`. Recompute or forbid negative XP. |
| H6 | H | `buildOptions` 3720–3745, choice 3935–3945 | Distractors exclude only the same word, and only `n[0]` is treated as the correct key. | A listed alternative translation can appear as a distractor and be marked wrong; picking a valid alternative is scored correct but highlighted red. Build options against all accepted translations. |
| H7 | M | 3926 and 3979 | Duplicate `id="btnSpeak"` on choice and type screens. | Invalid HTML; only one screen is rendered at a time today, so it works by accident. Rename to `btnSpeakChoice`/`btnSpeakType`. |
| H8 | M | `defaultState` 1610–1641 vs uses | `ttsKey`, `uiLangSet`, `lastHeartDay`, `bestCombo`, `bestSpeed`, `bossWins`, `nightOwl` are absent from defaults and added lazily. | Export shape depends on usage history; migrations cannot see them. Types mark them optional; adding them would change stored JSON, so leave for an explicit schema pass. |
| H9 | H | settings 5200, export 5230 | Google Cloud key is stored as plain text and included in JSON backups. | Anyone with the browser profile or the backup file can use the key. Mask it, store separately, or exclude it from export. |
| H10 | M | PIN 1737-1753, 1858-1888 | Salted SHA-256 is not a KDF; throttle state is in memory only; PIN can be 4 chars. | Reload resets attempts; offline brute force is cheap. UI already says it is not encryption; use PBKDF2/Argon2 if it is meant as a lock. |
| H11 | M | 5288 | `prompt()` is used to change the PIN. | PIN is displayed in clear text in a browser dialog and cannot be masked. Use the existing PIN form pattern. |
| M1 | M | preview 4845–4860 | Per-input debounce captures the row index; deleting a row re-renders but does not cancel pending timers. | A late callback can edit a different row. Cancel timers on re-render or derive the index at write time. |
| M2 | M | match 4128–4148 | Match mistakes do not grade/heart; a completed board grades every word correct; `setTimeout`s are not cancelled on quit. | Flawless mastery is possible despite many mismatches, and callbacks can advance after the session ended. |
| M3 | M | `openDeck` 4923 | Sets `lastOpened` but does not save until the next answer/screen action. | A refresh immediately after opening a deck loses the “continue” marker (on top of H1). |
| M4 | M | `openWordSheet` 5000–5005 | Sheet is inserted after `#deckStats` and only removed on close/emoji. | Re-rendering or re-entering the deck can leave a stale/duplicate sheet. Remove it in `renderDeck`. |
| M5 | M | many | Hardcoded English outside i18n: badge names/descriptions, word-sheet labels/aria, “(soon)”, “avg / 5”, “due for review”, “Untitled deck”, sample deck name, “seen/correct/wrong/mastery/due”. | Serbian UI shows mixed languages. Move to keys (copy unchanged for EN). |
| M6 | M | `renderLangConfirm` 4792 | “Sure” threshold is 0.32 and the Latin formula is biased high. | Almost every guess looks confident, which weakens the confirmation step. Tune only with evidence. |
| M7 | L | `readFile` 4731–4734 | The extension/type check is an empty `if` block. | Dead code; any file is read as text. Keep or remove deliberately. |
| M8 | L | sample 2058, 4753 | Comment says “20-word” but `SAMPLE_TEXT` has 40 pairs; button labelled “Download sample” opens a preview. | Misleading docs/label. |
| M9 | M | speed progress 3689–3692 | Progress uses `speedLeft / 60`, so the bar starts full and shrinks. | Reads as “progress lost” rather than “time left”; invert if intended as progress. |
| M10 | M | `endSession` 4407–4415 | Every end reason counts a lesson, touches the streak, and can award `perfectLessons`. | Quitting after one correct answer with zero wrong yields a “perfect lesson” and a streak. Gate on `complete` and a minimum of answers. |
| M11 | M | 4411 vs 4450 | A flawless speed round increments `perfectLessons`, but the summary forces `perfect = false` for speed. | Inconsistent badge/confetti/title. |
| M12 | L | `buildSession` 3163+, `startSession` 3649–3651 | A full speed queue is built and immediately discarded. | Wasted work, no user-visible effect. |
| M13 | M | emoji 2434–2860 | Several lexicon entries are wrong/typoed (`zm agati`, Dutch `lijden` under “read”, Swedish `djur` under “lamb”); duplicates are silently first-wins although the comment says “longer keywords win”. | Wrong mnemonics. Data needs a native-speaker pass; lookup semantics should match the comment. |
| M14 | M | `normalizeDeck` 1681 | Words with an empty `n` array are silently dropped. | A valid foreign word can disappear on reload/import. Report it in the UI instead. |
| M15 | M | `migrate` 1660–1701 | No type validation for counters, arrays, theme, uiLang, language codes, deck languages. | Hand-edited/corrupt JSON can produce `NaN`, string concatenation, or thrown renders. Validate at the boundary. |
| M16 | M | `applyI18n` 1535–1541 | Skips every `data-i18n` node that has child elements. | A label with a nested `<span>` silently never translates; easy to trip when editing HTML. |
| M17 | L | settings 5091, 5218 | The goal select only offers 20/50/100/200; another stored value shows blank. | Imported/custom goals look unset. Add a fallback option or clamp. |
| M18 | L | `currentWord` 3714–3718 | Reads `ex.wordId` without narrowing away `match` (undefined at runtime). | Harmless today; type the access explicitly in the new controller. |
| M19 | L | `renderExercise` 3846–3847 | `session.mode` is assigned **after** the mode renderer runs. | A synchronous handler (or throw) sees the previous mode; set it before render. |
| M20 | M | nav 4519, 4544 | `navStack` grows on summary/deck loops and has no dedupe. | Back can revisit dead screens indefinitely. |
| L1 | L | `const Audio` 3235 | Shadows `window.Audio`; code must use `new window.Audio()`. | Easy to break when moving modules. Rename the export (e.g. `sound`). |
| L2 | M | `let S` 1644, 5241, 5259 | Central state is reassigned; any module holding a reference would go stale. | The refactor must use `getState()` at call time. |
| L3 | L | `UI_LOCALES` 1505–1517, 5086 | Nine locales without catalogues; “(soon)” is hardcoded English. | Disabled options are fine, the suffix is not localized. |
| L4 | L | `loginChrome` 1768–1778 | Mutates `S.settings` before a profile is unlocked. | Login screen locale/theme leak into the next profile only until its state loads; harmless but surprising. |
| L5 | M | `speakOnline` 3427–3474 | Returns `true` when playback is only initiated; autoplay/network failures can be silent. | Listen mode may show no sound and no toast. Return a meaningful result or surface the fallback. |
| L6 | L | `totalSeen` 3578 | Counts every view, not distinct words; badge copy says “See 10 words”. | Badge is earned by repetitions. Keep or clarify. |
| L7 | L | `t()` 1520 + `let S` 1644 | `t()` reads `S` before its declaration in source order. | Safe only because no call happens during module evaluation. Module split must initialise state first. |
| L8 | L | 4410 | `lessons` increments for lesson, practice, speed and boss. | “Finish 10 lessons” badge counts all session kinds. |
| L9 | L | speed/boss | Speed has no hearts/requeue and uses combo XP; boss uses normal hearts but a 60 % win threshold. | Documented semantics, not a bug; tests must pin them. |
| L10 | L | 2058, 4753 | Sample name `German → Serbian sample` is hardcoded English. | Mixed-language UI in SR. |
| L11 | L | 5086, 5209 | `uiLang` from storage is not validated; t() falls back to English. | A corrupt locale leaves a disabled/blank select. |
| L12 | L | 1677–1678 | Deck language codes from JSON are not validated. | Unknown codes reach `LANGUAGES` lookups and TTS tags. |
| L13 | L | 3029 | Comment says “fold đ/đ” (typo). | Documentation only. |
| L14 | L | 5325 | Uses `MediaQueryList.addEventListener` without the legacy `addListener` fallback. | Old Safari won’t live-update theme. |
| L15 | M | `ensureDaily` 4612 | Runs only on Home render/unlock. | If the app stays in a session past midnight, the new day’s goal/hearts are not applied until Home. |
| L16 | L | speed timer 4325 | `setInterval` is throttled in background tabs. | A “60 s” round can last longer when the tab is hidden. |

---

## 5. Target structure and dependency rules

The requested layout is kept. Three additions are needed and are called out:

- `src/util/core.ts` — pure shared helpers (`clamp`, `rand`, `sample`,
  `shuffle`, `uid`, `dayKey`, `daysBetween`, `humanDue`, `debounce`). Without
  it, storage/engine/UI would duplicate them or import “upwards”.
- `src/ui/nav.ts` + `src/ui/sessionFlow.ts` — navigation state and the session
  controller. They let modes call `answer/next` and screens call `showScreen`
  without circular screen↔router imports.
- `src/ui/languageSelect.ts` — the localised `<option>` builder shared by the
  language-confirmation and settings screens, so that markup is not duplicated.
- `src/styles/index.css` — the single CSS entry that imports the five requested
  stylesheets in the original order.

```
index.html                     # phase 5; exact body markup, module entry
package.json  tsconfig.json  vite.config.ts  .gitignore
LICENSE  README.md             # README in phase 7

src/
  main.ts                      # phase 5
  types.ts                     # phase 1 (done)
  util/core.ts
  storage/
    keys.ts  state.ts  profiles.ts  pin.ts  migration.ts  backup.ts
  i18n/
    en.ts  sr.ts  index.ts
  parser/
    separators.ts  parseWordList.ts  sample.ts
  language/
    languages.ts  names.ts  latinProfiles.ts  scripts.ts  detect.ts
    normalize.ts               # normKey, Latin↔Cyrillic, answer normalisation
  emoji/
    lexicon.ts  index.ts       # lookup + lazy loader
  engine/
    srs.ts  options.ts  answer.ts  xp.ts  session.ts
  modes/
    flashcards.ts  multipleChoice.ts  typeIt.ts  memoryMatch.ts  emojiLink.ts
    listenPick.ts  scramble.ts  speedRound.ts  bossRound.ts  index.ts
  audio/
    sfx.ts  tts.ts  index.ts
  gamification/
    achievements.ts  confetti.ts  hearts.ts  combo.ts  mascot.ts
  ui/
    dom.ts  nav.ts  router.ts  topbar.ts  toast.ts  feedback.ts
    theme.ts  mnemonic.ts  wordSheet.ts  importFlow.ts  sessionFlow.ts
    languageSelect.ts
    screens/
      login.ts  home.ts  import.ts  lang.ts  preview.ts  deck.ts
      session.ts  summary.ts  achievements.ts  settings.ts
  presets/                     # phase 6
    index.ts  merge.ts  ui.ts  data/*.txt
  styles/
    base.css  components.css  screens.css  themes.css  motion.css
    presets.css                # phase 6
    index.css
```

Dependency direction (arrows point to dependencies):

```
types ← util ← storage ← i18n
types ← language ← parser
types ← emoji ← engine
engine ← audio/gamification ← modes
modes/ui-primitives ← ui/sessionFlow ← ui/screens ← ui/router ← main
```

- `types.ts` has no runtime imports.
- Screens never import the router; they navigate through `ui/nav.ts`. The only
  screen-to-screen imports are acyclic action helpers (`settings` → `login` for
  profile switching, `home`/`preview`/`summary` → `deck` for `openDeck`).
- `storage` never imports UI/i18n; functions return results and the caller
  toasts. `state.ts` exposes `getState()`/`setState()`; nobody imports a
  mutable `S` binding.
- `i18n` reads the current locale through `getState()`.
- `engine` is DOM-free. `modesFor`/`buildSession` receive a `canSpeak`
  capability from the caller instead of importing audio.
- `audio` may import `ui/toast` for the rejected-key toast; `ui/toast` imports
  only DOM + i18n.
- `modes` import `ui/sessionFlow` for `getSession/answer/next`, and
  `ui/feedback`/`ui/toast` for presentation.
- `ui/sessionFlow` gets its exercise renderer and summary/navigation host via
  registration (`setExerciseRenderer`, `initSessionFlowHost`) so it does not
  import modes/screens back.
- `ui/screens/*` never import each other; navigation goes through `ui/nav.ts`.
- `main.ts` imports styles, binds the router, preloads the emoji lexicon and
  boots the profile flow.

State that was global becomes module state with explicit accessors:
`getState/setState`, `getProfiles/getUnlockedProfile`, `getSession/setSession`,
`getPendingImport/setPendingImport`, `getCurrentScreen`, `getCurrentDeckId`.
Every call site reads at call time, preserving live-binding semantics after
profile switch/import/reset.

---

## 6. Extraction order

### Phase 2 — Foundation

Files: `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`,
`src/util/core.ts`, `src/styles/{base,components,screens,themes,motion,index}.css`,
`src/i18n/{en,sr,index}.ts`,
`src/storage/{keys,state,profiles,pin,migration,backup}.ts`.

- Config: Vite `base: './'`, ES2022, `tsc --noEmit` in `build`, Vitest node
  environment and `src/**/*.test.ts` include.
- CSS is moved **verbatim** into five files, imported in the original section
  order: tokens/base → components → screens → themes → motion. No selector,
  value, media query or animation is edited. Verify rule count and brace
  balance, then compare computed styles against the legacy app.
- i18n: every key/value/array copied exactly; `t`, `tRand`, `applyI18n`,
  `UI_LOCALES`, fallback order preserved. `sr` remains Latin script.
- Storage: keys, defaults, merge/migrate, `normalizeDeck/Word`, save debounce/
  gating, profile registry, PIN hashing/throttle, backup export/import.
  `normalizeDeck` reproduces the current field list exactly (including H1).
- `index.html` is still the old app; `npm run build` reproduces it. The new
  modules are type-checked but not imported yet.

Acceptance: `npm run typecheck`, `npm run build` (old app), CSS rule/brace
comparison, i18n key parity audit.

### Phase 3 — Core logic + tests

Files: `src/parser/{separators,parseWordList,sample}.ts`,
`src/language/{languages,names,latinProfiles,scripts,detect,normalize}.ts`,
`src/emoji/{lexicon,index}.ts`,
`src/engine/{srs,options,answer,xp,session}.ts`,
tests: `src/parser/parseWordList.test.ts`, `src/language/detect.test.ts`,
`src/language/normalize.test.ts`, `src/engine/srs.test.ts`,
`src/engine/options.test.ts`, `src/engine/answer.test.ts`,
`src/engine/session.test.ts`, `src/engine/xp.test.ts`.

- Reproduce parser edge cases, script/Latin detection, all 34 languages,
  Serbian names, 21 Latin profiles, 10 script ranges, 412 emoji entries (the
  legacy comment still says “320+”).
- SRS weights/intervals/grade/master/avg/trouble; weighted picks; lesson
  composition rules; distractor construction; typed-answer verdicts; XP curve.
- Tests are characterisation tests: they pin current behaviour **including the
  known bugs** (e.g. H6 and M2) so a later fix must change a test deliberately.
- `canSpeak` is injected into `modesFor`/`buildSession`.

Acceptance: `npm test`, `npm run typecheck`, unchanged old app.

### Phase 4 — Audio, gamification, modes

Files: `src/audio/{sfx,tts,index}.ts`,
`src/gamification/{achievements,confetti,hearts,combo,mascot}.ts`,
`src/ui/{dom,nav,toast,feedback,mnemonic,sessionFlow}.ts`,
`src/modes/{flashcards,multipleChoice,typeIt,memoryMatch,emojiLink,listenPick,scramble,speedRound,bossRound,index}.ts`.

- SFX/TTS: same frequencies, envelopes, engines, caches, fallbacks, constants.
  Rename the module export from `Audio` to `sound` (L1) without changing calls.
- Gamification: 15 badges, confetti, hearts/day regen, combo, mascot SVG/moods.
- Modes: the exact template strings, listeners, keyboard hooks, timings,
  feedback copy and grade calls. Each mode file exports one render function.
- `sessionFlow` owns `session`, `answer`, `nextExercise`, `endSession`,
  `startSession`, speed timer hooks. Its host/renderer are registered in phase 5.

Acceptance: type-check; a small DOM smoke test is optional (no jsdom added
unless needed); old app still builds.

### Phase 5 — UI, router, main

Files: `index.html` (Vite shell with the exact legacy body),
`src/main.ts`, `src/ui/{router,topbar,theme,wordSheet,importFlow,languageSelect}.ts`,
`src/ui/screens/{login,home,import,lang,preview,deck,session,summary,achievements,settings}.ts`.

- Replace the inline app with the module entry (same markup, ids, classes,
  inline styles, aria attributes, fonts, meta).
- Router reproduces `showScreen` exactly: stop speech, push unless replace,
  screen activation, back button visibility, tabbar highlight/hide,
  `body.in-session`, pills, scroll-to-top, per-screen render.
- Wire every listener from the legacy app, in the same order, including
  `beforeunload`/`visibilitychange`, Escape, logo, tabs, import, preview,
  deck actions, settings, profiles, theme/motion.
- Boot order: load profiles → theme/motion → active profile/auto-unlock →
  topbar/toggles → level repair → achievements → save → audio unlock → keydown
  → unload hooks. Emoji lexicon is awaited before the first screen render.

Acceptance: all 10 screens match screenshots; the manual checklist begins.

### Phase 6 — Presets

Files: `src/presets/index.ts`, `src/presets/merge.ts`, `src/presets/ui.ts`,
`src/presets/data/*.txt` (13 packs), `src/presets/presets.test.ts`,
`src/styles/presets.css`, plus complete updated `src/types.ts`,
`src/storage/migration.ts`, `src/ui/screens/import.ts`,
`src/ui/screens/home.ts`, `src/i18n/en.ts`, `src/i18n/sr.ts`,
`src/styles/index.css`.

- Registry entry: `id`, `{en,sr}` title/description, `foreignLang`,
  `nativeLang`, `category`, `level`, `load: () => import('./data/x.txt?raw')`.
  One `.txt` + one entry adds a pack. `wordCount` is computed by parsing the
  loaded text (metadata loads lazily with the cards), never hardcoded.
- 13 packs: German→Serbian top 300 + 9 themes; English→Serbian top 300 +
  phrases + verbs. Themed packs 40–80 pairs. (Interpretation: the two “Top
  300” packs really contain 300 pairs; the 40–80 guidance applies to themed
  packs. Flagged in phase 6 if that is not intended.)
- Preview modal: first 10 pairs, total, pair, “Add as new deck”, “Add to
  existing deck” (picker restricted to decks with the same pair; merge by
  `normKey(f)`, skip duplicates, report added count). “Already added” state by
  `presetId`; re-add stays possible.
- Presets skip language confirmation, get `presetId`, behave like normal
  words/decks (TTS, emoji, SRS, export/import, rename, delete).
- Home empty state: “No decks yet. Pick a ready-made pack or upload your own”
  with a link to the packs section.
- `normalizeDeck` gains `presetId` (additive; H1 remains unfixed unless the
  user requests it). `presetId` is singular, so a deck that receives several
  packs can only remember one of them (documented limitation).

Acceptance: preset data test (no duplicate foreign keys, all pairs parse, word
counts, language pair), browser pass of filters/preview/merge/re-add, storage
round-trip.

### Phase 7 — Verification and docs

Files: `README.md`, `docs/REGRESSION.md`, `docs/BEHAVIOR-DIFFERENCES.md`,
`LICENSE` (MIT, `Copyright (c) 2026 Filip Djuric`).

- Full manual checklist (profiles, import, detection, all modes, SRS, XP,
  hearts, streak, badges, settings, export/import/reset, presets).
- Old vs new: DOM id/class inventory, computed styles at 390 px and 1280 px in
  light/dark, EN/SR copy, localStorage diff after the same actions, keyboard
  and screen-reader semantics.
- Build/deploy: `npm ci`, `npm test`, `npm run build`, `vite preview`; Vercel
  static output `dist/`; no GitHub Pages.
- Behaviour-differences list: the target is “none”; the only intentional
  differences are the Vite asset pipeline and the code-split emoji lexicon
  preloaded during boot (so the first screen can still render emoji).

---

## 7. Behaviour-preservation checklist for every phase

1. No user-facing string, key name, id, class, data attribute, aria attribute,
   inline style or element order changes (presets add new ones in phase 6).
2. CSS stays rule-for-rule and in the same order; no token value changes.
3. Storage keys, defaults, optional-field behaviour, debounce and write gating
   stay identical. No `version` bump.
4. Randomness is not refactored into injected RNGs; the same `Math.random`
   calls remain in the same order. Tests stub `Math.random` only.
5. Timing constants stay: save 220 ms, toast 2600 ms, match 520/620 ms, speed
   260/620 ms, listen 260 ms, PIN 5 s, TTS caches 240.
6. Profile switching/import/reset must be followed by reads through
   `getState()`, never a cached object.
7. Every phase finishes with `npm run typecheck`; phases 2–4 also run
   `npm run build` against the untouched legacy `index.html`; phase 5 onward
   runs the new app.
