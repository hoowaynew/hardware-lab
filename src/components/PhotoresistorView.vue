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

    <!-- 电路原理图 (光敏电阻分压采集) -->
    <svg class="photo-circuit" viewBox="0 0 320 130">
      <!-- Vcc -->
      <text x="15" y="22" fill="var(--text-dim)" font-size="10">+Vcc = 3.3V</text>
      <circle cx="50" cy="30" r="3" fill="var(--wire)"/>
      <line x1="50" y1="30" x2="50" y2="38" stroke="var(--wire)" stroke-width="2"/>

      <!-- 光敏电阻 (圆形带入射光箭头) -->
      <circle cx="50" cy="52" r="10" fill="none" stroke="#f1c40f" stroke-width="1.5"/>
      <line x1="44" y1="46" x2="56" y2="58" stroke="#f1c40f" stroke-width="1"/>
      <line x1="56" y1="46" x2="44" y2="58" stroke="#f1c40f" stroke-width="1"/>
      <!-- 入射光箭头 -->
      <path d="M30,25 L40,40" stroke="#f1c40f" stroke-width="1.5" fill="none"/>
      <path d="M36,38 L40,40 L37,36" stroke="#f1c40f" stroke-width="1.5" fill="#f1c40f"/>
      <text x="20" y="20" fill="#f1c40f" font-size="8">光</text>
      <text x="68" y="50" fill="#f1c40f" font-size="9">LDR</text>
      <text x="68" y="60" fill="#f1c40f" font-size="8">{{ rphotoDisplay }}</text>

      <line x1="50" y1="42" x2="50" y2="38" stroke="var(--wire)" stroke-width="2"/>
      <line x1="50" y1="62" x2="50" y2="68" stroke="var(--wire)" stroke-width="2"/>

      <!-- Vout节点 -->
      <circle cx="50" cy="68" r="3" fill="var(--wire)"/>

      <!-- ADC 输出 -->
      <line x1="50" y1="68" x2="180" y2="68" stroke="var(--accent)" stroke-width="2"/>
      <rect x="180" y="58" width="40" height="20" rx="3" fill="none" stroke="var(--text)" stroke-width="1.5"/>
      <text x="186" y="72" fill="var(--text)" font-size="9">ADC</text>
      <text x="225" y="72" fill="var(--accent)" font-size="10" font-weight="bold">{{ adcValue }}</text>

      <!-- 节点 → R_fixed -->
      <line x1="50" y1="68" x2="50" y2="74" stroke="var(--wire)" stroke-width="2"/>

      <!-- R_fixed (固定分压电阻) -->
      <path d="M50,74 v3 l-5,3 l10,6 l-10,6 l10,6 l-10,6 l5,3 v3" fill="none" stroke="#e67e22" stroke-width="1.5"/>
      <text x="62" y="92" fill="#e67e22" font-size="9">R_fixed</text>

      <!-- R_fixed → GND -->
      <line x1="50" y1="110" x2="50" y2="118" stroke="var(--wire)" stroke-width="2"/>

      <!-- GND -->
      <line x1="42" y1="118" x2="58" y2="118" stroke="var(--text)" stroke-width="2.5"/>
      <line x1="45" y1="122" x2="55" y2="122" stroke="var(--text)" stroke-width="2"/>
      <line x1="48" y1="126" x2="52" y2="126" stroke="var(--text)" stroke-width="1.5"/>
      <text x="65" y="122" fill="var(--text-dim)" font-size="9">GND</text>
    </svg>

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
.photo-circuit {
  width: 100%;
  max-width: 400px;
  height: auto;
}
</style>
