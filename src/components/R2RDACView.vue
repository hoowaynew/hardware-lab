<template>
  <div class="r2r-dac-view">
    <div class="formula-bar">
      <span class="formula">V<sub>out</sub> = V<sub>ref</sub> × D / 2<sup>{{ bits }}</sup></span>
      <span class="formula-sep">|</span>
      <span class="formula">LSB = V<sub>ref</sub> / 2<sup>{{ bits }}</sup> = {{ lsb.toFixed(4) }}V</span>
    </div>

    <svg class="dac-svg" viewBox="0 0 360 220">
      <!-- R-2R 梯形网络 -->
      <!-- 横线 -->
      <line x1="20" y1="60" x2="340" y2="60" stroke="var(--wire)" stroke-width="1.5"/>

      <!-- Vref -->
      <text x="10" y="55" fill="#888" font-size="10">Vref={{ vref }}V</text>
      <line x1="20" y1="50" x2="20" y2="60" stroke="var(--wire)" stroke-width="2"/>

      <!-- 各位电阻网络 (从MSB到LSB) -->
      <g v-for="(bw, i) in visibleBits" :key="i">
        <!-- 2R 垂直电阻 -->
        <rect :x="resistorX(i) - 6" y="60" width="12" height="30" rx="2" fill="#3a2a1a" stroke="var(--wire)" stroke-width="1"/>
        <line :x1="resistorX(i)" y1="90" x2="resistorX(i)" y2="100" stroke="var(--wire)" stroke-width="1.5"/>

        <!-- 开关 -->
        <rect :x="resistorX(i) - 10" y="100" width="20" height="14" rx="2"
              :fill="bw.value ? 'var(--accent)' : '#3a3a4e'"
              stroke="var(--wire)" stroke-width="1"/>
        <text :x="resistorX(i)" y="111" text-anchor="middle" :fill="bw.value ? '#fff' : '#888'" font-size="8">
          {{ bw.bit }}
        </text>

        <!-- 接地线 (bit=0时) -->
        <line v-if="!bw.value" :x1="resistorX(i)" y1="114" x2="resistorX(i)" y2="130" stroke="var(--wire)" stroke-width="1"/>
        <line v-if="!bw.value" :x1="resistorX(i) - 6" y1="130" x2="resistorX(i) + 6" y2="130" stroke="var(--wire)" stroke-width="1.5"/>

        <!-- Vref连接线 (bit=1时) -->
        <line v-if="bw.value" :x1="resistorX(i)" y1="114" x2="resistorX(i)" y2="125" stroke="var(--accent)" stroke-width="1.5"/>
        <text v-if="bw.value" :x="resistorX(i)" y="140" text-anchor="middle" fill="var(--accent)" font-size="7">Vref</text>

        <!-- R 水平电阻 -->
        <rect v-if="i < visibleBits.length - 1" :x="resistorX(i) + 6" y="56" width="14" height="8" rx="1"
              fill="#3a2a1a" stroke="var(--wire)" stroke-width="1"/>

        <!-- 权重标签 -->
        <text :x="resistorX(i)" y="50" text-anchor="middle" fill="var(--text-dim)" font-size="8">
          {{ bw.weight.toFixed(3) }}V
        </text>
      </g>

      <!-- 运放/缓冲器 (输出, ANSI标准三角形) -->
      <g>
        <path d="M315,140 L315,160 L335,150 Z" fill="none" stroke="var(--text)" stroke-width="1.5"/>
        <text x="318" y="148" fill="var(--text-dim)" font-size="7">+</text>
        <text x="318" y="158" fill="var(--text-dim)" font-size="7">−</text>
        <text x="338" y="154" fill="var(--text-dim)" font-size="8">A</text>
        <line x1="320" y1="60" x2="320" y2="140" stroke="var(--wire)" stroke-width="1.5" stroke-dasharray="2,2"/>
        <!-- 反馈线 (电压跟随器: Vout → −输入) -->
        <line x1="335" y1="150" x2="345" y2="150" stroke="var(--accent)" stroke-width="2"/>
        <line x1="335" y1="158" x2="310" y2="158" stroke="var(--wire)" stroke-width="1.5"/>
        <line x1="310" y1="158" x2="310" y2="150" stroke="var(--wire)" stroke-width="1.5"/>
        <line x1="310" y1="150" x2="315" y2="150" stroke="var(--wire)" stroke-width="1.5"/>
      </g>

      <!-- 输出 -->
      <line x1="330" y1="150" x2="350" y2="150" stroke="var(--accent)" stroke-width="2"/>
      <text x="340" y="165" fill="var(--accent)" font-size="11" font-weight="bold">{{ vout.toFixed(3) }}V</text>
      <circle cx="345" cy="150" r="3" fill="var(--accent)"/>

      <!-- 接地 (2R底端) -->
      <line x1="340" y1="160" x2="340" y2="185" stroke="var(--wire)" stroke-width="1.5"/>
      <line x1="330" y1="185" x2="350" y2="185" stroke="var(--wire)" stroke-width="2"/>

      <!-- 数字输入显示 -->
      <text x="180" y="200" text-anchor="middle" fill="var(--text-dim)" font-size="10">
        D = {{ digitalInput }} ({{ binaryString }})
      </text>
    </svg>

    <!-- 阶梯波形 -->
    <svg class="staircase-svg" viewBox="0 0 360 80" v-if="staircase.length">
      <text x="5" y="12" fill="var(--text-dim)" font-size="9">Vout</text>
      <!-- 轴线 -->
      <line x1="20" y1="70" x2="340" y2="70" stroke="var(--wire)" stroke-width="0.5"/>
      <!-- 阶梯 -->
      <path :d="staircasePath" fill="none" stroke="var(--accent)" stroke-width="1.5"/>
      <!-- 当前值标记 -->
      <circle :cx="currentStairX" :cy="currentStairY" r="3" fill="#e74c3c"/>
      <text :x="currentStairX + 5" :y="currentStairY - 5" fill="#e74c3c" font-size="8">
        {{ vout.toFixed(2) }}V
      </text>
    </svg>

    <div class="data-panel">
      <div class="data-row">
        <span class="label">数字输入</span>
        <span class="value">{{ digitalInput }} ({{ binaryString }})</span>
      </div>
      <div class="data-row">
        <span class="label">输出电压</span>
        <span class="value accent">{{ vout.toFixed(4) }}V</span>
      </div>
      <div class="data-row">
        <span class="label">LSB分辨率</span>
        <span class="value">{{ lsb.toFixed(4) }}V</span>
      </div>
      <div class="data-row">
        <span class="label">最大值</span>
        <span class="value">{{ vref }}V ({{ maxVal }})</span>
      </div>
      <div class="data-row">
        <span class="label">量化SNR</span>
        <span class="value">{{ snr }}dB</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  simResult: { type: Object, default: () => ({}) }
})

