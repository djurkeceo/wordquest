/**
 * WordQuest — shared domain types (phase 1).
 *
 * This file is the contract between the modules that replace the single-file
 * app. It models the *current* persisted and in-memory shapes exactly,
 * including fields the legacy code adds lazily at runtime (marked optional).
 *
 * There is no `any` in this file. Hand-edited JSON, imported backups and
 * localStorage are untrusted at the boundary: the storage/migration layer is
 * responsible for validating and narrowing before it constructs these values.
 */

/* ------------------------------------------------------------------ time -- */

export type Timestamp = number;

/** Local calendar date as `YYYY-MM-DD`, produced by `dayKey()`. */
export type DayKey = string;

/* -------------------------------------------------------------- language -- */

/** Every language code in the current `LANGUAGES` registry. */
export type LanguageCode =
  | 'en' | 'de' | 'fr' | 'es' | 'it' | 'pt' | 'nl' | 'sv' | 'da' | 'no'
  | 'fi' | 'pl' | 'cs' | 'sk' | 'sl' | 'sr' | 'ro' | 'hu' | 'tr' | 'ru'
  | 'uk' | 'bg' | 'mk' | 'el' | 'ar' | 'he' | 'fa' | 'hi' | 'th' | 'ko'
  | 'ja' | 'zh' | 'vi' | 'id';

/** Script families tracked by detection; `both` means Latin + Cyrillic. */
export type ScriptFamily =
  | 'latin' | 'cyrillic' | 'greek' | 'arabic' | 'hebrew'
  | 'devanagari' | 'thai' | 'hangul' | 'kana' | 'hanzi' | 'both';

/** Concrete scripts counted by `scriptCounts()`; `both` is not countable. */
export type TextScript = Exclude<ScriptFamily, 'both'>;

/** UI locales that currently ship a catalogue. Persisted values are not
 *  restricted to these two, because old/hand-edited saves may contain others. */
export type UiLangCode = 'en' | 'sr';

export interface LanguageMeta {
  readonly name: string;
  readonly native: string;
  readonly tts: string;
  readonly script: ScriptFamily;
}

/** Serbian display names, keyed by language code. */
export type LanguageNames = Partial<Record<LanguageCode, string>>;

export interface UiLocale {
  readonly code: string;
  readonly label: string;
}

/* --------------------------------------------------------------- settings -- */

export type ThemeMode = 'auto' | 'light' | 'dark';
export type TtsEngine = 'auto' | 'browser' | 'online';

export interface Settings {
  sound: boolean;
  tts: boolean;
  ttsEngine: TtsEngine;
  /** Not in `defaultState()`; absent until the user saves a key. Plain text. */
  ttsKey?: string;
  strictAccents: boolean;
  hearts: boolean;
  calmMotion: boolean;
  theme: ThemeMode;
  /** Persisted as a string; only `en` and `sr` have catalogues today. */
  uiLang: string;
  /** Not in `defaultState()`; set after the first deck save. */
  uiLangSet?: boolean;
  nativeLang: LanguageCode | null;
  dailyGoal: number;
}

/* --------------------------------------------------------------- progress -- */

export type BadgeId =
  | 'first10'
  | 'firstdeck'
  | 'perfect'
  | 'streak3'
  | 'streak7'
  | 'streak30'
  | 'master25'
  | 'master100'
  | 'xp500'
  | 'xp2000'
  | 'lessons10'
  | 'combo10'
  | 'speed30'
  | 'boss'
  | 'nightowl';

export interface ProfileProgress {
  xp: number;
  level: number;
  streak: number;
  lastLessonDay: DayKey | null;
  dailyDay: DayKey | null;
  dailyXp: number;
  hearts: number;
  maxHearts: number;
  achievements: BadgeId[];
  lessons: number;
  perfectLessons: number;
  totalCorrect: number;
  totalWrong: number;
  /** Not in `defaultState()`; added by `ensureDaily()`. */
  lastHeartDay?: DayKey;
  /** Not in `defaultState()`; added on the first 10-combo. */
  bestCombo?: number;
  /** Not in `defaultState()`; added at the end of a speed round. */
  bestSpeed?: number;
  /** Not in `defaultState()`; added after the first boss win. */
  bossWins?: number;
  /** Not in `defaultState()`; once true it stays true. */
  nightOwl?: boolean;
}

