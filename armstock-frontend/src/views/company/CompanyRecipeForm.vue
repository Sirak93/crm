<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import type { IRecipeDetails, IRecipePayload } from 'armstock-shared';
import BackLink from '../../components/BackLink.vue';
import PageHeader from '../../components/PageHeader.vue';
import AppCard from '../../components/AppCard.vue';
import LoadError from '../../components/LoadError.vue';
import RecipeLinesEditor from '../../components/company/RecipeLinesEditor.vue';
import { RecipeService } from '../../services/RecipeService';
import { NotificationService } from '../../services/NotificationService';
import { useApiErrorMessage } from '../../composables/useApiErrorMessage';
import { useUnsavedChanges } from '../../composables/useUnsavedChanges';
import { REQUIRED_RULE_TRIGGER, ROUTE_NAME } from '../../constants/constants';
import type { IStockOutLineForm } from '../../interfaces/IStockOutLineForm';
import { formatNumber } from '../../utils/format';
import { emptyOutLine, isOutLineValid, toOutLineForm } from '../../utils/stockOutLines';
import { AppLogger } from '../../utils/AppLogger';

const props = defineProps<{
  /** Missing = a new recipe. */
  uuid?: string;
}>();

const router = useRouter();
const { t } = useI18n();
const { showError } = useApiErrorMessage();

const isEdit = computed(() => !!props.uuid);

const formRef = ref<FormInstance>();
const form = ref({ name: '', note: '' });
const lines = ref<IStockOutLineForm[]>([emptyOutLine()]);
const original = ref<IRecipeDetails | null>(null);

const isLoading = ref(isEdit.value);
const hasError = ref(false);
const isSaving = ref(false);
const showLineErrors = ref(false);

/** What is compared to tell whether anything changed. Row keys and product details are left out. */
const snapshotOf = () => JSON.stringify({
  ...form.value,
  lines: lines.value.map(({ productUuid, quantity }) => ({ productUuid, quantity })),
});
const savedSnapshot = ref(snapshotOf());
const isDirty = computed(() => snapshotOf() !== savedSnapshot.value);

useUnsavedChanges(isDirty);

const rules: FormRules = {
  name: [{ required: true, whitespace: true, message: () => t('recipes.form.nameRequired'), trigger: REQUIRED_RULE_TRIGGER }],
};

const listRoute = { name: ROUTE_NAME.COMPANY_RECIPES };

const load = async () => {
  if (!props.uuid) return;
  isLoading.value = true;
  hasError.value = false;
  try {
    const recipe = await RecipeService.get(props.uuid);
    original.value = recipe;
    form.value = { name: recipe.name, note: recipe.note ?? '' };
    lines.value = recipe.lines.map(toOutLineForm);
    savedSnapshot.value = snapshotOf();
  } catch (error) {
    AppLogger.error('Failed to load the recipe:', error);
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
};

onMounted(load);

const toPayload = (): IRecipePayload => ({
  name: form.value.name.trim(),
  note: form.value.note.trim() || null,
  lines: lines.value.map((line) => ({ productUuid: line.productUuid, quantity: line.quantity! })),
});

const save = async () => {
  const isHeaderValid = await formRef.value?.validate().catch(() => false);
  const areLinesValid = lines.value.length > 0 && lines.value.every(isOutLineValid);
  showLineErrors.value = !areLinesValid;
  if (!areLinesValid) {
    NotificationService.error(t(lines.value.length ? 'recipes.form.linesInvalid' : 'recipes.form.linesRequired'));
  }
  if (!isHeaderValid || !areLinesValid) return;

  isSaving.value = true;
  try {
    const saved = props.uuid ? await RecipeService.update(props.uuid, toPayload()) : await RecipeService.create(toPayload());
    savedSnapshot.value = snapshotOf();
    NotificationService.success(t(isEdit.value ? 'recipes.updated' : 'recipes.created', { name: saved.name }));
    await router.replace(listRoute);
  } catch (error) {
    showError(error, 'recipes.saveError');
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <section class="recipe-form-page">
    <BackLink :to="listRoute" :label="$t('recipes.backToList')" />

    <PageHeader
      :title="isEdit ? $t('recipes.editTitle', { name: original?.name ?? '' }) : $t('recipes.addTitle')"
      :subtitle="$t('recipes.formSubtitle')"
    />

    <LoadError v-if="hasError && !isLoading" :message="$t('recipes.loadOneError')" @retry="load" />

    <el-skeleton v-else-if="isLoading" :rows="8" animated />

    <template v-else>
      <AppCard>
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" :disabled="isSaving" @submit.prevent="save">
          <el-form-item :label="$t('recipes.form.name')" prop="name">
            <el-input v-model="form.name" maxlength="200" :placeholder="$t('recipes.form.namePlaceholder')" />
          </el-form-item>

          <el-form-item :label="$t('recipes.form.note')" prop="note">
            <el-input v-model="form.note" type="textarea" :rows="2" maxlength="1000" :placeholder="$t('recipes.form.optional')" />
          </el-form-item>

          <!-- Lets Enter submit the form. -->
          <button type="submit" hidden />
        </el-form>
      </AppCard>

      <AppCard class="lines-card">
        <p class="lines-card__hint">{{ $t('recipes.form.linesHint') }}</p>
        <RecipeLinesEditor v-model="lines" :show-errors="showLineErrors" />
      </AppCard>

      <div class="form-bar" role="region" :aria-label="$t('recipes.form.summary')">
        <div class="form-bar__summary">
          <span>{{ $t('recipes.form.productCount', { count: formatNumber(lines.length) }) }}</span>
        </div>
        <div class="form-bar__actions">
          <el-button :disabled="isSaving" @click="router.push(listRoute)">{{ $t('common.cancel') }}</el-button>
          <el-button type="primary" :loading="isSaving" @click="save">{{ $t('common.save') }}</el-button>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.recipe-form-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.recipe-form-page > :deep(.page-header) {
  margin-bottom: 0;
}

.lines-card {
  padding: 0;
  overflow: hidden;
}

.lines-card__hint {
  margin: 0;
  padding: 0.75rem clamp(0.75rem, 2vw, 1.25rem);
  font-size: var(--text-sm);
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}

/* Stays at the bottom of the screen while the rows scroll. */
.form-bar {
  position: sticky;
  bottom: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  padding: 0.75rem clamp(0.75rem, 2vw, 1.25rem);
  background-color: var(--bg-card);
  border: 1px solid var(--border-dark);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
}

.form-bar__summary {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.form-bar__actions {
  display: flex;
  gap: 0.5rem;
}

@media (max-width: 576px) {
  .form-bar__actions {
    width: 100%;
  }

  .form-bar__actions .el-button {
    flex: 1;
  }
}
</style>
