<template>
  <div class="pwm-load-view">
    <!-- PWM 驱动电路原理图 (通用) -->
    <svg class="pwm-circuit" viewBox="0 0 320 120">
      <!-- MCU PWM 输出 -->
      <rect x="15" y="35" width="45" height="30" rx="3" fill="none" stroke="var(--text)" stroke-width="1.5"/>
      <text x="22" y="48" fill="var(--text-dim)" font-size="8">MCU</text>
      <text x="22" y="58" fill="var(--accent)" font-size="8">PWM</text>

      <!-- PWM 引脚 -->
      <line x1="60" y1="50" x2="80" y2="50" stroke="var(--wire)" stroke-width="2"/>
      <circle cx="80" cy="50" r="3" fill="var(--wire)"/>
      <text x="62" y="44" fill="var(--text-dim)" font-size="7">GP0</text>

      <!-- R_gate 栅极电阻 -->
      <path d="M80,50 h3 l3,-5 l6,10 l6,-10 l6,10 l6,-10 l3,5 h3" fill="none" stroke="#e67e22" stroke-width="1.5"/>
      <text x="88" y="42" fill="#e67e22" font-size="8">Rg</text>

      <!-- 导线 → MOSFET 栅极 -->
      <line x1="122" y1="50" x2="150" y2="50" stroke="var(--wire)" stroke-width="2"/>

      <!-- MOSFET (N沟道, ANSI标准) -->
      <!-- 栅极 -->
      <line x1="150" y1="50" x2="155" y2="50" stroke="var(--wire)" stroke-width="2"/>
      <line x1="155" y1="42" x2="155" y2="58" stroke="var(--text)" stroke-width="2"/>
      <!-- 沟道线 -->
      <line x1="158" y1="40" x2="158" y2="60" stroke="var(--text)" stroke-width="2"/>
      <!-- 漏极 D -->
      <line x1="158" y1="40" x2="170" y2="40" stroke="var(--wire)" stroke-width="2"/>
      <text x="172" y="36" fill="var(--text-dim)" font-size="8">D</text>
      <!-- 源极 S -->
      <line x1="158" y1="60" x2="170" y2="60" stroke="var(--wire)" stroke-width="2"/>
      <text x="172" y="64" fill="var(--text-dim)" font-size="8">S</text>
      <!-- 箭头 (N沟道指向内) -->
      <path d="M155,55 l3,-3 v6 z" fill="var(--text)"/>
      <text x="140" y="36" fill="var(--text-dim)" font-size="7">G</text>

      <!-- 负载 (根据类型显示不同符号) -->
      <line x1="170" y1="40" x2="200" y2="40" stroke="var(--wire)" stroke-width="2"/>

      <!-- LED 负载 -->
      <template v-if="loadType === 'led'">
        <!-- LED 符号 (三角形+线, ANSI) -->
        <path d="M200,34 L210,40 L200,46 Z" fill="none" :stroke="brightness > 0 ? '#f1c40f' : '#888'" stroke-width="1.5"/>
        <line x1="210" y1="34" x2="210" y2="46" :stroke="brightness > 0 ? '#f1c40f' : '#888'" stroke-width="2"/>
        <!-- 发光箭头 -->
        <path d="M212,33 L217,28 M215,34 L220,29" fill="none" :stroke="brightness > 0 ? '#f1c40f' : '#888'" stroke-width="0.8"/>
        <text x="205" y="26" fill="#f1c40f" font-size="8">LED</text>
        <!-- → Vcc -->
        <line x1="210" y1="40" x2="260" y2="40" stroke="var(--wire)" stroke-width="2"/>
        <text x="255" y="35" fill="var(--text-dim)" font-size="9">+Vcc</text>
      </template>

      <!-- 舵机负载 -->
      <template v-else-if="loadType === 'servo'">
        <!-- 舵机符号 (电机M圆圈) -->
        <circle cx="210" cy="40" r="8" fill="none" stroke="var(--text)" stroke-width="1.5"/>
        <text x="207" y="44" fill="var(--text)" font-size="9">M</text>
        <text x="200" y="26" fill="var(--text-dim)" font-size="8">Servo</text>
        <line x1="218" y1="40" x2="260" y2="40" stroke="var(--wire)" stroke-width="2"/>
        <text x="255" y="35" fill="var(--text-dim)" font-size="9">+Vcc</text>
      </template>

      <!-- 蜂鸣器负载 -->
      <template v-else-if="loadType === 'buzzer'">
        <!-- 蜂鸣器符号 (半圆+方框) -->
        <rect x="200" y="32" width="16" height="16" fill="none" stroke="var(--text)" stroke-width="1.5"/>
        <path d="M216,34 q6,6 0,12" fill="none" :stroke="isBuzzing ? '#e74c3c' : '#888'" stroke-width="1.5"/>
        <text x="200" y="26" fill="var(--text-dim)" font-size="8">Buzzer</text>
        <line x1="216" y1="40" x2="260" y2="40" stroke="var(--wire)" stroke-width="2"/>
        <text x="255" y="35" fill="var(--text-dim)" font-size="9">+Vcc</text>
      </template>

      <!-- 源极 → GND -->
      <line x1="170" y1="60" x2="170" y2="85" stroke="var(--wire)" stroke-width="2"/>

      <!-- GND 回路 -->
      <line x1="37" y1="85" x2="170" y2="85" stroke="var(--wire)" stroke-width="2"/>
      <line x1="37" y1="65" x2="37" y2="85" stroke="var(--wire)" stroke-width="2"/>

      <!-- 接地符号 -->
      <line x1="90" y1="85" x2="106" y2="85" stroke="var(--text)" stroke-width="2.5"/>
      <line x1="93" y1="89" x2="103" y2="89" stroke="var(--text)" stroke-width="2"/>
      <line x1="96" y1="93" x2="100" y2="93" stroke="var(--text)" stroke-width="1.5"/>
      <text x="112" y="91" fill="var(--text-dim)" font-size="8">GND</text>
    </svg>

    <!-- 状态信息 -->
    <div class="pwm-load-info">
      <div v-if="loadType === 'led'" class="load-info-row">
        <span class="load-label">LED亮度</span>
        <div class="brightness-bar">
          <div class="brightness-fill" :style="{ width: brightness + '%' }"></div>
        </div>
        <span class="load-val">{{ brightness }}%</span>
      </div>
      <div v-else-if="loadType === 'servo'" class="load-info-row">
        <span class="load-label">舵机角度</span>
        <span class="load-val" v-if="angle !== null">{{ angle.toFixed(0) }}°</span>
        <span class="load-error" v-else>不响应</span>
      </div>
      <div v-else-if="loadType === 'buzzer'" class="load-info-row">
        <span class="load-label">蜂鸣器</span>
        <span class="load-val" v-if="isBuzzing">{{ formatFreq }}Hz</span>
        <span class="load-val" v-else>静音</span>
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
</script>

<style scoped>
.pwm-load-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-height: 80px;
}
.pwm-circuit {
  width: 100%;
  max-width: 400px;
  height: auto;
}
.pwm-load-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}
.load-info-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.load-label {
  color: var(--text-dim);
}
.load-val {
  font-weight: bold;
  color: var(--accent);
}
.load-error {
  color: var(--danger);
}
.brightness-bar {
  width: 100px;
  height: 6px;
  background: var(--btn-bg);
  border-radius: 3px;
  overflow: hidden;
}
.brightness-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--warning), #fff);
  transition: width 0.3s;
}
</style>