/* ------------------------------------------------------------------ words -- */

export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5;

/** Modes that can grade a word. `speed` is a live exercise, not planned. */
export type GradeMode = ModeId | 'speed';

export interface WordStats {
  seen: number;
  correct: number;
  wrong: number;
  streak: number;
  mastery: MasteryLevel;
  lastSeen: Timestamp;
  due: Timestamp;
  modeCorrect: Partial<Record<GradeMode, number>>;
}

export interface Word {
  id: string;
  /** Foreign side as typed by the user (may contain an article). */
  f: string;
  /** One or more accepted native translations. */
  n: string[];
  /** User-chosen emoji, or null to let `emojiFor()` infer one. */
  emoji: string | null;
  stats: WordStats;
}

export interface Deck {
  id: string;
  name: string;
  createdAt: Timestamp;
  nativeLang: LanguageCode;
  foreignLang: LanguageCode;
  words: Word[];
  /**
   * Set by `openDeck()` and written by `save()`, but currently dropped by
   * `normalizeDeck()` on every load (reported as bug H1 in docs/PLAN.md).
   */
  lastOpened?: Timestamp;
}

/* -------------------------------------------------------------- app state -- */

export interface AppState {
  version: number;
  settings: Settings;
  profile: ProfileProgress;
  decks: Deck[];
}

/* --------------------------------------------------------------- profiles -- */

export interface ProfileRecord {
  id: string;
  name: string;
  emoji: string;
  /** SHA-256 hex, or the `w…` FNV fallback; null means no lock. */
  pinHash: string | null;
  salt: string | null;
  createdAt: Timestamp;
  /** Optional: written on unlock. */
  lastSeen?: Timestamp;
  /** Optional: mirrored from settings by `save()`. */
  lang?: string;
  /** Optional: mirrored from settings by `save()`. */
  theme?: ThemeMode;
  /** True only for the pre-profiles save adopted as the first profile. */
  legacy?: boolean;
}

export interface ProfileRegistry {
  activeId: string | null;
  list: ProfileRecord[];
}

/* ----------------------------------------------------------------- parser -- */

export type SeparatorName = 'tab' | '=' | 'dash' | 'hyphen' | 'colon' | 'comma';

export interface SeparatorRule {
  readonly re: RegExp;
  readonly name: SeparatorName;
}

/** A parsed line, before duplicate merging. */
export interface ParsedPair {
  f: string;
  n: string[];
  line: number;
}

export type ParseErrorReason = 'no separator' | 'empty side' | 'no letters';

export interface ParseError {
  line: number;
  text: string;
  reason: ParseErrorReason;
}

export interface ParseResult {
  pairs: ParsedPair[];
  errors: ParseError[];
}

/* ----------------------------------------------------- language detection -- */

export interface LatinProfile {
  readonly stop: readonly string[];
  readonly chars: string;
  readonly ngrams: readonly string[];
}

export type ScriptCounts = Record<TextScript, number>;

export type DetectionScores = Partial<Record<LanguageCode, number>>;

export interface DetectionResult {
  code: LanguageCode;
  confidence: number;
  /** Latin path only; script path returns an empty object. */
  scores: DetectionScores;
}

export interface PairDetection {
  foreign: LanguageCode;
  native: LanguageCode;
  a: DetectionResult;
  b: DetectionResult;
}

/* ------------------------------------------------------------------ emoji -- */

/** Tuple shape used by the static lexicon: emoji plus `|`-separated keywords. */
export type EmojiLexiconEntry = readonly [emoji: string, keywords: string];

export type EmojiIndex = Map<string, string>;

/* ----------------------------------------------------------------- engine -- */

export type AnswerVerdict = 'correct' | 'almost' | 'accents' | 'wrong';

export interface TypedCheckOptions {
  strict?: boolean;
  bilingual?: boolean;
}

export interface TypedCheckResult {
  status: AnswerVerdict;
  matched: string;
}

