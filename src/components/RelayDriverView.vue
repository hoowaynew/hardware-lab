<template>
  <div class="relay-view">
    <div class="formula-bar">
      <span class="formula">I<sub>coil</sub> = V<sub>cc</sub> / R<sub>coil</sub></span>
      <span class="formula-sep">|</span>
      <span class="formula">V<sub>spike</sub> = -L × di/dt</span>
    </div>

    <svg class="relay-svg" viewBox="0 0 360 220">
      <!-- Vcc -->
      <text x="20" y="25" fill="#888" font-size="11">Vcc={{ vcc }}V</text>
      <line x1="30" y1="30" x2="30" y2="50" stroke="var(--wire)" stroke-width="2"/>
      <line x1="20" y1="30" x2="40" y2="30" stroke="var(--wire)" stroke-width="2"/>

      <!-- 线圈 -->
      <rect x="22" y="50" width="16" height="60" rx="2" fill="#3a2a1a" stroke="var(--wire)" stroke-width="1.5"/>
      <!-- 线圈绕组线 -->
      <line x1="22" y1="55" x2="38" y2="60" stroke="var(--wire)" stroke-width="0.8"/>
      <line x1="22" y1="65" x2="38" y2="70" stroke="var(--wire)" stroke-width="0.8"/>
      <line x1="22" y1="75" x2="38" y2="80" stroke="var(--wire)" stroke-width="0.8"/>
      <line x1="22" y1="85" x2="38" y2="90" stroke="var(--wire)" stroke-width="0.8"/>
      <line x1="22" y1="95" x2="38" y2="100" stroke="var(--wire)" stroke-width="0.8"/>
      <text x="50" y="82" fill="var(--text-dim)" font-size="10">R={{ coilR }}Ω</text>
      <text x="50" y="95" fill="var(--text-dim)" font-size="9">L≈0.5H</text>

      <!-- 续流二极管 (反向并联) -->
      <g v-if="hasFlyback">
        <line x1="30" y1="50" x2="60" y2="50" stroke="var(--accent)" stroke-width="1.5"/>
        <line x1="60" y1="50" x2="60" y2="110" stroke="var(--accent)" stroke-width="1.5"/>
        <line x1="60" y1="110" x2="30" y2="110" stroke="var(--accent)" stroke-width="1.5"/>
        <!-- 二极管符号 -->
        <polygon points="55,75 65,75 60,68" fill="var(--accent)"/>
        <line x1="55" y1="68" x2="65" y2="68" stroke="var(--accent)" stroke-width="2"/>
        <text x="68" y="78" fill="var(--accent)" font-size="9">续流</text>
      </g>

      <!-- 线圈下端到三极管C -->
      <line x1="30" y1="110" x2="30" y2="140" stroke="var(--wire)" stroke-width="2"/>

      <!-- 三极管 (NPN) -->
      <g :stroke="state === 'on' ? 'var(--accent)' : '#666'" stroke-width="2" fill="none">
        <circle cx="30" cy="150" r="12" fill="none" stroke="var(--wire)" stroke-width="1"/>
        <line x1="30" y1="140" x2="30" y2="145"/>
        <line x1="30" y1="148" x2="20" y2="155"/>
        <line x1="30" y1="152" x2="40" y2="160"/>
        <polygon points="38,159 42,156 40,162" :fill="state === 'on' ? 'var(--accent)' : '#666'"/>
      </g>
      <text x="48" y="148" fill="#888" font-size="8">C</text>
      <text x="48" y="162" fill="#888" font-size="8">E</text>
      <text x="8" y="158" fill="#888" font-size="8">B</text>

      <!-- Base 驱动 -->
      <line x1="18" y1="155" x2="8" y2="155" stroke="var(--wire)" stroke-width="1.5"/>
      <text x="2" y="150" :fill="state === 'on' ? 'var(--accent)' : '#666'" font-size="9">{{ state === 'on' ? 'ON' : 'OFF' }}</text>

      <!-- 发射极接地 -->
      <line x1="40" y1="160" x2="40" y2="185" stroke="var(--wire)" stroke-width="2"/>
      <line x1="28" y1="185" x2="52" y2="185" stroke="var(--wire)" stroke-width="2.5"/>
      <line x1="32" y1="190" x2="48" y2="190" stroke="var(--wire)" stroke-width="2"/>

      <!-- 状态指示 -->
      <text x="120" y="40" :fill="state === 'on' ? 'var(--accent)' : '#666'" font-size="13" font-weight="bold">
        {{ state === 'on' ? '线圈通电' : '线圈断电' }}
      </text>
      <circle :cx="200" :cy="36" r="6" :fill="state === 'on' ? 'var(--accent)' : '#666'">
        <animate v-if="state === 'on'" attributeName="opacity" values="1;0.5;1" dur="0.8s" repeatCount="indefinite"/>
      </circle>

      <!-- 反电动势尖峰可视化 -->
      <g v-if="flybackActive">
        <!-- 闪电图标 -->
        <path d="M120 80 L110 100 L118 100 L108 120" fill="none" stroke="#e74c3c" stroke-width="2.5" stroke-linecap="round">
          <animate attributeName="opacity" values="0;1;0" dur="0.5s" repeatCount="indefinite"/>
        </path>
        <text x="130" y="90" fill="#e74c3c" font-size="11" font-weight="bold">反电动势!</text>
        <text x="130" y="105" fill="#e74c3c" font-size="10">{{ flybackSpike.toFixed(0) }}V</text>
        <text x="130" y="120" fill="#e74c3c" font-size="9">Vce耐压仅25V</text>
      </g>

      <!-- 续流回路箭头 -->
      <g v-if="hasFlyback && state === 'off'">
        <path d="M45 80 Q55 75 55 70" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="3,2"/>
        <text x="58" y="60" fill="var(--accent)" font-size="9">续流回路</text>
      </g>

      <!-- 线圈电流 -->
      <g v-if="state === 'on'">
        <text x="15" y="75" fill="var(--accent)" font-size="9">{{ coilCurrent.toFixed(0) }}mA</text>
      </g>
    </svg>

    <div class="data-panel">
      <div class="data-row">
        <span class="label">线圈电流</span>
        <span class="value" :class="{ error: coilCurrent > 200 }">{{ coilCurrent.toFixed(1) }}mA</span>
      </div>
      <div class="data-row">
        <span class="label">线圈功耗</span>
        <span class="value">{{ coilPower.toFixed(0) }}mW</span>
      </div>
      <div class="data-row">
        <span class="label">续流二极管</span>
        <span class="value" :style="{ color: hasFlyback ? 'var(--accent)' : '#e74c3c' }">
          {{ hasFlyback ? '已保护 ✓' : '未保护 ✗' }}
        </span>
      </div>
      <div class="data-row">
        <span class="label">反电动势</span>
        <span class="value" :class="{ error: flybackSpike > 25 }">
          {{ flybackActive ? flybackSpike.toFixed(0) + 'V' : '0V (安全)' }}
        </span>
      </div>
      <div class="data-row">
        <span class="label">Vce应力</span>
        <span class="value" :class="{ error: vceStress > vceMax }">
          {{ vceStress.toFixed(0) }}V / {{ vceMax }}V
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

