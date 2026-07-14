<template>
  <div class="debounce-view">
    <!-- 公式区 -->
    <div class="formula-bar">
      <span class="formula">τ = R × C</span>
      <span class="formula-sep">|</span>
      <span class="formula">软件消抖: delay(≥20ms) → 重新读取</span>
    </div>

    <!-- 按键电路图 -->
    <svg class="btn-svg" viewBox="0 0 340 160">
      <!-- MCU -->
      <rect x="260" y="50" width="50" height="40" rx="4" fill="var(--card-bg)" stroke="var(--wire)" stroke-width="2"/>
      <text x="285" y="68" text-anchor="middle" fill="#888" font-size="9" font-weight="bold">MCU</text>
      <text x="285" y="80" text-anchor="middle" fill="#888" font-size="8">GPIO</text>

      <!-- 按键 -->
      <rect x="20" y="55" width="30" height="30" rx="3" fill="var(--card-bg)" :stroke="pressed ? 'var(--accent)' : 'var(--wire)'" stroke-width="2"/>
      <text x="35" y="73" text-anchor="middle" :fill="pressed ? 'var(--accent)' : '#888'" font-size="14">{{ pressed ? '⬇' : '⬆' }}</text>
      <text x="35" y="100" text-anchor="middle" fill="#888" font-size="8">SW</text>

      <!-- 上拉电阻 (按下时接地) -->
      <line x1="50" y1="60" x2="80" y2="60" stroke="var(--wire)" stroke-width="2"/>
      <rect x="80" y="56" width="20" height="8" fill="none" stroke="var(--wire)" stroke-width="1.5"/>
      <text x="90" y="50" text-anchor="middle" fill="#888" font-size="8">10kΩ</text>
      <line x1="100" y1="60" x2="130" y2="60" stroke="var(--wire)" stroke-width="2"/>
      <text x="115" y="50" text-anchor="middle" fill="#888" font-size="8">VCC</text>

      <!-- RC消抖电路（条件显示） -->
      <template v-if="mode === 'rc'">
        <line x1="50" y1="70" x2="65" y2="70" stroke="var(--wire)" stroke-width="2"/>
        <rect x="65" y="66" width="20" height="8" fill="none" stroke="#f39c12" stroke-width="1.5"/>
        <text x="75" y="62" text-anchor="middle" fill="#f39c12" font-size="8">R={{ rcR }}k</text>
        <line x1="85" y1="70" x2="100" y2="70" stroke="var(--wire)" stroke-width="2"/>
        <!-- 电容到地 -->
        <line x1="100" y1="70" x2="100" y2="85" stroke="var(--wire)" stroke-width="2"/>
        <line x1="93" y1="85" x2="107" y2="85" stroke="#f39c12" stroke-width="2.5"/>
        <line x1="93" y1="90" x2="107" y2="90" stroke="#f39c12" stroke-width="2.5"/>
        <line x1="100" y1="90" x2="100" y2="110" stroke="var(--wire)" stroke-width="2"/>
        <text x="115" y="90" fill="#f39c12" font-size="8">C={{ rcC }}nF</text>
      </template>

      <!-- 连线到MCU -->
      <line x1="100" y1="70" x2="260" y2="70" :stroke="signalLine ? 'var(--accent)' : 'var(--wire)'" stroke-width="2"/>

      <!-- 地线 -->
      <line x1="20" y1="85" x2="20" y2="110" stroke="var(--wire)" stroke-width="2"/>
      <line x1="20" y1="110" x2="285" y2="110" stroke="var(--wire)" stroke-width="2"/>
      <line x1="285" y1="90" x2="285" y2="110" stroke="var(--wire)" stroke-width="2"/>
      <text x="150" y="125" text-anchor="middle" fill="#888" font-size="9">GND</text>
    </svg>

    <!-- 信号波形 -->
    <div class="waveforms">
      <div class="wave-row">
        <span class="wave-label">原始信号</span>
        <svg class="wave-svg" viewBox="0 0 300 50">
          <line x1="0" y1="25" x2="300" y2="25" stroke="var(--wire)" stroke-width="0.5" opacity="0.3"/>
          <path :d="rawWavePath" fill="none" :stroke="hasBounce ? '#e74c3c' : 'var(--accent)'" stroke-width="1.5"/>
        </svg>
        <span class="wave-info" :class="{ error: hasBounce }">
          {{ hasBounce ? `${bounceCount}次抖动` : '干净' }}
        </span>
      </div>
      <div class="wave-row">
        <span class="wave-label">MCU检测</span>
        <svg class="wave-svg" viewBox="0 0 300 50">
          <line x1="0" y1="25" x2="300" y2="25" stroke="var(--wire)" stroke-width="0.5" opacity="0.3"/>
          <path :d="mcuWavePath" fill="none" :stroke="mcuTriggerCount > 1 ? '#e74c3c' : '#2ecc71'" stroke-width="1.5"/>
        </svg>
        <span class="wave-info" :class="{ error: mcuTriggerCount > 1 }">
          {{ mcuTriggerCount }}次触发
        </span>
      </div>
    </div>

    <!-- 数据面板 -->
    <div class="data-panel">
      <div class="data-row">
        <span class="label">消抖方式</span>
        <span class="value">{{ modeLabel }}</span>
      </div>
      <div class="data-row" v-if="mode === 'rc'">
        <span class="label">时间常数 τ</span>
        <span class="value" :class="{ error: rcTooSmall }">{{ rcTau }}μs ({{ (rcTau / 1000).toFixed(2) }}ms)</span>
      </div>
      <div class="data-row" v-if="mode === 'software'">
        <span class="label">消抖延时</span>
        <span class="value" :class="{ error: swTooShort }">{{ swDelay }}ms</span>
      </div>
      <div class="data-row">
        <span class="label">抖动时间</span>
        <span class="value">{{ bounceTime }}ms</span>
      </div>
      <div class="data-row">
        <span class="label">结果</span>
        <span class="value" :class="{ good: debounced, error: !debounced }">
          {{ debounced ? '✅ 消抖成功' : '❌ 仍有抖动' }}
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

