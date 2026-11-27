<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Permission, SupplierStatus, type IPaginationMeta, type ISupplier, type ISupplierContact } from 'armstock-shared';
import { Plus, Truck } from 'lucide-vue-next';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import SupplierFilters from '../../components/company/SupplierFilters.vue';
import SuppliersTable from '../../components/company/SuppliersTable.vue';
import SupplierDialog from '../../components/company/SupplierDialog.vue';
import SupplierContactDialog from '../../components/company/SupplierContactDialog.vue';
import { SupplierService } from '../../services/SupplierService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { useAuthStore } from '../../stores/auth';
import { DEFAULT_PAGE_SIZE } from '../../constants/constants';
import type { ISupplierFilters } from '../../interfaces/ISupplierFilters';
import { formatNumber } from '../../utils/format';
import { AppLogger } from '../../utils/AppLogger';
import { useOpenAddFromQuery } from '../../composables/useOpenAddFromQuery';
import AppPagination from '../../components/AppPagination.vue';

const { t } = useI18n();
const { parseError } = useApiErrorMessage();

const suppliers = ref<ISupplier[]>([]);
const meta = ref<IPaginationMeta>({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 });
const filters = ref<ISupplierFilters>({});
const isLoading = ref(true);
const hasLoaded = ref(false);
const hasError = ref(false);
const busyUuid = ref<string | null>(null);

const isDialogOpen = ref(false);
const editingSupplier = ref<ISupplier | null>(null);

const isContactDialogOpen = ref(false);
const contactSupplier = ref<ISupplier | null>(null);
const editingContact = ref<ISupplierContact | null>(null);
const deletingContactUuid = ref<string | null>(null);

const hasFilters = computed(() => !!filters.value.search);

