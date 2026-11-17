import iziToast from 'izitoast';
import 'izitoast/dist/css/iziToast.min.css';
import { escapeHtml } from '../utils/escapeHtml';

iziToast.settings({
  timeout: 2500,
  resetOnHover: true,
  transitionIn: 'flipInX',
  transitionOut: 'fadeOut',
  position: 'topRight',
  borderRadius: '16px',
  theme: 'light',
  displayMode: 0,
  maxWidth: 400,
});

/** Look shared by every toast; `accent` colors the icon and progress bar. */
const toastStyle = (accent: string) => ({
  backgroundColor: 'var(--bg-card)',
  titleColor: 'var(--text-main)',
  messageColor: 'var(--text-muted)',
  iconColor: accent,
  progressBarColor: accent,
  boxShadow: 'var(--shadow-md)',
});

// iziToast inserts title and message as HTML, so both are escaped.
export const NotificationService = {
  success: (title: string, message = '') =>
    iziToast.success({ title: escapeHtml(title), message: escapeHtml(message), ...toastStyle('var(--primary)') }),
  error: (title: string, message = '') =>
    iziToast.error({ title: escapeHtml(title), message: escapeHtml(message), ...toastStyle('var(--danger)') }),
};
