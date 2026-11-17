<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance } from 'element-plus';
import { Save } from 'lucide-vue-next';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import CompanyFormFields from '../../components/company/CompanyFormFields.vue';
import { CompanyService } from '../../services/company/CompanyService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { toCompanyForm, toCompanyPayload } from '../../utils/formPayload';
import { AppLogger } from '../../utils/AppLogger';

const { t } = useI18n();
const { parseError } = useApiErrorMessage();

const formRef = ref<FormInstance>();
const form = ref(toCompanyForm(null));
const isLoading = ref(true);
const hasError = ref(false);
const isSaving = ref(false);

const load = async () => {
  isLoading.value = true;
  hasError.value = false;
  try {
    form.value = toCompanyForm(await CompanyService.get());
  } catch (error) {
    AppLogger.error('Failed to load the company:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

const save = async () => {
  if (!(await formRef.value?.validate().catch(() => false))) return;

  isSaving.value = true;
  try {
    form.value = toCompanyForm(await CompanyService.update(toCompanyPayload(form.value)));
    NotificationService.success(t('company.profile.saved'));
  } catch (error) {
    NotificationService.error(parseError(error, 'company.profile.saveError'));
  } finally {
    isSaving.value = false;
  }
};

onMounted(load);
</script>

<template>
  <section class="profile-page">
    <PageHeader :title="$t('company.profile.title')" :subtitle="$t('company.profile.subtitle')" />

    <LoadError v-if="hasError && !isLoading" :message="$t('company.profile.loadError')" @retry="load" />

    <AppCard v-else class="profile-card">
      <el-skeleton v-if="isLoading" :rows="5" animated />

      <el-form
        v-else
        ref="formRef"
        :model="form"
        label-position="top"
        :disabled="isSaving"
        @submit.prevent="save"
      >
        <CompanyFormFields v-model="form" />

        <div class="profile-actions">
          <el-button type="primary" native-type="submit" :loading="isSaving">
            <Save v-if="!isSaving" :size="16" aria-hidden="true" />
            <span>{{ $t('common.save') }}</span>
          </el-button>
        </div>
      </el-form>
    </AppCard>
  </section>
</template>

<style scoped>
.profile-card {
  max-width: 640px;
}

.profile-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
