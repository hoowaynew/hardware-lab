<template>
  <div class="pwm-load-view">
    <div v-if="loadType === 'led'" class="load-led">
      <div class="led-visual" :style="ledStyle">
        <div class="led-glow" :style="glowStyle"></div>
        <div class="led-body">💡</div>
      </div>
      <div class="load-info">
        <span>亮度：{{ brightness }}%</span>
        <div class="brightness-bar">
          <div class="brightness-fill" :style="{ width: brightness + '%' }"></div>
        </div>
      </div>
    </div>

    <div v-else-if="loadType === 'servo'" class="load-servo">
      <div class="servo-visual">
        <div class="servo-body">⚙️</div>
        <div class="servo-arm" :style="{ transform: `rotate(${angle}deg)` }">↗</div>
      </div>
      <div class="load-info">
        <span v-if="angle !== null">角度：{{ angle.toFixed(0) }}°</span>
        <span v-else class="load-error">⚙️ 舵机不响应</span>
      </div>
    </div>

    <div v-else-if="loadType === 'buzzer'" class="load-buzzer">
      <div class="buzzer-visual" :class="{ buzzing: isBuzzing }">
        🔊
      </div>
      <div class="load-info">
        <span v-if="isBuzzing">音调：{{ formatFreq }}Hz</span>
        <span v-else>静音</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  loadType: { type: String, default: 'led' },
  simResult: { type: Object, default: null }
})

const brightness = computed(() => {
  if (!props.simResult) return 0
  if (props.simResult.loadState === 'off') return 0
  return Math.round(props.simResult.brightness || 0)
})

const angle = computed(() => {
  if (!props.simResult) return null
  if (props.simResult.loadState === 'error') return null
  return props.simResult.angle ?? null
})

const isBuzzing = computed(() => {
  if (!props.simResult) return false
  return props.simResult.loadState === 'on'
})

const formatFreq = computed(() => {
  const f = props.simResult?.frequency || 0
  return f >= 1000 ? (f / 1000).toFixed(1) + 'k' : f
})

const ledStyle = computed(() => ({
  opacity: brightness.value / 100
}))

const glowStyle = computed(() => ({
  opacity: brightness.value / 100 * 0.6,
  transform: `scale(${0.8 + brightness.value / 100 * 0.6})`
}))
</script>

<style scoped>
.pwm-load-view {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  min-height: 80px;
}
.load-led {
  display: flex;
  align-items: center;
  gap: 16px;
}
.led-visual {
  position: relative;
  font-size: 48px;
  transition: opacity 0.3s;
}
.led-glow {
  position: absolute;
  inset: -20px;
  background: radial-gradient(circle, rgba(255,200,0,0.4), transparent 70%);
  border-radius: 50%;
  transition: all 0.3s;
  pointer-events: none;
}
.led-body { position: relative; z-index: 1; }
.load-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #888;
}
.brightness-bar {
  width: 120px;
  height: 6px;
  background: #2a2a3e;
  border-radius: 3px;
  overflow: hidden;
}
.brightness-fill {
  height: 100%;
  background: linear-gradient(90deg, #f39c12, #fff);
  transition: width 0.3s;
}
.servo-visual {
  position: relative;
  font-size: 48px;
}
.servo-arm {
  position: absolute;
  top: 10px;
  left: 30px;
  font-size: 24px;
  transform-origin: left center;
  transition: transform 0.3s;
}
.load-error {
  color: #e74c3c;
}
.buzzer-visual {
  font-size: 48px;
}
.buzzer-visual.buzzing {
  animation: buzz 0.1s linear infinite;
}
@keyframes buzz {
  0% { transform: translateX(0); }
  50% { transform: translateX(2px); }
  100% { transform: translateX(0); }
}
</style>
