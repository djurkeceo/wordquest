# Regression checklist — Vite refactor

This is the final verification record for the multi-file refactor. The source of
truth was the preserved single-file app at
`%TEMP%\wordquest-legacy-index.html`; phase 5 compared the new screens against it
side by side. Phase 7 re-ran the automated suite, the production build, the
preset flows and a nine-mode browser smoke test.

## Environment

| Item | Value |
| --- | --- |
| OS | Windows, Chrome/Chromium desktop |
| Node | 24.20.0 local verification; `engines` requires >=20.19 (README development note says Node 22) |
| Package manager | npm, lockfile committed |
| Test runner | Vitest 4 (node environment) |
| App shell | Vite 6, `base: './'` |

## Automated gates

| Command | Result |
| --- | --- |
| `npm ci` | Pass, 43 packages, 0 vulnerabilities, lockfile honoured |
| `npm run typecheck` | Pass, strict mode, no `any` added |
| `npm test` | Pass: 11 files, 79 tests |
| `npm run build` | Pass: 110 modules, `dist/index.html`, one CSS file, main JS, lazy emoji lexicon, 36 lazy pack chunks |
| `npm run preview` | Pass: production build served and exercised over HTTP |

Preset data tests pin:

- 36 registry entries, unique ids, 10 German→Serbian + 6 English→Serbian +
  5 each Italian→Serbian, Spanish→Serbian, French→Serbian and Hungarian→Serbian.
- Food, travel, home and verb packs exist for every advertised language.
- Both starter packs parse to exactly 300 pairs; every themed pack is 40–80 pairs.
- No duplicate normalised foreign keys inside a pack; every pack parses with no
  line errors.
- Every pair has both sides; metadata is complete in English and Serbian.
- Merge skips duplicates, reports the added count, is idempotent on re-add, sets
  `presetId`, and starts all progress at zero.
- `normalizeDeck()` keeps `presetId` and still drops `lastOpened` (H1).

## Manual checklist

Marked `P7` when exercised in this phase, `P5` when the phase 5 side-by-side
comparison covered it, and `P3` when the behaviour is pinned by engine tests.

### Profiles and unlock

- [x] First-run login creates a profile and adopts legacy state (P5).
- [x] PIN create, unlock, wrong PIN, change and remove (P5; headless prompts for
      rename/change PIN are auto-dismissed, so those two were code-reviewed).
- [x] Switch profile, per-profile decks/XP/settings stay separate (P5).
- [x] Delete profile with confirmation (P5).
- [x] Boot auto-unlocks a profile with no PIN and shows Home (P7).

### Import, detection and preview

- [x] Paste a four-pair German→Serbian list, parse, confirm the detected pair,
      save, and land on the new deck (P7).
- [x] Drag/drop and file-picker paths (P5).
- [x] UTF-8 BOM, comments, blank lines, mixed separators and duplicate merge
      (P3 parser tests).
- [x] Detection with short lists, swapped columns and Serbian Latin/Cyrillic
      (P3 + P5).
- [x] Preview edits, delete-row, name editing and unparseable-line report (P5).
- [x] Sample download and built-in sample deck (P5).

### Decks

- [x] Home deck list, mastery counter, continue card and daily goal (P7).
- [x] Open, rename, delete, export single deck and word-sheet editing (P5; prompts
      code-reviewed).
- [x] Empty state now reads “No decks yet. Pick a ready-made pack or upload your
      own.” and its button reaches the packs section (P7).

### Nine modes

- [x] Flashcards: flip, self-grade, feedback and next (P7).
- [x] Multiple choice: both directions (P7).
- [x] Type it: forward and reverse, typo tolerance, hint path (P7 + P3).
- [x] Memory match: 4 pairs, mismatch reset, completion (P7).
- [x] Emoji link (P7).
- [x] Listen & pick: TTS prompt, options, feedback (P7; speech availability
      depends on the browser voice).
