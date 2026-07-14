<template>
  <div class="ntc-view">
    <div class="ntc-formula">
      <span class="formula-text">R(T) = R25 × exp(B × (1/T − 1/298.15))</span>
    </div>

    <!-- 温度显示 -->
    <div class="ntc-temp-display">
      <div class="ntc-temp-bar">
        <div class="ntc-temp-track">
          <div class="ntc-temp-fill" :style="{ width: tempPercent + '%' }"></div>
          <div class="ntc-temp-marker" :style="{ left: tempPercent + '%' }">
            <span class="ntc-temp-val">{{ tempC }}°C</span>
          </div>
        </div>
        <div class="ntc-temp-range">
          <span>-20°C</span>
          <span>25°C</span>
          <span>100°C</span>
        </div>
      </div>
    </div>

    <!-- 阻值+电压+ADC -->
    <div class="ntc-readings">
      <div class="ntc-reading">
        <span class="ntc-r-label">NTC阻值</span>
        <span class="ntc-r-value" :class="{ 'ntc-r-warn': rWarn }">{{ rntcDisplay }}</span>
      </div>
      <div class="ntc-reading">
        <span class="ntc-r-label">分压输出</span>
        <span class="ntc-r-value">{{ vout.toFixed(3) }}V</span>
      </div>
      <div class="ntc-reading">
        <span class="ntc-r-label">ADC读数</span>
        <span class="ntc-r-value" :class="{ 'ntc-r-warn': adcWarn }">{{ adcValue }} / {{ adcMax }}</span>
      </div>
      <div class="ntc-reading">
        <span class="ntc-r-label">ADC占比</span>
        <span class="ntc-r-value" :class="{ 'ntc-r-warn': adcWarn }">{{ adcPercent }}%</span>
      </div>
    </div>

    <!-- ADC条 -->
    <div class="ntc-adc-bar-container">
      <div class="ntc-adc-bar">
        <div class="ntc-adc-safe-zone"></div>
        <div class="ntc-adc-fill" :style="{ width: adcPercent + '%', background: adcWarn ? 'var(--danger)' : 'var(--primary)' }"></div>
      </div>
      <div class="ntc-adc-labels">
        <span>0</span>
        <span class="ntc-safe-label">安全区(20%~80%)</span>
        <span>{{ adcMax }}</span>
      </div>
    </div>

    <!-- 精度信息 -->
    <div class="ntc-precision">
      <span>分辨率: {{ adcResolution }} ADC/°C</span>
      <span :class="{ 'ntc-good-res': adcResolution >= 5 }">
        {{ adcResolution >= 5 ? '✅ 测温精度良好' : '⚠️ 分辨率偏低' }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  simResult: { type: Object, default: null }
})

const tempC = computed(() => props.simResult?.tempC ?? 25)
const rntcDisplay = computed(() => props.simResult?.RntcK || '—')
const vout = computed(() => props.simResult?.Vout || 0)
const adcValue = computed(() => props.simResult?.adcValue || 0)
const adcMax = computed(() => props.simResult?.adcMax || 4095)
const adcPercent = computed(() => parseFloat(props.simResult?.adcPercent) || 0)
const adcResolution = computed(() => props.simResult?.adcResolution || 0)

const tempPercent = computed(() => {
  return ((tempC.value + 20) / 120) * 100
})

const adcWarn = computed(() => adcPercent.value > 80 || adcPercent.value < 20)
const rWarn = computed(() => {
  const r = props.simResult?.Rntc
  return r < 100 || r > 500000
})
</script>

<style scoped>
.ntc-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 0;
}
.ntc-formula {
  text-align: center;
  background: var(--surface-light);
  border-radius: 8px;
  padding: 8px;
}
.formula-text {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--text-dim);
}
.ntc-temp-display {
  padding: 4px 0;
}
.ntc-temp-bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ntc-temp-track {
  position: relative;
  height: 20px;
  background: linear-gradient(90deg, #3498db, #2ecc71, #e74c3c);
  border-radius: 10px;
  opacity: 0.3;
}
.ntc-temp-fill {
  position: absolute;
  height: 100%;
  background: linear-gradient(90deg, #3498db, #2ecc71, #e74c3c);
  border-radius: 10px;
  opacity: 0.6;
  transition: width 0.3s;
}
.ntc-temp-marker {
  position: absolute;
  top: -8px;
  transform: translateX(-50%);
}
.ntc-temp-val {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--primary);
  white-space: nowrap;
}
.ntc-temp-range {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-dim);
}
.ntc-readings {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.ntc-reading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--surface-light);
  border-radius: 8px;
  padding: 8px 12px;
}
.ntc-r-label {
  font-size: 11px;
  color: var(--text-dim);
}
.ntc-r-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary);
  font-family: monospace;
}
.ntc-r-warn {
  color: var(--danger);
}
.ntc-adc-bar-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ntc-adc-bar {
  position: relative;
  height: 16px;
  background: var(--surface-light);
  border-radius: 4px;
  overflow: hidden;
}
.ntc-adc-safe-zone {
  position: absolute;
  left: 20%;
  width: 60%;
  height: 100%;
  background: rgba(46, 204, 113, 0.15);
}
.ntc-adc-fill {
  position: absolute;
  height: 100%;
  transition: all 0.3s;
  border-radius: 4px;
}
.ntc-adc-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-dim);
}
.ntc-safe-label { color: var(--success); }
.ntc-precision {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-dim);
  font-family: monospace;
}
.ntc-good-res { color: var(--success); }
</style>
