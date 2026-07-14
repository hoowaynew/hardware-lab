<template>
  <div class="rc-filter-view">
    <div class="rf-formula">
      <span class="formula-text">fc = 1 / (2πRC)</span>
    </div>
    <div class="rf-result">
      <div class="rf-fc">
        <span class="rf-label">截止频率 fc</span>
        <span class="rf-number" :class="{ 'rf-active': isFiltering }">{{ fcDisplay }}</span>
        <span class="rf-unit">Hz</span>
      </div>
      <div class="rf-meta">
        <span>输入: {{ inputFreq }}Hz ({{ inputType === 'square' ? '方波' : '正弦' }})</span>
        <span>衰减: {{ attenuationDB.toFixed(1) }}dB</span>
        <span>增益: {{ (gain * 100).toFixed(1) }}%</span>
      </div>
    </div>
    <!-- 双波形对比 -->
    <div class="rf-waveform">
      <div class="rf-wave-label">
        <span class="rf-wave-tag rf-input-tag">输入</span>
        <span class="rf-wave-tag rf-output-tag">输出</span>
      </div>
      <svg class="rf-svg" :viewBox="`0 0 ${svgW} ${svgH}`" preserveAspectRatio="none">
        <!-- 输入波形 -->
        <polyline
          class="rf-input-line"
          :points="inputPoints"
          fill="none"
        />
        <!-- 输出波形 -->
        <polyline
          class="rf-output-line"
          :points="outputPoints"
          fill="none"
        />
      </svg>
    </div>
    <div class="rf-info">
      <span :class="{ 'rf-filtering': isFiltering }">
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

const fc = computed(() => props.simResult?.fc || 0)
const fcDisplay = computed(() => {
  const v = fc.value
  if (v < 1) return v.toFixed(4)
  if (v < 1000) return v.toFixed(1)
  return (v / 1000).toFixed(1) + 'k'
})
const inputFreq = computed(() => props.simResult?.inputFreq || 0)
const inputType = computed(() => props.simResult?.inputType || 'square')
const gain = computed(() => props.simResult?.gain || 1)
const attenuationDB = computed(() => props.simResult?.attenuationDB || 0)
const isFiltering = computed(() => inputFreq.value > fc.value)

const inputCurve = computed(() => props.simResult?.inputCurve || [])
const outputCurve = computed(() => props.simResult?.outputCurve || [])

const inputPoints = computed(() => {
  const curve = inputCurve.value
  if (!curve.length) return ''
  const maxT = curve[curve.length - 1].t
  return curve.map(p => `${(p.t / maxT) * svgW},${svgH - p.v * svgH * 0.9 - 5}`).join(' ')
})

const outputPoints = computed(() => {
  const curve = outputCurve.value
  if (!curve.length) return ''
  const maxT = curve[curve.length - 1].t
  return curve.map(p => `${(p.t / maxT) * svgW},${svgH - p.v * svgH * 0.9 - 5}`).join(' ')
})

const statusText = computed(() => {
  if (isFiltering.value) {
    return `✅ 滤波中：${inputFreq.value}Hz > fc=${fcDisplay.value}Hz，信号被衰减`
  }
  return `信号直接通过：${inputFreq.value}Hz < fc=${fcDisplay.value}Hz，几乎无衰减`
})
</script>

<style scoped>
.rc-filter-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 0;
}
.rf-formula {
  text-align: center;
  background: var(--surface-light);
  border-radius: 8px;
  padding: 8px;
}
.formula-text {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: var(--text-dim);
}
.rf-result {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.rf-fc {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.rf-label {
  font-size: 12px;
  color: var(--text-dim);
}
.rf-number {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-dim);
}
.rf-number.rf-active {
  color: var(--primary);
}
.rf-unit {
  font-size: 13px;
  color: var(--text-dim);
}
.rf-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: var(--text-dim);
  text-align: right;
  font-family: monospace;
}
.rf-waveform {
  background: var(--bg);
  border-radius: 8px;
  padding: 8px;
  border: 1px solid var(--border);
}
.rf-wave-label {
  display: flex;
  gap: 12px;
  margin-bottom: 4px;
}
.rf-wave-tag {
  font-size: 11px;
  font-weight: 600;
}
.rf-input-tag { color: var(--text-dim); }
.rf-output-tag { color: var(--primary); }
.rf-svg {
  width: 100%;
  height: 100px;
  display: block;
}
.rf-input-line {
  stroke: var(--text-dim);
  stroke-width: 1.5;
  opacity: 0.6;
}
.rf-output-line {
  stroke: var(--primary);
  stroke-width: 2;
}
.rf-info {
  font-size: 12px;
  color: var(--text-dim);
  text-align: center;
  font-family: monospace;
}
.rf-filtering {
  color: var(--success);
}
</style>
