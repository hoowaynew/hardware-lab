<template>
  <div class="ldo-view">
    <!-- 公式区 -->
    <div class="formula-bar">
      <span class="formula">P = (V<sub>in</sub> − V<sub>out</sub>) × I<sub>load</sub></span>
      <span class="formula-sep">|</span>
      <span class="formula">η = V<sub>out</sub> / V<sub>in</sub></span>
      <span class="formula-sep">|</span>
      <span class="formula">ΔT = P × θ<sub>JA</sub></span>
    </div>

    <!-- LDO电路示意图 -->
    <svg class="ldo-svg" viewBox="0 0 380 200">
      <!-- 输入端 -->
      <text x="15" y="30" fill="#888" font-size="11">Vin={{ vin.toFixed(1) }}V</text>
      <line x1="30" y1="50" x2="100" y2="50" stroke="var(--wire)" stroke-width="2"/>

      <!-- LDO方块 -->
      <rect x="100" y="38" width="80" height="24" rx="3" fill="var(--card-bg)" :stroke="dropoutOk ? 'var(--accent)' : 'var(--error)'" stroke-width="2"/>
      <text x="140" y="55" text-anchor="middle" fill="var(--accent)" font-size="10" font-weight="bold">LDO</text>

      <!-- IN/OUT 标注 -->
      <text x="105" y="34" fill="#888" font-size="8">IN</text>
      <text x="170" y="34" fill="#888" font-size="8">OUT</text>

      <!-- 输出连线 -->
      <line x1="180" y1="50" x2="330" y2="50" :stroke="dropoutOk ? 'var(--wire)' : 'var(--error)'" stroke-width="2"/>
      <text x="250" y="42" :fill="dropoutOk ? 'var(--accent)' : 'var(--error)'" font-size="13" font-weight="bold">Vout={{ vout.toFixed(2) }}V</text>

      <!-- 负载 -->
      <rect x="315" y="42" width="30" height="16" rx="2" fill="var(--card-bg)" stroke="var(--wire)" stroke-width="1.5"/>
      <text x="330" y="54" text-anchor="middle" fill="#888" font-size="8">LOAD</text>
      <text x="330" y="80" text-anchor="middle" fill="#888" font-size="9">{{ loadCurrent }}mA</text>

      <!-- 地线 -->
      <line x1="140" y1="62" x2="140" y2="100" stroke="var(--wire)" stroke-width="2"/>
      <line x1="30" y1="100" x2="330" y2="100" stroke="var(--wire)" stroke-width="2"/>
      <line x1="30" y1="50" x2="30" y2="100" stroke="var(--wire)" stroke-width="2"/>
      <line x1="330" y1="58" x2="330" y2="100" stroke="var(--wire)" stroke-width="2"/>
      <text x="170" y="118" text-anchor="middle" fill="#888" font-size="9">GND</text>

      <!-- 热量指示 -->
      <rect x="95" y="130" width="90" height="20" rx="3" :fill="thermalBar" opacity="0.7"/>
      <text x="140" y="145" text-anchor="middle" :fill="thermalColor" font-size="10" font-weight="bold">
        Tj={{ junctionTemp.toFixed(0) }}°C
      </text>

      <!-- 功耗箭头 -->
      <text x="20" y="145" fill="#888" font-size="9">功耗</text>
      <text x="20" y="160" fill="var(--error)" font-size="11" font-weight="bold">{{ powerLoss.toFixed(0) }}mW</text>

      <!-- 温度计 -->
      <rect x="265" y="128" width="8" height="50" rx="2" fill="var(--card-bg)" stroke="var(--wire)" stroke-width="1"/>
      <rect x="266" y="128" width="6" :height="tempBarHeight" :fill="thermalColor"/>
      <text x="285" y="140" fill="#888" font-size="8">环境</text>
      <text x="285" y="152" fill="#888" font-size="8">{{ ambient }}°C</text>
      <text x="285" y="164" fill="#888" font-size="8">上限</text>
      <text x="285" y="176" fill="#888" font-size="8">{{ maxTj }}°C</text>
    </svg>

    <!-- 数据面板 -->
    <div class="data-panel">
      <div class="data-row">
        <span class="label">输出电压</span>
        <span class="value" :class="{ error: !dropoutOk }">{{ vout.toFixed(3) }}V</span>
        <span class="target">标称 3.300V</span>
      </div>
      <div class="data-row">
        <span class="label">压差</span>
        <span class="value" :class="{ error: !dropoutOk }">{{ dropout.toFixed(2) }}V</span>
        <span class="target">应 ≥ 0.3V</span>
      </div>
      <div class="data-row">
        <span class="label">功耗</span>
        <span class="value" :class="{ warn: powerLoss > 1000 }">{{ powerLoss.toFixed(0) }}mW</span>
        <span class="target">P = ΔV × I</span>
      </div>
      <div class="data-row">
        <span class="label">效率</span>
        <span class="value" :class="{ warn: efficiency < 50 }">{{ efficiency.toFixed(1) }}%</span>
        <span class="target">η = Vout/Vin</span>
      </div>
      <div class="data-row">
        <span class="label">结温</span>
        <span class="value" :class="{ error: junctionTemp > maxTj, warn: junctionTemp > maxTj * 0.8 && junctionTemp <= maxTj }">
          {{ junctionTemp.toFixed(0) }}°C
        </span>
        <span class="target">应 < {{ maxTj }}°C</span>
      </div>
      <div class="data-row">
        <span class="label">温升</span>
        <span class="value">{{ tempRise.toFixed(0) }}°C</span>
        <span class="target">ΔT = P × θJA</span>
      </div>
    </div>

    <!-- 状态指示 -->
    <div class="status-bar">
      <span class="status" :class="statusClass">{{ statusText }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  simResult: { type: Object, default: () => ({}) }
})

