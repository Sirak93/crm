<script setup lang="ts">
import type { ISupplier, ISupplierContact } from 'armstock-shared';
import { Pencil, Phone, StickyNote, Trash2, UserRound, UserRoundPlus } from 'lucide-vue-next';

defineProps<{
  supplier: ISupplier;
  /** uuid of the contact being deleted. */
  deletingContactUuid: string | null;
}>();

defineEmits<{
  addContact: [];
  editContact: [contact: ISupplierContact];
  deleteContact: [contact: ISupplierContact];
}>();
</script>

<template>
  <div class="details">
    <section class="details__section">
      <div class="details__head">
        <h3 class="details__label">{{ $t('suppliers.details.contacts') }}</h3>
        <el-button size="small" @click="$emit('addContact')">
          <UserRoundPlus :size="14" aria-hidden="true" />
          <span>{{ $t('supplierContacts.add') }}</span>
        </el-button>
      </div>

      <p v-if="!supplier.contacts.length" class="details__muted">{{ $t('suppliers.details.noContacts') }}</p>

      <ul v-else class="contacts">
        <li v-for="contact in supplier.contacts" :key="contact.uuid" class="contact">
          <span class="contact__icon"><UserRound :size="14" aria-hidden="true" /></span>
          <div class="contact__body">
            <div class="contact__name">
              {{ contact.name }}
              <span v-if="contact.position" class="details__muted">· {{ contact.position }}</span>
            </div>
            <div class="contact__line">
              <Phone :size="12" aria-hidden="true" />
              <span :class="{ details__muted: !contact.phone }">{{ contact.phone || $t('suppliers.details.noPhone') }}</span>
            </div>
            <p v-if="contact.note" class="contact__note">{{ contact.note }}</p>
          </div>
          <div class="contact__actions">
            <el-button
              text
              size="small"
              :aria-label="$t('supplierContacts.editFor', { name: contact.name })"
              @click="$emit('editContact', contact)"
            >
              <Pencil :size="14" aria-hidden="true" />
            </el-button>
            <el-button
              text
              size="small"
              type="danger"
              :loading="deletingContactUuid === contact.uuid"
              :aria-label="$t('supplierContacts.deleteFor', { name: contact.name })"
              @click="$emit('deleteContact', contact)"
            >
              <Trash2 v-if="deletingContactUuid !== contact.uuid" :size="14" aria-hidden="true" />
            </el-button>
          </div>
        </li>
      </ul>
    </section>

    <section v-if="supplier.note" class="details__section">
      <h3 class="details__label">{{ $t('suppliers.details.note') }}</h3>
      <div class="firm-note">
        <StickyNote :size="14" aria-hidden="true" class="firm-note__icon" />
        <p class="firm-note__text">{{ supplier.note }}</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.details {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  padding: clamp(0.5rem, 2vw, 1rem);
  white-space: normal;
}

@media (min-width: 992px) {
  .details {
    grid-template-columns: 2fr 1fr;
  }
}

.details__section {
  min-width: 0;
}

.details__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.details__label {
  margin: 0 0 0.5rem;
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.details__head .details__label {
  margin-bottom: 0;
}

.details__muted {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--text-muted);
}

.contacts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.contact {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.625rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background-color: var(--bg-card);
}

.contact__icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--primary);
  background-color: var(--primary-light);
}

.contact__body {
  flex: 1;
  min-width: 0;
}

.contact__name {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-main);
  overflow-wrap: anywhere;
}

.contact__line {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: var(--text-sm);
  color: var(--text-main);
}

.contact__note {
  margin: 0.25rem 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.contact__actions {
  display: flex;
  flex-shrink: 0;
}

.contact__actions .el-button + .el-button {
  margin-left: 0;
}

.firm-note {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.625rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background-color: var(--bg-card);
}

.firm-note__icon {
  flex-shrink: 0;
  margin-top: 3px;
  color: var(--text-muted);
}

.firm-note__text {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-main);
  white-space: pre-line;
  overflow-wrap: anywhere;
}
</style>
