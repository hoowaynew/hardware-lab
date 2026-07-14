<template>
  <div class="transistor-switch-view">
    <!-- 工作区指示 -->
    <div class="ts-state-badge" :class="stateClass">
      <span class="ts-state-icon">{{ stateIcon }}</span>
      <span class="ts-state-text">{{ stateText }}</span>
    </div>

    <!-- 三极管示意 SVG -->
    <svg class="ts-diagram" viewBox="0 0 300 160">
      <!-- Vcc rail -->
      <line x1="50" y1="20" x2="250" y2="20" stroke="#e74c3c" stroke-width="2" />
      <text x="20" y="15" fill="#e74c3c" font-size="11">Vcc={{ vcc }}V</text>

      <!-- Rc -->
      <rect x="145" y="25" width="10" height="35" fill="none" stroke="#e67e22" stroke-width="2" rx="2" />
      <text x="130" y="45" fill="#e67e22" font-size="10">Rc={{ rc }}Ω</text>

      <!-- wires to collector -->
      <line x1="150" y1="25" x2="150" y2="20" stroke="#888" stroke-width="1.5" />
      <line x1="150" y1="60" x2="150" y2="75" stroke="#888" stroke-width="1.5" />

      <!-- NPN transistor body (circle) -->
      <circle cx="150" cy="95" r="20" fill="none" stroke="#34495e" stroke-width="2" />

      <!-- Base bar -->
      <line x1="138" y1="95" x2="148" y2="95" stroke="#34495e" stroke-width="3" />

      <!-- Collector line -->
      <line x1="150" y1="75" x2="150" y2="85" stroke="#34495e" stroke-width="2" />

      <!-- Emitter line with arrow -->
      <line x1="150" y1="95" x2="162" y2="110" stroke="#34495e" stroke-width="2" />
      <polygon points="162,110 156,106 158,112" fill="#34495e" />

      <!-- Base wire -->
      <line x1="138" y1="95" x2="80" y2="95" stroke="#888" stroke-width="1.5" />

      <!-- Rb -->
      <rect x="60" y="80" width="10" height="30" fill="none" stroke="#e67e22" stroke-width="2" rx="2" />
      <text x="40" y="98" fill="#e67e22" font-size="10">Rb={{ rb }}Ω</text>

      <!-- Input -->
      <line x1="65" y1="80" x2="65" y2="50" stroke="#888" stroke-width="1.5" />
      <text x="50" y="45" :fill="inputHigh ? '#2ecc71' : '#888'" font-size="11">{{ inputHigh ? 'HIGH' : 'LOW' }}</text>

      <!-- GND -->
      <line x1="162" y1="110" x2="162" y2="135" stroke="#888" stroke-width="1.5" />
      <line x1="150" y1="135" x2="174" y2="135" stroke="#333" stroke-width="2" />
      <line x1="155" y1="140" x2="169" y2="140" stroke="#333" stroke-width="1.5" />
      <line x1="159" y1="145" x2="165" y2="145" stroke="#333" stroke-width="1" />
      <text x="180" y="140" fill="#888" font-size="10">GND</text>

      <!-- Current flow animation -->
      <g v-if="state === 'saturation' || state === 'active'">
        <circle r="3" :fill="state === 'saturation' ? '#2ecc71' : '#f39c12'">
          <animateMotion dur="1.5s" repeatCount="indefinite"
            path="M 150,25 L 150,75 L 150,85 M 150,85 L 150,95 L 162,110 L 162,135" />
        </circle>
      </g>

      <!-- Vce label -->
      <text x="200" y="95" fill="#3498db" font-size="11">Vce={{ vce.toFixed(2) }}V</text>
    </svg>

    <!-- 数据面板 -->
    <div class="ts-data-grid">
      <div class="ts-data-item">
        <span class="ts-data-label">Ib</span>
        <span class="ts-data-value" :class="{ 'ts-warn': ib > 20 }">{{ ib.toFixed(2) }}mA</span>
      </div>
      <div class="ts-data-item">
        <span class="ts-data-label">Ic</span>
        <span class="ts-data-value" :class="{ 'ts-warn': ic > 500 }">{{ ic.toFixed(1) }}mA</span>
      </div>
      <div class="ts-data-item">
        <span class="ts-data-label">β</span>
        <span class="ts-data-value">{{ beta }}</span>
      </div>
      <div class="ts-data-item">
        <span class="ts-data-label">P</span>
        <span class="ts-data-value" :class="{ 'ts-warn': power > 500 }">{{ power.toFixed(0) }}mW</span>
      </div>
    </div>

    <!-- 工作区说明 -->
    <div class="ts-region-info">
      <div class="ts-region" :class="{ active: state === 'cutoff' }">
        <span>截止区</span>
        <small>Vbe &lt; 0.7V, 开关OFF</small>
      </div>
      <div class="ts-region" :class="{ active: state === 'active' }">
        <span>放大区</span>
        <small>Ic = β × Ib</small>
      </div>
      <div class="ts-region" :class="{ active: state === 'saturation' }">
        <span>饱和区</span>
        <small>Vce ≈ 0.2V, 开关ON</small>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  simResult: { type: Object, default: null }
})

