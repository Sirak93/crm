<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import enElement from 'element-plus/es/locale/lang/en';
import hyAm from './locales/elementPlusHy';
import { LOCALE, type Locale } from 'armstock-shared';

/** Element Plus has its own texts (date picker, pagination, "No data"). */
const ELEMENT_LOCALES = {
  [LOCALE.HY]: hyAm,
  [LOCALE.EN]: enElement,
} as const;

const { locale } = useI18n();

const elementLocale = computed(() => ELEMENT_LOCALES[locale.value as Locale]);
</script>

<template>
  <el-config-provider :locale="elementLocale">
    <router-view />
  </el-config-provider>
</template>
