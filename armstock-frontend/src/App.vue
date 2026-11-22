<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import hyAm from 'element-plus/es/locale/lang/hy-am';
import enElement from 'element-plus/es/locale/lang/en';
import { LOCALE, type Locale } from './constants/constants';

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
