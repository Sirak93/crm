<script setup lang="ts">
import { computed, ref } from 'vue';
import { ProductStatus } from 'armstock-shared';
import { Plus } from 'lucide-vue-next';
import { ProductService } from '../../services/ProductService';
import type { IProductOption } from '../../interfaces/IProductOption';
import { toProductOption } from '../../utils/stockInLines';
import { AppLogger } from '../../utils/AppLogger';

const props = defineProps<{
  /** The current choice, so its name shows before any search (it may be archived). */
  selected: IProductOption | null;
  placeholder: string;
  /** Shows "+ New product" at the bottom of the dropdown. */
  canCreate?: boolean;
}>();

const emit = defineEmits<{
  select: [product: IProductOption];
  /** The text typed in the search, to pre-fill the new product's name. */
  create: [name: string];
}>();

const model = defineModel<string>({ required: true });

const SEARCH_PAGE_SIZE = 20;

const selectRef = ref<{ focus: () => void; blur: () => void }>();
const options = ref<IProductOption[]>([]);
const isLoading = ref(false);
const query = ref('');
let lastRequest = 0;

const shownOptions = computed(() => {
  const current = props.selected;
  return current && !options.value.some((o) => o.uuid === current.uuid) ? [current, ...options.value] : options.value;
});

// Only active products can be picked; an archived one already on the row stays through `selected`.
const search = async (text: string) => {
  query.value = text.trim();
  const request = ++lastRequest;
  isLoading.value = true;
  try {
    const { items } = await ProductService.list(1, SEARCH_PAGE_SIZE, { search: query.value || undefined, status: ProductStatus.ACTIVE });
    // An older, slower answer must not replace a newer one.
    if (request === lastRequest) options.value = items.map(toProductOption);
  } catch (error) {
    AppLogger.error('Failed to search products:', error);
  } finally {
    if (request === lastRequest) isLoading.value = false;
  }
};

const onVisibleChange = (visible: boolean) => {
  if (visible && !options.value.length) search('');
};

const onChange = (uuid: string) => {
  const product = shownOptions.value.find((o) => o.uuid === uuid);
  if (product) emit('select', product);
};

const onCreate = () => {
  selectRef.value?.blur();
  emit('create', query.value);
};

defineExpose({ focus: () => selectRef.value?.focus() });
</script>

<template>
  <el-select
    ref="selectRef"
    v-model="model"
    filterable
    remote
    :remote-method="search"
    :loading="isLoading"
    :placeholder="placeholder"
    :aria-label="placeholder"
    @visible-change="onVisibleChange"
    @change="onChange"
  >
    <el-option v-for="option in shownOptions" :key="option.uuid" :label="option.name" :value="option.uuid">
      <span>{{ option.name }}</span>
      <span v-if="option.code" class="product-option__code">{{ option.code }}</span>
    </el-option>

    <!-- In the footer, so it stays visible however many matches there are. -->
    <template v-if="canCreate" #footer>
      <el-button type="primary" class="product-select__create" @click="onCreate">
        <Plus :size="16" aria-hidden="true" />
        <span>{{ query ? $t('stockIn.lines.newProductNamed', { name: query }) : $t('stockIn.lines.newProduct') }}</span>
      </el-button>
    </template>
  </el-select>
</template>

<style scoped>
.product-select__create {
  width: 100%;
}

.product-option__code {
  margin-left: 0.5rem;
  font-size: var(--text-xs);
  color: var(--text-muted);
}
</style>
