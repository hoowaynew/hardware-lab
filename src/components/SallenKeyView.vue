<template>
  <div class="sk-view">
    <div class="sk-formula">
      <span class="formula-text">fc = 1/(2πRC) · Q = 0.707 (Butterworth)</span>
    </div>

    <!-- Key metrics -->
    <div class="sk-metrics">
      <div class="sk-metric">
        <span class="sk-m-label">截止频率 fc</span>
        <span class="sk-m-value">{{ fcDisplay }}</span>
      </div>
      <div class="sk-metric">
        <span class="sk-m-label">品质因数 Q</span>
        <span class="sk-m-value" :class="{ 'sk-warn': q > 1.5 }">{{ q?.toFixed(2) }}</span>
      </div>
      <div class="sk-metric">
        <span class="sk-m-label">输入频率</span>
        <span class="sk-m-value">{{ freqDisplay }}</span>
      </div>
      <div class="sk-metric">
        <span class="sk-m-label">增益</span>
        <span class="sk-m-value" :class="{ 'sk-warn': gainDb > 3 }">{{ gainDb?.toFixed(1) }} dB</span>
      </div>
      <div class="sk-metric">
        <span class="sk-m-label">阻带衰减</span>
        <span class="sk-m-value">{{ attenuationDb?.toFixed(1) }} dB/dec</span>
      </div>
      <div class="sk-metric">
        <span class="sk-m-label">响应类型</span>
        <span class="sk-m-value">{{ responseType }}</span>
      </div>
    </div>

    <!-- Frequency response curve -->
    <div class="sk-response">
      <div class="sk-response-label">频率响应曲线 (幅频特性)</div>
      <svg width="100%" height="120" viewBox="0 0 280 120" class="sk-svg">
        <!-- Grid lines -->
        <line x1="30" y1="10" x2="30" y2="100" stroke="var(--border)" stroke-width="0.5" />
        <line x1="30" y1="100" x2="270" y2="100" stroke="var(--border)" stroke-width="0.5" />
        <line x1="30" y1="55" x2="270" y2="55" stroke="var(--border)" stroke-width="0.3" stroke-dasharray="2,2" />
        <!-- 0dB line label -->
        <text x="2" y="14" font-size="8" fill="var(--text-dim)">+10</text>
        <text x="2" y="58" font-size="8" fill="var(--text-dim)">0dB</text>
        <text x="2" y="103" font-size="8" fill="var(--text-dim)">-40</text>
        <!-- fc marker -->
        <line v-if="fcXPos > 30" :x1="fcXPos" y1="10" :x2="fcXPos" y2="100" stroke="var(--warning)" stroke-width="0.5" stroke-dasharray="3,3" />
        <text v-if="fcXPos > 30" :x="fcXPos - 8" y="9" font-size="7" fill="var(--warning)">fc</text>
        <!-- Response curve -->
        <polyline :points="responsePoints" fill="none" :stroke="curveColor" stroke-width="2" />
        <!-- Input freq marker -->
        <circle v-if="inputFreqXPos > 30" :cx="inputFreqXPos" :cy="inputFreqYPos" r="3" :fill="curveColor" />
      </svg>
    </div>

    <!-- Input/Output waveforms -->
    <div class="sk-waveforms">
      <div class="sk-wave-label">输入(蓝) / 输出(绿) 波形</div>
      <svg width="100%" height="60" viewBox="0 0 280 60" class="sk-svg">
        <line x1="0" y1="30" x2="280" y2="30" stroke="var(--border)" stroke-width="0.3" />
        <polyline :points="inputWavePoints" fill="none" stroke="var(--text-dim)" stroke-width="1.5" opacity="0.5" />
        <polyline :points="outputWavePoints" fill="none" :stroke="curveColor" stroke-width="2" />
      </svg>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  simResult: { type: Object, default: null }
})

const fc = computed(() => props.simResult?.fc ?? 0)
const q = computed(() => props.simResult?.q ?? 0.707)
const inputFreq = computed(() => props.simResult?.inputFreq ?? 100)
const gain = computed(() => props.simResult?.gain ?? 1)
const gainDb = computed(() => props.simResult?.gainDb ?? 0)
const attenuationDb = computed(() => props.simResult?.attenuationDb ?? -40)
const responseCurve = computed(() => props.simResult?.responseCurve ?? [])
const inputCurve = computed(() => props.simResult?.inputCurve ?? [])
const outputCurve = computed(() => props.simResult?.outputCurve ?? [])

