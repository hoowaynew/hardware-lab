<template>
  <div class="mosfet-view">
    <div class="formula-bar">
      <span class="formula">I<sub>D</sub> = V<sub>cc</sub> / (R<sub>load</sub> + R<sub>ds(on)</sub>)</span>
      <span class="formula-sep">|</span>
      <span class="formula">P = I<sub>D</sub>² × R<sub>ds(on)</sub></span>
    </div>

    <svg class="mosfet-svg" viewBox="0 0 360 220">
      <!-- Vcc电源 -->
      <text x="20" y="25" fill="#888" font-size="11">Vcc={{ vcc }}V</text>
      <line x1="30" y1="30" x2="30" y2="60" stroke="var(--wire)" stroke-width="2"/>
      <line x1="20" y1="30" x2="40" y2="30" stroke="var(--wire)" stroke-width="2"/>

      <!-- 负载电阻 -->
      <rect x="22" y="60" width="16" height="40" rx="2" fill="#3a2a1a" stroke="var(--wire)" stroke-width="1.5"/>
      <text x="50" y="82" fill="var(--text-dim)" font-size="10">R_load={{ loadR }}Ω</text>

      <!-- 漏极连线 -->
      <line x1="30" y1="100" x2="30" y2="120" stroke="var(--wire)" stroke-width="2"/>
      <line x1="30" y1="120" x2="160" y2="120" stroke="var(--wire)" stroke-width="2"/>

      <!-- MOSFET符号 -->
      <g :stroke="region === 'cutoff' ? '#666' : 'var(--accent)'" stroke-width="2" fill="none">
        <!-- 栅极 -->
        <line x1="140" y1="100" x2="150" y2="100"/>
        <line x1="150" y1="88" x2="150" y2="132"/>
        <!-- 沟道 -->
        <line x1="155" y1="90" x2="155" y2="100"/>
        <line x1="155" y1="108" x2="155" y2="120"/>
        <line x1="155" y1="122" x2="155" y2="130"/>
        <!-- 漏极 -->
        <line x1="155" y1="100" x2="180" y2="120"/>
        <line x1="180" y1="120" x2="220" y2="120"/>
        <!-- 源极 -->
        <line x1="155" y1="120" x2="180" y2="140"/>
        <line x1="180" y1="140" x2="180" y2="170"/>
        <!-- 箭头 (N沟道) -->
        <polygon points="180,140 174,134 176,142" :fill="region === 'cutoff' ? '#666' : 'var(--accent)'"/>
      </g>
      <text x="185" y="125" :fill="region === 'cutoff' ? '#666' : 'var(--accent)'" font-size="10">D</text>
      <text x="185" y="155" :fill="region === 'cutoff' ? '#666' : 'var(--accent)'" font-size="10">S</text>
      <text x="125" y="95" fill="#888" font-size="10">G</text>

      <!-- 栅极驱动 -->
      <line x1="100" y1="100" x2="140" y2="100" stroke="var(--wire)" stroke-width="2"/>
      <text x="80" y="92" :fill="vgs >= vth ? 'var(--accent)' : '#e74c3c'" font-size="11" font-weight="bold">Vgs={{ vgs.toFixed(1) }}V</text>
      <rect x="70" y="95" width="30" height="10" rx="2" fill="#2a2a3e" stroke="var(--wire)" stroke-width="1"/>
      <text x="85" y="103" text-anchor="middle" fill="#888" font-size="7">MCU</text>

      <!-- 源极接地 -->
      <line x1="180" y1="170" x2="180" y2="185" stroke="var(--wire)" stroke-width="2"/>
      <line x1="168" y1="185" x2="192" y2="185" stroke="var(--wire)" stroke-width="2.5"/>
      <line x1="172" y1="190" x2="188" y2="190" stroke="var(--wire)" stroke-width="2"/>

      <!-- 工作区指示 -->
      <text x="250" y="60" :fill="regionColor" font-size="12" font-weight="bold">{{ regionLabel }}</text>
      <rect x="245" y="65" width="100" height="6" rx="3" :fill="regionColor" opacity="0.3"/>
      <rect x="245" y="65" :width="regionBar" height="6" rx="3" :fill="regionColor"/>

      <!-- 电流方向箭头 -->
      <g v-if="region !== 'cutoff'">
        <text x="15" y="115" fill="var(--accent)" font-size="9">{{ loadCurrent.toFixed(0) }}mA</text>
        <path d="M25 110 L20 110 L22 107 M20 110 L22 113" fill="none" stroke="var(--accent)" stroke-width="1"/>
      </g>

      <!-- 发热效果 -->
      <g v-if="powerDissipation > 1000">
        <circle cx="165" cy="115" r="20" fill="#e74c3c" opacity="0.15">
          <animate attributeName="r" values="18;24;18" dur="1s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.1;0.25;0.1" dur="1s" repeatCount="indefinite"/>
        </circle>
        <text x="165" y="200" text-anchor="middle" fill="#e74c3c" font-size="9">⚠️ 发热 {{ powerDissipation.toFixed(0) }}mW</text>
      </g>
    </svg>

    <div class="data-panel">
      <div class="data-row">
        <span class="label">工作区</span>
        <span class="value" :style="{ color: regionColor }">{{ regionLabel }}</span>
      </div>
      <div class="data-row">
        <span class="label">Vgs - Vth</span>
        <span class="value" :class="{ warn: vgs < vth + 2 && vgs >= vth }">
          {{ (vgs - vth).toFixed(2) }}V
        </span>
      </div>
      <div class="data-row">
        <span class="label">导通电阻</span>
        <span class="value">
          {{ region === 'enhancement' ? rdsOn + 'mΩ' : (rdsActual / 1000).toFixed(1) + 'Ω' }}
        </span>
      </div>
      <div class="data-row">
        <span class="label">负载电流</span>
        <span class="value">{{ loadCurrent.toFixed(1) }}mA</span>
      </div>
      <div class="data-row">
        <span class="label">Vds压降</span>
        <span class="value">{{ vds.toFixed(3) }}V</span>
      </div>
      <div class="data-row">
        <span class="label">功耗</span>
        <span class="value" :class="{ error: powerDissipation > 2000 }">
          {{ powerDissipation.toFixed(1) }}mW
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  simResult: { type: Object, default: () => ({}) }
})

