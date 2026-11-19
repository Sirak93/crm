import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const DAYS_IN_LAST_WEEK = 7;

/** Quick ranges for an Element Plus daterange picker. None reaches past today. */
export const useDateRangeShortcuts = () => {
  const { t } = useI18n();

  return computed(() => [
    {
      text: t('dateRanges.today'),
      value: () => [new Date(), new Date()],
    },
    {
      text: t('dateRanges.last7Days'),
      value: () => {
        const start = new Date();
        start.setDate(start.getDate() - (DAYS_IN_LAST_WEEK - 1));
        return [start, new Date()];
      },
    },
    {
      text: t('dateRanges.thisMonth'),
      value: () => {
        const now = new Date();
        return [new Date(now.getFullYear(), now.getMonth(), 1), now];
      },
    },
    {
      text: t('dateRanges.lastMonth'),
      value: () => {
        const now = new Date();
        // Day 0 of this month is the last day of the previous one.
        return [new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 0)];
      },
    },
    {
      text: t('dateRanges.thisYear'),
      value: () => {
        const now = new Date();
        return [new Date(now.getFullYear(), 0, 1), now];
      },
    },
    {
      text: t('dateRanges.lastYear'),
      value: () => {
        const year = new Date().getFullYear() - 1;
        return [new Date(year, 0, 1), new Date(year, 11, 31)];
      },
    },
  ]);
};
