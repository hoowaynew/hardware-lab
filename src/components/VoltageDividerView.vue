<template>
  <div class="voltage-divider-view">
    <div class="vd-formula">
      <span class="formula-text">Vout = Vin × R2 / (R1 + R2)</span>
    </div>
    <div class="vd-result">
      <div class="vd-value" :class="{ 'vd-warn': isOvervoltage }">
        <span class="vd-label">Vout</span>
        <span class="vd-number">{{ vout.toFixed(2) }}</span>
        <span class="vd-unit">V</span>
      </div>
      <div class="vd-meta">
        <span>Vin = {{ vin }}V</span>
        <span>R1 = {{ formatR(r1) }}</span>
        <span>R2 = {{ formatR(r2) }}</span>
      </div>
    </div>
    <div class="vd-bar-container">
      <div class="vd-bar-label">
        <span>0V</span>
        <span class="vd-adc-limit">3.3V (ADC限值)</span>
        <span>{{ vin }}V</span>
      </div>
      <div class="vd-bar">
        <div class="vd-adc-zone" :style="{ width: (3.3 / vin * 100) + '%' }"></div>
        <div class="vd-bar-fill" :style="{ width: (vout / vin * 100) + '%', background: isOvervoltage ? 'var(--danger)' : 'var(--primary)' }"></div>
        <div class="vd-bar-marker" :style="{ left: (3.3 / vin * 100) + '%' }"></div>
      </div>
    </div>
    <div class="vd-current">
      <span>I = Vin / (R1+R2) = {{ current.toFixed(2) }}mA</span>
      <span>P = {{ power.toFixed(1) }}mW</span>
      <span v-if="isHighPower" class="vd-power-warn">功耗偏高!</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  simResult: { type: Object, default: null }
})

const vout = computed(() => {
  if (!props.simResult) return 0
  return props.simResult.vout || 0
})

const vin = computed(() => props.simResult?.vin || 5)
const r1 = computed(() => props.simResult?.r1 || 1000)
const r2 = computed(() => props.simResult?.r2 || 1000)
const current = computed(() => props.simResult?.current || 0)
const power = computed(() => props.simResult?.power || 0)

const isOvervoltage = computed(() => vout.value > 3.3)
const isHighPower = computed(() => power.value > 10)

function formatR(ohms) {
  if (ohms >= 1000) return (ohms / 1000).toFixed(1) + 'kΩ'
  return ohms + 'Ω'
}
</script>

<style scoped>
.voltage-divider-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}
.vd-formula {
  text-align: center;
  background: var(--surface-light);
  border-radius: 8px;
  padding: 8px;
}
.formula-text {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: var(--text-dim);
}
.vd-result {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.vd-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.vd-label {
  font-size: 13px;
  color: var(--text-dim);
}
.vd-number {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary);
}
.vd-warn .vd-number { color: var(--danger); }
.vd-unit {
  font-size: 14px;
  color: var(--text-dim);
}
.vd-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: var(--text-dim);
  text-align: right;
}
.vd-bar-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.vd-bar-label {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-dim);
}
.vd-adc-limit { color: var(--warning); }
.vd-bar {
  position: relative;
  height: 16px;
  background: var(--surface-light);
  border-radius: 4px;
  overflow: hidden;
}
.vd-adc-zone {
  position: absolute;
  height: 100%;
  background: rgba(46, 204, 113, 0.15);
}
.vd-bar-fill {
  position: absolute;
  height: 100%;
  transition: all 0.3s;
  border-radius: 4px;
}
.vd-bar-marker {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 2px;
  background: var(--warning);
  z-index: 2;
}
.vd-current {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-dim);
  font-family: monospace;
}
.vd-power-warn { color: var(--warning); }
</style>
