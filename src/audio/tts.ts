/**
 * Text to speech with the same three engines as the single-file app:
 * browser voices, the keyless Google Translate endpoint, and an optional
 * Google Cloud key. Caches, fallback order and failure handling are unchanged.
 */

import type { LanguageCode } from '../types';
import { t } from '../i18n';
import { ttsTag } from '../language/languages';
import { getState } from '../storage/state';
import { toast } from '../ui/toast';

/** Google speaks a few languages under a legacy code, not BCP-47. */
const ONLINE_LANG: Record<string, string> = {
  zh: 'zh-CN', he: 'iw', nb: 'no', pt: 'pt-PT'
};
/** The endpoint truncates long input; a vocabulary word is never close. */
const ONLINE_MAX = 190;

/** Optional Google Cloud key — when present it is used before the keyless URL. */
function cloudKey(): string {
  return String(getState().settings.ttsKey || '').trim();
}

let cloudAbort: AbortController | null = null;
let cloudBroken = false;              // stop retrying a rejected key
const cloudVoices: Record<string, string | null> = {}; // 'hu-HU' -> best voice name, or null
const cloudCache = new Map<string, string>();         // 'hu|ház' -> data URL

/** Read `.name` without assuming a particular error class. */
function errorName(err: unknown): string {
  if (!err || typeof err !== 'object' || !('name' in err)) return '';
  return String((err as { name?: unknown }).name || '');
}

/** Prefer the highest-quality voice family available for a language. */
function rankVoice(name: string): number {
  if (/Neural2/i.test(name)) return 5;
  if (/Wavenet/i.test(name)) return 4;
  if (/Studio/i.test(name)) return 3;
  if (/Standard/i.test(name)) return 2;
  return 1;
}

interface CloudVoice {
  name: string;
  languageCodes?: string[];
}

/** Ask the API which voice is best for a language (cached). */
async function pickCloudVoice(lang: string, key: string): Promise<string | null> {
  if (Object.prototype.hasOwnProperty.call(cloudVoices, lang)) return cloudVoices[lang];
  try {
    const res = await fetch('https://texttospeech.googleapis.com/v1/voices?key='
      + encodeURIComponent(key) + '&languageCode=' + encodeURIComponent(lang));
    if (!res.ok) throw new Error('voices ' + res.status);
    const data = await res.json() as { voices?: CloudVoice[] };
    const list = (data.voices || []).filter(v =>
      (v.languageCodes || []).some(c => c.toLowerCase() === lang.toLowerCase()));
    list.sort((a, b) => rankVoice(b.name) - rankVoice(a.name));
    cloudVoices[lang] = list.length ? list[0].name : null;
  } catch {
    cloudVoices[lang] = null;
  }
  return cloudVoices[lang];
}

/** Synthesize a word via Google Cloud TTS; resolves to a data: URL. */
async function cloudAudio(text: string, code: LanguageCode, rate?: number): Promise<string> {
  const key = cloudKey();
  if (!key) throw new Error('no-key');
  const cacheKey = code + '|' + text;
  const cached = cloudCache.get(cacheKey);
  if (cached) return cached;
  const lang = ttsTag(code);
  if (cloudAbort) cloudAbort.abort();
  cloudAbort = new AbortController();
  const voice = await pickCloudVoice(lang, key);
  const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + encodeURIComponent(key), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text: String(text).slice(0, ONLINE_MAX) },
      voice: voice ? { languageCode: lang, name: voice } : { languageCode: lang },
      audioConfig: { audioEncoding: 'MP3', speakingRate: Math.min(1.5, Math.max(0.7, rate || 0.95)) }
    }),
    signal: cloudAbort.signal
  });
  if (!res.ok) {
    if (res.status === 400 || res.status === 403) cloudBroken = true;
    throw new Error('cloud ' + res.status);
  }
  const data = await res.json() as { audioContent?: string };
  if (!data.audioContent) throw new Error('cloud-empty');
  const url = 'data:audio/mp3;base64,' + data.audioContent;
  if (cloudCache.size > 240) {
    const oldest = cloudCache.keys().next().value;
    if (oldest !== undefined) cloudCache.delete(oldest);
  }
  cloudCache.set(cacheKey, url);
  return url;
}

