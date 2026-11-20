import { onBeforeUnmount, onMounted, type Ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { NotificationService } from '../services/NotificationService';
import { isLeavingForLostAccess } from '../utils/lostAccess';

/**
 * Asks before leaving a form with unsaved changes. In-app navigation gets our own dialog;
 * reload and closing the tab can only get the browser's own alert, whose text cannot be set.
 */
export const useUnsavedChanges = (isDirty: Ref<boolean>) => {
  const { t } = useI18n();

  onBeforeRouteLeave(async () => {
    if (!isDirty.value || isLeavingForLostAccess()) return true;
    return NotificationService.confirm(t('unsavedChanges.title'), t('unsavedChanges.text'), t('unsavedChanges.leave'), t('unsavedChanges.stay'));
  });

  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (isDirty.value && !isLeavingForLostAccess()) event.preventDefault();
  };

  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload));
  onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload));
};
