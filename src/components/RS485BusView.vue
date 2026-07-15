<template>
  <div class="rs485-view">
    <div class="rs485-formula">
      <span class="formula-text">L_max ≈ 10⁷ / Baudrate (m·bps) · Z_term = Z₀ = 120Ω</span>
    </div>

    <!-- RS-485 总线拓扑图 -->
    <svg class="rs485-topology" viewBox="0 0 360 130">
      <!-- 差分总线 A/B 双线 -->
      <line x1="40" y1="45" x2="320" y2="45" stroke="var(--wire)" stroke-width="2"/>
      <line x1="40" y1="65" x2="320" y2="65" stroke="var(--wire)" stroke-width="2"/>
      <text x="10" y="48" fill="var(--text-dim)" font-size="9">A</text>
      <text x="10" y="68" fill="var(--text-dim)" font-size="9">B</text>

      <!-- 节点1: Master -->
      <rect x="45" y="25" width="50" height="60" rx="3" fill="none" stroke="var(--text)" stroke-width="1.5"/>
      <text x="52" y="42" fill="var(--text)" font-size="8">Master</text>
      <text x="52" y="52" fill="var(--text-dim)" font-size="7">MCU</text>
      <!-- 收发器 -->
      <rect x="50" y="56" width="40" height="22" rx="2" fill="none" stroke="#8e44ad" stroke-width="1"/>
      <text x="55" y="68" fill="#8e44ad" font-size="7">RS485</text>
      <text x="55" y="75" fill="#8e44ad" font-size="7">IC</text>
      <!-- Master → A/B 连线 -->
      <line x1="70" y1="56" x2="70" y2="45" stroke="var(--wire)" stroke-width="1.5"/>
      <line x1="78" y1="78" x2="78" y2="65" stroke="var(--wire)" stroke-width="1.5"/>
      <circle cx="70" cy="45" r="2.5" fill="var(--wire)"/>
      <circle cx="78" cy="65" r="2.5" fill="var(--wire)"/>

      <!-- 节点2: Slave 1 -->
      <rect x="145" y="25" width="50" height="60" rx="3" fill="none" stroke="var(--text)" stroke-width="1.5"/>
      <text x="150" y="42" fill="var(--text)" font-size="8">Slave 1</text>
      <text x="150" y="52" fill="var(--text-dim)" font-size="7">Sensor</text>
      <rect x="150" y="56" width="40" height="22" rx="2" fill="none" stroke="#8e44ad" stroke-width="1"/>
      <text x="155" y="68" fill="#8e44ad" font-size="7">RS485</text>
      <text x="155" y="75" fill="#8e44ad" font-size="7">IC</text>
      <line x1="170" y1="56" x2="170" y2="45" stroke="var(--wire)" stroke-width="1.5"/>
      <line x1="178" y1="78" x2="178" y2="65" stroke="var(--wire)" stroke-width="1.5"/>
      <circle cx="170" cy="45" r="2.5" fill="var(--wire)"/>
      <circle cx="178" cy="65" r="2.5" fill="var(--wire)"/>

      <!-- 节点3: Slave 2 -->
      <rect x="245" y="25" width="50" height="60" rx="3" fill="none" stroke="var(--text)" stroke-width="1.5"/>
      <text x="250" y="42" fill="var(--text)" font-size="8">Slave 2</text>
      <text x="250" y="52" fill="var(--text-dim)" font-size="7">Sensor</text>
      <rect x="250" y="56" width="40" height="22" rx="2" fill="none" stroke="#8e44ad" stroke-width="1"/>
      <text x="255" y="68" fill="#8e44ad" font-size="7">RS485</text>
      <text x="255" y="75" fill="#8e44ad" font-size="7">IC</text>
      <line x1="270" y1="56" x2="270" y2="45" stroke="var(--wire)" stroke-width="1.5"/>
      <line x1="278" y1="78" x2="278" y2="65" stroke="var(--wire)" stroke-width="1.5"/>
      <circle cx="270" cy="45" r="2.5" fill="var(--wire)"/>
      <circle cx="278" cy="65" r="2.5" fill="var(--wire)"/>

      <!-- 终端电阻 RT1 (左端) -->
      <path d="M40,45 h3 l3,-5 l6,10 l6,-10 l6,10 l6,-10 l3,5 h3" fill="none" stroke="#e74c3c" stroke-width="1.5" transform="translate(-5,0) rotate(90 40 55)"/>
      <text x="20" y="100" fill="#e74c3c" font-size="8">RT1</text>
      <text x="20" y="110" fill="#e74c3c" font-size="7">120Ω</text>

      <!-- 终端电阻 RT2 (右端) -->
      <line x1="320" y1="45" x2="320" y2="65" stroke="#e74c3c" stroke-width="2"/>
      <path d="M320,55 h3 l3,-5 l6,10 l6,-10 l6,10 l6,-10 l3,5 h3" fill="none" stroke="#e74c3c" stroke-width="1.5" transform="translate(0,-10)"/>
      <text x="330" y="55" fill="#e74c3c" font-size="8">RT2</text>
      <text x="330" y="65" fill="#e74c3c" font-size="7">120Ω</text>

      <!-- GND -->
      <line x1="70" y1="85" x2="70" y2="105" stroke="var(--wire)" stroke-width="1.5"/>
      <line x1="170" y1="85" x2="170" y2="105" stroke="var(--wire)" stroke-width="1.5"/>
      <line x1="270" y1="85" x2="270" y2="105" stroke="var(--wire)" stroke-width="1.5"/>
      <line x1="70" y1="105" x2="270" y2="105" stroke="var(--wire)" stroke-width="1.5"/>
      <line x1="155" y1="105" x2="185" y2="105" stroke="var(--text)" stroke-width="2.5"/>
      <line x1="160" y1="109" x2="180" y2="109" stroke="var(--text)" stroke-width="2"/>
      <line x1="165" y1="113" x2="175" y2="113" stroke="var(--text)" stroke-width="1.5"/>
      <text x="190" y="111" fill="var(--text-dim)" font-size="8">GND</text>

      <!-- 线缆标注 -->
      <text x="95" y="40" fill="var(--text-dim)" font-size="7">twisted pair</text>
      <text x="95" y="80" fill="var(--text-dim)" font-size="7">Z₀=120Ω</text>
    </svg>

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
.rs485-topology {
  width: 100%;
  max-width: 400px;
  height: auto;
}
</style>
