<script setup lang="ts">
/** 数量步进器 */
const props = withDefaults(
  defineProps<{
    modelValue: number
    min?: number
    max?: number
    disabled?: boolean
    size?: 'sm' | 'md'
  }>(),
  {
    min: 1,
    max: 9999,
    disabled: false,
    size: 'md',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

function step(delta: number): void {
  if (props.disabled) return
  const next = props.modelValue + delta
  if (next < props.min || next > props.max) return
  emit('update:modelValue', next)
}

function onInput(event: Event): void {
  const value = Number.parseInt((event.target as HTMLInputElement).value, 10)
  if (!Number.isFinite(value)) return
  if (value < props.min) {
    emit('update:modelValue', props.min)
    return
  }
  if (value > props.max) {
    emit('update:modelValue', props.max)
    return
  }
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="stepper" :class="`stepper--${props.size}`">
    <button
      type="button"
      class="stepper__btn"
      :disabled="props.disabled || props.modelValue <= props.min"
      aria-label="减少数量"
      @click="step(-1)"
    >
      −
    </button>
    <input
      class="stepper__input"
      type="text"
      inputmode="numeric"
      :value="props.modelValue"
      :disabled="props.disabled"
      @change="onInput"
    />
    <button
      type="button"
      class="stepper__btn"
      :disabled="props.disabled || props.modelValue >= props.max"
      aria-label="增加数量"
      @click="step(1)"
    >
      +
    </button>
  </div>
</template>

<style scoped>
.stepper {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--ss-color-border-default);
  border-radius: var(--ss-radius-md);
  overflow: hidden;
  background: var(--ss-color-bg-card);
}

.stepper--sm .stepper__btn,
.stepper--sm .stepper__input {
  height: 26px;
  width: 30px;
  font-size: var(--ss-font-size-sm);
}

.stepper--md .stepper__btn,
.stepper--md .stepper__input {
  height: 32px;
  width: 38px;
  font-size: var(--ss-font-size-base);
}

.stepper__btn {
  border: 0;
  background: var(--ss-color-neutral-100);
  color: var(--ss-color-text-secondary);
  cursor: pointer;
  line-height: 1;
}

.stepper__btn:hover:not(:disabled) {
  background: var(--ss-color-neutral-200);
}

.stepper__btn:disabled {
  color: var(--ss-color-text-placeholder);
  cursor: not-allowed;
}

.stepper__input {
  border: 0;
  outline: none;
  text-align: center;
  font-family: var(--ss-font-family-numeric);
  background: transparent;
}

.stepper__input:disabled {
  background: var(--ss-color-neutral-50);
  color: var(--ss-color-text-placeholder);
}
</style>
