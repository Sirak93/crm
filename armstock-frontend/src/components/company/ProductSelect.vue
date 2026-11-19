<script setup lang="ts">
import { computed, ref } from 'vue';
import { ProductStatus, type IProduct } from 'armstock-shared';
import { ProductService } from '../../services/ProductService';
import type { IProductOption } from '../../interfaces/IProductOption';
import { AppLogger } from '../../utils/AppLogger';

const props = defineProps<{
  /** The current choice, so its name shows before any search (it may be archived). */
  selected: IProductOption | null;
  placeholder: string;
}>();

const emit = defineEmits<{ select: [product: IProductOption] }>();

const model = defineModel<string>({ required: true });

const SEARCH_PAGE_SIZE = 20;

const selectRef = ref<{ focus: () => void }>();
const options = ref<IProductOption[]>([]);
const isLoading = ref(false);
let lastRequest = 0;

const toOption = (product: IProduct): IProductOption => ({
  uuid: product.uuid,
  name: product.name,
  code: product.code,
  status: product.status,
  unitShortName: product.measureUnit.shortName,
  allowsDecimals: product.measureUnit.allowsDecimals,
});

const shownOptions = computed(() => {
  const current = props.selected;
  return current && !options.value.some((o) => o.uuid === current.uuid) ? [current, ...options.value] : options.value;
});

// Only active products can be picked; an archived one already on the row stays through `selected`.
const search = async (query: string) => {
  const request = ++lastRequest;
  isLoading.value = true;
  try {
    const { items } = await ProductService.list(1, SEARCH_PAGE_SIZE, { search: query.trim() || undefined, status: ProductStatus.ACTIVE });
    // An older, slower answer must not replace a newer one.
    if (request === lastRequest) options.value = items.map(toOption);
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
  </el-select>
</template>

<style scoped>
.product-option__code {
  margin-left: 0.5rem;
  font-size: var(--text-xs);
  color: var(--text-muted);
}
</style>
