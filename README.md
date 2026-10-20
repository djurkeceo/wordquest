# WordQuest 🦊

A single-file language-learning game. Import your own word list, let WordQuest work out which
languages you are studying, and practise with spaced repetition, nine exercise types and a friendly
fox called Pip.

No build step, no backend, no tracking — the whole app is one `index.html`.

![WordQuest home screen](assets/screenshot.png)

## Why

Most vocabulary apps make you pick a course from their catalogue. WordQuest starts from *your*
list: a text file, a pasted column from a spreadsheet, or anything you can drag onto the page.
Everything else — language detection, exercise choice, difficulty — adapts to that list.

## Features

### Import and decks
- **Three ways in:** drag & drop, file picker, or paste text.
- **Flexible format:** `-` `–` `—` `=` `:` `;` tab and comma all separate the two sides.
- Skips blank lines and `#` comments, strips a UTF-8 BOM, merges duplicate words, and keeps
  several translations per word.
- **Editable preview** before saving — fix a line or delete a row; unparseable lines are reported
  with their line numbers instead of failing silently.
- Unlimited decks. Rename, delete, or switch between them at any time.

### Language detection
- Works offline: script ranges, stopword lists, diacritics and character n-grams.
- You confirm the guess once with two dropdowns; the native language is remembered.
- Serbian is supported in both scripts (Latin and Cyrillic), including transliteration between them.
- Optional accent-insensitive matching (`cafe` = `café`) for typing exercises.

### Nine ways to practise
| Mode | What it trains |
| --- | --- |
| Flashcards | Self-graded recall, both directions |
| Multiple choice | Recognition, foreign → native and native → foreign |
| Type it | Production, with a progressive hint and typo tolerance (Levenshtein) |
| Memory match | Pair foreign words with translations |
| Emoji link | Pick the word from a picture |
| Listen & pick | Ear training with text-to-speech |
| Letter scramble | Spelling and word shape |
| Speed round | 60 seconds, combo multiplier, one point per correct answer |

A lesson is 10–15 exercises, so it fits in a coffee break.

### Adaptive repetition
- Every word carries a mastery level from 0 to 5 (Leitner-style).
- Wrong answers are requeued in the same session and weighted heavier next time.
- Mastery 5 requires success in at least two different exercise types.
- Words you keep missing are collected in **trouble words**, which unlock a **boss round**.

### Pronunciation that actually sounds right
Three selectable engines:
- **Auto** — uses an installed system voice when one exists for that language, otherwise falls
  back to an online voice. This is the default, and it fixes languages your OS has no voice for.
- **Browser** — offline Web Speech only.
- **Online** — Google Cloud Text-to-Speech with your own API key (free tier covers a lot of
  practice), with a keyless fallback when no key is set.

The API key is stored only in your browser's `localStorage`; it is never sent anywhere except to
Google. Synthesised audio is cached in memory so repeated words do not hit the network twice.

### Progress and profiles
- XP, levels, daily goal, streak, hearts, combos, badges and confetti.
- **Local profiles**: several people can share one device, each with their own decks, XP and
  settings. Profiles can be protected with a PIN (salted SHA-256 — a lock, not encryption).
- Export and import all progress as JSON, or reset it, per profile.

### Small things that matter
- Light and dark themes.
- Keyboard: `Enter` to continue, `1`–`4` to answer, `Space` to flip a card, `Esc` to leave.
- Respects `prefers-reduced-motion`, visible focus rings, ARIA labels, and a skip link.
- UI available in English and Serbian (Latin); it defaults to the language you are learning from.
- Works on a phone — the layout is mobile-first, not a shrunken desktop page.

## Run it

Download or clone the repo and open `index.html` in a modern browser. That's it.

```bash
git clone https://github.com/djurkeceo/wordquest.git
cd wordquest
# double-click index.html, or serve it:
python -m http.server 8000
```

Then click **Sample** on the home screen to try a built-in 20-word German → Serbian deck.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Enter` | Continue / submit |
| `1`–`4` | Choose an answer |
| `Space` | Flip a flashcard |
| `Esc` | Leave the lesson |

## How it is built

- Plain HTML, CSS and JavaScript in one file (~4,900 lines). No framework, no bundler, no npm.
- The only external request is Google Fonts (Nunito) — and the app is perfectly usable without it.
- State lives in `localStorage`: one key per profile (`wordquest.state.v1::<id>`), plus a small
  registry of profiles.
- The script is organised into 13 commented sections: storage, accounts, parser, language
  detection, SRS, exercise generators, game engine, TTS, i18n, UI and so on.

## Browser support

Current Chrome, Edge, Firefox and Safari. Speech quality depends on the voices installed on your
system; the online engine covers the gaps.

## License

MIT — see [LICENSE](LICENSE). Use it, change it, ship it.