const vref = computed(() => props.simResult?.vref ?? 3.3)
const bits = computed(() => props.simResult?.bits ?? 4)
const digitalInput = computed(() => props.simResult?.digitalInput ?? 0)
const vout = computed(() => props.simResult?.vout ?? 0)
const lsb = computed(() => props.simResult?.lsb ?? 0)
const maxVal = computed(() => props.simResult?.maxVal ?? 15)
const snr = computed(() => props.simResult?.snr ?? 0)
const bitWeights = computed(() => props.simResult?.bitWeights ?? [])
const staircase = computed(() => props.simResult?.staircase ?? [])

const visibleBits = computed(() => bitWeights.value.slice(0, Math.min(bits.value, 4)))
const binaryString = computed(() => digitalInput.value.toString(2).padStart(bits.value, '0'))

const resistorX = (i) => 40 + i * 40

const staircasePath = computed(() => {
  if (!staircase.value.length) return ''
  const maxV = vref.value
  const w = 320 / (staircase.value.length - 1)
  let d = ''
  staircase.value.forEach((s, i) => {
    const x = 20 + i * w
    const y = 70 - (s.v / maxV) * 60
    if (i === 0) d += `M ${x} ${y}`
    else d += ` L ${x} ${y}`
    // 阶梯水平段
    if (i < staircase.value.length - 1) {
      const nextX = 20 + (i + 1) * w
      d += ` L ${nextX} ${y}`
    }
  })
  return d
})

const currentStairX = computed(() => {
  const w = 320 / Math.max(staircase.value.length - 1, 1)
  return 20 + digitalInput.value * w
})

const currentStairY = computed(() => {
  return 70 - (vout.value / vref.value) * 60
})
</script>

<style scoped>
.r2r-dac-view { display: flex; flex-direction: column; gap: 6px; }
.formula-bar {
  display: flex; gap: 8px; flex-wrap: wrap;
  padding: 6px 10px; background: var(--card-bg); border-radius: 6px;
  font-size: 12px; color: var(--text-secondary);
}
.formula { color: var(--accent); font-family: monospace; }
.formula-sep { color: var(--text-dim); }
.dac-svg, .staircase-svg {
  width: 100%; max-width: 360px; height: auto;
  background: var(--canvas-bg); border-radius: 8px;
}
.data-panel { display: flex; flex-direction: column; gap: 4px; }
.data-row {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 8px; font-size: 13px;
}
.data-row .label { width: 90px; color: var(--text-secondary); }
.data-row .value { font-weight: bold; color: var(--text-primary); }
.data-row .value.accent { color: var(--accent); }
</style>
