<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ScanBarcode } from 'lucide-vue-next';
import { SerialScannerService } from '../services/SerialScannerService';
import { NotificationService } from '../services/NotificationService';

const { t } = useI18n();
const { isSupported, isConnected } = SerialScannerService;
const isConnecting = ref(false);

const connect = async () => {
  isConnecting.value = true;
  try {
    if (await SerialScannerService.connect()) NotificationService.success(t('scanner.connected'));
    else if (!isConnected.value) NotificationService.error(t('scanner.connectError'));
  } finally {
    isConnecting.value = false;
  }
};
</script>

<template>
  <button
    v-if="isSupported && !isConnected"
    type="button"
    class="scanner-connect"
    :disabled="isConnecting"
    :aria-label="$t('scanner.connect')"
    :title="$t('scanner.connect')"
    @click="connect"
  >
    <ScanBarcode :size="18" aria-hidden="true" />
    <span class="scanner-connect__label">{{ $t('scanner.connect') }}</span>
  </button>
</template>

<style scoped>
.scanner-connect {
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
  cursor: pointer;
  transition: var(--transition);
}

.scanner-connect:hover:not(:disabled) {
  background-color: var(--bg-muted);
  color: var(--primary);
}

.scanner-connect:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.scanner-connect:disabled {
  cursor: wait;
  opacity: 0.6;
}

@media (max-width: 575px) {
  .scanner-connect {
    width: 38px;
    padding: 0;
    justify-content: center;
  }

  .scanner-connect__label {
    display: none;
  }
}
</style>