const vcc = computed(() => props.simResult?.vcc ?? 12)
const coilR = computed(() => props.simResult?.coilR ?? 100)
const hasFlyback = computed(() => props.simResult?.hasFlyback ?? true)
const state = computed(() => props.simResult?.state ?? 'on')
const coilCurrent = computed(() => props.simResult?.coilCurrent ?? 0)
const coilPower = computed(() => props.simResult?.coilPower ?? 0)
const flybackSpike = computed(() => props.simResult?.flybackSpike ?? 0)
const vceMax = computed(() => props.simResult?.vceMax ?? 25)
const vceStress = computed(() => props.simResult?.vceStress ?? 0)
const flybackActive = computed(() => props.simResult?.flybackActive ?? false)
</script>

<style scoped>
.relay-view { display: flex; flex-direction: column; gap: 8px; }
.formula-bar {
  display: flex; gap: 8px; flex-wrap: wrap;
  padding: 6px 10px; background: var(--card-bg); border-radius: 6px;
  font-size: 12px; color: var(--text-secondary);
}
.formula { color: var(--accent); font-family: monospace; }
.formula-sep { color: var(--text-dim); }
.relay-svg {
  width: 100%; max-width: 360px; height: auto;
  background: var(--canvas-bg); border-radius: 8px;
}
.data-panel { display: flex; flex-direction: column; gap: 4px; }
.data-row {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 8px; font-size: 13px;
}
.data-row .label { width: 90px; color: var(--text-secondary); }
.data-row .value { font-weight: bold; color: var(--accent); }
.data-row .value.error { color: var(--error); }
</style>
