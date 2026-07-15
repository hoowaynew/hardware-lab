<template>
  <div class="rc-filter-view">
    <div class="rf-formula">
      <span class="formula-text">fc = 1 / (2πRC)</span>
    </div>

    <!-- 电路原理图 -->
    <svg class="rf-circuit" viewBox="0 0 320 150">
      <!-- Vin 输入端 -->
      <text x="15" y="22" fill="var(--text-dim)" font-size="10">Vin = {{ inputFreq }}Hz</text>
      <line x1="50" y1="30" x2="50" y2="40" stroke="var(--wire)" stroke-width="2"/>
      <text x="42" y="38" fill="var(--text-dim)" font-size="8">+</text>
      <circle cx="50" cy="30" r="3" fill="var(--wire)"/>

      <!-- 导线 Vin → R -->
      <line x1="50" y1="40" x2="50" y2="45" stroke="var(--wire)" stroke-width="2"/>

      <!-- R 电阻 (ANSI zigzag, 水平) -->
      <path d="M50,50 h3 l3,-5 l6,10 l6,-10 l6,10 l6,-10 l3,5 h3" fill="none" stroke="#e67e22" stroke-width="1.5"/>
      <text x="58" y="40" fill="#e67e22" font-size="10">R</text>

      <!-- 导线 R → Vout节点 -->
      <line x1="92" y1="50" x2="120" y2="50" stroke="var(--wire)" stroke-width="2"/>

      <!-- Vout 节点 (junction dot) -->
      <circle cx="120" cy="50" r="3" fill="var(--wire)"/>

      <!-- Vout 输出连线 -->
      <line x1="120" y1="50" x2="220" y2="50" stroke="var(--accent)" stroke-width="2"/>
      <circle cx="220" cy="50" r="3" fill="var(--accent)"/>
      <text x="228" y="54" fill="var(--accent)" font-size="11" font-weight="bold">Vout</text>

      <!-- 导线 Vout节点 → C -->
      <line x1="120" y1="50" x2="120" y2="65" stroke="var(--wire)" stroke-width="2"/>

      <!-- C 电容 (两平行板) -->
      <line x1="112" y1="65" x2="128" y2="65" stroke="#3498db" stroke-width="2.5"/>
      <line x1="112" y1="71" x2="128" y2="71" stroke="#3498db" stroke-width="2.5"/>
      <text x="135" y="70" fill="#3498db" font-size="10">C</text>

      <!-- 导线 C → GND -->
      <line x1="120" y1="71" x2="120" y2="90" stroke="var(--wire)" stroke-width="2"/>

      <!-- GND回路 → Vin -->
      <line x1="50" y1="90" x2="120" y2="90" stroke="var(--wire)" stroke-width="2"/>
      <line x1="50" y1="50" x2="50" y2="90" stroke="var(--wire)" stroke-width="2" opacity="0"/>

      <!-- 接地符号 -->
      <line x1="72" y1="90" x2="88" y2="90" stroke="var(--wire)" stroke-width="2.5"/>
      <line x1="75" y1="94" x2="85" y2="94" stroke="var(--wire)" stroke-width="2"/>
      <line x1="78" y1="98" x2="82" y2="98" stroke="var(--wire)" stroke-width="1.5"/>
      <text x="95" y="96" fill="var(--text-dim)" font-size="9">GND</text>

      <!-- Vin → GND 连线 (左侧回路) -->
      <line x1="50" y1="50" x2="50" y2="90" stroke="var(--wire)" stroke-width="2"/>

      <!-- 截止频率标注 -->
      <text x="150" y="120" fill="var(--text-dim)" font-size="9">fc = {{ fcDisplay }} Hz ({{ isFiltering ? '正在滤波' : '通带' }})</text>
    </svg>

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