let onlineEl: HTMLAudioElement | null = null;

function ensureEl(): HTMLAudioElement {
  if (!onlineEl) onlineEl = new window.Audio();
  return onlineEl;
}

/** Play via the Cloud API; on any failure hand control back to the caller. */
function speakCloud(
  text: string,
  code: LanguageCode,
  rate: number | undefined,
  onFail: (err: unknown) => void
): void {
  const el = ensureEl();
  cloudAudio(text, code, rate)
    .then(url => { el.pause(); el.src = url; return el.play(); })
    .catch((err: unknown) => {
      if (errorName(err) === 'AbortError') return;
      if (cloudBroken) toast(t('toast.ttsKeyBad'));
      onFail(err);
    });
}

function ttsAvailable(): boolean {
  return typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined';
}

let voices: SpeechSynthesisVoice[] = [];

export function loadVoices(): void {
  if (ttsAvailable()) voices = window.speechSynthesis.getVoices() || [];
}

if (ttsAvailable()) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

/**
 * Installed voices are not equally good. Windows ships old concatenative
 * voices that sound robotic, while Edge/Android may expose Natural/Neural or
 * network voices. Rank them so Auto does not pick eSpeak or a desktop voice
 * over a clearly better one.
 */
function localVoiceScore(voice: SpeechSynthesisVoice): number {
  let score = voice.localService === false ? 8 : 0;
  if (/natural|neural|online|premium|enhanced|studio|siri/i.test(voice.name)) score += 20;
  if (/espeak|compact|pico|robotic|festival|mbrola/i.test(voice.name)) score -= 30;
  if (voice.default) score += 1;
  return score;
}

/** Best installed voice for a language code, or null when there is none. */
function localVoice(code: LanguageCode): SpeechSynthesisVoice | null {
  if (ttsAvailable()) loadVoices();
  const tag = ttsTag(code).toLowerCase().replace('_', '-');
  const two = tag.slice(0, 2);
  const exact = voices.filter(v => v.lang && v.lang.toLowerCase().replace('_', '-') === tag);
  const prefix = voices.filter(v => v.lang && v.lang.toLowerCase().replace('_', '-').slice(0, 2) === two);
  const matches = exact.length ? exact : prefix;
  if (!matches.length) return null;
  return matches.reduce((best, v) => localVoiceScore(v) > localVoiceScore(best) ? v : best, matches[0]);
}

export function hasLocalVoice(code: LanguageCode): boolean {
  return !!localVoice(code);
}

/** True when the installed voice is likely natural rather than a legacy synth. */
export function hasNaturalLocalVoice(code: LanguageCode): boolean {
  const voice = localVoice(code);
  return !!voice && localVoiceScore(voice) >= 8;
}

function onlineReachable(): boolean {
  return navigator.onLine !== false;
}

/**
 * Can this language be pronounced at all with the current engine?
 * Used to decide whether the listening mode should be offered.
 */
export function canSpeak(code: LanguageCode): boolean {
  const engine = getState().settings.ttsEngine || 'auto';
  // Browser mode cannot pronounce a language when no matching voice exists;
  // Chrome would otherwise read it with the default English voice.
  if (engine === 'browser') return hasLocalVoice(code);
  if (cloudKey() && !cloudBroken) return onlineReachable();
  if (engine === 'online') return onlineReachable();
  return hasLocalVoice(code) || onlineReachable();
}

/** Forget cached voices/failures — call after the API key changes. */
export function resetCloud(): void {
  cloudBroken = false;
  cloudCache.clear();
  Object.keys(cloudVoices).forEach(k => delete cloudVoices[k]);
}

