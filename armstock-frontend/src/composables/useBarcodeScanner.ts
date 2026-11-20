import { onBeforeUnmount, onMounted, toValue, type MaybeRefOrGetter } from 'vue';
import { BARCODE_INPUT_ATTR } from '../constants/constants';
import { SerialScannerService } from '../services/SerialScannerService';

// A USB scanner types like a keyboard, but far faster than a person, and ends with Enter.
const MAX_KEY_GAP_MS = 50;
const MIN_LENGTH = 4;

type TextField = HTMLInputElement | HTMLTextAreaElement;

const asTextField = (target: EventTarget | null): TextField | null =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ? target : null;

/**
 * Calls `onScan` with each scanned barcode while `enabled`. A scan into the barcode field
 * (BARCODE_INPUT_ATTR) only fills it; a scan into any other field is undone in that field.
 * While not `enabled` (a dialog is open) scans are still undone, so they cannot type or submit there.
 * A serial (COM mode) scanner follows the same rules, but never types, so there is nothing to undo.
 */
export const useBarcodeScanner = (onScan: (barcode: string) => void, enabled: MaybeRefOrGetter<boolean> = true) => {
  let buffer = '';
  let lastKeyAt = 0;
  // The focused field and its value before the scan's first character landed in it.
  let field: TextField | null = null;
  let fieldValueBefore = '';

  const reset = () => {
    buffer = '';
    field = null;
  };

  const setFieldValue = (target: TextField, value: string) => {
    target.value = value;
    // v-model (el-input, el-input-number) listens to `input`, not to the value itself.
    target.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const restoreField = () => {
    if (field && field.value !== fieldValueBefore) setFieldValue(field, fieldValueBefore);
  };

  const onSerialScan = (barcode: string) => {
    const focused = asTextField(document.activeElement);
    if (focused?.closest(`[${BARCODE_INPUT_ATTR}]`)) setFieldValue(focused, barcode);
    else if (toValue(enabled)) onScan(barcode);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const target = asTextField(event.target);
    if (target?.closest(`[${BARCODE_INPUT_ATTR}]`) || event.ctrlKey || event.metaKey || event.altKey) {
      reset();
      return;
    }
    if (event.key === 'Shift') return;

    const isFast = event.timeStamp - lastKeyAt <= MAX_KEY_GAP_MS;
    lastKeyAt = event.timeStamp;

    if (event.key === 'Enter') {
      if (isFast && buffer.length >= MIN_LENGTH) {
        event.preventDefault();
        event.stopPropagation();
        restoreField();
        if (toValue(enabled)) onScan(buffer);
      }
      reset();
      return;
    }

    if (event.key.length !== 1) {
      reset();
      return;
    }

    if (!isFast || !buffer) {
      buffer = '';
      field = target;
      fieldValueBefore = target?.value ?? '';
    }
    buffer += event.key;
  };

  // Capture phase: we must see Enter before the form or dialog under the focus acts on it.
  let unsubscribeSerial = () => {};
  onMounted(() => {
    window.addEventListener('keydown', onKeyDown, true);
    unsubscribeSerial = SerialScannerService.subscribe(onSerialScan);
  });
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeyDown, true);
    unsubscribeSerial();
  });
};
