<template>
  <div class="adc-view">
    <div class="formula-bar">
      <span class="formula">LSB = V<sub>ref</sub> / 2<sup>N</sup></span>
      <span class="formula-sep">|</span>
      <span class="formula">SNR = 6.02N + 1.76 dB</span>
    </div>

    <svg class="adc-svg" viewBox="0 0 360 220">
      <!-- ADC block -->
      <rect x="130" y="70" width="100" height="80" rx="6" fill="var(--card-bg)" stroke="var(--accent)" stroke-width="2"/>
      <text x="180" y="95" text-anchor="middle" fill="var(--accent)" font-size="11" font-weight="bold">STM32 ADC</text>
      <text x="180" y="110" text-anchor="middle" fill="var(--text-dim)" font-size="9">{{ bits }}-bit</text>
      <text x="180" y="125" text-anchor="middle" fill="var(--text-dim)" font-size="9">Vref={{ vref }}V</text>
      <text x="180" y="140" text-anchor="middle" fill="var(--text-secondary)" font-size="8">S/H={{ acqTime }}μs</text>

      <!-- Vin input arrow -->
      <line x1="60" y1="110" x2="130" y2="110" stroke="var(--wire)" stroke-width="2"/>
      <polygon points="130,110 124,106 124,114" fill="var(--wire)"/>
      <text x="60" y="100" :fill="inputV > vref ? 'var(--error)' : 'var(--accent)'" font-size="11" font-weight="bold">Vin={{ inputV.toFixed(2) }}V</text>
      <rect x="40" y="105" width="20" height="10" rx="2" fill="var(--canvas-bg)" stroke="var(--wire)" stroke-width="1"/>
      <text x="50" y="135" text-anchor="middle" fill="var(--text-dim)" font-size="8">信号源</text>

      <!-- Vref pin -->
      <line x1="180" y1="70" x2="180" y2="50" stroke="var(--wire)" stroke-width="2"/>
      <text x="190" y="48" fill="var(--text-dim)" font-size="9">Vref={{ vref }}V</text>

      <!-- Digital output -->
      <line x1="230" y1="110" x2="300" y2="110" stroke="var(--wire)" stroke-width="2"/>
      <polygon points="300,110 294,106 294,114" fill="var(--wire)"/>
      <text x="250" y="100" fill="var(--accent)" font-size="10" font-weight="bold">D={{ digitalCode }}</text>
      <text x="250" y="128" fill="var(--text-dim)" font-size="8">0x{{ digitalHex }}</text>

      <!-- Quantization bar -->
      <rect x="130" y="160" width="100" height="6" rx="2" fill="var(--canvas-bg)" stroke="var(--wire)" stroke-width="0.5"/>
      <rect x="130" y="160" :width="quantBar" height="6" rx="2" :fill="inputV > vref ? 'var(--error)' : 'var(--accent)'"/>
      <text x="130" y="178" fill="var(--text-dim)" font-size="8">0</text>
      <text x="218" y="178" fill="var(--text-dim)" font-size="8">{{ maxCode }}</text>

      <!-- Quantization error indicator -->
      <g v-if="inputV <= vref">
        <text x="180" y="200" text-anchor="middle" :fill="quantError > lsb / 2 ? '#f1c40f' : 'var(--text-dim)'" font-size="9">
          量化误差: ±{{ (lsb / 2 * 1000).toFixed(2) }}mV
        </text>
      </g>
      <g v-if="inputV > vref">
        <text x="180" y="200" text-anchor="middle" fill="var(--error)" font-size="10" font-weight="bold">⚠️ 满量程饱和！</text>
      </g>

      <!-- Acquisition warning -->
      <g v-if="acqTime < 3">
        <circle cx="180" cy="82" r="14" fill="#f1c40f" opacity="0.15">
          <animate attributeName="r" values="12;16;12" dur="0.8s" repeatCount="indefinite"/>
        </circle>
      </g>
    </svg>

    <!-- Waveform: quantized vs analog -->
    <div class="waveform-section">
      <div class="waveform-label">量化波形（模拟 → 数字阶梯）</div>
      <svg class="quant-wave" viewBox="0 0 340 80" preserveAspectRatio="none">
        <!-- Analog sine -->
        <path :d="analogPath" fill="none" stroke="var(--text-dim)" stroke-width="1" opacity="0.5" stroke-dasharray="3,2"/>
        <!-- Quantized staircase -->
        <path :d="quantPath" fill="none" stroke="var(--accent)" stroke-width="1.5"/>
      </svg>
    </div>

    <div class="data-panel">
      <div class="data-row">
        <span class="label">数字码值</span>
        <span class="value">{{ digitalCode }} / {{ maxCode }}</span>
      </div>
      <div class="data-row">
        <span class="label">LSB (分辨电压)</span>
        <span class="value">{{ (lsb * 1000).toFixed(3) }}mV</span>
      </div>
      <div class="data-row">
        <span class="label">量化误差</span>
        <span class="value" :class="{ warn: lsb * 1000 > 10 }">±{{ (lsb / 2 * 1000).toFixed(3) }}mV</span>
      </div>
      <div class="data-row">
        <span class="label">SNR (理想)</span>
        <span class="value">{{ snr.toFixed(1) }}dB</span>
      </div>
      <div class="data-row">
        <span class="label">输入范围</span>
        <span class="value" :class="{ error: inputV > vref }">
          {{ inputV > vref ? '超量程!' : '正常' }}
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