const fcDisplay = computed(() => {
  const f = fc.value
  if (f < 1000) return f.toFixed(1) + ' Hz'
  return (f / 1000).toFixed(2) + ' kHz'
})

const freqDisplay = computed(() => {
  const f = inputFreq.value
  if (f < 1000) return f + ' Hz'
  return (f / 1000).toFixed(1) + ' kHz'
})

const responseType = computed(() => {
  if (q.value < 0.5) return '过阻尼'
  if (q.value < 0.6) return 'Bessel'
  if (Math.abs(q.value - 0.707) < 0.05) return 'Butterworth'
  if (q.value <= 1) return 'Chebyshev轻'
  return '高Q谐振'
})

const curveColor = computed(() => {
  if (q.value > 2 && gainDb.value > 3) return '#e74c3c'
  if (q.value > 1) return '#f39c12'
  return '#2ecc71'
})

// Map response curve to SVG points (log freq: 10Hz ~ 1MHz, gain: +10dB ~ -40dB)
const responsePoints = computed(() => {
  if (!responseCurve.value.length) return ''
  const fMin = 10, fMax = 1000000
  const gMin = -40, gMax = 10
  return responseCurve.value.map(p => {
    const x = 30 + (Math.log10(p.f / fMin) / Math.log10(fMax / fMin)) * 240
    const gainDbVal = 20 * Math.log10(Math.max(0.0001, p.gain))
    const y = 100 - ((gainDbVal - gMin) / (gMax - gMin)) * 90
    return `${x.toFixed(1)},${Math.max(10, Math.min(100, y)).toFixed(1)}`
  }).join(' ')
})

const fcXPos = computed(() => {
  const fMin = 10, fMax = 1000000
  if (fc.value <= 0) return 0
  return 30 + (Math.log10(fc.value / fMin) / Math.log10(fMax / fMin)) * 240
})

const inputFreqXPos = computed(() => {
  const fMin = 10, fMax = 1000000
  if (inputFreq.value <= 0) return 0
  return 30 + (Math.log10(inputFreq.value / fMin) / Math.log10(fMax / fMin)) * 240
})

const inputFreqYPos = computed(() => {
  const gMin = -40, gMax = 10
  const gainDbVal = gainDb.value
  return 100 - ((gainDbVal - gMin) / (gMax - gMin)) * 90
})

// Input/output waveform points
const inputWavePoints = computed(() => {
  if (!inputCurve.value.length) return ''
  return inputCurve.value.map((p, i) => {
    const x = (i / (inputCurve.value.length - 1)) * 280
    const y = 30 - p.v * 20
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
})

const outputWavePoints = computed(() => {
  if (!outputCurve.value.length) return ''
  return outputCurve.value.map((p, i) => {
    const x = (i / (outputCurve.value.length - 1)) * 280
    const y = 30 - p.v * 20
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
})
</script>

<style scoped>
.sk-view { display: flex; flex-direction: column; gap: 10px; padding: 8px 0; }
.sk-formula { text-align: center; background: var(--surface-light); border-radius: 8px; padding: 8px; }
.formula-text { font-family: 'Courier New', monospace; font-size: 12px; color: var(--text-dim); }
.sk-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: var(--surface-light); border-radius: 8px; padding: 10px 12px; }
.sk-metric { display: flex; justify-content: space-between; align-items: center; }
.sk-m-label { font-size: 11px; color: var(--text-dim); }
.sk-m-value { font-size: 13px; font-weight: 700; font-family: monospace; color: var(--text); }
.sk-warn { color: var(--danger); }
.sk-response { background: var(--surface-light); border-radius: 8px; padding: 8px 12px; }
.sk-response-label { font-size: 11px; color: var(--text-dim); margin-bottom: 4px; }
.sk-svg { display: block; }
.sk-waveforms { background: var(--surface-light); border-radius: 8px; padding: 8px 12px; }
.sk-wave-label { font-size: 11px; color: var(--text-dim); margin-bottom: 4px; }
</style>
