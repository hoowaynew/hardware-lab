<template>
  <div class="ground-loop-view">
    <div class="formula-bar">
      <span class="formula">EMI ∝ f² × A<sub>loop</sub></span>
      <span class="formula-sep">|</span>
      <span class="formula">A<sub>loop</sub> = L<sub>trace</sub> × L<sub>return</sub></span>
    </div>

    <svg class="pcb-svg" viewBox="0 0 360 220">
      <!-- PCB outline -->
      <rect x="20" y="20" width="320" height="180" rx="4" fill="none" stroke="var(--wire)" stroke-width="1" stroke-dasharray="4,2" opacity="0.5"/>
      <text x="30" y="15" fill="var(--text-dim)" font-size="9">PCB Top Layer</text>

      <!-- Ground plane (changes with type) -->
      <rect v-if="groundType === 'solid'" x="25" y="25" width="310" height="170" fill="var(--accent)" opacity="0.08"/>
      <text v-if="groundType === 'solid'" x="300" y="45" fill="var(--accent)" font-size="8" opacity="0.6">GND Plane</text>

      <!-- Slotted ground -->
      <g v-if="groundType === 'slotted'">
        <rect x="25" y="25" width="310" height="170" fill="var(--accent)" opacity="0.08"/>
        <rect :x="170 - slotWidth/2" y="25" :width="slotWidth" height="170" fill="var(--canvas-bg)"/>
        <line :x1="170 - slotWidth/2" y1="25" :x2="170 - slotWidth/2" y2="195" stroke="var(--error)" stroke-width="1" stroke-dasharray="3,2"/>
        <line :x1="170 + slotWidth/2" y1="25" :x2="170 + slotWidth/2" y2="195" stroke="var(--error)" stroke-width="1" stroke-dasharray="3,2"/>
        <text :x="170" y="200" text-anchor="middle" fill="var(--error)" font-size="8">槽 {{ slotWidth }}mm</text>
      </g>

      <!-- Split ground -->
      <g v-if="groundType === 'split'">
        <rect x="25" y="25" width="145" height="170" fill="var(--accent)" opacity="0.08"/>
        <rect x="190" y="25" width="145" height="170" fill="#f39c12" opacity="0.08"/>
        <line x1="180" y1="25" x2="180" y2="195" stroke="var(--error)" stroke-width="2"/>
        <text x="90" y="45" fill="var(--accent)" font-size="8">GND-A</text>
        <text x="250" y="45" fill="#f39c12" font-size="8">GND-B</text>
      </g>

      <!-- Signal trace (top) -->
      <path :d="signalTracePath" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
      <circle cx="40" cy="50" r="4" fill="var(--accent)"/>
      <text x="40" y="40" fill="var(--accent)" font-size="9">SRC</text>

      <!-- Signal endpoint -->
      <circle cx="320" cy="50" r="4" fill="var(--accent)"/>
      <text x="320" y="40" text-anchor="end" fill="var(--accent)" font-size="9">LOAD</text>
      <text x="180" y="40" text-anchor="middle" :fill="frequency > 300 ? 'var(--error)' : 'var(--text-dim)'" font-size="9">{{ frequency }}MHz</text>

      <!-- Return current path -->
      <path :d="returnPath" fill="none" :stroke="returnColor" stroke-width="2" stroke-dasharray="4,3"/>
      <!-- Current arrows -->
      <g v-if="loopArea > 50">
        <text x="180" :y="returnY + 20" text-anchor="middle" :fill="returnColor" font-size="9">回流路径</text>
      </g>

      <!-- Loop area indicator -->
      <g v-if="loopArea > 50">
        <rect x="40" y="50" :width="280" :height="returnY - 50" fill="var(--error)" opacity="0.06" rx="2"/>
        <text x="180" y="120" text-anchor="middle" fill="var(--error)" font-size="10" font-weight="bold">
          环路面积 = {{ loopArea.toFixed(0) }}mm²
        </text>
      </g>

      <!-- EMI radiation waves -->
      <g v-if="emiLevel > 40">
        <circle cx="180" cy="110" r="30" fill="none" stroke="var(--error)" stroke-width="1" opacity="0.4">
          <animate attributeName="r" values="25;50;25" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        <circle cx="180" cy="110" r="30" fill="none" stroke="var(--error)" stroke-width="1" opacity="0.3">
          <animate attributeName="r" values="35;60;35" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.3;0.05;0.3" dur="1.5s" repeatCount="indefinite"/>
        </circle>
      </g>
    </svg>

    <div class="data-panel">
      <div class="data-row">
        <span class="label">回流路径长度</span>
        <span class="value" :class="{ warn: returnLen > traceLen }">
          {{ returnLen.toFixed(0) }}mm
        </span>
      </div>
      <div class="data-row">
        <span class="label">环路面积</span>
        <span class="value" :class="{ error: loopArea > 200, warn: loopArea > 50 }">
          {{ loopArea.toFixed(0) }}mm²
        </span>
      </div>
      <div class="data-row">
        <span class="label">EMI辐射等级</span>
        <span class="value" :class="{ error: emiLevel > 60, warn: emiLevel > 30 }">
          {{ emiLabel }}
        </span>
      </div>
      <div class="data-row">
        <span class="label">地平面状态</span>
        <span class="value" :class="{ error: groundType !== 'solid' }">
          {{ groundLabel }}
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

