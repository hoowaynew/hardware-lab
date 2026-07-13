<template>
  <div class="waveform-view">
    <svg :viewBox="`0 0 ${viewW} ${viewH}`" :width="width" :height="height" class="wave-svg">
      <!-- 网格 -->
      <defs>
        <pattern id="grid" :width="gridSize" :height="gridSize" patternUnits="userSpaceOnUse">
          <path :d="`M ${gridSize} 0 L 0 0 0 ${gridSize}`" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      <!-- 中线 -->
      <line :x1="0" :y1="viewH/2" :x2="viewW" :y2="viewH/2" stroke="rgba(255,255,255,0.1)" stroke-dasharray="4 4"/>

      <!-- PWM方波 -->
      <polyline
        v-if="waveType === 'pwm'"
        :points="pwmPoints"
        fill="none"
        stroke="#3498db"
        stroke-width="2"
      />
      <!-- PWM填充 -->
      <polygon
        v-if="waveType === 'pwm'"
        :points="pwmFillPoints"
        fill="rgba(52,152,219,0.1)"
      />

      <!-- GPIO波形 -->
      <polyline
        v-if="waveType === 'gpio'"
        :points="gpioPoints"
        fill="none"
        :stroke="gpioColor"
        stroke-width="2"
      />

      <!-- 标签 -->
      <text x="8" y="16" fill="#666" font-size="10">V</text>
      <text x="8" :y="viewH - 6" fill="#666" font-size="10">0</text>
      <text :x="viewW - 20" :y="viewH - 6" fill="#666" font-size="10">t</text>
    </svg>
    <div v-if="info" class="waveform-info">{{ info }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  waveType: { type: String, default: 'pwm' }, // 'pwm' | 'gpio'
  frequency: { type: Number, default: 1000 },
  dutyCycle: { type: Number, default: 50 },
  gpioState: { type: String, default: 'stable-high' },
  width: { type: Number, default: 380 },
  height: { type: Number, default: 100 }
})

const viewW = 380
const viewH = 100
const gridSize = 20

const info = computed(() => {
  if (props.waveType === 'pwm') {
    const freq = props.frequency >= 1000 ? `${(props.frequency / 1000).toFixed(1)}kHz` : `${props.frequency}Hz`
    const period = (1000 / props.frequency).toFixed(2)
    const highTime = (period * props.dutyCycle / 100).toFixed(2)
    return `${freq} | 周期${period}ms | 高电平${highTime}ms | 占空比${props.dutyCycle}%`
  }
  if (props.waveType === 'gpio') {
    const stateInfo = {
      unstable: '⚠️ 电平不稳定',
      'stable-high': '✅ 稳定高电平 3.3V',
      'stable-low': '✅ 稳定低电平 0V',
      analog: '📊 模拟电压 1.65V'
    }
    return stateInfo[props.gpioState] || props.gpioState
  }
  return ''
})

// PWM波形点
const pwmPoints = computed(() => {
  const points = []
  const periods = 4 // 显示4个周期
  const periodW = viewW / periods
  const highW = periodW * props.dutyCycle / 100
  const highY = 15
  const lowY = viewH - 15

  for (let i = 0; i < periods; i++) {
    const x0 = i * periodW
    const x1 = x0 + highW
    const x2 = x0 + periodW

    if (i === 0) points.push(`${x0},${lowY}`)
    // 上升沿
    points.push(`${x0},${highY}`)
    points.push(`${x1},${highY}`)
    // 下降沿
    points.push(`${x1},${lowY}`)
    points.push(`${x2},${lowY}`)
  }

  return points.join(' ')
})

const pwmFillPoints = computed(() => {
  return pwmPoints.value + ` ${viewW},${viewH} 0,${viewH}`
})

// GPIO波形
const gpioPoints = computed(() => {
  const points = []
  const highY = 15
  const lowY = viewH - 15
  const midY = viewH / 2

  if (props.gpioState === 'unstable') {
    // 随机抖动
    let y = midY
    for (let x = 0; x <= viewW; x += 4) {
      y = midY + Math.sin(x * 0.3) * 25 + (Math.random() - 0.5) * 15
      y = Math.max(highY, Math.min(lowY, y))
      points.push(`${x},${y.toFixed(1)}`)
    }
  } else if (props.gpioState === 'stable-high') {
    points.push(`0,${highY}`, `${viewW},${highY}`)
  } else if (props.gpioState === 'stable-low') {
    points.push(`0,${lowY}`, `${viewW},${lowY}`)
  } else if (props.gpioState === 'analog') {
    points.push(`0,${midY}`, `${viewW},${midY}`)
  } else {
    points.push(`0,${midY}`, `${viewW},${midY}`)
  }

  return points.join(' ')
})

const gpioColor = computed(() => {
  if (props.gpioState === 'unstable') return '#e74c3c'
  if (props.gpioState === 'stable-high') return '#2ecc71'
  if (props.gpioState === 'stable-low') return '#2ecc71'
  return '#3498db'
})
</script>

<style scoped>
.waveform-view {
  background: #0d0d1a;
  border-radius: 8px;
  padding: 8px;
}
.wave-svg {
  display: block;
}
.waveform-info {
  color: #888;
  font-size: 11px;
  text-align: center;
  margin-top: 4px;
  font-family: monospace;
}
</style>
