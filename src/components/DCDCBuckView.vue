<template>
  <div class="dcdc-view">
    <!-- 公式区 -->
    <div class="formula-bar">
      <span class="formula">V<sub>out</sub> = V<sub>in</sub> × D</span>
      <span class="formula-sep">|</span>
      <span class="formula">ΔI<sub>L</sub> = V<sub>in</sub>×D×(1−D) / (2×L×f)</span>
    </div>

    <!-- 电路示意图 -->
    <svg class="buck-svg" viewBox="0 0 380 180">
      <!-- 输入端 -->
      <text x="20" y="30" fill="#888" font-size="11">Vin={{ vin }}V</text>
      <line x1="30" y1="50" x2="80" y2="50" stroke="var(--wire)" stroke-width="2"/>
      <!-- 开关管 (MOSFET) -->
      <rect x="80" y="42" width="40" height="16" rx="2" fill="var(--card-bg)" :stroke="switching ? 'var(--accent)' : 'var(--wire)'" stroke-width="2"/>
      <text x="100" y="38" text-anchor="middle" fill="#888" font-size="9">MOSFET</text>
      <!-- 开关波形 -->
      <path :d="switchWavePath" fill="none" :stroke="switching ? 'var(--accent)' : '#666'" stroke-width="1" opacity="0.6"/>

      <!-- 电感 -->
      <line x1="120" y1="50" x2="140" y2="50" stroke="var(--wire)" stroke-width="2"/>
      <path d="M140 50 Q148 40 156 50 Q164 40 172 50 Q180 40 188 50 Q196 40 204 50" fill="none" stroke="var(--accent)" stroke-width="2"/>
      <text x="172" y="38" text-anchor="middle" fill="#888" font-size="9">L={{ l }}μH</text>
      <line x1="204" y1="50" x2="240" y2="50" stroke="var(--wire)" stroke-width="2"/>

      <!-- 输出电容 -->
      <line x1="240" y1="50" x2="240" y2="65" stroke="var(--wire)" stroke-width="2"/>
      <line x1="232" y1="65" x2="248" y2="65" stroke="var(--wire)" stroke-width="2.5"/>
      <line x1="232" y1="71" x2="248" y2="71" stroke="var(--wire)" stroke-width="2.5"/>
      <line x1="240" y1="71" x2="240" y2="90" stroke="var(--wire)" stroke-width="2"/>
      <text x="255" y="68" fill="#888" font-size="9">C<sub>out</sub></text>

      <!-- 输出端 -->
      <line x1="240" y1="50" x2="330" y2="50" stroke="var(--wire)" stroke-width="2"/>
      <text x="300" y="40" fill="var(--accent)" font-size="13" font-weight="bold">Vout={{ vout.toFixed(2) }}V</text>

      <!-- 续流二极管 -->
      <line x1="120" y1="50" x2="120" y2="80" stroke="var(--wire)" stroke-width="2"/>
      <polygon points="112,80 128,80 120,92" fill="var(--wire)"/>
      <line x1="112" y1="92" x2="128" y2="92" stroke="var(--wire)" stroke-width="2"/>
      <line x1="120" y1="92" x2="120" y2="105" stroke="var(--wire)" stroke-width="2"/>
      <text x="135" y="90" fill="#888" font-size="9">D</text>

      <!-- 地线 -->
      <line x1="30" y1="105" x2="330" y2="105" stroke="var(--wire)" stroke-width="2"/>
      <line x1="30" y1="50" x2="30" y2="105" stroke="var(--wire)" stroke-width="2"/>
      <line x1="330" y1="50" x2="330" y2="105" stroke="var(--wire)" stroke-width="2"/>
      <text x="170" y="125" text-anchor="middle" fill="#888" font-size="9">GND</text>

      <!-- 纹波波形 -->
      <text x="20" y="150" fill="#888" font-size="10">输出纹波:</text>
      <path :d="ripplePath" fill="none" stroke="var(--accent)" stroke-width="1.5" opacity="0.7"/>
    </svg>

    <!-- 数据面板 -->
    <div class="data-panel">
      <div class="data-row">
        <span class="label">输出电压</span>
        <span class="value" :class="{ error: !voutOk }">{{ vout.toFixed(3) }}V</span>
        <span class="target">目标 5.000V</span>
      </div>
      <div class="data-row">
        <span class="label">纹波电压</span>
        <span class="value" :class="{ error: rippleHigh }">{{ ripple.toFixed(1) }}mV</span>
        <span class="target">应 &lt; 100mV</span>
      </div>
      <div class="data-row">
        <span class="label">纹波电流</span>
        <span class="value">{{ rippleCurrent.toFixed(0) }}mA</span>
        <span class="target">ΔI<sub>L</sub></span>
      </div>
      <div class="data-row">
        <span class="label">转换效率</span>
        <span class="value" :class="{ error: efficiencyLow }">{{ efficiency.toFixed(1) }}%</span>
        <span class="target">应 &gt; 85%</span>
      </div>
      <div class="data-row">
        <span class="label">功耗</span>
        <span class="value">{{ powerLoss.toFixed(2) }}W</span>
        <span class="target">P<sub>loss</sub></span>
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

