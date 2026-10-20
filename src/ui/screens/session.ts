/**
 * Session screen chrome. The exercise itself is rendered into `#stage` by the
 * mode registry; this module only owns the quit button.
 */

import { t } from '../../i18n';
import { $ } from '../dom';
import { navigate } from '../nav';
import { endSession, getSession } from '../sessionFlow';

export function bindSessionScreen(): void {
  $('#btnQuit')?.addEventListener('click', () => {
    if (!getSession()) { navigate('home'); return; }
    if (confirm(t('session.quit'))) endSession('quit');
  });
}