/** Offline path: Web Speech API. */
function speakLocal(text: string, code: LanguageCode, rate?: number): boolean {
  if (!ttsAvailable()) return false;
  const v = localVoice(code);
  // Never hand Hungarian (or any other non-English word) to an unrelated
  // default voice: that is the "machine" reading users hear on PCs without
  // the matching speech pack. English may use the browser's default voice.
  if (!v && code !== 'en') return false;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = ttsTag(code);
    u.rate = rate || 0.92;
    u.pitch = 1;
    if (v) u.voice = v;
    synth.speak(u);
    return true;
  } catch {
    return false;
  }
}

/**
 * Google's keyless endpoint returns HTTP 404 when a non-Google Referer is
 * sent. Audio elements inherit the document referrer policy, so apply a
 * no-referrer policy just while the request is created and then restore it.
 * This keeps HTTP-referrer-restricted Cloud API keys working.
 */
function withNoReferrer<T>(fn: () => T): T {
  const head = document.head;
  const existing = head.querySelector<HTMLMetaElement>('meta[name="referrer"]');
  const previous = existing ? existing.getAttribute('content') : null;
  let meta = existing;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'referrer';
    head.appendChild(meta);
  }
  meta.content = 'no-referrer';
  try {
    return fn();
  } finally {
    if (!existing) meta.remove();
    else if (previous === null) meta.removeAttribute('content');
    else meta.content = previous;
  }
}

/**
 * Keyless online path: play an MP3 straight from the public endpoint.
 * Calls onFail(err) when the browser refuses or the request dies.
 */
function speakOnline(
  text: string,
  code: LanguageCode,
  onFail: (err: unknown) => void
): boolean {
  try {
    const el = ensureEl();
    const tl = ONLINE_LANG[code] || String(code || 'en').split('-')[0];
    let settled = false;
    const fail = (err: unknown): void => {
      if (settled) return;
      settled = true;
      onFail(err);
    };
    el.onerror = () => fail(new Error('tts-error'));
    const p = withNoReferrer(() => {
      el.pause();
      el.src = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob'
        + '&tl=' + encodeURIComponent(tl)
        + '&q=' + encodeURIComponent(String(text).slice(0, ONLINE_MAX));
      el.playbackRate = 1;
      el.load();
      return el.play();
    });
    if (p && p.catch) p.catch(err => fail(err));
    return true;
  } catch (err) {
    onFail(err);
    return false;
  }
}

/** Stop anything currently being spoken. */
export function stopSpeaking(): void {
  if (ttsAvailable()) {
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
  }
  if (onlineEl) {
    try { onlineEl.pause(); } catch { /* ignore */ }
  }
}

/**
 * Speak text in a language, honouring the selected engine.
 * Returns false when nothing at all could be played.
 */
export function speak(text: string, langCode: LanguageCode, rate?: number): boolean {
  const settings = getState().settings;
  if (!settings.tts || !text) return false;
  const engine = settings.ttsEngine || 'auto';
  // Auto prefers a natural installed voice, otherwise the online voice. Old
  // desktop voices stay available as the offline fallback and in Browser mode.
  const localFirst = engine === 'browser' || (engine === 'auto' && hasNaturalLocalVoice(langCode));
  if (localFirst && speakLocal(text, langCode, rate)) return true;
  if (engine !== 'browser') {
    const fallback = (): boolean => speakLocal(text, langCode, rate);
    // Best quality first: a Google Cloud key, when the user supplied one.
    if (cloudKey() && !cloudBroken) {
      speakCloud(text, langCode, rate, err => {
        if (errorName(err) === 'NotAllowedError') return;
        fallback();
      });
      return true;
    }
    const started = speakOnline(text, langCode, err => {
      // A new word interrupted the old clip; that is not a broken voice.
      if (errorName(err) === 'AbortError') return;
      // A blocked autoplay is a browser policy, not a broken voice — stay quiet
      // rather than jumping to a second, worse reading of the same word.
      if (errorName(err) === 'NotAllowedError') return;
      fallback();
    });
    if (started) return true;
  }
  return localFirst ? false : speakLocal(text, langCode, rate);
}

export { ttsAvailable };