export interface Badge {
  id: BadgeId;
  emoji: string;
  name: string;
  desc: string;
  test: (state: AppState) => boolean;
}

/* ---------------------------------------------------------------- session -- */

export type ModeId =
  | 'flash'
  | 'choice-f2n'
  | 'choice-n2f'
  | 'type-f2n'
  | 'type-n2f'
  | 'match'
  | 'emoji'
  | 'listen'
  | 'scramble';

export type SessionKind = 'lesson' | 'practice' | 'boss' | 'speed';

export interface MatchExercise {
  type: 'match';
  wordIds: string[];
}

export interface SingleExercise {
  type: Exclude<ModeId, 'match'> | 'speed';
  /** Null only when a wrong answer had no resolvable word (legacy behaviour). */
  wordId: string | null;
}

export type Exercise = MatchExercise | SingleExercise;

export interface SessionOptions {
  kind?: SessionKind;
  size?: number;
  pool?: Word[];
}

/** What `buildSession()` returns; `startSession()` attaches the deck. */
export interface SessionPlan {
  deckId: string;
  kind: SessionKind;
  queue: Exercise[];
  index: number;
  correct: number;
  wrong: number;
  xp: number;
  /** `Infinity` means hearts are disabled for this run. */
  hearts: number;
  combo: number;
  bestCombo: number;
  startedAt: Timestamp;
  masteredBefore: Set<string>;
  seenWords: Set<string>;
  mode: ModeId | 'speed' | null;
  ended: boolean;
  speedLeft: number;
}

/** The mutable run object held by the session controller. */
export interface SessionState extends SessionPlan {
  deck: Deck;
  hintUsed: number;
  answers: number;
  requeued: number;
  /** Undefined until the first render, then true/false. */
  locked?: boolean;
  flipHandler?: (() => void) | null;
  choiceHandler?: ((index: number) => void) | null;
  /** Speed round only. */
  speedPool?: Word[];
  speedIdx?: number;
}

export type SessionEndReason = 'complete' | 'nohearts' | 'timeup' | 'quit';

export interface AnswerMeta {
  noHeart?: boolean;
  noRequeue?: boolean;
  mode?: GradeMode;
  /** Unused by the legacy code; kept for signature compatibility. */
  shown?: string;
}

export interface SummaryData {
  reason: SessionEndReason;
  accuracy: number;
  perfect: boolean;
  newlyMastered: Word[];
  review: Word[];
  newBadges: Badge[];
}

/* --------------------------------------------------------------- import -- */

export interface ImportPair {
  f: string;
  n: string[];
  emoji: string | null;
}

/** Transient state between import, language confirmation and preview. */
export interface PendingImport {
  pairs: ImportPair[];
  errors: ParseError[];
  foreign: LanguageCode;
  native: LanguageCode;
  confidence: number;
  suggestedName: string;
  nameTouched: boolean;
}

/* -------------------------------------------------------------------- ui -- */

export type ScreenName =
  | 'login'
  | 'home'
  | 'import'
  | 'lang'
  | 'preview'
  | 'deck'
  | 'session'
  | 'summary'
  | 'achievements'
  | 'settings';

export type NavTarget = 'home' | 'achievements' | 'settings';

export interface ShowScreenOptions {
  replace?: boolean;
}

export interface FeedbackOptions {
  ok: boolean;
  title: string;
  msg?: string;
  /** Trusted HTML assembled by the caller (already escaped where needed). */
  extra?: string;
  then?: () => void;
}

/* ----------------------------------------------------------------- audio -- */

export type SfxName =
  | 'correct'
  | 'wrong'
  | 'flip'
  | 'tap'
  | 'combo'
  | 'win'
  | 'lose'
  | 'hint';

export interface ParticleOptions {
  x?: number;
  y?: number;
  angle?: number;
  spread?: number;
  power?: number;
}

/* ------------------------------------------------------------------ i18n -- */

export type I18nValue = string | readonly string[];
export type I18nDict = Record<string, I18nValue>;
export type I18nCatalogs = Record<UiLangCode, I18nDict>;
export type I18nVars = Record<string, string | number>;