const vgs = computed(() => props.simResult?.vgs ?? 0)
const vcc = computed(() => props.simResult?.vcc ?? 12)
const rdsOn = computed(() => props.simResult?.rdsOn ?? 25)
const loadR = computed(() => props.simResult?.loadR ?? 10)
const vth = computed(() => props.simResult?.vth ?? 2.5)
const region = computed(() => props.simResult?.region ?? 'cutoff')
const rdsActual = computed(() => props.simResult?.rdsActual ?? Infinity)
const loadCurrent = computed(() => props.simResult?.loadCurrent ?? 0)
const vds = computed(() => props.simResult?.vds ?? 0)
const powerDissipation = computed(() => props.simResult?.powerDissipation ?? 0)

const regionLabel = computed(() => {
  const labels = { cutoff: '截止区', linear: '线性区', enhancement: '完全增强' }
  return labels[region.value] || '未知'
})

const regionColor = computed(() => {
  const colors = { cutoff: '#666', linear: '#f39c12', enhancement: '#2ecc71' }
  return colors[region.value] || '#666'
})

const regionBar = computed(() => {
  if (region.value === 'cutoff') return 0
  if (region.value === 'linear') return 40
  return 100
})
</script>

<style scoped>
.mosfet-view { display: flex; flex-direction: column; gap: 8px; }
.formula-bar {
  display: flex; gap: 8px; flex-wrap: wrap;
  padding: 6px 10px; background: var(--card-bg); border-radius: 6px;
  font-size: 12px; color: var(--text-secondary);
}
.formula { color: var(--accent); font-family: monospace; }
.formula-sep { color: var(--text-dim); }
.mosfet-svg {
  width: 100%; max-width: 360px; height: auto;
  background: var(--canvas-bg); border-radius: 8px;
}
.data-panel { display: flex; flex-direction: column; gap: 4px; }
.data-row {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 8px; font-size: 13px;
}
.data-row .label { width: 90px; color: var(--text-secondary); }
.data-row .value { font-weight: bold; color: var(--accent); }
.data-row .value.warn { color: #f1c40f; }
.data-row .value.error { color: var(--error); }
</style>
