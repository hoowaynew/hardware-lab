<template>
  <div class="rs485-view">
    <div class="rs485-formula">
      <span class="formula-text">L_max ≈ 10⁷ / Baudrate (m·bps) · Z_term = Z₀ = 120Ω</span>
    </div>

    <!-- Signal quality -->
    <div class="rs485-status">
      <div class="rs485-status-value" :class="statusClass">
        {{ statusText }}
      </div>
      <div class="rs485-status-sub">{{ subText }}</div>
    </div>

    <!-- Eye diagram quality bar -->
    <div class="rs485-eye-bar-container">
      <div class="rs485-eye-label">
        <span>信号眼图质量</span>
        <span class="rs485-eye-pct" :class="statusClass">{{ eyeQuality }}%</span>
      </div>
      <div class="rs485-eye-bar">
        <div class="rs485-eye-fill" :style="{ width: eyeQuality + '%', background: eyeColor }"></div>
      </div>
    </div>

    <!-- Key metrics -->
    <div class="rs485-metrics">
      <div class="rs485-metric">
        <span class="rs485-m-label">波特率</span>
        <span class="rs485-m-value">{{ baudrateDisplay }}</span>
      </div>
      <div class="rs485-metric">
        <span class="rs485-m-label">线缆长度</span>
        <span class="rs485-m-value">{{ cableLength }} m</span>
      </div>
      <div class="rs485-metric">
        <span class="rs485-m-label">最大允许长度</span>
        <span class="rs485-m-value" :class="{ 'rs485-over': overMaxLen }">{{ maxCableLength }} m</span>
      </div>
      <div class="rs485-metric">
        <span class="rs485-m-label">终端电阻</span>
        <span class="rs485-m-value" :class="{ 'rs485-warn': !hasTerminator }">{{ hasTerminator ? '120Ω ✓' : '无 ✗' }}</span>
      </div>
      <div class="rs485-metric">
        <span class="rs485-m-label">传播延迟</span>
        <span class="rs485-m-value">{{ propDelay }} ns</span>
      </div>
      <div class="rs485-metric">
        <span class="rs485-m-label">单位负载</span>
        <span class="rs485-m-value">{{ unitLoad }} UL</span>
      </div>
    </div>

    <!-- Differential signal preview -->
    <div class="rs485-diff" v-if="hasTerminator !== undefined">
      <div class="rs485-diff-label">差分信号 (A-B):</div>
      <div class="rs485-diff-wave">
        <svg width="100%" height="40" viewBox="0 0 200 40">
          <polyline :points="wavePoints" fill="none" :stroke="waveColor" stroke-width="2" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  simResult: { type: Object, default: null }
})

const baudrate = computed(() => props.simResult?.baudrate ?? 9600)
const cableLength = computed(() => props.simResult?.cableLength ?? 30)
const hasTerminator = computed(() => props.simResult?.hasTerminator)
const maxCableLength = computed(() => Math.round(props.simResult?.maxCableLength ?? 1000))
const propDelay = computed(() => props.simResult?.propDelay?.toFixed(0) ?? '0')
const unitLoad = computed(() => props.simResult?.unitLoad ?? 4)
const eyeQuality = computed(() => props.simResult?.eyeQuality ?? 0)
const ringing = computed(() => props.simResult?.ringing ?? false)

const baudrateDisplay = computed(() => {
  const b = baudrate.value
  if (b >= 1000000) return (b / 1000000).toFixed(1) + ' Mbps'
  return (b / 1000).toFixed(1) + ' kbps'
})

const overMaxLen = computed(() => cableLength.value > maxCableLength.value)

const statusClass = computed(() => {
  if (props.simResult?.error) return 'rs485-err'
  if (eyeQuality.value < 50) return 'rs485-warn'
  return 'rs485-ok'
})

const statusText = computed(() => {
  if (props.simResult?.error) return '信号异常！'
  if (eyeQuality.value < 50) return '信号质量差'
  if (eyeQuality.value < 80) return '信号可用'
  return '信号良好'
})

const subText = computed(() => {
  if (ringing.value) return '检测到振铃反射'
  if (overMaxLen.value) return '线缆超长，信号衰减'
  if (!hasTerminator.value) return '无终端电阻'
  return '终端匹配良好，无反射'
})

const eyeColor = computed(() => {
  if (eyeQuality.value < 30) return '#e74c3c'
  if (eyeQuality.value < 60) return '#f39c12'
  return '#2ecc71'
})

const waveColor = computed(() => {
  if (ringing.value) return '#e74c3c'
  return '#3498db'
})

// Generate a simplified differential waveform
const wavePoints = computed(() => {
  if (!props.simResult) return '0,20 200,20'
  const pts = []
  const N = 50
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * 200
    let y = 20
    if (ringing.value) {
      // ringing waveform: base step with oscillation
      const phase = i / N * 4
      y = 20 + 10 * Math.sin(phase * Math.PI) * Math.exp(-phase * 0.3)
      if (i > N / 2) y = 20 - 10 * Math.sin(phase * Math.PI) * Math.exp(-phase * 0.3)
    } else {
      // clean differential signal
      if (i > 10 && i < 40) y = 5
      else if (i > 40) y = 35
      else y = 20
    }
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return pts.join(' ')
})
</script>

<style scoped>
.rs485-view { display: flex; flex-direction: column; gap: 10px; padding: 8px 0; }
.rs485-formula { text-align: center; background: var(--surface-light); border-radius: 8px; padding: 8px; }
.formula-text { font-family: 'Courier New', monospace; font-size: 11px; color: var(--text-dim); }
.rs485-status { text-align: center; padding: 6px 0; }
.rs485-status-value { font-size: 22px; font-weight: 800; }
.rs485-status-sub { font-size: 12px; color: var(--text-dim); margin-top: 2px; }
.rs485-ok { color: var(--success); }
.rs485-warn { color: var(--warning); }
.rs485-err { color: var(--danger); }
.rs485-eye-bar-container { display: flex; flex-direction: column; gap: 4px; }
.rs485-eye-label { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-dim); }
.rs485-eye-pct { font-weight: 700; }
.rs485-eye-bar { height: 16px; background: var(--surface-light); border-radius: 4px; overflow: hidden; }
.rs485-eye-fill { height: 100%; transition: all 0.3s; border-radius: 4px; }
.rs485-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: var(--surface-light); border-radius: 8px; padding: 10px 12px; }
.rs485-metric { display: flex; justify-content: space-between; align-items: center; }
.rs485-m-label { font-size: 11px; color: var(--text-dim); }
.rs485-m-value { font-size: 13px; font-weight: 700; font-family: monospace; color: var(--text); }
.rs485-warn { color: var(--danger); }
.rs485-over { color: var(--warning); }
.rs485-diff { background: var(--surface-light); border-radius: 8px; padding: 8px 12px; }
.rs485-diff-label { font-size: 11px; color: var(--text-dim); margin-bottom: 4px; }
</style>
