<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Permission, type IMeasureUnit } from 'armstock-shared';
import { Plus, Ruler, Search } from 'lucide-vue-next';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import MeasureUnitsTable from '../../components/company/MeasureUnitsTable.vue';
import MeasureUnitDialog from '../../components/company/MeasureUnitDialog.vue';
import { MeasureUnitService } from '../../services/MeasureUnitService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';
import { useAuthStore } from '../../stores/auth';

const { t } = useI18n();
const { parseError } = useApiErrorMessage();
const authStore = useAuthStore();
const canAdd = computed(() => !!authStore.user?.can(Permission.MEASURE_UNIT_ADD));
const canEdit = computed(() => !!authStore.user?.can(Permission.MEASURE_UNIT_EDIT));
const canDelete = computed(() => !!authStore.user?.can(Permission.MEASURE_UNIT_DELETE));

const units = ref<IMeasureUnit[]>([]);
const search = ref('');
const isLoading = ref(true);
const hasLoaded = ref(false);
const hasError = ref(false);
const deletingUuid = ref<string | null>(null);

const isDialogOpen = ref(false);
const editingUnit = ref<IMeasureUnit | null>(null);

// The list is small, so it is filtered here instead of on the server.
const filteredUnits = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return units.value;
  return units.value.filter((u) => u.name.toLowerCase().includes(term) || u.shortName.toLowerCase().includes(term));
});

const load = async () => {
  isLoading.value = true;
  hasError.value = false;
  try {
    units.value = await MeasureUnitService.list();
    hasLoaded.value = true;
  } catch (error) {
    AppLogger.error('Failed to load units:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

const openAdd = () => {
  editingUnit.value = null;
  isDialogOpen.value = true;
};

const openEdit = (unit: IMeasureUnit) => {
  editingUnit.value = unit;
  isDialogOpen.value = true;
};

const deleteUnit = async (unit: IMeasureUnit) => {
  const confirmed = await NotificationService.confirm(
    t('measureUnits.deleteConfirmTitle', { name: unit.name }),
    t('measureUnits.deleteConfirmText'),
    t('measureUnits.actions.delete'),
  );
  if (!confirmed) return;

  deletingUuid.value = unit.uuid;
  try {
    await MeasureUnitService.delete(unit.uuid);
    units.value = units.value.filter((u) => u.uuid !== unit.uuid);
    NotificationService.success(t('measureUnits.deleted'));
  } catch (error) {
    NotificationService.error(parseError(error, 'measureUnits.deleteError'));
  } finally {
    deletingUuid.value = null;
  }
};

onMounted(load);
</script>

<template>
  <section class="units-page">
    <PageHeader
      :title="$t('measureUnits.title')"
      :subtitle="$t('measureUnits.subtitle')"
      :badge="hasLoaded ? formatNumber(units.length) : undefined"
    >
      <template v-if="canAdd" #actions>
        <el-button type="primary" @click="openAdd">
          <Plus :size="16" aria-hidden="true" />
          <span>{{ $t('measureUnits.add') }}</span>
        </el-button>
      </template>
    </PageHeader>

    <el-input
      v-model="search"
      :placeholder="$t('measureUnits.searchPlaceholder')"
      :aria-label="$t('measureUnits.searchPlaceholder')"
      clearable
      class="units-search"
    >
      <template #prefix><Search :size="16" aria-hidden="true" /></template>
    </el-input>

    <LoadError v-if="hasError && !isLoading" :message="$t('measureUnits.loadError')" @retry="load" />

    <AppCard v-else class="table-card">
      <el-skeleton v-if="isLoading && !hasLoaded" :rows="4" animated class="skeleton" />

      <el-empty v-else-if="!filteredUnits.length" :description="$t(search.trim() ? 'measureUnits.noResults' : 'measureUnits.empty')">
        <template #image><Ruler :size="40" aria-hidden="true" /></template>
      </el-empty>

      <MeasureUnitsTable v-else v-loading="isLoading" :units="filteredUnits" :can-edit="canEdit" :can-delete="canDelete" :deleting-uuid="deletingUuid" @edit="openEdit" @delete="deleteUnit" />
    </AppCard>

    <MeasureUnitDialog v-if="canAdd || canEdit" v-model="isDialogOpen" :unit="editingUnit" @saved="load" />
  </section>
</template>

<style scoped>
.units-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.units-page > :deep(.page-header) {
  margin-bottom: 0;
}

.units-search {
  max-width: 320px;
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.skeleton {
  padding: 1rem;
}
</style>
