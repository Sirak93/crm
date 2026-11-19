<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { Phone, Plus, Trash2, UserRound } from 'lucide-vue-next';
import { REQUIRED_RULE_TRIGGER } from '../../constants/constants';
import type { ISupplierContactForm } from '../../interfaces/ISupplierContactForm';

const contacts = defineModel<ISupplierContactForm[]>({ required: true });

const { t } = useI18n();

const nameRules = [{ required: true, whitespace: true, message: () => t('suppliers.form.contactNameRequired'), trigger: REQUIRED_RULE_TRIGGER }];

const add = () => {
  contacts.value = [...contacts.value, { key: crypto.randomUUID(), name: '', position: '', phone: '' }];
};

const remove = (key: string) => {
  contacts.value = contacts.value.filter((c) => c.key !== key);
};
</script>

<template>
  <fieldset class="contacts">
    <legend class="contacts__title">{{ $t('suppliers.form.contacts') }}</legend>

    <p v-if="!contacts.length" class="contacts__empty">{{ $t('suppliers.form.noContacts') }}</p>

    <div v-for="(contact, index) in contacts" :key="contact.key" class="contacts__row">
      <el-form-item :prop="`contacts.${index}.name`" :rules="nameRules">
        <el-input
          v-model="contact.name"
          maxlength="200"
          :placeholder="$t('suppliers.form.contactName')"
          :aria-label="$t('suppliers.form.contactName')"
        >
          <template #prefix><UserRound :size="16" aria-hidden="true" /></template>
        </el-input>
      </el-form-item>
      <el-form-item>
        <el-input
          v-model="contact.position"
          maxlength="100"
          :placeholder="$t('suppliers.form.contactPosition')"
          :aria-label="$t('suppliers.form.contactPosition')"
        />
      </el-form-item>
      <el-form-item>
        <el-input
          v-model="contact.phone"
          type="tel"
          maxlength="50"
          :placeholder="$t('suppliers.form.contactPhone')"
          :aria-label="$t('suppliers.form.contactPhone')"
        >
          <template #prefix><Phone :size="16" aria-hidden="true" /></template>
        </el-input>
      </el-form-item>
      <el-button
        class="contacts__remove"
        text
        :aria-label="$t('suppliers.form.removeContact', { n: index + 1 })"
        @click="remove(contact.key)"
      >
        <Trash2 :size="16" aria-hidden="true" />
      </el-button>
    </div>

    <el-button class="contacts__add" @click="add">
      <Plus :size="16" aria-hidden="true" />
      <span>{{ $t('suppliers.form.addContact') }}</span>
    </el-button>
  </fieldset>
</template>

<style scoped>
.contacts {
  margin: 0 0 18px;
  padding: 0;
  border: 0;
  min-width: 0;
}

.contacts__title {
  margin-bottom: 0.5rem;
  padding: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-main);
}

.contacts__empty {
  margin: 0 0 0.75rem;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

/* Stacked on small screens, one line per contact from 576px. */
.contacts__row {
  display: grid;
  grid-template-columns: 1fr;
  column-gap: 0.5rem;
  padding-bottom: 0.75rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
}

.contacts__remove {
  justify-self: end;
  margin-top: -0.5rem;
}

@media (min-width: 576px) {
  .contacts__row {
    grid-template-columns: 1.4fr 1fr 1fr auto;
    align-items: start;
    padding-bottom: 0;
    margin-bottom: 0;
    border-bottom: 0;
  }

  .contacts__remove {
    margin-top: 0;
  }
}
</style>