- [x] Letter scramble: tile bank, clear, check, article-aware answer (P7).
- [x] Speed round: 60-second timer, live options, combo, timer reset (P7).
- [x] Boss round: unlocked by trouble words, starts from the deck (P7).

### Progression and gamification

- [x] Correct answers award XP and update the topbar immediately (P7; 20 XP
      after the first graded answers, 125 total after the smoke run).
- [x] Hearts render and wrong answers consume them; heart regeneration logic is
      unchanged (P3 + P5).
- [x] Streak, daily goal and level-up copy (P3 + P5).
- [x] Achievements screen renders all 15 badges with locked/unlocked state (P7).
      The legacy “save before `checkAchievements()`” ordering is preserved, so a
      badge unlocked by deck creation can appear one save late (known bug).
- [x] Confetti and sound hooks fire without console errors (P5/P7).

### Settings, themes and data

- [x] Theme select: `auto` → `dark`, `data-theme` and stored setting update (P7).
- [x] UI language switch EN ↔ SR updates static labels and `document.lang` (P7).
- [x] Sound, TTS, strict accents, hearts, calm motion and daily goal controls
      (P5; storage shape pinned by tests).
- [x] Hungarian on a PC without a Hungarian system voice: Auto uses the keyless
      online voice (HTTP 200 `audio/mpeg`, no Referer), and Browser mode refuses
      to read it with an unrelated English default voice.
- [x] The temporary no-referrer meta used for the keyless endpoint is removed
      after the request, so a referrer-restricted Google Cloud key still works.
- [x] Export JSON produces a download without console errors (P7 click path).
- [x] Import JSON replaces the active profile state after confirmation (P5).
- [x] Reset clears decks/progress and keeps the profile (P5).
- [x] Storage keys unchanged: `wordquest.profiles.v1` and
      `wordquest.state.v1::<id>`; no `version` bump (tests).

### Ready-made packs (new)

- [x] All 36 cards render with computed counts, pair, level and category (P8).
- [x] Language chips list German, English, Italian, Spanish, French and
      Hungarian; selecting one limits the category chips to subjects that
      language actually has (P8).
- [x] Switching from German + Health to Spanish resets the hidden category to
      All instead of showing a misleading empty grid (P8).
- [x] Category and search filters still combine with the selected language; search
      filters after the 120 ms debounce (P8).
- [x] No-match search shows the empty message (P7).
- [x] Preview shows the first 10 pairs, total, pair, level and “…and N more”; the
      Spanish phrases preview kept its accents and added 41 words as a new deck
      with the Spanish→Serbian pair (P8).
- [x] Add as new deck: 60-word food pack, 61-word phrases pack, language pair and
      `presetId` stored (P7).
- [x] Merge into a same-pair deck: travel pack added 59 new words because one
      foreign word overlapped food; deck reached 119 words and `presetId` became
      the latest pack (P7).
- [x] Re-add the same pack reports “every word is already in that deck”, adds no
      deck and leaves the word list unchanged (P7).
- [x] “Already added” badge appears on the remembered pack after returning Home
      (P7).
- [x] Adding a pack skips language confirmation and switches a fresh UI to
      Serbian when the native side is Serbian (P7).
- [x] Import screen shortcut returns Home, scrolls to the section and focuses
      search (P7).
- [x] Import screen teaser shows one featured pack per language (six cards)
      instead of four German cards (P8).
- [x] Modal closes via the close button, backdrop and Escape; focus returns to
      the opener (P7).

### Mascot and icon artwork

- [x] One shared fox SVG is mounted at a time, including when feedback opens
      over a lesson; moving between screens does not leave duplicate copies.
- [x] All five states render: `idle`, `happy`, `celebrate`, `sad`, `thinking`.
- [x] Correct answers/combo increases show `happy`; wrong answers show `sad`;
      level-ups and perfect/new-badge summaries show `celebrate`; hints, Boss
      intro, PIN hashing and pack loading show `thinking`.
- [x] Reactions auto-reset: the goal celebration on Home and the summary
      celebration never stay looped, and starting a new run always begins idle.
