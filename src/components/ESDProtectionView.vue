<template>
  <div class="esd-view">
    <!-- 公式区 -->
    <div class="formula-bar">
      <span class="formula">P<sub>peak</sub> = V<sub>ESD</sub> / Z<sub>source</sub></span>
      <span class="formula-sep">|</span>
      <span class="formula">V<sub>clamp</sub> ≈ V<sub>c</sub> (TVS钳位)</span>
    </div>

    <!-- ESD保护电路图 -->
    <svg class="esd-svg" viewBox="0 0 380 200">
      <!-- 信号源 -->
      <circle cx="40" cy="100" r="15" fill="var(--card-bg)" stroke="var(--wire)" stroke-width="2"/>
      <text x="40" y="104" text-anchor="middle" fill="#888" font-size="8">SIG</text>
      <line x1="55" y1="100" x2="150" y2="100" stroke="var(--wire)" stroke-width="2"/>

      <!-- TVS二极管 (并联到GND) -->
      <line x1="150" y1="100" x2="150" y2="130" :stroke="hasProtection ? 'var(--accent)' : '#555'" stroke-width="2"/>
      <!-- TVS符号 -->
      <polygon v-if="hasProtection" points="140,130 160,130 150,145" fill="var(--card-bg)" stroke="var(--accent)" stroke-width="2"/>
      <line x1="140" y1="145" x2="160" y2="145" stroke="var(--accent)" stroke-width="2"/>
      <text x="168" y="135" fill="var(--accent)" font-size="9">TVS</text>
      <text x="168" y="147" fill="var(--accent)" font-size="8">Vwm={{ vwm.toFixed(1) }}V</text>
      <text x="168" y="159" fill="var(--accent)" font-size="8">Vc={{ vc.toFixed(1) }}V</text>

      <!-- 无TVS时显示虚线 -->
      <text v-if="!hasProtection" x="145" y="135" fill="var(--error)" font-size="9">无TVS!</text>

      <!-- 到芯片IO -->
      <line x1="150" y1="100" x2="280" y2="100" :stroke="hasProtection ? 'var(--wire)' : 'var(--error)'" stroke-width="2"/>

      <!-- 芯片 -->
      <rect x="280" y="80" width="60" height="40" rx="3" fill="var(--card-bg)" :stroke="chipOk ? 'var(--accent)' : 'var(--error)'" stroke-width="2"/>
      <text x="310" y="104" text-anchor="middle" :fill="chipOk ? 'var(--accent)' : 'var(--error)'" font-size="10" font-weight="bold">MCU IO</text>

      <!-- 地线 -->
      <line x1="150" y1="145" x2="150" y2="165" stroke="var(--wire)" stroke-width="2"/>
      <line x1="40" y1="165" x2="340" y2="165" stroke="var(--wire)" stroke-width="2"/>
      <text x="180" y="182" text-anchor="middle" fill="#888" font-size="8">GND</text>

      <!-- ESD脉冲指示 -->
      <g v-if="esdActive">
        <!-- 闪电符号 -->
        <path d="M35 75 L45 90 L38 92 L48 110" fill="none" stroke="#f39c12" stroke-width="2.5" stroke-linecap="round">
          <animate attributeName="opacity" values="1;0.3;1" dur="0.3s" repeatCount="indefinite"/>
        </path>
        <text x="20" y="70" fill="#f39c12" font-size="9" font-weight="bold">{{ esdVoltage }}kV!</text>
      </g>

      <!-- 钳位电压标注 -->
      <text x="200" y="92" :fill="chipOk ? 'var(--accent)' : 'var(--error)'" font-size="10" font-weight="bold">
        {{ esdActive ? `Vclamp=${clampV.toFixed(1)}V` : 'Vsig=3.3V' }}
      </text>

      <!-- 峰值电流标注 -->
      <text x="200" y="120" :fill="esdActive ? '#f39c12' : '#888'" font-size="9">
        {{ esdActive ? `Ipeak=${peakCurrent.toFixed(1)}A` : 'I=10mA' }}
      </text>
    </svg>

    <!-- 数据面板 -->
    <div class="data-panel">
      <div class="data-row">
        <span class="label">工作电压</span>
        <span class="value">{{ vwm.toFixed(1) }}V</span>
        <span class="target">应 > 信号电压</span>
      </div>
      <div class="data-row">
        <span class="label">钳位电压</span>
        <span class="value" :class="{ error: clampingRatio > 3 }">{{ vc.toFixed(1) }}V</span>
        <span class="target">越低越好</span>
      </div>
      <div class="data-row">
        <span class="label">钳位比</span>
        <span class="value" :class="{ error: clampingRatio > 3, warn: clampingRatio > 2 && clampingRatio <= 3 }">
          {{ clampingRatio.toFixed(1) }}×
        </span>
        <span class="target">Vc/Vwm 应 < 3</span>
      </div>
      <div class="data-row">
        <span class="label">ESD电压</span>
        <span class="value" :class="{ warn: esdVoltage >= 8 }">{{ esdVoltage }}kV</span>
        <span class="target">IEC标准 ±8kV</span>
      </div>
      <div class="data-row">
        <span class="label">峰值电流</span>
        <span class="value">{{ peakCurrent.toFixed(1) }}A</span>
        <span class="target">Ipp = V/330Ω</span>
      </div>
      <div class="data-row">
        <span class="label">芯片状态</span>
        <span class="value" :class="{ error: !chipOk }">
          {{ chipOk ? '安全 ✓' : '损坏 ✗' }}
        </span>
        <span class="target">钳位 < 芯片耐压</span>
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