const vin = computed(() => props.simResult?.vin ?? 12)
const vout = computed(() => props.simResult?.vout ?? 0)
const ripple = computed(() => props.simResult?.ripple ?? 0)
const rippleCurrent = computed(() => props.simResult?.rippleCurrent ?? 0)
const efficiency = computed(() => props.simResult?.efficiency ?? 0)
const powerLoss = computed(() => props.simResult?.powerLoss ?? 0)
const switching = computed(() => props.simResult?.switching ?? true)
const l = computed(() => props.simResult?.l ?? 22)

const voutOk = computed(() => Math.abs(vout.value - 5) < 0.15)
const rippleHigh = computed(() => ripple.value > 100)
const efficiencyLow = computed(() => efficiency.value < 85)

const statusClass = computed(() => {
  if (!voutOk.value) return 'bad'
  if (rippleHigh.value || efficiencyLow.value) return 'warn'
  return 'good'
})
const statusText = computed(() => {
  if (!voutOk.value) return '❌ 输出电压偏差过大'
  if (rippleHigh.value) return '⚠️ 纹波过大'
  if (efficiencyLow.value) return '⚠️ 效率偏低'
  return '✅ 工作正常'
})

// 开关管波形
const switchWavePath = computed(() => {
  const f = props.simResult?.freq ?? 500
  const d = props.simResult?.dutyPct ?? 42
  const w = 60, h = 8, baseY = 60
  let path = `M80 ${baseY}`
  const periods = 3
  const periodW = w / periods
  const highW = periodW * d / 100
  for (let i = 0; i < periods; i++) {
    const x0 = 80 + i * periodW
    path += ` L${x0} ${baseY} L${x0} ${baseY - h} L${x0 + highW} ${baseY - h} L${x0 + highW} ${baseY}`
  }
  return path
})

// 输出纹波波形
const ripplePath = computed(() => {
  const amp = Math.min(ripple.value / 5, 8)
  let path = 'M80 160'
  for (let x = 80; x <= 330; x += 4) {
    const y = 160 + amp * Math.sin((x - 80) * 0.3)
    path += ` L${x.toFixed(0)} ${y.toFixed(1)}`
  }
  return path
})
</script>

<style scoped>
.dcdc-view { display: flex; flex-direction: column; gap: 8px; }
.formula-bar {
  display: flex; gap: 8px; flex-wrap: wrap;
  padding: 6px 10px; background: var(--card-bg); border-radius: 6px;
  font-size: 12px; color: var(--text-secondary);
}
.formula { color: var(--accent); font-family: monospace; }
.formula-sep { color: var(--text-dim); }
.buck-svg {
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
.data-row .target { color: var(--text-dim); font-size: 11px; }
.status-bar { margin-top: 4px; }
.status {
  display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 13px;
}
.status.good { background: rgba(46,204,113,0.15); color: #2ecc71; }
.status.warn { background: rgba(241,196,15,0.15); color: #f1c40f; }
.status.bad { background: rgba(231,76,60,0.15); color: #e74c3c; }
</style>
