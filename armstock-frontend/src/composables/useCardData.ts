import { onMounted, ref, shallowRef } from 'vue';
import { AppLogger } from '../utils/AppLogger';

/** One dashboard card's data with its own loading and error state. */
export const useCardData = <T>(name: string, fetch: () => Promise<T>) => {
  const data = shallowRef<T | null>(null);
  const isLoading = ref(true);
  const hasError = ref(false);

  const load = async () => {
    isLoading.value = true;
    hasError.value = false;
    try {
      data.value = await fetch();
    } catch (error) {
      AppLogger.error(`Failed to load the ${name} card:`, error);
      hasError.value = true;
    } finally {
      isLoading.value = false;
    }
  };

  onMounted(load);

  return { data, isLoading, hasError, load };
};