const vin = computed(() => props.simResult?.vin ?? 5)
const vout = computed(() => props.simResult?.vout ?? 3.3)
const dropout = computed(() => props.simResult?.dropout ?? 1.7)
const dropoutOk = computed(() => props.simResult?.dropoutOk ?? true)
const powerLoss = computed(() => props.simResult?.powerLoss ?? 510)
const efficiency = computed(() => props.simResult?.efficiency ?? 66)
const junctionTemp = computed(() => props.simResult?.junctionTemp ?? 58)
const tempRise = computed(() => props.simResult?.tempRise ?? 33)
const ambient = computed(() => props.simResult?.ambient ?? 25)
const maxTj = computed(() => props.simResult?.maxTj ?? 125)
const loadCurrent = computed(() => props.simResult?.loadCurrent ?? 300)

const thermalColor = computed(() => {
  const ratio = junctionTemp.value / maxTj.value
  if (ratio > 1) return '#e74c3c'
  if (ratio > 0.8) return '#f39c12'
  if (ratio > 0.5) return '#f1c40f'
  return '#2ecc71'
})

const thermalBar = computed(() => {
  const ratio = Math.min(junctionTemp.value / maxTj.value, 1)
  if (ratio > 0.8) return 'rgba(231,76,60,0.3)'
  if (ratio > 0.5) return 'rgba(241,196,15,0.3)'
  return 'rgba(46,204,113,0.3)'
})

const tempBarHeight = computed(() => {
  const ratio = Math.min(junctionTemp.value / maxTj.value, 1)
  return Math.max(2, ratio * 48)
})

const statusClass = computed(() => {
  if (!dropoutOk.value) return 'bad'
  if (junctionTemp.value > maxTj.value) return 'bad'
  if (junctionTemp.value > maxTj.value * 0.8) return 'warn'
  return 'good'
})

const statusText = computed(() => {
  if (!dropoutOk.value) return '❌ 压差不足，输出失稳'
  if (junctionTemp.value > maxTj.value) return `❌ 结温${junctionTemp.value.toFixed(0)}°C超限！热关断`
  if (junctionTemp.value > maxTj.value * 0.8) return `⚠️ 结温偏高 (${junctionTemp.value.toFixed(0)}°C)`
  return '✅ 工作正常'
})
</script>

<style scoped>
.ldo-view { display: flex; flex-direction: column; gap: 8px; }
.formula-bar {
  display: flex; gap: 8px; flex-wrap: wrap;
  padding: 6px 10px; background: var(--card-bg); border-radius: 6px;
  font-size: 12px; color: var(--text-secondary);
}
.formula { color: var(--accent); font-family: monospace; }
.formula-sep { color: var(--text-dim); }
.ldo-svg {
  width: 100%; max-width: 380px; height: auto;
  background: var(--canvas-bg); border-radius: 8px;
}
.data-panel { display: flex; flex-direction: column; gap: 4px; }
.data-row {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 8px; font-size: 13px;
}
.data-row .label { width: 80px; color: var(--text-secondary); }
.data-row .value { font-weight: bold; min-width: 80px; color: var(--accent); }
.data-row .value.error { color: var(--error); }
.data-row .value.warn { color: #f1c40f; }
.data-row .target { color: var(--text-dim); font-size: 11px; }
.status-bar { margin-top: 4px; }
.status {
  display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 13px;
}
.status.good { background: rgba(46,204,113,0.15); color: #2ecc71; }
.status.warn { background: rgba(241,196,15,0.15); color: #f1c40f; }
.status.bad { background: rgba(231,76,60,0.15); color: #e74c3c; }
</style>
