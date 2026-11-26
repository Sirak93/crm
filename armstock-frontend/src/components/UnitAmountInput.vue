<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { convertibleUnits, MEASURE_UNITS, QUANTITY_DECIMALS, QUANTITY_MAX, unitRatio, type MeasureUnit } from 'armstock-shared';
import { useMeasureUnits } from '../composables/useMeasureUnits';

/** An amount typed in any unit of the product's type; the value is always kept in the product's unit. */
const props = withDefaults(defineProps<{
  /** null = no product picked yet. */
  productUnit: MeasureUnit | null;
  /** Decimals the value keeps in the product's unit. */
  decimals?: number;
  /** Largest value, in the product's unit. */
  max?: number;
  /** Unit the picker starts on - the product's own unit when not set. */
  startUnit?: MeasureUnit | null;
  disabled?: boolean;
  invalid?: boolean;
  /** Read out by screen readers for the number field. */
  label: string;
}>(), { decimals: QUANTITY_DECIMALS, max: QUANTITY_MAX, startUnit: null });

/** In the product's unit. */
const value = defineModel<number | undefined>({ required: true });
/** The unit the amount is typed in - starts on the product's unit. */
const unit = defineModel<MeasureUnit | null>('unit', { default: null });

const { unitShortName } = useMeasureUnits();

const valueDecimals = computed(() =>
  props.productUnit !== null && MEASURE_UNITS[props.productUnit].allowsDecimals ? props.decimals : 0);

/** Decimals the typed number may have so it still fits the value's decimals (մլ of a լ product: 0). */
const typedDecimals = (typedUnit: MeasureUnit): number =>
  props.productUnit === null ? valueDecimals.value : valueDecimals.value + Math.round(Math.log10(unitRatio(typedUnit, props.productUnit)));

// A unit too small to fit the value's decimals is left out (մգ of a կգ product with 3 decimals).
const units = computed(() =>
  props.productUnit === null ? [] : convertibleUnits(props.productUnit).filter((u) => typedDecimals(u) >= 0));

const typedUnit = computed(() => unit.value ?? props.productUnit);
const ratio = computed(() => (typedUnit.value !== null && props.productUnit !== null ? unitRatio(typedUnit.value, props.productUnit) : 1));
const precision = computed(() => (typedUnit.value !== null ? typedDecimals(typedUnit.value) : valueDecimals.value));

const toTyped = (v: number | undefined) => (v === undefined ? undefined : Number((v / ratio.value).toFixed(precision.value)));
const toValue = (typed: number | undefined) => (typed === undefined ? undefined : Number((typed * ratio.value).toFixed(valueDecimals.value)));

const startingUnit = () => props.startUnit ?? props.productUnit;

// Starts on the start unit unless a fitting one was already picked (an edit); a new product starts over.
if (unit.value === null || !units.value.includes(unit.value)) unit.value = startingUnit();

const typed = ref<number | undefined>(toTyped(value.value));

const onTyped = (next: number | null | undefined) => {
  typed.value = next ?? undefined;
  value.value = toValue(typed.value);
};

// Switching the unit keeps the typed number: 500 typed, then մլ picked = 500 մլ.
const onUnitChange = () => {
  if (typed.value !== undefined) typed.value = Number(typed.value.toFixed(precision.value));
  value.value = toValue(typed.value);
};

watch(() => props.productUnit, () => {
  unit.value = startingUnit();
  typed.value = toTyped(value.value);
});

// Changed from outside (a load, a product with a whole-number unit).
watch(value, (next) => {
  if (next !== toValue(typed.value)) typed.value = toTyped(next);
});
</script>

<template>
  <div :class="['unit-amount', { 'is-invalid': invalid }]">
    <el-input-number
      :model-value="typed"
      :controls="false"
      :disabled="disabled"
      :min="0"
      :max="max / ratio"
      :precision="precision"
      :aria-label="label"
      class="unit-amount__number"
      @update:model-value="onTyped"
    />
    <el-select
      v-if="units.length > 1"
      v-model="unit"
      :disabled="disabled"
      :aria-label="$t('common.unit')"
      class="unit-amount__unit"
      @change="onUnitChange"
    >
      <el-option v-for="u in units" :key="u" :label="unitShortName(u)" :value="u" />
    </el-select>
    <span v-else :class="['unit-amount__suffix', { 'is-empty': productUnit === null }]">
      {{ productUnit !== null ? unitShortName(productUnit) : '—' }}
    </span>
  </div>
</template>

<style scoped>
.unit-amount {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  width: 100%;
}

.unit-amount__number {
  flex: 1;
  min-width: 0;
}

.unit-amount__number :deep(.el-input__inner) {
  text-align: right;
}

.unit-amount__unit {
  flex: 0 0 4.75rem;
}

.unit-amount__suffix {
  flex: 0 0 4.75rem;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.unit-amount__suffix.is-empty {
  color: var(--text-light);
}

.unit-amount.is-invalid :deep(.el-input__wrapper) {
  border-color: var(--danger) !important;
}
</style>