- [x] Pin hashing holds `thinking` for at least 450 ms, so the pose is visible
      instead of flashing.
- [x] The lesson fox sits in a dedicated perch above the exercise (not in the
      progress bar); the feedback fox is also larger.
- [x] `prefers-reduced-motion: reduce` removes loops and transitions and leaves
      a static pose; calm mode does the same. Changing the OS setting while the
      app is open takes effect immediately (media-query listener).
- [x] Hiding the tab pauses all fox animations through `data-paused`.
- [x] Pointer tracking works on desktop in `idle`/`happy` only and never runs
      on a touch/coarse-pointer device or with reduced/calm motion.
- [x] Light and dark themes, and 320/390 px phone layouts, show the mascot
      without horizontal overflow. The scarf uses a lighter purple in dark mode
      for contrast.
- [x] Lesson, deck, feedback and login mascots are decorative (`aria-hidden`,
      no `tabindex`, no key handler); Home and Summary give the fox an
      accessible name.
- [x] The icon set uses the same purple-and-white "W" card mark as the header
      brand: `icon.svg`, `icon-maskable.svg`, `icon-192.png`, `icon-512.png`,
      `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon-32.png`.

### Icons, manifest and deployment

- [x] `favicon-32.png` is the 32 px favicon; `icon.svg` is the scalable favicon.
- [x] `apple-touch-icon.png` is the Apple touch icon (180×180).
- [x] `icon-192.png` and `icon-512.png` are manifest `any` icons.
- [x] `icon-maskable-512.png` and `icon-maskable.svg` are manifest maskable icons.
- [x] `site.webmanifest` returns 200 and every icon path returns 200 from
      `vite preview`.
- [x] `theme-color` follows the active theme (`#6C4BF6` light, `#12121E` dark)
      and updates when the theme or OS preference changes.
- [x] Production output is static and relative (`base: './'`), suitable for
      Vercel with build `npm run build` and output `dist`.
- [x] The optional Google TTS key is client-side by design; the Settings hint
      tells users to restrict it to the site and the Text-to-Speech API.

## Layout and accessibility spot checks

- Desktop (≈1577 px viewport): packs grid fills three columns, modal is a centred
  560 px sheet, tabbar stays fixed.
- Narrow/mobile layout was compared in phase 5 at 390 px using the legacy
  breakpoints; the packs grid uses `auto-fill/minmax(230px, 1fr)` and the modal
  becomes a bottom sheet under 640 px. The Add words teaser uses the same grid
  at `minmax(190px, 1fr)` and stays one column at 320 px.
- The lesson perch scales from 108 px on desktop to 88 px on phones and 76/58 px
  on short viewports; 320×640 and 320×480 iframes show no horizontal overflow.
- Every new control is a real button/input, has an accessible name, and the
  search/chips use translated `aria-label`s.
- The preview dialog has `role="dialog"`, `aria-modal`, a labelled title, focus
  moves to Close on open, and Escape closes it.
- Existing skip link, focus rings, `aria-live` regions and reduced-motion rules
  are untouched.

## Known issues deliberately preserved

These predate the refactor and are documented rather than fixed:

- **H1:** deck `lastOpened` is written but dropped by `normalizeDeck()` on load.
- `presetId` is singular: merging a second pack into a deck makes the deck
  remember only the latest pack. The old pack's words remain and re-adding it
  reports duplicates.
- Achievements unlocked during deck creation are persisted on the next save, not
  immediately (legacy save/check order).
- Headless `prompt()` dialogs are auto-dismissed, so profile/deck rename and PIN
  change were not replayed interactively in phase 7; their handlers are unchanged
  from phase 5.
- Badge names/descriptions remain hardcoded English (M5).
- Speed-round timers and TTS voices depend on the client; automated tests do not
  assert wall-clock timing or audio output.

## Final result

No regression was found in the refactored flows. The only deliberate
behavioural additions are the ready-made packs, the app icons/manifest, the
animated mascot refresh, and the build-time code splitting described in
`BEHAVIOR-DIFFERENCES.md`.
