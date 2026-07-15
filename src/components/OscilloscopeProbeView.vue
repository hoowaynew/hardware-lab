<template>
  <div class="probe-view">
    <div class="formula-bar">
      <span class="formula">正确补偿: R<sub>1</sub>C<sub>1</sub> = R<sub>2</sub>C<sub>2</sub></span>
      <span class="formula-sep">|</span>
      <span class="formula">带宽 = 1 / (2π·R·C<sub>total</sub>)</span>
    </div>

    <svg class="probe-svg" viewBox="0 0 360 220">
      <!-- Probe tip -->
      <line x1="20" y1="110" x2="60" y2="110" stroke="var(--wire)" stroke-width="2"/>
      <circle cx="20" cy="110" r="4" fill="var(--accent)"/>
      <text x="20" y="130" text-anchor="middle" fill="var(--text-dim)" font-size="8">TIP</text>

      <!-- R1 (probe resistor) -->
      <rect x="60" y="102" width="40" height="16" rx="2" fill="#3a2a1a" stroke="var(--wire)" stroke-width="1"/>
      <text x="80" y="113" text-anchor="middle" fill="var(--text-dim)" font-size="9">{{ r1 }}Ω</text>

      <!-- C1 (compensation cap, parallel to R1) -->
      <g v-if="attenuation > 1">
        <line x1="80" y1="102" x2="80" y2="82" stroke="var(--wire)" stroke-width="1.5"/>
        <line x1="70" y1="82" x2="90" y2="82" stroke="var(--wire)" stroke-width="2"/>
        <line x1="70" y1="76" x2="90" y2="76" stroke="var(--wire)" stroke-width="2"/>
        <line x1="80" y1="76" x2="80" y2="102" stroke="var(--wire)" stroke-width="1.5"/>
        <text x="100" y="80" :fill="compColor" font-size="8">C1</text>
        <!-- Compensation adjust screw -->
        <circle cx="100" cy="70" r="5" fill="var(--canvas-bg)" stroke="var(--wire)" stroke-width="1"/>
        <line x1="96" y1="70" x2="104" y2="70" :stroke="compColor" stroke-width="1.5">
          <animateTransform v-if="compensation !== 1" attributeName="transform" type="rotate"
            :from="`0 100 70`" :to="`${(compensation - 1) * 90} 100 70`" dur="0.3s"/>
        </line>
      </g>

      <!-- Cable capacitance C2 -->
      <line x1="100" y1="110" x2="160" y2="110" stroke="var(--wire)" stroke-width="2"/>
      <line x1="160" y1="110" x2="160" y2="130" stroke="var(--wire)" stroke-width="1.5"/>
      <line x1="150" y1="130" x2="170" y2="130" stroke="var(--wire)" stroke-width="2"/>
      <line x1="150" y1="136" x2="170" y2="136" stroke="var(--wire)" stroke-width="2"/>
      <line x1="160" y1="136" x2="160" y2="155" stroke="var(--wire)" stroke-width="1.5"/>
      <line x1="150" y1="155" x2="170" y2="155" stroke="var(--wire)" stroke-width="2"/>
      <text x="175" y="135" fill="var(--text-dim)" font-size="8">C2={{ cableCap }}pF</text>

      <!-- R2 (scope input) -->
      <line x1="160" y1="110" x2="220" y2="110" stroke="var(--wire)" stroke-width="2"/>
      <rect x="220" y="102" width="40" height="16" rx="2" fill="#3a2a1a" stroke="var(--wire)" stroke-width="1"/>
      <text x="240" y="113" text-anchor="middle" fill="var(--text-dim)" font-size="9">{{ r2 }}Ω</text>

      <!-- Scope -->
      <rect x="270" y="80" width="70" height="60" rx="4" fill="var(--card-bg)" stroke="var(--accent)" stroke-width="2"/>
      <text x="305" y="100" text-anchor="middle" fill="var(--accent)" font-size="10" font-weight="bold">SCOPE</text>
      <text x="305" y="115" text-anchor="middle" fill="var(--text-dim)" font-size="8">{{ attenuation }}x</text>
      <line x1="260" y1="110" x2="270" y2="110" stroke="var(--wire)" stroke-width="2"/>

      <!-- Ground -->
      <line x1="305" y1="140" x2="305" y2="160" stroke="var(--wire)" stroke-width="2"/>
      <line x1="293" y1="160" x2="317" y2="160" stroke="var(--wire)" stroke-width="2.5"/>
      <line x1="297" y1="165" x2="313" y2="165" stroke="var(--wire)" stroke-width="2"/>

      <!-- Compensation status -->
      <text x="180" y="195" text-anchor="middle" :fill="compColor" font-size="11" font-weight="bold">{{ compLabel }}</text>
      <rect x="140" y="200" width="80" height="5" rx="2" fill="var(--canvas-bg)" stroke="var(--wire)" stroke-width="0.5"/>
      <rect x="140" y="200" :width="compBar" height="5" rx="2" :fill="compColor"/>
    </svg>

    <!-- Waveform display -->
    <div class="waveform-section">
      <div class="waveform-label">示波器显示：方波响应</div>
      <svg class="scope-wave" viewBox="0 0 340 80" preserveAspectRatio="none">
        <!-- Grid -->
        <line x1="0" y1="40" x2="340" y2="40" stroke="var(--text-dim)" stroke-width="0.3" opacity="0.3"/>
        <line x1="170" y1="0" x2="170" y2="80" stroke="var(--text-dim)" stroke-width="0.3" opacity="0.3"/>

        <!-- Ideal square wave (dashed) -->
        <path :d="idealPath" fill="none" stroke="var(--text-dim)" stroke-width="1" opacity="0.4" stroke-dasharray="3,2"/>

        <!-- Actual waveform -->
        <path :d="actualPath" fill="none" :stroke="compColor" stroke-width="1.5"/>
      </svg>
    </div>

    <div class="data-panel">
      <div class="data-row">
        <span class="label">衰减比</span>
        <span class="value">{{ attenuation }}x</span>
      </div>
      <div class="data-row">
        <span class="label">补偿状态</span>
        <span class="value" :class="{ warn: compensation < 0.95 || compensation > 1.05 }">
          {{ compLabel }}
        </span>
      </div>
      <div class="data-row">
        <span class="label">显示电压</span>
        <span class="value">{{ displayVoltage.toFixed(3) }}V</span>
      </div>
      <div class="data-row">
        <span class="label">带宽</span>
        <span class="value" :class="{ warn: bandwidth < 10 }">
          {{ bandwidth.toFixed(1) }}MHz
        </span>
      </div>
      <div class="data-row">
        <span class="label">上升时间</span>
        <span class="value">{{ riseTime.toFixed(1) }}ns</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  simResult: { type: Object, default: () => ({}) }
})

