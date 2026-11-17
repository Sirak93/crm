<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { IUnit } from 'armstock-shared';
import { Plus, Ruler, Search } from 'lucide-vue-next';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import UnitsTable from '../../components/platform/UnitsTable.vue';
import UnitDialog from '../../components/platform/UnitDialog.vue';
import { UnitService } from '../../services/UnitService';
import { PlatformUnitsService } from '../../services/platform/PlatformUnitsService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';

const { t } = useI18n();
const { parseError } = useApiErrorMessage();

const units = ref<IUnit[]>([]);
const search = ref('');
const isLoading = ref(true);
const hasLoaded = ref(false);
const hasError = ref(false);
const deletingUuid = ref<string | null>(null);

const isDialogOpen = ref(false);
const editingUnit = ref<IUnit | null>(null);

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
    units.value = await UnitService.list();
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

const openEdit = (unit: IUnit) => {
  editingUnit.value = unit;
  isDialogOpen.value = true;
};

const deleteUnit = async (unit: IUnit) => {
  const confirmed = await NotificationService.confirm(
    t('platform.units.deleteConfirmTitle', { name: unit.name }),
    t('platform.units.deleteConfirmText'),
    t('platform.units.actions.delete'),
  );
  if (!confirmed) return;

  deletingUuid.value = unit.uuid;
  try {
    await PlatformUnitsService.delete(unit.uuid);
    units.value = units.value.filter((u) => u.uuid !== unit.uuid);
    NotificationService.success(t('platform.units.deleted'));
  } catch (error) {
    NotificationService.error(parseError(error, 'platform.units.deleteError'));
  } finally {
    deletingUuid.value = null;
  }
};

onMounted(load);
</script>

<template>
  <section class="units-page">
    <PageHeader
      :title="$t('platform.units.title')"
      :subtitle="$t('platform.units.subtitle')"
      :badge="hasLoaded ? formatNumber(units.length) : undefined"
    >
      <template #actions>
        <el-button type="primary" @click="openAdd">
          <Plus :size="16" aria-hidden="true" />
          <span>{{ $t('platform.units.add') }}</span>
        </el-button>
      </template>
    </PageHeader>

    <el-input
      v-model="search"
      :placeholder="$t('platform.units.searchPlaceholder')"
      :aria-label="$t('platform.units.searchPlaceholder')"
      clearable
      class="units-search"
    >
      <template #prefix><Search :size="16" aria-hidden="true" /></template>
    </el-input>

    <LoadError v-if="hasError && !isLoading" :message="$t('platform.units.loadError')" @retry="load" />

    <AppCard v-else class="table-card">
      <el-skeleton v-if="isLoading && !hasLoaded" :rows="4" animated class="skeleton" />

      <el-empty v-else-if="!filteredUnits.length" :description="$t(search.trim() ? 'platform.units.noResults' : 'platform.units.empty')">
        <template #image><Ruler :size="40" aria-hidden="true" /></template>
      </el-empty>

      <UnitsTable v-else v-loading="isLoading" :units="filteredUnits" :deleting-uuid="deletingUuid" @edit="openEdit" @delete="deleteUnit" />
    </AppCard>

    <UnitDialog v-model="isDialogOpen" :unit="editingUnit" @saved="load" />
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
