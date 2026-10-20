/**
 * Mode registry. Importing this module (which the app does during boot) both
 * registers the exercise renderers with the session flow and loads the speed
 * round's timer hooks.
 */

import { registerSessionRenderers } from '../ui/sessionFlow';
import { renderFlash } from './flashcards';
import { renderChoice } from './multipleChoice';
import { renderType } from './typeIt';
import { renderMatch } from './memoryMatch';
import { renderEmoji } from './emojiLink';
import { renderListen } from './listenPick';
import { renderScramble } from './scramble';
import './speedRound';

export { renderFlash } from './flashcards';
export { renderChoice } from './multipleChoice';
export { renderType } from './typeIt';
export { renderMatch } from './memoryMatch';
export { renderEmoji } from './emojiLink';
export { renderListen } from './listenPick';
export { renderScramble } from './scramble';
export { startSpeedTimer, stopSpeedTimer, renderSpeedQuestion } from './speedRound';
export { startBossRound, isBossWin, BOSS_WIN_ACCURACY } from './bossRound';

registerSessionRenderers({
  match: renderMatch,
  single: {
    flash: renderFlash,
    'choice-f2n': renderChoice,
    'choice-n2f': renderChoice,
    'type-f2n': renderType,
    'type-n2f': renderType,
    emoji: renderEmoji,
    listen: renderListen,
    scramble: renderScramble
  }
});
