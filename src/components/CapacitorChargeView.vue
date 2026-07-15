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

    <!-- 电路原理图 -->
    <svg class="cc-circuit" viewBox="0 0 320 130">
      <!-- V 电源 -->
      <text x="15" y="22" fill="var(--text-dim)" font-size="10">V = {{ voltage }}V</text>
      <line x1="50" y1="30" x2="50" y2="38" stroke="var(--wire)" stroke-width="2"/>
      <text x="42" y="36" fill="var(--text-dim)" font-size="8">+</text>
      <circle cx="50" cy="30" r="3" fill="var(--wire)"/>

      <!-- 导线 V → SW (开关) -->
      <line x1="50" y1="38" x2="50" y2="45" stroke="var(--wire)" stroke-width="2"/>

      <!-- SW 开关符号 -->
      <circle cx="50" cy="45" r="2" fill="var(--wire)"/>
      <line x1="50" y1="45" x2="62" y2="38" :stroke="mode === 'charge' ? 'var(--accent)' : '#888'" stroke-width="2"/>
      <text x="68" y="35" :fill="mode === 'charge' ? 'var(--accent)' : 'var(--text-dim)'" font-size="8">{{ mode === 'charge' ? 'SW(充电)' : 'SW(放电)' }}</text>

      <!-- 导线 SW → R -->
      <line x1="62" y1="38" x2="80" y2="38" stroke="var(--wire)" stroke-width="2" opacity="0"/>
      <line x1="62" y1="45" x2="80" y2="45" stroke="var(--wire)" stroke-width="2"/>

      <!-- R 电阻 (ANSI zigzag, 水平) -->
      <path d="M80,45 h3 l3,-5 l6,10 l6,-10 l6,10 l6,-10 l3,5 h3" fill="none" stroke="#e67e22" stroke-width="1.5"/>
      <text x="88" y="38" fill="#e67e22" font-size="10">R</text>

      <!-- 导线 R → 节点 -->
      <line x1="122" y1="45" x2="160" y2="45" stroke="var(--wire)" stroke-width="2"/>

      <!-- Vc 输出节点 -->
      <circle cx="160" cy="45" r="3" fill="var(--wire)"/>
      <line x1="160" y1="45" x2="240" y2="45" :stroke="mode === 'charge' ? 'var(--accent)' : '#e74c3c'" stroke-width="2"/>
      <text x="248" y="49" :fill="mode === 'charge' ? 'var(--accent)' : '#e74c3c'" font-size="11" font-weight="bold">Vc = {{ currentVoltage.toFixed(2) }}V</text>

      <!-- 导线 节点 → C -->
      <line x1="160" y1="45" x2="160" y2="55" stroke="var(--wire)" stroke-width="2"/>

      <!-- C 电容 (两平行板) -->
      <line x1="152" y1="55" x2="168" y2="55" stroke="#3498db" stroke-width="2.5"/>
      <line x1="152" y1="61" x2="168" y2="61" stroke="#3498db" stroke-width="2.5"/>
      <text x="175" y="60" fill="#3498db" font-size="10">C</text>

      <!-- 导线 C → GND -->
      <line x1="160" y1="61" x2="160" y2="85" stroke="var(--wire)" stroke-width="2"/>

      <!-- GND 回路 -->
      <line x1="50" y1="85" x2="160" y2="85" stroke="var(--wire)" stroke-width="2"/>
      <line x1="50" y1="45" x2="50" y2="85" stroke="var(--wire)" stroke-width="2" opacity="0"/>

      <!-- 接地符号 -->
      <line x1="92" y1="85" x2="108" y2="85" stroke="var(--wire)" stroke-width="2.5"/>
      <line x1="95" y1="89" x2="105" y2="89" stroke="var(--wire)" stroke-width="2"/>
      <line x1="98" y1="93" x2="102" y2="93" stroke="var(--wire)" stroke-width="1.5"/>
      <text x="115" y="91" fill="var(--text-dim)" font-size="9">GND</text>

      <!-- 时间常数标注 -->
      <text x="100" y="115" fill="var(--text-dim)" font-size="9">τ = RC = {{ tauMs.toFixed(1) }}ms</text>
    </svg>

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
