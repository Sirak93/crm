<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import { Lock, LogIn, Mail } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useApiErrorMessage } from '../composables/useApiErrorMessage';
import { NotificationService } from '../services/NotificationService';

const authStore = useAuthStore();
const router = useRouter();
const { t } = useI18n();
const { parseError } = useApiErrorMessage();

const formRef = ref<FormInstance>();
const form = reactive({ email: '', password: '' });
const isLoading = ref(false);

const rules: FormRules = {
  email: [{ required: true, message: () => t('auth.emailRequired'), trigger: 'blur' }],
  password: [{ required: true, message: () => t('auth.passwordRequired'), trigger: 'blur' }],
};

const handleLogin = async () => {
  if (!(await formRef.value?.validate().catch(() => false))) return;

  isLoading.value = true;
  try {
    await authStore.login(form.email, form.password);
    router.push('/');
  } catch (error) {
    NotificationService.error(parseError(error, 'auth.loginFailed'));
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="login-card">
    <h1 class="login-card__title">{{ $t('auth.welcomeBack') }}</h1>
    <p class="login-card__subtitle">{{ $t('auth.enterCredentials') }}</p>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      :disabled="isLoading"
      @submit.prevent="handleLogin"
    >
      <el-form-item :label="$t('auth.email')" prop="email">
        <el-input v-model="form.email" type="email" autocomplete="username" :placeholder="$t('auth.emailPlaceholder')">
          <template #prefix><Mail :size="18" aria-hidden="true" /></template>
        </el-input>
      </el-form-item>

      <el-form-item :label="$t('auth.password')" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          show-password
          :placeholder="$t('auth.passwordPlaceholder')"
        >
          <template #prefix><Lock :size="18" aria-hidden="true" /></template>
        </el-input>
      </el-form-item>

      <el-button type="primary" native-type="submit" class="login-card__submit" :loading="isLoading">
        <LogIn v-if="!isLoading" :size="18" aria-hidden="true" />
        <span>{{ $t('auth.signIn') }}</span>
      </el-button>
    </el-form>
  </div>
</template>

<style scoped>
.login-card {
  width: 100%;
  max-width: 440px;
  padding: clamp(1rem, 4vw, 1.5rem);
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
}

.login-card__title {
  margin: 0 0 0.25rem;
  font-size: var(--text-3xl);
  font-weight: 800;
  letter-spacing: -0.025em;
  color: var(--text-main);
}

.login-card__subtitle {
  margin: 0 0 2rem;
  color: var(--text-muted);
}

.login-card__submit {
  width: 100%;
  margin-top: 0.5rem;
  gap: 0.5rem;
}

@media (max-width: 991.98px) {
  .login-card {
    margin-top: -24px;
  }
}
</style>
