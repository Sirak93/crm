import iziToast from 'izitoast';
import Swal from 'sweetalert2';
import 'izitoast/dist/css/iziToast.min.css';
import i18n from '../i18n';
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

const SWAL_CLASSES = {
  popup: 'app-swal-popup',
  title: 'app-swal-title',
  htmlContainer: 'app-swal-text',
  actions: 'app-swal-actions',
  icon: 'app-swal-icon',
  confirmButton: 'app-swal-btn app-swal-btn--danger',
  cancelButton: 'app-swal-btn app-swal-btn--cancel',
};

const AppSwal = Swal.mixin({
  customClass: SWAL_CLASSES,
  buttonsStyling: false,
  reverseButtons: true,
});

// iziToast inserts title and message as HTML, so both are escaped.
// SweetAlert's `title` and `text` are set as text, so they need no escaping; its `html` is escaped here.
export const NotificationService = {
  success: (title: string, message = '') =>
    iziToast.success({ title: escapeHtml(title), message: escapeHtml(message), ...toastStyle('var(--primary)') }),
  error: (title: string, message = '') =>
    iziToast.error({ title: escapeHtml(title), message: escapeHtml(message), ...toastStyle('var(--danger)') }),

  /** A destructive-action confirm. Resolves true when confirmed. */
  confirm: async (title: string, text: string, confirmText: string, cancelText = i18n.global.t('common.cancel')): Promise<boolean> => {
    const result = await AppSwal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      focusCancel: true,
    });
    return result.isConfirmed;
  },

  /** A notice with a single OK button. */
  notice: async (title: string, text: string): Promise<void> => {
    await AppSwal.fire({
      title,
      text,
      icon: 'warning',
      confirmButtonText: i18n.global.t('common.ok'),
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: { ...SWAL_CLASSES, confirmButton: 'app-swal-btn app-swal-btn--primary' },
    });
  },

  /** An info popup with a list of rows, for a message too long to read in a toast. */
  alertList: async (title: string, text: string, rows: { label: string; value: string }[]): Promise<void> => {
    const items = rows
      .map((row) => `<li><span class="app-swal-list__label">${escapeHtml(row.label)}</span><span class="app-swal-list__value">${escapeHtml(row.value)}</span></li>`)
      .join('');
    await AppSwal.fire({
      title,
      html: `<p>${escapeHtml(text)}</p><ul class="app-swal-list">${items}</ul>`,
      icon: 'warning',
      confirmButtonText: i18n.global.t('common.ok'),
      // The mixin's customClass is replaced, not merged, so the shared classes are spread in.
      customClass: { ...SWAL_CLASSES, confirmButton: 'app-swal-btn app-swal-btn--primary' },
    });
  },
};
