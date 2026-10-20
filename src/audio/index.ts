/**
 * Audio facade. The legacy module was named `Audio`, which shadowed
 * `window.Audio`; this export keeps the same method names under `sound`.
 */

import { play } from './sfx';
import {
  canSpeak,
  hasLocalVoice,
  loadVoices,
  resetCloud,
  speak,
  stopSpeaking,
  ttsAvailable
} from './tts';

export const sound = {
  play,
  speak,
  stopSpeaking,
  canSpeak,
  hasLocalVoice,
  resetCloud,
  ttsAvailable,
  loadVoices
};
