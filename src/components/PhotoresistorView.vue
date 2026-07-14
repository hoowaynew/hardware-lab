<template>
  <div class="photo-view">
    <div class="photo-formula">
      <span class="formula-text">R(lux) = Rdark × (lux_ref / lux)^γ</span>
    </div>

    <!-- 光照强度显示 -->
    <div class="photo-lux-display">
      <div class="photo-lux-bar">
        <div class="photo-lux-track">
          <div class="photo-lux-fill" :style="{ width: luxPercent + '%' }"></div>
          <div class="photo-lux-marker" :style="{ left: luxPercent + '%' }">
            <span class="photo-lux-val">{{ luxLevel }} lux</span>
          </div>
        </div>
        <div class="photo-lux-range">
          <span>暗</span>
          <span>黄昏</span>
          <span>室内</span>
          <span>日光</span>
        </div>
      </div>
    </div>

    <!-- 阻值+电压+ADC -->
    <div class="photo-readings">
      <div class="photo-reading">
        <span class="photo-r-label">光敏阻值</span>
        <span class="photo-r-value" :class="{ 'photo-r-warn': rWarn }">{{ rphotoDisplay }}</span>
      </div>
      <div class="photo-reading">
        <span class="photo-r-label">分压输出</span>
        <span class="photo-r-value">{{ vout.toFixed(3) }}V</span>
      </div>
      <div class="photo-reading">
        <span class="photo-r-label">ADC读数</span>
        <span class="photo-r-value" :class="{ 'photo-r-warn': adcWarn }">{{ adcValue }} / {{ adcMax }}</span>
      </div>
      <div class="photo-reading">
        <span class="photo-r-label">ADC占比</span>
        <span class="photo-r-value" :class="{ 'photo-r-warn': adcWarn }">{{ adcPercent }}%</span>
      </div>
    </div>

    <!-- ADC条 -->
    <div class="photo-adc-bar-container">
      <div class="photo-adc-bar">
        <div class="photo-adc-safe-zone"></div>
        <div class="photo-adc-fill" :style="{ width: adcPercent + '%', background: adcWarn ? 'var(--danger)' : 'var(--primary)' }"></div>
      </div>
      <div class="photo-adc-labels">
        <span>0</span>
        <span class="photo-safe-label">安全区(15%~85%)</span>
        <span>{{ adcMax }}</span>
      </div>
    </div>

    <!-- 光照等级 -->
    <div class="photo-level">
      <span>当前环境: {{ lightLevel }}</span>
      <span :class="{ 'photo-good-res': dynamicRange >= 50 }">
        {{ dynamicRange >= 50 ? '✅ 动态范围充足' : '⚠️ 动态范围不足' }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  simResult: { type: Object, default: null }
})

const luxLevel = computed(() => props.simResult?.luxLevel ?? 100)
const rphotoDisplay = computed(() => props.simResult?.rphotoK || '—')
const vout = computed(() => props.simResult?.Vout || 0)
const adcValue = computed(() => props.simResult?.adcValue || 0)
const adcMax = computed(() => props.simResult?.adcMax || 4095)
const adcPercent = computed(() => parseFloat(props.simResult?.adcPercent) || 0)
const dynamicRange = computed(() => props.simResult?.dynamicRange || 0)

const luxPercent = computed(() => {
  return Math.min(100, (Math.log10(luxLevel.value) / Math.log10(1000)) * 100)
})

const adcWarn = computed(() => adcPercent.value > 85 || adcPercent.value < 15)
const rWarn = computed(() => {
  const r = props.simResult?.Rphoto
  return r < 100 || r > 500000
})

const lightLevel = computed(() => {
  const l = luxLevel.value
  if (l < 10) return '🌙 深暗'
  if (l < 50) return '🌆 黄昏/暗光'
  if (l < 200) return '💡 室内照明'
  if (l < 500) return '☀️ 明亮室内'
  return '🌞 日光直射'
})
</script>

<style scoped>
.photo-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 0;
}
.photo-formula {
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
.photo-lux-display {
  padding: 4px 0;
}
.photo-lux-bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.photo-lux-track {
  position: relative;
  height: 20px;
  background: linear-gradient(90deg, #2c3e50, #8e44ad, #f39c12, #f1c40f);
  border-radius: 10px;
  opacity: 0.3;
}
.photo-lux-fill {
  position: absolute;
  height: 100%;
  background: linear-gradient(90deg, #2c3e50, #8e44ad, #f39c12, #f1c40f);
  border-radius: 10px;
  opacity: 0.6;
  transition: width 0.3s;
}
.photo-lux-marker {
  position: absolute;
  top: -8px;
  transform: translateX(-50%);
}
.photo-lux-val {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--primary);
  white-space: nowrap;
}
.photo-lux-range {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-dim);
}
.photo-readings {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.photo-reading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--surface-light);
  border-radius: 8px;
  padding: 8px 12px;
}
.photo-r-label {
  font-size: 11px;
  color: var(--text-dim);
}
.photo-r-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary);
  font-family: monospace;
}
.photo-r-warn {
  color: var(--danger);
}
.photo-adc-bar-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.photo-adc-bar {
  position: relative;
  height: 16px;
  background: var(--surface-light);
  border-radius: 4px;
  overflow: hidden;
}
.photo-adc-safe-zone {
  position: absolute;
  left: 15%;
  width: 70%;
  height: 100%;
  background: rgba(46, 204, 113, 0.15);
}
.photo-adc-fill {
  position: absolute;
  height: 100%;
  transition: all 0.3s;
  border-radius: 4px;
}
.photo-adc-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-dim);
}
.photo-safe-label { color: var(--success); }
.photo-level {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-dim);
  font-family: monospace;
}
.photo-good-res { color: var(--success); }
</style>
