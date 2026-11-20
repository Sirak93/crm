import i18n from '../i18n';
import { NotificationService } from '../services/NotificationService';

let isLeaving = false;

/** True while the app reloads after lost access - the unsaved-changes prompt is skipped (typed data is lost). */
export const isLeavingForLostAccess = (): boolean => isLeaving;

/**
 * The one "permissions changed" popup. OK reloads the app at `/` - the user's own dashboard,
 * which every account can open. Shown once, however many requests were refused.
 */
export const showLostAccess = async (): Promise<void> => {
  if (isLeaving) return;
  isLeaving = true;
  await NotificationService.notice(i18n.global.t('lostAccess.title'), i18n.global.t('lostAccess.text'));
  window.location.assign('/');
};
