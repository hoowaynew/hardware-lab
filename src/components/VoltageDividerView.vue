<template>
  <div class="voltage-divider-view">
    <div class="vd-formula">
      <span class="formula-text">Vout = Vin × R2 / (R1 + R2)</span>
    </div>

    <!-- 电路原理图 -->
    <svg class="vd-circuit" viewBox="0 0 320 160">
      <!-- Vin 电源 -->
      <text x="45" y="14" fill="var(--text-dim)" font-size="10">Vin = {{ vin }}V</text>
      <line x1="80" y1="20" x2="80" y2="30" stroke="var(--wire)" stroke-width="2"/>
      <text x="70" y="28" fill="var(--text-dim)" font-size="8">+</text>

      <!-- 导线 Vin → R1 -->
      <line x1="80" y1="30" x2="80" y2="35" stroke="var(--wire)" stroke-width="2"/>

      <!-- R1 电阻 (ANSI zigzag) -->
      <path d="M80,35 v3 l-5,3 l10,6 l-10,6 l10,6 l-10,6 l5,3 v3" fill="none" stroke="#e67e22" stroke-width="1.5"/>
      <text x="100" y="58" fill="#e67e22" font-size="10">R1 = {{ formatR(r1) }}</text>

      <!-- 导线 R1 → Vout节点 -->
      <line x1="80" y1="74" x2="80" y2="85" stroke="var(--wire)" stroke-width="2"/>

      <!-- Vout 抽取节点 (junction dot) -->
      <circle cx="80" cy="85" r="3" fill="var(--wire)"/>

      <!-- Vout 输出连线 -->
      <line x1="80" y1="85" x2="180" y2="85" stroke="var(--accent)" stroke-width="2"/>
      <circle cx="180" cy="85" r="3" fill="var(--accent)"/>
      <text x="188" y="89" fill="var(--accent)" font-size="11" font-weight="bold">Vout = {{ vout.toFixed(2) }}V</text>

      <!-- 导线 Vout节点 → R2 -->
      <line x1="80" y1="85" x2="80" y2="90" stroke="var(--wire)" stroke-width="2"/>

      <!-- R2 电阻 (ANSI zigzag) -->
      <path d="M80,90 v3 l-5,3 l10,6 l-10,6 l10,6 l-10,6 l5,3 v3" fill="none" stroke="#e67e22" stroke-width="1.5"/>
      <text x="100" y="115" fill="#e67e22" font-size="10">R2 = {{ formatR(r2) }}</text>

      <!-- 导线 R2 → GND -->
      <line x1="80" y1="129" x2="80" y2="138" stroke="var(--wire)" stroke-width="2"/>

      <!-- 接地符号 -->
      <line x1="72" y1="138" x2="88" y2="138" stroke="var(--wire)" stroke-width="2.5"/>
      <line x1="75" y1="142" x2="85" y2="142" stroke="var(--wire)" stroke-width="2"/>
      <line x1="78" y1="146" x2="82" y2="146" stroke="var(--wire)" stroke-width="1.5"/>
      <text x="95" y="143" fill="var(--text-dim)" font-size="9">GND</text>

      <!-- 电流方向标注 -->
      <text x="60" y="58" fill="var(--text-dim)" font-size="8">I = {{ current.toFixed(2) }}mA</text>
      <path d="M65,63 L65,120" fill="none" stroke="var(--text-dim)" stroke-width="0.5" stroke-dasharray="2,2" opacity="0.3"/>
    </svg>

    <div class="vd-result">
      <div class="vd-value" :class="{ 'vd-warn': isOvervoltage }">
        <span class="vd-label">Vout</span>
        <span class="vd-number">{{ vout.toFixed(2) }}</span>
        <span class="vd-unit">V</span>
      </div>
      <div class="vd-meta">
        <span>Vin = {{ vin }}V</span>
        <span>R1 = {{ formatR(r1) }}</span>
        <span>R2 = {{ formatR(r2) }}</span>
      </div>
    </div>
    <div class="vd-bar-container">
      <div class="vd-bar-label">
        <span>0V</span>
        <span class="vd-adc-limit">3.3V (ADC限值)</span>
        <span>{{ vin }}V</span>
      </div>
      <div class="vd-bar">
        <div class="vd-adc-zone" :style="{ width: (3.3 / vin * 100) + '%' }"></div>
        <div class="vd-bar-fill" :style="{ width: (vout / vin * 100) + '%', background: isOvervoltage ? 'var(--danger)' : 'var(--primary)' }"></div>
        <div class="vd-bar-marker" :style="{ left: (3.3 / vin * 100) + '%' }"></div>
      </div>
    </div>
    <div class="vd-current">
      <span>I = Vin / (R1+R2) = {{ current.toFixed(2) }}mA</span>
      <span>P = {{ power.toFixed(1) }}mW</span>
      <span v-if="isHighPower" class="vd-power-warn">功耗偏高!</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  simResult: { type: Object, default: null }
})

const vout = computed(() => {
  if (!props.simResult) return 0
  return props.simResult.vout || 0
})

const vin = computed(() => props.simResult?.vin || 5)
const r1 = computed(() => props.simResult?.r1 || 1000)
const r2 = computed(() => props.simResult?.r2 || 1000)
const current = computed(() => props.simResult?.current || 0)
const power = computed(() => props.simResult?.power || 0)

const isOvervoltage = computed(() => vout.value > 3.3)
const isHighPower = computed(() => power.value > 10)

function formatR(ohms) {
  if (ohms >= 1000) return (ohms / 1000).toFixed(1) + 'kΩ'
  return ohms + 'Ω'
}
</script>

<style scoped>
.voltage-divider-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}
.vd-formula {
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
.vd-result {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.vd-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.vd-label {
  font-size: 13px;
  color: var(--text-dim);
}
.vd-number {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary);
}
.vd-warn .vd-number { color: var(--danger); }
.vd-unit {
  font-size: 14px;
  color: var(--text-dim);
}
.vd-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: var(--text-dim);
  text-align: right;
}
.vd-bar-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.vd-bar-label {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-dim);
}
.vd-adc-limit { color: var(--warning); }
.vd-bar {
  position: relative;
  height: 16px;
  background: var(--surface-light);
  border-radius: 4px;
  overflow: hidden;
}
.vd-adc-zone {
  position: absolute;
  height: 100%;
  background: rgba(46, 204, 113, 0.15);
}
.vd-bar-fill {
  position: absolute;
  height: 100%;
  transition: all 0.3s;
  border-radius: 4px;
}
.vd-bar-marker {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 2px;
  background: var(--warning);
  z-index: 2;
}
.vd-current {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-dim);
  font-family: monospace;
}
.vd-power-warn { color: var(--warning); }
</style>
