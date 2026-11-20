<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ProductStatus, type IStockLineProduct } from 'armstock-shared';
import { Plus } from 'lucide-vue-next';
import CodeBadge from '../CodeBadge.vue';
import { OptionsService } from '../../services/OptionsService';
import { AppLogger } from '../../utils/AppLogger';

const props = defineProps<{
  /** The current choice, so its name shows before any search (it may be archived). */
  selected: IStockLineProduct | null;
  placeholder: string;
  /** Shows "+ New product" at the bottom of the dropdown. */
  canCreate?: boolean;
  /** Stock-out: archived products that still have stock can be picked too. */
  forStockOut?: boolean;
  /** Return: only products this supplier brought; null = no supplier picked yet, so nothing to show. */
  suppliedBy?: string | null;
}>();

const emit = defineEmits<{
  select: [product: IStockLineProduct];
  /** The text typed in the search, to pre-fill the new product's name. */
  create: [name: string];
}>();

const model = defineModel<string>({ required: true });

const selectRef = ref<{ focus: () => void; blur: () => void }>();
const options = ref<IStockLineProduct[]>([]);
const isLoading = ref(false);
const query = ref('');
let lastRequest = 0;

const shownOptions = computed(() => {
  const current = props.selected;
  return current && !options.value.some((o) => o.uuid === current.uuid) ? [current, ...options.value] : options.value;
});

// Only active products can be picked (stock-out: also archived ones with stock); an archived one already
// on the row stays through `selected`.
// Element Plus calls this itself when the dropdown opens, so no extra call on open.
const search = async (text: string) => {
  query.value = text.trim();
  const request = ++lastRequest;
  if (props.suppliedBy === null) {
    options.value = [];
    isLoading.value = false;
    return;
  }
  isLoading.value = true;
  try {
    const items = await OptionsService.products({
      search: query.value || undefined,
      suppliedBy: props.suppliedBy,
      forStockOut: props.forStockOut || undefined,
    });
    // An older, slower answer must not replace a newer one.
    if (request === lastRequest) options.value = items;
  } catch (error) {
    AppLogger.error('Failed to search products:', error);
  } finally {
    if (request === lastRequest) isLoading.value = false;
  }
};

// Another supplier means other products; the next open searches again.
watch(() => props.suppliedBy, () => {
  lastRequest++;
  options.value = [];
});

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
    :no-data-text="suppliedBy === null ? $t('stockOut.lines.chooseSupplierFirst') : undefined"
    @change="onChange"
  >
    <el-option v-for="option in shownOptions" :key="option.uuid" :label="option.name" :value="option.uuid">
      <div class="product-option">
        <span class="product-option__name">{{ option.name }}</span>
        <span class="product-option__meta">
          <el-tag v-if="option.status === ProductStatus.ARCHIVED" size="small" type="info" round>{{ $t('status.archived') }}</el-tag>
          <CodeBadge v-if="option.code" :code="option.code" />
        </span>
      </div>
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

.product-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.product-option__name {
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-option__meta {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.5rem;
}
</style>
