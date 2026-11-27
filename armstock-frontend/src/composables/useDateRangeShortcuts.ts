import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { appNow, toPickerDay } from '../utils/appTime';

const DAYS_IN_LAST_WEEK = 7;

/**
 * Quick ranges for an Element Plus daterange picker. None reaches past today.
 * `activeClass` goes to the picker's `popper-class`: Element has no selected state, so CSS marks the matching one.
 */
export const useDateRangeShortcuts = () => {
  const { t } = useI18n();

  const shortcuts = computed(() => [
    {
      text: t('dateRanges.today'),
      value: () => [appNow(), appNow()],
    },
    {
      text: t('dateRanges.last7Days'),
      value: () => {
        const start = appNow();
        start.setDate(start.getDate() - (DAYS_IN_LAST_WEEK - 1));
        return [start, appNow()];
      },
    },
    {
      text: t('dateRanges.thisMonth'),
      value: () => {
        const now = appNow();
        return [new Date(now.getFullYear(), now.getMonth(), 1), now];
      },
    },
    {
      text: t('dateRanges.lastMonth'),
      value: () => {
        const now = appNow();
        // Day 0 of this month is the last day of the previous one.
        return [new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 0)];
      },
    },
    {
      text: t('dateRanges.thisYear'),
      value: () => {
        const now = appNow();
        return [new Date(now.getFullYear(), 0, 1), now];
      },
    },
    {
      text: t('dateRanges.lastYear'),
      value: () => {
        const year = appNow().getFullYear() - 1;
        return [new Date(year, 0, 1), new Date(year, 11, 31)];
      },
    },
  ]);

  const activeClass = (range: [string, string] | null): string => {
    if (!range) return '';
    const index = shortcuts.value.findIndex((shortcut) => {
      const [from, to] = shortcut.value();
      return toPickerDay(from) === range[0] && toPickerDay(to) === range[1];
    });
    return index < 0 ? '' : `date-shortcut-active-${index + 1}`;
  };

  return { shortcuts, activeClass };
};
