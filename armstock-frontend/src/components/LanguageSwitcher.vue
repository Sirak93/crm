<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { Check, Languages } from 'lucide-vue-next';
import { LOCALE, type Locale } from 'armstock-shared';
import { setLocale } from '../i18n';

const { locale } = useI18n();

const LOCALES = Object.values(LOCALE);

const handleCommand = (command: Locale) => setLocale(command);
</script>

<template>
  <el-dropdown trigger="click" placement="bottom-end" @command="handleCommand">
    <button type="button" class="language-trigger" :aria-label="$t('language.label')" :title="$t('language.label')">
      <Languages :size="18" aria-hidden="true" />
      <span>{{ $t(`language.short.${locale}`) }}</span>
    </button>

    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="item in LOCALES"
          :key="item"
          :command="item"
          :lang="item"
          class="language-item"
        >
          <span>{{ $t(`language.names.${item}`) }}</span>
          <Check v-if="item === locale" :size="16" class="language-check" aria-hidden="true" />
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style scoped>
.language-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: 38px;
  padding: 0 0.75rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.language-trigger:hover {
  background-color: var(--bg-muted);
  color: var(--primary);
}

.language-trigger:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.language-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  min-width: 140px;
}

.language-check {
  color: var(--primary);
}
</style>
