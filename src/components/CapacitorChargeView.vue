<template>
  <div class="capacitor-charge-view">
    <div class="cc-info-row">
      <div class="cc-info-item">
        <span class="cc-info-label">τ = RC</span>
        <span class="cc-info-value">{{ tauMs.toFixed(1) }}ms</span>
      </div>
      <div class="cc-info-item">
        <span class="cc-info-label">5τ (充满)</span>
        <span class="cc-info-value">{{ fiveTauMs.toFixed(1) }}ms</span>
      </div>
      <div class="cc-info-item">
        <span class="cc-info-label">Vmax</span>
        <span class="cc-info-value">{{ voltage }}V</span>
      </div>
    </div>

    <svg class="cc-curve-svg" :viewBox="`0 0 ${svgW} ${svgH}`">
      <!-- grid -->
      <defs>
        <pattern id="ccgrid" width="40" height="30" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ccgrid)" />

      <!-- axes -->
      <line x1="40" y1="10" x2="40" y2="180" stroke="#555" stroke-width="1" />
      <line x1="40" y1="180" x2="370" y2="180" stroke="#555" stroke-width="1" />

      <!-- y-axis labels -->
      <text x="35" y="15" text-anchor="end" fill="#888" font-size="10">{{ voltage }}V</text>
      <text x="35" y="95" text-anchor="end" fill="#888" font-size="10">{{ (voltage * 0.63).toFixed(1) }}V</text>
      <text x="35" y="183" text-anchor="end" fill="#888" font-size="10">0V</text>

      <!-- 63% line -->
      <line x1="40" y1="92" x2="370" y2="92" stroke="rgba(243,156,18,0.3)" stroke-width="1" stroke-dasharray="4,4" />
      <text x="365" y="88" text-anchor="end" fill="rgba(243,156,18,0.6)" font-size="9">63% (1τ)</text>

      <!-- curve path -->
      <path :d="curvePath" fill="none" :stroke="curveColor" stroke-width="2.5" stroke-linecap="round" />

      <!-- current voltage dot -->
      <circle :cx="dotX" :cy="dotY" r="4" :fill="curveColor" />
    </svg>

    <div class="cc-x-axis">
      <span>0ms</span>
      <span>{{ (fiveTauMs * 0.5).toFixed(0) }}ms</span>
      <span>{{ fiveTauMs.toFixed(0) }}ms (5τ)</span>
    </div>

    <div class="cc-mode-display">
      <span v-if="mode === 'charge'" class="cc-mode-tag charge">充电中 ⬆️</span>
      <span v-else class="cc-mode-tag discharge">放电中 ⬇️</span>
      <span class="cc-current-v">当前: {{ currentVoltage.toFixed(2) }}V ({{ chargePercent.toFixed(0) }}%)</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  simResult: { type: Object, default: null }
})

const svgW = 380
const svgH = 190

const tauMs = computed(() => props.simResult?.tauMs ?? 100)
const fiveTauMs = computed(() => props.simResult?.fiveTauMs ?? 500)
const voltage = computed(() => props.simResult?.voltage ?? 5)
const mode = computed(() => props.simResult?.mode ?? 'charge')
const curve = computed(() => props.simResult?.curve ?? [])

const curveColor = computed(() => mode.value === 'charge' ? '#3498db' : '#e74c3c')

const curvePath = computed(() => {
  if (!curve.value.length) return ''
  const maxT = fiveTauMs.value
  const maxV = voltage.value
  const points = curve.value.map(p => {
    const x = 40 + (p.t / maxT) * 330
    const y = 180 - (p.v / maxV) * 170
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return `M ${points.join(' L ')}`
})

const dotX = computed(() => {
  if (!curve.value.length) return 40
  const last = curve.value[curve.value.length - 1]
  return 40 + (last.t / fiveTauMs.value) * 330
})

const dotY = computed(() => {
  if (!curve.value.length) return 180
  const last = curve.value[curve.value.length - 1]
  return 180 - (last.v / voltage.value) * 170
})

const currentVoltage = computed(() => {
  if (!curve.value.length) return 0
  return curve.value[curve.value.length - 1].v
})

const chargePercent = computed(() => {
  return (currentVoltage.value / voltage.value) * 100
})
</script>

<style scoped>
.capacitor-charge-view {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cc-info-row {
  display: flex;
  justify-content: space-around;
}
.cc-info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.cc-info-label {
  font-size: 11px;
  color: var(--text-dim);
}
.cc-info-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  font-family: monospace;
}
.cc-curve-svg {
  width: 100%;
  max-width: 380px;
  height: auto;
}
.cc-x-axis {
  display: flex;
  justify-content: space-between;
  padding: 0 10px;
  font-size: 10px;
  color: var(--text-dim);
}
.cc-mode-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}
.cc-mode-tag {
  font-size: 13px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 6px;
}
.cc-mode-tag.charge {
  background: rgba(52, 152, 219, 0.2);
  color: var(--primary);
}
.cc-mode-tag.discharge {
  background: rgba(231, 76, 60, 0.2);
  color: var(--danger);
}
.cc-current-v {
  font-size: 13px;
  color: var(--text-dim);
  font-family: monospace;
}
</style>
