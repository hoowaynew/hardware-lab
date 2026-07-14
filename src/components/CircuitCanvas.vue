<template>
  <div class="circuit-canvas">
    <svg :viewBox="`0 0 ${width} ${height}`" :width="width" :height="height" class="circuit-svg">
      <!-- 连线 -->
      <g class="wires">
        <line
          v-for="(wire, i) in renderedWires"
          :key="'wire-' + i"
          :x1="wire.x1" :y1="wire.y1"
          :x2="wire.x2" :y2="wire.y2"
          :class="['wire', { 'wire-error': wire.hasError }]"
          :stroke="wire.hasError ? '#e74c3c' : '#555'"
          stroke-width="2"
        />
      </g>

      <!-- 元件 -->
      <g
        v-for="comp in renderedComponents"
        :key="comp.id"
        :transform="`translate(${comp.x - comp.width/2}, ${comp.y - comp.height/2})`"
        :class="['component', { 'component-error': comp.hasError, 'component-burned': comp.state === 'burned' }]"
        @click="$emit('component-click', comp)"
      >
        <!-- 元件形状 -->
        <ComponentShape
          :type="comp.type"
          :width="comp.width"
          :height="comp.height"
          :color="comp.color"
          :state="comp.state"
          :brightness="comp.brightness"
        />

        <!-- 标签 -->
        <text
          :x="comp.width / 2"
          :y="comp.height + 14"
          text-anchor="middle"
          class="component-label"
        >{{ comp.label }}</text>

        <!-- 状态指示 -->
        <text
          v-if="comp.currentText"
          :x="comp.width / 2"
          :y="-4"
          text-anchor="middle"
          :class="['component-current', { 'text-danger': comp.hasError }]"
        >{{ comp.currentText }}</text>
      </g>

      <!-- 冒烟动画 -->
      <SmokeAnimation
        v-for="comp in smokeComponents"
        :key="'smoke-' + comp.id"
        :x="comp.x"
        :y="comp.y"
      />
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ComponentShape from './ComponentShape.vue'
import SmokeAnimation from './SmokeAnimation.vue'

const props = defineProps({
  canvas: { type: Object, default: () => ({}) },
  simResult: { type: Object, default: null },
  errors: { type: Array, default: () => [] }
})

defineEmits(['component-click'])

const width = computed(() => props.canvas?.width || 400)
const height = computed(() => props.canvas?.height || 200)

const pinPositions = {
  'power.+'  : { dx: 10, dy: 20 },
  'power.-'  : { dx: 50, dy: 20 },
  'ground.gnd': { dx: 20, dy: 5 },
  'resistor.1': { dx: 0, dy: 12 },
  'resistor.2': { dx: 60, dy: 12 },
  'led.anode'  : { dx: 0, dy: 18 },
  'led.cathode': { dx: 36, dy: 18 },
  'capacitor.1': { dx: 0, dy: 15 },
  'capacitor.2': { dx: 36, dy: 15 },
  'buzzer.+'   : { dx: 0, dy: 18 },
  'buzzer.-'   : { dx: 36, dy: 18 },
  'motor.+'    : { dx: 0, dy: 20 },
  'motor.-'    : { dx: 40, dy: 20 },
  'diode.anode'  : { dx: 0, dy: 10 },
  'diode.cathode': { dx: 40, dy: 10 }
}

function getPinPos(compId, pin, comp) {
  const key = `${comp.type}.${pin}`
  const offset = pinPositions[key] || { dx: 0, dy: 0 }
  return {
    x: comp.x - (comp._w || 40) / 2 + offset.dx,
    y: comp.y - (comp._h || 30) / 2 + offset.dy
  }
}

const componentSizes = {
  power: { w: 60, h: 40 },
  ground: { w: 40, h: 30 },
  resistor: { w: 60, h: 24 },
  led: { w: 36, h: 36 },
  capacitor: { w: 36, h: 30 },
  buzzer: { w: 36, h: 36 },
  motor: { w: 40, h: 40 },
  diode: { w: 40, h: 20 },
  gpio: { w: 50, h: 50 },
  pwm: { w: 50, h: 50 },
  probe: { w: 30, h: 30 },
  'capacitor-charge': { w: 50, h: 50 },
  'transistor-switch': { w: 50, h: 50 },
  'rc-filter': { w: 50, h: 50 },
  'i2c-bus': { w: 50, h: 50 },
  'ntc-sensor': { w: 50, h: 50 },
  'pcb-trace': { w: 50, h: 50 },
  'wifi-link': { w: 50, h: 50 },
  'logic-analyzer': { w: 50, h: 50 }
}

