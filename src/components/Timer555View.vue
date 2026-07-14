<template>
  <div class="timer-view">
    <!-- 公式区 -->
    <div class="formula-bar">
      <span class="formula">f = 1.44 / ((R<sub>a</sub> + 2R<sub>b</sub>) × C)</span>
      <span class="formula-sep">|</span>
      <span class="formula">D = (R<sub>a</sub> + R<sub>b</sub>) / (R<sub>a</sub> + 2R<sub>b</sub>)</span>
    </div>

    <!-- 555电路示意图 -->
    <svg class="timer-svg" viewBox="0 0 380 200">
      <!-- 555芯片方块 -->
      <rect x="130" y="60" width="60" height="50" rx="3" fill="var(--card-bg)" stroke="var(--accent)" stroke-width="2"/>
      <text x="160" y="85" text-anchor="middle" fill="var(--accent)" font-size="14" font-weight="bold">555</text>
      <text x="160" y="100" text-anchor="middle" fill="#888" font-size="8">NE555</text>

      <!-- 引脚标注 -->
      <text x="115" y="72" fill="#888" font-size="7">TRIG</text>
      <text x="115" y="102" fill="#888" font-size="7">THR</text>
      <text x="195" y="72" fill="#888" font-size="7">OUT</text>
      <text x="195" y="102" fill="#888" font-size="7">DIS</text>

      <!-- VCC -->
      <line x1="160" y1="60" x2="160" y2="40" stroke="var(--wire)" stroke-width="2"/>
      <text x="160" y="35" text-anchor="middle" fill="#888" font-size="9">VCC=5V</text>

      <!-- Ra 电阻 (VCC到DIS) -->
      <line x1="160" y1="40" x2="80" y2="40" stroke="var(--wire)" stroke-width="2"/>
      <line x1="80" y1="40" x2="80" y2="85" stroke="var(--wire)" stroke-width="2"/>
      <!-- 电阻符号 -->
      <rect x="72" y="55" width="16" height="30" rx="2" fill="var(--card-bg)" stroke="#e67e22" stroke-width="1.5"/>
      <text x="60" y="72" fill="#e67e22" font-size="9">Ra={{ ra }}k</text>
      <line x1="80" y1="85" x2="130" y2="85" stroke="var(--wire)" stroke-width="2"/>

      <!-- Rb 电阻 (DIS到THR之间) -->
      <line x1="130" y1="85" x2="130" y2="110" stroke="var(--wire)" stroke-width="2"/>
      <rect x="122" y="110" width="16" height="30" rx="2" fill="var(--card-bg)" stroke="#e67e22" stroke-width="1.5"/>
      <text x="100" y="128" fill="#e67e22" font-size="9">Rb={{ rb }}k</text>
      <line x1="130" y1="140" x2="130" y2="110" stroke="var(--wire)" stroke-width="1" opacity="0"/>
      <!-- 连到THR -->
      <line x1="130" y1="140" x2="130" y2="155" stroke="var(--wire)" stroke-width="2"/>
      <line x1="130" y1="155" x2="190" y2="155" stroke="var(--wire)" stroke-width="2"/>
      <line x1="190" y1="155" x2="190" y2="110" stroke="var(--wire)" stroke-width="2"/>
      <line x1="190" y1="110" x2="190" y2="100" stroke="var(--wire)" stroke-width="2"/>

      <!-- 电容 C (THR到GND) -->
      <line x1="220" y1="155" x2="220" y2="140" stroke="var(--wire)" stroke-width="2"/>
      <line x1="210" y1="140" x2="230" y2="140" stroke="#3498db" stroke-width="2.5"/>
      <line x1="210" y1="134" x2="230" y2="134" stroke="#3498db" stroke-width="2.5"/>
      <text x="235" y="138" fill="#3498db" font-size="9">C={{ c }}nF</text>
      <line x1="220" y1="134" x2="220" y2="120" stroke="var(--wire)" stroke-width="1" opacity="0"/>

      <!-- 连接 THR 到 C -->
      <line x1="190" y1="155" x2="220" y2="155" stroke="var(--wire)" stroke-width="2"/>

      <!-- 输出波形引脚 -->
      <line x1="190" y1="72" x2="290" y2="72" stroke="var(--accent)" stroke-width="2"/>
      <text x="250" y="64" fill="var(--accent)" font-size="10">OUT</text>

      <!-- 地线 -->
      <line x1="160" y1="110" x2="160" y2="170" stroke="var(--wire)" stroke-width="2"/>
      <line x1="220" y1="140" x2="220" y2="170" stroke="var(--wire)" stroke-width="2"/>
      <line x1="80" y1="170" x2="320" y2="170" stroke="var(--wire)" stroke-width="2"/>
      <text x="200" y="185" text-anchor="middle" fill="#888" font-size="8">GND</text>
    </svg>

    <!-- 输出波形 -->
    <svg class="wave-svg" viewBox="0 0 360 60">
      <line x1="0" y1="30" x2="360" y2="30" stroke="var(--wire)" stroke-width="0.5" opacity="0.3" stroke-dasharray="2 2"/>
      <path :d="wavePath" fill="none" stroke="var(--accent)" stroke-width="2"/>
      <text x="5" y="12" fill="#888" font-size="8">VCC</text>
      <text x="5" y="52" fill="#888" font-size="8">0V</text>
      <text x="340" y="55" fill="#888" font-size="8">t</text>
    </svg>

    <!-- 数据面板 -->
    <div class="data-panel">
      <div class="data-row">
        <span class="label">频率</span>
        <span class="value" :class="{ warn: frequency > 500 }">{{ frequency.toFixed(2) }} kHz</span>
        <span class="target">f = 1.44/((Ra+2Rb)C)</span>
      </div>
      <div class="data-row">
        <span class="label">周期</span>
        <span class="value">{{ period.toFixed(1) }} μs</span>
        <span class="target">T = 1/f</span>
      </div>
      <div class="data-row">
        <span class="label">占空比</span>
        <span class="value" :class="{ warn: dutyCycle > 90 }">{{ dutyCycle.toFixed(1) }}%</span>
        <span class="target">D = (Ra+Rb)/(Ra+2Rb)</span>
      </div>
      <div class="data-row">
        <span class="label">高电平时间</span>
        <span class="value">{{ highTime.toFixed(1) }} μs</span>
        <span class="target">tH = 0.693×(Ra+Rb)×C</span>
      </div>
      <div class="data-row">
        <span class="label">低电平时间</span>
        <span class="value">{{ lowTime.toFixed(1) }} μs</span>
        <span class="target">tL = 0.693×Rb×C</span>
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

