import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ADD_QUERY } from '../constants/constants';

/** Opens the page's "add" dialog when the URL has `?add=1`, then removes it from the URL. */
export const useOpenAddFromQuery = (canAdd: () => boolean, openAdd: () => void) => {
  const route = useRoute();
  const router = useRouter();

  onMounted(() => {
    if (route.query.add !== ADD_QUERY.add) return;
    router.replace({ query: { ...route.query, add: undefined } });
    if (canAdd()) openAdd();
  });
};