const load = async (page = meta.value.page) => {
  isLoading.value = true;
  hasError.value = false;
  try {
    const result = await SupplierService.list(page, meta.value.pageSize, filters.value);
    suppliers.value = result.items;
    meta.value = result.meta;
    hasLoaded.value = true;
  } catch (error) {
    AppLogger.error('Failed to load suppliers:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

const authStore = useAuthStore();
const canAdd = computed(() => !!authStore.user?.can(Permission.SUPPLIER_ADD));
const canEdit = computed(() => !!authStore.user?.can(Permission.SUPPLIER_EDIT));
const canArchive = computed(() => !!authStore.user?.can(Permission.SUPPLIER_ARCHIVE));
const canDelete = computed(() => !!authStore.user?.can(Permission.SUPPLIER_DELETE));

const onFiltersChange = (newFilters: ISupplierFilters) => {
  filters.value = newFilters;
  load(1);
};

const openAdd = () => {
  editingSupplier.value = null;
  isDialogOpen.value = true;
};

useOpenAddFromQuery(() => canAdd.value, openAdd);

const openEdit = (supplier: ISupplier) => {
  editingSupplier.value = supplier;
  isDialogOpen.value = true;
};

const openContactDialog = (supplier: ISupplier, contact: ISupplierContact | null) => {
  contactSupplier.value = supplier;
  editingContact.value = contact;
  isContactDialogOpen.value = true;
};

/** A new firm goes straight on to its first contact - it may not be on the current page to expand. */
const onSaved = (saved: ISupplier) => {
  const isNew = !editingSupplier.value;
  load(isNew ? 1 : meta.value.page);
  if (isNew && authStore.user?.can(Permission.SUPPLIER_CONTACT_ADD)) openContactDialog(saved, null);
};

/** Contacts change in place, so the open row stays expanded. */
const setContacts = (supplierUuid: string, update: (contacts: ISupplierContact[]) => ISupplierContact[]) => {
  const supplier = suppliers.value.find((s) => s.uuid === supplierUuid);
  if (supplier) supplier.contacts = update(supplier.contacts);
};

const onContactSaved = (supplierUuid: string, saved: ISupplierContact) => {
  setContacts(supplierUuid, (contacts) =>
    [...contacts.filter((c) => c.uuid !== saved.uuid), saved].sort((a, b) => a.name.localeCompare(b.name)),
  );
};

const deleteContact = async (supplier: ISupplier, contact: ISupplierContact) => {
  const confirmed = await NotificationService.confirm(
    t('supplierContacts.deleteConfirmTitle', { name: contact.name }),
    t('supplierContacts.deleteConfirmText', { firm: supplier.name }),
    t('supplierContacts.delete'),
  );
  if (!confirmed) return;

  deletingContactUuid.value = contact.uuid;
  try {
    await SupplierService.deleteContact(supplier.uuid, contact.uuid);
    setContacts(supplier.uuid, (contacts) => contacts.filter((c) => c.uuid !== contact.uuid));
    NotificationService.success(t('supplierContacts.deleted'));
  } catch (error) {
    NotificationService.error(parseError(error, 'supplierContacts.deleteError'));
  } finally {
    deletingContactUuid.value = null;
  }
};

/** Stays on the same page unless it became empty. */
const reloadAfterRemoval = () => load(suppliers.value.length === 1 && meta.value.page > 1 ? meta.value.page - 1 : meta.value.page);

const setStatus = async (supplier: ISupplier, status: SupplierStatus) => {
  busyUuid.value = supplier.uuid;
  try {
    await SupplierService.setStatus(supplier.uuid, status);
    NotificationService.success(t(status === SupplierStatus.ARCHIVED ? 'suppliers.archived' : 'suppliers.restored'));
    // The row may no longer match the status filter.
    await (filters.value.status ? reloadAfterRemoval() : load());
  } catch (error) {
    NotificationService.error(parseError(error, 'suppliers.saveError'));
  } finally {
    busyUuid.value = null;
  }
};

const deleteSupplier = async (supplier: ISupplier) => {
  const confirmed = await NotificationService.confirm(
    t('suppliers.deleteConfirmTitle', { name: supplier.name }),
    t('suppliers.deleteConfirmText'),
    t('suppliers.actions.delete'),
  );
  if (!confirmed) return;

  busyUuid.value = supplier.uuid;
  try {
    await SupplierService.delete(supplier.uuid);
    NotificationService.success(t('suppliers.deleted'));
    await reloadAfterRemoval();
  } catch (error) {
    NotificationService.error(parseError(error, 'suppliers.deleteError'));
  } finally {
    busyUuid.value = null;
  }
};
</script>

<template>
  <section class="suppliers-page">
    <PageHeader
      :title="$t('suppliers.title')"
      :subtitle="$t('suppliers.subtitle')"
      :badge="hasLoaded ? formatNumber(meta.total) : undefined"
    >
      <template v-if="canAdd" #actions>
        <el-button type="primary" @click="openAdd">
          <Plus :size="16" aria-hidden="true" />
          <span>{{ $t('suppliers.add') }}</span>
        </el-button>
      </template>
    </PageHeader>

    <SupplierFilters @change="onFiltersChange" />

    <LoadError v-if="hasError && !isLoading" :message="$t('suppliers.loadError')" @retry="load()" />

    <AppCard v-else class="table-card">
      <el-skeleton v-if="isLoading && !hasLoaded" :rows="6" animated class="skeleton" />

      <el-empty v-else-if="!suppliers.length" :description="$t(hasFilters ? 'suppliers.noResults' : 'suppliers.empty')">
        <template #image><Truck :size="40" aria-hidden="true" /></template>
      </el-empty>

      <SuppliersTable
        v-else
        v-loading="isLoading"
        :suppliers="suppliers"
        :busy-uuid="busyUuid"
        :deleting-contact-uuid="deletingContactUuid"
        :can-edit="canEdit"
        :can-archive="canArchive"
        :can-delete="canDelete"
        @edit="openEdit"
        @set-status="setStatus"
        @delete="deleteSupplier"
        @add-contact="(supplier) => openContactDialog(supplier, null)"
        @edit-contact="openContactDialog"
        @delete-contact="deleteContact"
      />
    </AppCard>

    <AppPagination :meta="meta" @change="load" />

    <SupplierDialog v-if="canAdd || canEdit" v-model="isDialogOpen" :supplier="editingSupplier" @saved="onSaved" />
    <SupplierContactDialog
      v-model="isContactDialogOpen"
      :supplier="contactSupplier"
      :contact="editingContact"
      @saved="onContactSaved"
    />
  </section>
</template>

<style scoped>
.suppliers-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.suppliers-page > :deep(.page-header) {
  margin-bottom: 0;
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.skeleton {
  padding: 1rem;
}
</style>