const attenuation = computed(() => props.simResult?.attenuation ?? 10)
const compensation = computed(() => props.simResult?.compensation ?? 1.0)
const signalFreq = computed(() => props.simResult?.signalFreq ?? 1000)
const signalAmp = computed(() => props.simResult?.signalAmp ?? 2)
const cableCap = computed(() => props.simResult?.cableCap ?? 100)
const r1 = computed(() => attenuation.value === 1 ? 0 : (attenuation.value - 1) * 1000000) // Ω
const r2 = computed(() => 1000000) // 1MΩ scope input
const bandwidth = computed(() => props.simResult?.bandwidth ?? 100)
const riseTime = computed(() => props.simResult?.riseTime ?? 3.5)
const displayVoltage = computed(() => signalAmp.value / attenuation.value)

const compColor = computed(() => {
  if (compensation.value < 0.85) return '#f1c40f' // under - yellow
  if (compensation.value > 1.15) return 'var(--error)' // over - red
  return 'var(--accent)' // correct
})

const compLabel = computed(() => {
  if (compensation.value < 0.85) return '欠补偿'
  if (compensation.value > 1.15) return '过补偿'
  if (compensation.value < 0.95 || compensation.value > 1.05) return '微调中'
  return '补偿正确'
})

const compBar = computed(() => {
  return Math.min(Math.max((compensation.value - 0.5) / 1.5, 0), 1) * 80
})

// Ideal square wave path
const idealPath = computed(() => {
  const amp = signalAmp.value / attenuation.value
  const yHigh = 40 - amp * 15
  const yLow = 40 + amp * 15
  const half = 170
  return `M 0 ${yLow} L ${half} ${yLow} L ${half} ${yHigh} L 340 ${yHigh}`
})

// Actual waveform with compensation effects
const actualPath = computed(() => {
  const amp = signalAmp.value / attenuation.value
  const yHigh = 40 - amp * 15
  const yLow = 40 + amp * 15
  const half = 170
  const comp = compensation.value

  if (comp < 0.95) {
    // Under-compensation: rounded corners, drooping top
    return `M 0 ${yLow} L ${half - 10} ${yLow} Q ${half} ${yLow} ${half} ${yLow + (yHigh - yLow) * 0.15} L ${half + 5} ${yHigh + (yLow - yHigh) * 0.1} Q ${half + 15} ${yHigh + (yLow - yHigh) * 0.05} ${half + 25} ${yHigh + (yLow - yHigh) * 0.02} L 340 ${yHigh + (yLow - yHigh) * 0.05}`
  } else if (comp > 1.05) {
    // Over-compensation: overshoot spike then ringing
    const spike = Math.min((comp - 1) * 20, 15)
    return `M 0 ${yLow} L ${half - 2} ${yLow} L ${half} ${yHigh - spike} L ${half + 3} ${yHigh + spike * 0.3} L ${half + 6} ${yHigh - spike * 0.15} L ${half + 10} ${yHigh + spike * 0.05} L 340 ${yHigh}`
  } else {
    // Perfect compensation: clean square wave
    return `M 0 ${yLow} L ${half} ${yLow} L ${half} ${yHigh} L 340 ${yHigh}`
  }
})
</script>

<style scoped>
.probe-view { display: flex; flex-direction: column; gap: 8px; }
.formula-bar {
  display: flex; gap: 8px; flex-wrap: wrap;
  padding: 6px 10px; background: var(--card-bg); border-radius: 6px;
  font-size: 12px; color: var(--text-secondary);
}
.formula { color: var(--accent); font-family: monospace; }
.formula-sep { color: var(--text-dim); }
.probe-svg {
  width: 100%; max-width: 360px; height: auto;
  background: var(--canvas-bg); border-radius: 8px;
}
.waveform-section { background: var(--canvas-bg); border-radius: 8px; padding: 8px; }
.waveform-label { font-size: 11px; color: var(--text-dim); margin-bottom: 4px; }
.scope-wave { width: 100%; height: 80px; }
.data-panel { display: flex; flex-direction: column; gap: 4px; }
.data-row {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 8px; font-size: 13px;
}
.data-row .label { width: 100px; color: var(--text-secondary); }
.data-row .value { font-weight: bold; color: var(--accent); }
.data-row .value.warn { color: #f1c40f; }
.data-row .value.error { color: var(--error); }
</style>