<template>
  <div class="lc-view">
    <div class="lc-formula">
      <span class="formula-text">f₀ = 1/(2π√LC) · Q = ω₀L/R · BW = f₀/Q</span>
    </div>

    <!-- 谐振参数 -->
    <div class="lc-result">
      <div class="lc-f0">
        <span class="lc-label">中心频率 f₀</span>
        <span class="lc-number" :class="{ 'lc-resonant': isResonant }">{{ f0Display }}</span>
        <span class="lc-unit">Hz</span>
      </div>
      <div class="lc-meta">
        <span>Q值: {{ qValue.toFixed(1) }}</span>
        <span>带宽: {{ bwDisplay }}</span>
        <span>增益: {{ gain.toFixed(3) }}</span>
      </div>
    </div>

    <!-- 频率响应曲线 -->
    <div class="lc-response">
      <div class="lc-wave-label">
        <span class="lc-wave-tag lc-input-tag">频率响应 |H(f)|</span>
        <span class="lc-wave-tag lc-marker-tag">输入信号位置</span>
      </div>
      <svg class="lc-svg" :viewBox="`0 0 ${svgW} ${svgH}`" preserveAspectRatio="none">
        <!-- 响应曲线 -->
        <polyline
          class="lc-response-line"
          :points="responsePoints"
          fill="none"
        />
        <!-- 中心频率竖线 -->
        <line
          class="lc-f0-line"
          :x1="(Math.log(f0 / fMin) / Math.log(fMax / fMin)) * svgW"
          :y1="0"
          :x2="(Math.log(f0 / fMin) / Math.log(fMax / fMin)) * svgW"
          :y2="svgH"
        />
        <!-- 输入信号位置 -->
        <line
          class="lc-input-marker"
          :x1="inputFreqX"
          :y1="0"
          :x2="inputFreqX"
          :y2="svgH"
        />
        <!-- -3dB线 -->
        <line
          class="lc-3db-line"
          :x1="0"
          :y1="svgH * 0.293"
          :x2="svgW"
          :y2="svgH * 0.293"
        />
      </svg>
      <div class="lc-freq-labels">
        <span>{{ fMin }}Hz</span>
        <span>{{ f0Display }}Hz (f₀)</span>
        <span>{{ (fMax / 1000).toFixed(0) }}kHz</span>
      </div>
    </div>

    <!-- 输入vs输出波形 -->
    <div class="lc-waveform">
      <div class="lc-wave-label">
        <span class="lc-wave-tag lc-input-tag">输入</span>
        <span class="lc-wave-tag lc-output-tag">输出</span>
      </div>
      <svg class="lc-wave-svg" :viewBox="`0 0 ${svgW} ${waveH}`" preserveAspectRatio="none">
        <polyline class="lc-input-line" :points="inputPoints" fill="none" />
        <polyline class="lc-output-line" :points="outputPoints" fill="none" />
      </svg>
    </div>

    <div class="lc-info">
      <span :class="{ 'lc-at-resonance': isResonant }">
        {{ statusText }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  simResult: { type: Object, default: null }
})

const svgW = 300
const svgH = 100
const waveH = 80

const f0 = computed(() => props.simResult?.f0 || 0)
const f0Display = computed(() => {
  const v = f0.value
  if (v < 1) return v.toFixed(2)
  if (v < 1000) return v.toFixed(0)
  if (v < 1000000) return (v / 1000).toFixed(1) + 'k'
  return (v / 1000000).toFixed(1) + 'M'
})
const qValue = computed(() => props.simResult?.q || 0)
const bw = computed(() => props.simResult?.bw || 0)
const bwDisplay = computed(() => {
  const v = bw.value
  if (v < 1) return v.toFixed(2) + 'Hz'
  if (v < 1000) return v.toFixed(0) + 'Hz'
  return (v / 1000).toFixed(1) + 'kHz'
})
const gain = computed(() => props.simResult?.gain || 0)
const inputFreq = computed(() => props.simResult?.inputFreq || 0)
const isResonant = computed(() => {
  if (f0.value === 0) return false
  return Math.abs(inputFreq.value - f0.value) / f0.value < 0.1
})

const fMin = 100
const fMax = 200000