const state = computed(() => props.simResult?.state ?? 'cutoff')
const ib = computed(() => props.simResult?.baseCurrent ?? 0)
const ic = computed(() => props.simResult?.collectorCurrent ?? 0)
const vce = computed(() => props.simResult?.vce ?? 0)
const power = computed(() => props.simResult?.power ?? 0)
const beta = computed(() => props.simResult?.beta ?? 100)
const rb = computed(() => props.simResult?.baseResistor ?? 1000)
const rc = computed(() => props.simResult?.collectorResistor ?? 220)
const vcc = computed(() => props.simResult?.vcc ?? 5)
const inputHigh = computed(() => props.simResult?.inputHigh ?? false)

const stateIcon = computed(() => {
  if (state.value === 'saturation') return '🟢'
  if (state.value === 'active') return '🟡'
  return '🔴'
})

const stateText = computed(() => {
  if (state.value === 'saturation') return '饱和区 (开关ON)'
  if (state.value === 'active') return '放大区 (线性)'
  return '截止区 (开关OFF)'
})

const stateClass = computed(() => {
  if (state.value === 'saturation') return 'ts-sat'
  if (state.value === 'active') return 'ts-active'
  return 'ts-cutoff'
})
</script>

<style scoped>
.transistor-switch-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ts-state-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  align-self: flex-start;
}
.ts-state-badge.ts-sat { background: rgba(46, 204, 113, 0.15); color: var(--success); }
.ts-state-badge.ts-active { background: rgba(243, 156, 18, 0.15); color: var(--warning); }
.ts-state-badge.ts-cutoff { background: rgba(231, 76, 60, 0.15); color: var(--danger); }
.ts-diagram {
  width: 100%;
  max-width: 300px;
  height: auto;
  margin: 0 auto;
}
.ts-data-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.ts-data-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--surface-light);
  border-radius: 6px;
  padding: 6px 4px;
}
.ts-data-label {
  font-size: 10px;
  color: var(--text-dim);
}
.ts-data-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  font-family: monospace;
}
.ts-warn { color: var(--danger) !important; }
.ts-region-info {
  display: flex;
  gap: 6px;
}
.ts-region {
  flex: 1;
  text-align: center;
  padding: 6px;
  border-radius: 6px;
  background: var(--surface-light);
  font-size: 12px;
  opacity: 0.5;
  transition: all 0.2s;
}
.ts-region.active {
  opacity: 1;
  background: var(--primary);
  color: #fff;
}
.ts-region small {
  display: block;
  font-size: 9px;
  opacity: 0.8;
  margin-top: 2px;
}
</style>