const bits = computed(() => props.simResult?.bits ?? 12)
const vref = computed(() => props.simResult?.vref ?? 3.3)
const inputV = computed(() => props.simResult?.inputV ?? 1.5)
const acqTime = computed(() => props.simResult?.acqTime ?? 7.5)
const digitalCode = computed(() => props.simResult?.digitalCode ?? 0)
const maxCode = computed(() => props.simResult?.maxCode ?? 4095)
const lsb = computed(() => props.simResult?.lsb ?? 0.000806)
const snr = computed(() => props.simResult?.snr ?? 74)

const quantError = computed(() => Math.abs(inputV.value - (digitalCode.value * lsb.value)))

const digitalHex = computed(() => digitalCode.value.toString(16).toUpperCase().padStart(bits.value / 4, '0'))

const quantBar = computed(() => {
  const ratio = Math.min(digitalCode.value / maxCode.value, 1)
  return ratio * 100
})

// Generate analog sine and quantized staircase
const analogPath = computed(() => {
  const pts = []
  for (let i = 0; i <= 340; i += 4) {
    const t = i / 340
    const v = inputV.value * Math.sin(t * Math.PI * 2)
    const y = 70 - (v / vref.value) * 60
    pts.push(`${i === 0 ? 'M' : 'L'}${i},${y}`)
  }
  return pts.join(' ')
})

const quantPath = computed(() => {
  const pts = []
  const steps = Math.max(bits.value, 8)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const v = inputV.value * Math.sin(t * Math.PI * 2)
    const quantized = Math.round(v / lsb.value) * lsb.value
    const y = 70 - (quantized / vref.value) * 60
    const x = t * 340
    pts.push(`${i === 0 ? 'M' : 'L'}${x},${y}`)
  }
  return pts.join(' ')
})
</script>

<style scoped>
.adc-view { display: flex; flex-direction: column; gap: 8px; }
.formula-bar {
  display: flex; gap: 8px; flex-wrap: wrap;
  padding: 6px 10px; background: var(--card-bg); border-radius: 6px;
  font-size: 12px; color: var(--text-secondary);
}
.formula { color: var(--accent); font-family: monospace; }
.formula-sep { color: var(--text-dim); }
.adc-svg {
  width: 100%; max-width: 360px; height: auto;
  background: var(--canvas-bg); border-radius: 8px;
}
.waveform-section { background: var(--canvas-bg); border-radius: 8px; padding: 8px; }
.waveform-label { font-size: 11px; color: var(--text-dim); margin-bottom: 4px; }
.quant-wave { width: 100%; height: 80px; }
.data-panel { display: flex; flex-direction: column; gap: 4px; }
.data-row {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 8px; font-size: 13px;
}
.data-row .label { width: 110px; color: var(--text-secondary); }
.data-row .value { font-weight: bold; color: var(--accent); }
.data-row .value.warn { color: #f1c40f; }
.data-row .value.error { color: var(--error); }
</style>