const pressed = computed(() => props.simResult?.pressed ?? false)
const mode = computed(() => props.simResult?.mode ?? 'none')
const rcR = computed(() => props.simResult?.rcR ?? 10)
const rcC = computed(() => props.simResult?.rcC ?? 100)
const swDelay = computed(() => props.simResult?.swDelay ?? 20)
const bounceTime = computed(() => props.simResult?.bounceTime ?? 10)
const hasBounce = computed(() => props.simResult?.hasBounce ?? false)
const bounceCount = computed(() => props.simResult?.bounceCount ?? 0)
const mcuTriggerCount = computed(() => props.simResult?.mcuTriggerCount ?? 0)
const debounced = computed(() => props.simResult?.debounced ?? false)
const rcTau = computed(() => props.simResult?.rcTau ?? 1000)
const rcTooSmall = computed(() => props.simResult?.rcTooSmall ?? false)
const swTooShort = computed(() => props.simResult?.swTooShort ?? false)
const signalLine = computed(() => props.simResult?.signalLine ?? false)

const modeLabel = computed(() => ({
  none: '无消抖', rc: 'RC硬件消抖', software: '软件消抖'
}[mode.value]))

// 原始信号波形（含抖动）
const rawWavePath = computed(() => {
  if (!pressed.value) return 'M0 40 L300 40'
  const bt = bounceTime.value
  const startX = 50
  const bounceEnd = startX + bt * 4
  let path = `M0 40 L${startX} 40`
  if (hasBounce.value) {
    // 抖动区域
    const steps = Math.min(bounceCount.value, 6)
    const stepW = bt * 4 / steps
    for (let i = 0; i < steps; i++) {
      const x0 = startX + i * stepW
      path += ` L${x0} 40 L${x0} 10 L${x0 + stepW * 0.5} 10 L${x0 + stepW * 0.5} 40`
    }
    path += ` L${bounceEnd} 40 L${bounceEnd} 10 L300 10`
  } else {
    path += ` L${startX} 10 L300 10`
  }
  return path
})

// MCU检测波形
const mcuWavePath = computed(() => {
  if (!pressed.value) return 'M0 40 L300 40'
  if (mode.value === 'none') return rawWavePath.value
  if (mode.value === 'software') {
    const delayX = 50 + swDelay.value * 4
    return `M0 40 L50 40 L50 40 L${delayX} 40 L${delayX} 10 L300 10`
  }
  // RC: 平滑上升
  const tau = rcTau.value / 1000
  const rcEnd = 50 + Math.min(tau * 8, 80)
  let path = `M0 40 L50 40`
  for (let x = 50; x <= rcEnd; x += 2) {
    const progress = (x - 50) / (rcEnd - 50)
    const y = 40 - 30 * (1 - Math.exp(-progress * 3))
    path += ` L${x} ${y.toFixed(1)}`
  }
  path += ` L300 10`
  return path
})
</script>

<style scoped>
.debounce-view { display: flex; flex-direction: column; gap: 8px; }
.formula-bar {
  display: flex; gap: 8px; flex-wrap: wrap;
  padding: 6px 10px; background: var(--card-bg); border-radius: 6px;
  font-size: 12px; color: var(--text-secondary);
}
.formula { color: var(--accent); font-family: monospace; }
.formula-sep { color: var(--text-dim); }
.btn-svg {
  width: 100%; max-width: 340px; height: auto;
  background: var(--canvas-bg); border-radius: 8px;
}
.waveforms { display: flex; flex-direction: column; gap: 4px; }
.wave-row {
  display: flex; align-items: center; gap: 8px;
}
.wave-label { width: 60px; font-size: 11px; color: var(--text-secondary); }
.wave-svg { flex: 1; height: 40px; background: var(--canvas-bg); border-radius: 4px; }
.wave-info { width: 80px; font-size: 11px; text-align: right; }
.wave-info.error { color: var(--error); }
.data-panel { display: flex; flex-direction: column; gap: 4px; }
.data-row {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 8px; font-size: 13px;
}
.data-row .label { width: 80px; color: var(--text-secondary); }
.data-row .value { font-weight: bold; color: var(--accent); }
.data-row .value.good { color: #2ecc71; }
.data-row .value.error { color: var(--error); }
</style>