// 频率响应曲线（对数横轴）
const responseCurve = computed(() => props.simResult?.responseCurve || [])
const responsePoints = computed(() => {
  const curve = responseCurve.value
  if (!curve.length) return ''
  return curve.map(p => {
    const x = (Math.log(p.f / fMin) / Math.log(fMax / fMin)) * svgW
    const y = svgH - p.gain * svgH * 0.9 - 5
    return `${x},${y}`
  }).join(' ')
})

const inputFreqX = computed(() => {
  const f = Math.max(fMin, Math.min(fMax, inputFreq.value))
  return (Math.log(f / fMin) / Math.log(fMax / fMin)) * svgW
})

// 输入输出波形
const inputCurve = computed(() => props.simResult?.inputCurve || [])
const outputCurve = computed(() => props.simResult?.outputCurve || [])

const inputPoints = computed(() => {
  const curve = inputCurve.value
  if (!curve.length) return ''
  const maxT = curve[curve.length - 1].t
  return curve.map(p => `${(p.t / maxT) * svgW},${waveH - p.v * waveH * 0.8 - 5}`).join(' ')
})

const outputPoints = computed(() => {
  const curve = outputCurve.value
  if (!curve.length) return ''
  const maxT = curve[curve.length - 1].t
  return curve.map(p => `${(p.t / maxT) * svgW},${waveH - p.v * waveH * 0.8 - 5}`).join(' ')
})

const statusText = computed(() => {
  if (isResonant.value) {
    return `✅ 谐振！输入频率 ${inputFreq.value}Hz ≈ f₀=${f0Display.value}Hz，信号通过`
  }
  const ratio = f0.value > 0 ? Math.abs(inputFreq.value - f0.value) / f0.value : 1
  if (ratio > 0.5) {
    return `❌ 严重失谐：频率偏离 ${(ratio * 100).toFixed(0)}%，信号被抑制`
  }
  return `偏离谐振：增益 ${(gain.value * 100).toFixed(1)}%，接近通带边缘`
})
</script>

<style scoped>
.lc-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 0;
}
.lc-formula {
  text-align: center;
  background: var(--surface-light);
  border-radius: 8px;
  padding: 8px;
}
.formula-text {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: var(--text-dim);
}
.lc-result {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.lc-f0 {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.lc-label {
  font-size: 12px;
  color: var(--text-dim);
}
.lc-number {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-dim);
}
.lc-number.lc-resonant {
  color: var(--primary);
}
.lc-unit {
  font-size: 13px;
  color: var(--text-dim);
}
.lc-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: var(--text-dim);
  text-align: right;
  font-family: monospace;
}
.lc-response {
  background: var(--bg);
  border-radius: 8px;
  padding: 8px;
  border: 1px solid var(--border);
}
.lc-wave-label {
  display: flex;
  gap: 12px;
  margin-bottom: 4px;
}
.lc-wave-tag {
  font-size: 11px;
  font-weight: 600;
}
.lc-input-tag { color: var(--text-dim); }
.lc-output-tag { color: var(--primary); }
.lc-marker-tag { color: var(--warning); }
.lc-svg {
  width: 100%;
  height: 100px;
  display: block;
}
.lc-response-line {
  stroke: var(--primary);
  stroke-width: 2;
}
.lc-f0-line {
  stroke: var(--success);
  stroke-width: 1;
  stroke-dasharray: 3,2;
  opacity: 0.6;
}
.lc-input-marker {
  stroke: var(--warning);
  stroke-width: 1.5;
}
.lc-3db-line {
  stroke: var(--text-dim);
  stroke-width: 0.5;
  stroke-dasharray: 2,2;
  opacity: 0.4;
}
.lc-freq-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-dim);
  margin-top: 4px;
}
.lc-waveform {
  background: var(--bg);
  border-radius: 8px;
  padding: 8px;
  border: 1px solid var(--border);
}
.lc-wave-svg {
  width: 100%;
  height: 80px;
  display: block;
}
.lc-input-line {
  stroke: var(--text-dim);
  stroke-width: 1.5;
  opacity: 0.6;
}
.lc-output-line {
  stroke: var(--primary);
  stroke-width: 2;
}
.lc-info {
  font-size: 12px;
  color: var(--text-dim);
  text-align: center;
  font-family: monospace;
}
.lc-at-resonance { color: var(--success); }
</style>
