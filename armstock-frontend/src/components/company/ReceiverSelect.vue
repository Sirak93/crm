<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { UserStatus, type INamedRef, type IStockOutReceiver } from 'armstock-shared';
import { StockOutService } from '../../services/StockOutService';
import { USER_STATUS_TAG } from '../../constants/statusTags';
import { AppLogger } from '../../utils/AppLogger';

const props = defineProps<{
  /** The current choice, so its name shows before the list loads. */
  selected?: INamedRef | null;
  placeholder: string;
}>();

const model = defineModel<string>({ required: true });

const options = ref<IStockOutReceiver[]>([]);
const isLoading = ref(false);

// The API sends active users first, then blocked and archived ones (goods may be entered after someone left).
const shownOptions = computed<IStockOutReceiver[]>(() => {
  const current = props.selected;
  if (!current || options.value.some((o) => o.uuid === current.uuid)) return options.value;
  return [{ uuid: current.uuid, name: current.name, position: null, status: UserStatus.ACTIVE }, ...options.value];
});

// A company has few users, so the whole list loads once and is searched in the browser.
onMounted(async () => {
  isLoading.value = true;
  try {
    options.value = await StockOutService.receivers();
  } catch (error) {
    AppLogger.error('Failed to load receivers:', error);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <el-select
    v-model="model"
    filterable
    clearable
    :value-on-clear="''"
    :loading="isLoading"
    :placeholder="placeholder"
    :aria-label="placeholder"
  >
    <el-option v-for="option in shownOptions" :key="option.uuid" :label="option.name" :value="option.uuid">
      <div class="receiver-option">
        <span class="receiver-option__name">
          {{ option.name }}
          <span v-if="option.position" class="receiver-option__position">· {{ option.position }}</span>
        </span>
        <el-tag v-if="option.status !== UserStatus.ACTIVE" size="small" :type="USER_STATUS_TAG[option.status].type" round>
          {{ $t(USER_STATUS_TAG[option.status].labelKey) }}
        </el-tag>
      </div>
    </el-option>
  </el-select>
</template>

<style scoped>
.receiver-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.receiver-option__name {
  overflow: hidden;
  text-overflow: ellipsis;
}

.receiver-option__position {
  color: var(--text-muted);
}
</style>