const renderedComponents = computed(() => {
  if (!props.canvas?.components) return []
  const errorCompIds = new Set(props.errors.map(e => e.componentId))

  return props.canvas.components.map(comp => {
    const size = componentSizes[comp.type] || { w: 40, h: 30 }
    const result = props.simResult?.results?.[comp.id]
    const hasError = errorCompIds.has(comp.id)

    let currentText = ''
    if (result) {
      if (result.current !== undefined && result.current !== null && isFinite(result.current)) {
        currentText = `${result.current.toFixed(1)}mA`
      }
      if (result.voltage !== undefined && typeof result.voltage === 'number') {
        currentText += ` ${result.voltage.toFixed(1)}V`
      }
    }

    return {
      ...comp,
      width: size.w,
      height: size.h,
      _w: size.w,
      _h: size.h,
      state: result?.state || 'normal',
      brightness: result?.brightness,
      hasError,
      currentText: currentText.trim()
    }
  })
})

const renderedWires = computed(() => {
  if (!props.canvas?.wires) return []
  const compMap = new Map(props.canvas.components.map(c => [c.id, c]))

  return props.canvas.wires.map(wire => {
    // Support both array format ["V1+", "R1.1"] and object format {from: "V1.+", to: "R1.1"}
    const fromStr = Array.isArray(wire) ? wire[0] : wire.from
    const toStr = Array.isArray(wire) ? wire[1] : wire.to
    const { compId: fromCompId, pin: fromPin } = parsePin(fromStr)
    const { compId: toCompId, pin: toPin } = parsePin(toStr)

    const fromComp = compMap.get(fromCompId)
    const toComp = compMap.get(toCompId)
    if (!fromComp || !toComp) return null

    const from = getPinPos(fromCompId, fromPin, { ...fromComp, _w: componentSizes[fromComp.type]?.w || 40, _h: componentSizes[fromComp.type]?.h || 30 })
    const to = getPinPos(toCompId, toPin, { ...toComp, _w: componentSizes[toComp.type]?.w || 40, _h: componentSizes[toComp.type]?.h || 30 })

    const errorCompIds = new Set(props.errors.map(e => e.componentId))
    return {
      x1: from.x, y1: from.y,
      x2: to.x, y2: to.y,
      hasError: errorCompIds.has(fromCompId) || errorCompIds.has(toCompId)
    }
  }).filter(Boolean)
})

const smokeComponents = computed(() => {
  if (!props.canvas?.components) return []
  return props.canvas.components.filter(comp => {
    const result = props.simResult?.results?.[comp.id]
    return result?.animation === 'smoke' || result?.state === 'burned'
  })
})

function parsePin(str) {
  if (str.includes('.')) {
    const [compId, pin] = str.split('.')
    return { compId, pin }
  }
  // "V1+" → compId="V1", pin="+"
  const match = str.match(/^([A-Za-z0-9]+)([+\-.a-z0-9]+)$/i)
  if (match) return { compId: match[1], pin: match[2] }
  return { compId: str, pin: '' }
}
</script>

<style scoped>
.circuit-canvas {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 16px;
  overflow: hidden;
}
.circuit-svg {
  display: block;
  margin: 0 auto;
}
.wire {
  transition: stroke 0.3s;
}
.wire-error {
  animation: wire-flash 0.4s ease-in-out infinite alternate;
}
@keyframes wire-flash {
  from { stroke-opacity: 1; }
  to { stroke-opacity: 0.4; }
}
.component {
  cursor: pointer;
  transition: opacity 0.3s;
}
.component-label {
  fill: #aaa;
  font-size: 11px;
  font-family: monospace;
}
.component-current {
  fill: #2ecc71;
  font-size: 10px;
  font-family: monospace;
}
.text-danger {
  fill: #e74c3c !important;
}
.component-burned {
  opacity: 0.3;
  filter: grayscale(1);
}
.component-error {
  animation: component-shake 0.3s ease-in-out;
}
@keyframes component-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}
</style>
