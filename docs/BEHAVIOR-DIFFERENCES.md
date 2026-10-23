# Behaviour differences — legacy single-file app vs Vite refactor

The target for existing flows was **no behaviour differences**. The phase 5
side-by-side comparison and the phase 7 regression pass found none in profiles,
import/detection/preview, decks, the nine modes, SRS/XP/hearts/streaks/badges,
settings, export/import/reset, copy, timings or storage shape.

The differences below are the intentional ones the refactor required, plus the
requested ready-made-pack feature. Anything not listed here is a regression, not
an accepted difference.

## 1. Vite build and asset pipeline

| Legacy single file | Vite project | User-visible effect |
| --- | --- | --- |
| Inline CSS and one inline script | Split modules compiled to hashed `.js`/`.css` assets, injected by Vite | Same DOM, same computed styles; the browser now makes normal module/CSS requests |
| Opened directly from disk | Must be served by a static host (`vite`, `vite preview`, Vercel) | ES modules cannot run from `file://`; deployment is `dist/` |
| One inline emoji map | `lexicon-<hash>.js` lazy chunk, awaited during boot before the first screen renders | One extra request and a slightly later first paint; emoji lookup itself is identical and synchronous thereafter |
| No build step | `tsc --noEmit && vite build`; `base: './'` | Static, relative asset URLs; works from any path on Vercel |

The CSS import order is `base → components → screens → mascot → themes →
motion → presets`, matching the legacy cascade. The only stylesheets that did
not exist before are `presets.css`, scoped to the new pack UI, and `mascot.css`,
scoped to the shared fox.

`index.html` remains the Vite entry and still contains all ten legacy screens,
ids, classes, ARIA attributes, inline styles and copy. The new pack section,
import-screen shortcut, preview dialog, head icon links, mascot slots and
module script are insertions; legacy elements keep their order and identity.

## 2. Ready-made packs (new feature)

This is the one new product surface, requested after the refactor:

- **Home:** a "Ready-made packs" section below the deck list, language and
  category chips, debounced search, pack cards, an "Already added" state, and
  the new empty-state copy "No decks yet. Pick a ready-made pack or upload your
  own."
- **Import screen:** a compact "Ready-made packs" section with six featured
  cards (one per language), plus a "Browse all" button that returns Home,
  scrolls to the full section and focuses search. Upload/import behaviour is
  unchanged.
- **Preview dialog:** first 10 pairs, total count, pair, level, "Add as a new
  deck", and a same-pair deck picker plus "Add to this deck". Escape, backdrop
  and the close button dismiss it.
- **36 packs:** 10 German→Serbian (top 300 + nine themes), 6
  English→Serbian (top 300 + phrases + verbs + food + travel + home), and
  5 each Italian→Serbian, Spanish→Serbian, French→Serbian and
  Hungarian→Serbian (food, travel, home, verbs, phrases), all authored data in
  `src/presets/data/*.txt`.
- **One registry entry per pack.** Adding a pack means one `.txt` plus one
  `PRESETS` entry; the count is parsed from the file, not hardcoded.
- **Lazy loading:** the registry and cards ship in the main bundle, while each
  pack's text is a separate `?raw` chunk fetched only when its metadata is
  needed. This is visible in DevTools as 36 additional chunks after browsing
  the section, never on first load.

Preset merges are additive and never replace user words. They skip duplicates
by normalised foreign word, initialise all progress at zero, and report the
number actually added. Re-adding the same pack reports that every word is
already present.

## 3. `presetId` in deck storage

`Deck` gains one optional field, `presetId`. It is written only by the new pack
flow and preserved by `normalizeDeck()`.

- A deck created through import, sample data or a backup without `presetId`
  serialises exactly as before; `lastOpened` is still dropped on load (H1).
- No storage key, profile shape, `SCHEMA_VERSION`, settings field or default
  changed.
- The JSON backup format remains compatible in both directions: old backups
  load (no `presetId`), and new backups contain an extra optional field that the
  legacy app ignores.
- Limitation: a deck remembers only the most recently merged pack, because
  `presetId` is singular. The words from earlier packs are kept; re-adding an
  earlier pack reports duplicates rather than a false “already added” badge.

## 4. `data-i18n-placeholder`

`applyI18n()` now also fills `data-i18n-placeholder`, so the new pack search box
can have a translated placeholder. No legacy element used this attribute, so
existing labels, placeholders and aria strings are unchanged.

## 5. App icons and web manifest

New files under `public/` and new `<head>` links:

- `favicon-32.png` → 32 px favicon
- `icon.svg` → scalable favicon
- `apple-touch-icon.png` → Apple touch icon
- `site.webmanifest` → app name, colours, standalone display and icon set
- `icon-192.png` / `icon-512.png` → manifest `any`
- `icon-maskable.svg` / `icon-maskable-512.png` → manifest `maskable`

All icon artwork uses the same purple-and-white WordQuest "W" card mark as the
header brand, so browser chrome, install prompts and bookmark/home-screen icons
match the product. This changes only browser chrome, install prompts and
bookmark/home-screen icons. It adds no service worker and no offline cache; the
app remains offline-first in the sense that all data stays local and no runtime
API is needed, not in the sense of a cached installable PWA.

## 6. Accepted operational differences

- The first load fetches the main module, CSS and the emoji lexicon before the
  first screen. The legacy inline file rendered without those requests.
- If an asset chunk is missing from a broken deployment, boot cannot complete;
  the legacy single file had no separate chunks to lose. Normal `vite build`
  output and `vite preview` were verified.
- Production filenames are content-hashed. Hard-coded links to old JS/CSS names
  are not part of the app contract.
- The development server uses Vite HMR; production behaviour is what the
  regression checklist covers.

## 7. Deliberately unchanged (including known bugs)

- H1: `lastOpened` is still written and then dropped by `normalizeDeck()`.
- Badge names/descriptions remain hardcoded English (M5).
- Achievements unlocked during deck creation are persisted on the next save,
  not immediately (legacy save/check order).
- `applyI18n()` still translates only the attributes legacy supported, plus the
  new placeholder hook above; dynamic strings still use their existing code.
- All storage keys, defaults, save debounce (220 ms), feedback timings, keyboard
  shortcuts, mode composition, SRS maths, XP curve, hearts and streak rules are
  unchanged and pinned by characterisation tests.
- The legacy UI copy, emoji choices and sounds are unchanged. TTS now ranks
  installed voices, prefers a natural local voice or the online voice, refuses
  to read a non-English word with an unrelated default voice, and works around
  Google's keyless-endpoint Referer check. The mascot artwork and animation now
  come from the supplied animated fox and use the additive states `idle`,
  `happy`, `celebrate`, `sad` and `thinking`; no saved-data shape changes.

## 8. Verification

- `docs/REGRESSION.md` records the automated gates, the nine-mode browser smoke
  test, profiles, settings/themes, presets and the known issues above.
- `src/**/*.test.ts` contains characterisation tests that would fail if an
  existing rule, string, storage shape or known bug changed unintentionally.
- The phase 5 visual comparison used the preserved single-file app at
  `%TEMP%\wordquest-legacy-index.html` for side-by-side screenshots and DOM/CSS
  inventory.