const hasProtection = computed(() => props.simResult?.hasProtection ?? true)
const vwm = computed(() => props.simResult?.vwm ?? 5)
const vc = computed(() => props.simResult?.vc ?? 9.8)
const esdVoltage = computed(() => props.simResult?.esdVoltage ?? 8)
const peakCurrent = computed(() => props.simResult?.peakCurrent ?? 20)
const clampV = computed(() => props.simResult?.clampV ?? vc.value)
const clampingRatio = computed(() => props.simResult?.clampingRatio ?? 1.96)
const chipOk = computed(() => props.simResult?.chipOk ?? true)
const esdActive = computed(() => props.simResult?.esdActive ?? false)

const statusClass = computed(() => {
  if (!hasProtection.value) return 'bad'
  if (!chipOk.value || clampingRatio.value > 3) return 'bad'
  if (clampingRatio.value > 2) return 'warn'
  return 'good'
})

const statusText = computed(() => {
  if (!hasProtection.value) return `❌ 无TVS！${esdVoltage.value}kV直接打芯片`
  if (!chipOk.value) return `❌ 钳位${clampV.value.toFixed(1)}V超过芯片耐压`
  if (clampingRatio.value > 3) return `⚠️ 钳位比${clampingRatio.value.toFixed(1)}×过高`
  if (clampingRatio.value > 2) return `⚠️ 钳位比偏高 (${clampingRatio.value.toFixed(1)}×)`
  return '✅ ESD保护有效'
})
</script>

<style scoped>
.esd-view { display: flex; flex-direction: column; gap: 8px; }
.formula-bar {
  display: flex; gap: 8px; flex-wrap: wrap;
  padding: 6px 10px; background: var(--card-bg); border-radius: 6px;
  font-size: 12px; color: var(--text-secondary);
}
.formula { color: var(--accent); font-family: monospace; }
.formula-sep { color: var(--text-dim); }
.esd-svg {
  width: 100%; max-width: 380px; height: auto;
  background: var(--canvas-bg); border-radius: 8px;
}
.data-panel { display: flex; flex-direction: column; gap: 4px; }
.data-row {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 8px; font-size: 13px;
}
.data-row .label { width: 90px; color: var(--text-secondary); }
.data-row .value { font-weight: bold; min-width: 70px; color: var(--accent); }
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