const frequency = computed(() => props.simResult?.frequency ?? 0)
const period = computed(() => props.simResult?.period ?? 0)
const dutyCycle = computed(() => props.simResult?.dutyCycle ?? 0)
const highTime = computed(() => props.simResult?.highTime ?? 0)
const lowTime = computed(() => props.simResult?.lowTime ?? 0)
const ra = computed(() => props.simResult?.ra ?? 10)
const rb = computed(() => props.simResult?.rb ?? 47)
const c = computed(() => props.simResult?.c ?? 10)

const statusClass = computed(() => {
  if (ra.value <= 1) return 'bad'
  if (frequency.value > 500) return 'warn'
  if (dutyCycle.value > 90) return 'warn'
  return 'good'
})

const statusText = computed(() => {
  if (ra.value <= 1) return '❌ Ra过小，过流风险'
  if (frequency.value > 500) return `⚠️ 频率${frequency.value.toFixed(0)}kHz过高`
  if (dutyCycle.value > 90) return `⚠️ 占空比${dutyCycle.value.toFixed(0)}%过高`
  return '✅ 振荡正常'
})

// 输出波形
const wavePath = computed(() => {
  const periods = 4
  const w = 360
  const periodW = w / periods
  const highW = periodW * dutyCycle.value / 100
  const highY = 10, lowY = 50

  let path = `M0 ${lowY}`
  for (let i = 0; i < periods; i++) {
    const x0 = i * periodW
    path += ` L${x0} ${lowY} L${x0} ${highY} L${x0 + highW} ${highY} L${x0 + highW} ${lowY}`
  }
  path += ` L${w} ${lowY}`
  return path
})
</script>

<style scoped>
.timer-view { display: flex; flex-direction: column; gap: 8px; }
.formula-bar {
  display: flex; gap: 8px; flex-wrap: wrap;
  padding: 6px 10px; background: var(--card-bg); border-radius: 6px;
  font-size: 12px; color: var(--text-secondary);
}
.formula { color: var(--accent); font-family: monospace; }
.formula-sep { color: var(--text-dim); }
.timer-svg {
  width: 100%; max-width: 380px; height: auto;
  background: var(--canvas-bg); border-radius: 8px;
}
.wave-svg {
  width: 100%; max-width: 360px; height: 60px;
  background: var(--canvas-bg); border-radius: 8px;
}
.data-panel { display: flex; flex-direction: column; gap: 4px; }
.data-row {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 8px; font-size: 13px;
}
.data-row .label { width: 90px; color: var(--text-secondary); }
.data-row .value { font-weight: bold; min-width: 80px; color: var(--accent); }
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