const frequency = computed(() => props.simResult?.frequency ?? 100)
const traceLen = computed(() => props.simResult?.traceLen ?? 50)
const groundType = computed(() => props.simResult?.groundType ?? 'solid')
const slotWidth = computed(() => props.simResult?.slotWidth ?? 0)
const loopArea = computed(() => props.simResult?.loopArea ?? 0)
const returnLen = computed(() => props.simResult?.returnLen ?? 50)
const emiLevel = computed(() => props.simResult?.emiLevel ?? 0)

const returnY = computed(() => {
  if (groundType.value === 'solid') return 175
  if (groundType.value === 'slotted' && slotWidth.value > 0) return 185
  return 190 // split
})

const signalTracePath = computed(() => {
  return `M 40 50 L 320 50`
})

const returnPath = computed(() => {
  if (groundType.value === 'solid') {
    // Direct path underneath
    return `M 320 50 L 320 ${returnY.value} L 40 ${returnY.value} L 40 50`
  } else if (groundType.value === 'slotted') {
    // Detour around slot
    const slotL = 170 - slotWidth.value / 2
    const slotR = 170 + slotWidth.value / 2
    return `M 320 50 L 320 ${returnY.value} L ${slotR} ${returnY.value} L ${slotR} 165 L ${slotL} 165 L ${slotL} ${returnY.value} L 40 ${returnY.value} L 40 50`
  } else {
    // Split - must go around the gap
    return `M 320 50 L 320 190 L 180 190 L 180 205 L 40 205 L 40 50`
  }
})

const returnColor = computed(() => {
  if (groundType.value === 'solid') return 'var(--accent)'
  if (emiLevel.value > 40) return 'var(--error)'
  return '#f1c40f'
})

const emiLabel = computed(() => {
  if (emiLevel.value > 60) return '严重超标'
  if (emiLevel.value > 30) return '偏高'
  return '安全'
})

const groundLabel = computed(() => {
  const labels = { solid: '完整', slotted: '有开槽', split: '已分割' }
  return labels[groundType.value] || '未知'
})
</script>

<style scoped>
.ground-loop-view { display: flex; flex-direction: column; gap: 8px; }
.formula-bar {
  display: flex; gap: 8px; flex-wrap: wrap;
  padding: 6px 10px; background: var(--card-bg); border-radius: 6px;
  font-size: 12px; color: var(--text-secondary);
}
.formula { color: var(--accent); font-family: monospace; }
.formula-sep { color: var(--text-dim); }
.pcb-svg {
  width: 100%; max-width: 360px; height: auto;
  background: var(--canvas-bg); border-radius: 8px;
}
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