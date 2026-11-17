<script setup lang="ts">
import CompanyUsersManager from '../../components/company/CompanyUsersManager.vue';
import { CompanyUsersService } from '../../services/company/CompanyUsersService';
</script>

<template>
  <CompanyUsersManager :api="CompanyUsersService" :title="$t('companyUsers.title')" :subtitle="$t('companyUsers.subtitle')" />
</template>
