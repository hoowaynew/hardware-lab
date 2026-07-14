<template>
  <div v-if="visible" class="lp-overlay" @click.self="$emit('close')">
    <div class="lp-modal">
      <button class="lp-close" @click="$emit('close')">✕</button>
      <h3 class="lp-title">🛤️ 学习路径</h3>
      <p class="lp-subtitle">推荐学习顺序 · 循序渐进掌握硬件核心</p>

      <!-- Path overview -->
      <div class="lp-overview">
        <div class="lp-stat">
          <span class="lp-stat-val">{{ completedInPath }}/{{ pathSteps.length }}</span>
          <span class="lp-stat-label">已完成</span>
        </div>
        <div class="lp-stat">
          <span class="lp-stat-val">{{ currentStepIndex + 1 }}</span>
          <span class="lp-stat-label">当前步骤</span>
        </div>
        <div class="lp-stat">
          <span class="lp-stat-val">{{ pathPercent }}%</span>
          <span class="lp-stat-label">路径进度</span>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="lp-progress-bar">
        <div class="lp-progress-fill" :style="{ width: pathPercent + '%' }"></div>
      </div>

      <!-- Path steps -->
      <div class="lp-steps">
        <div
          v-for="(step, i) in pathSteps"
          :key="step.id"
          class="lp-step"
          :class="{
            'lp-step-done': isDone(step.id),
            'lp-step-current': i === currentStepIndex,
            'lp-step-locked': i > currentStepIndex && !isDone(step.id)
          }"
        >
          <!-- Connector line -->
          <div v-if="i < pathSteps.length - 1" class="lp-connector"
               :class="{ 'lp-connector-done': isDone(step.id) }"></div>

          <!-- Step indicator -->
          <div class="lp-step-indicator">
            <span v-if="isDone(step.id)" class="lp-check">✓</span>
            <span v-else-if="i === currentStepIndex" class="lp-current-dot">●</span>
            <span v-else class="lp-step-num">{{ i + 1 }}</span>
          </div>

          <!-- Step content -->
          <div class="lp-step-body" @click="startStep(step)">
            <div class="lp-step-header">
              <span class="lp-step-icon">{{ step.icon }}</span>
              <span class="lp-step-name">{{ step.title }}</span>
              <span class="lp-step-phase">{{ step.phase }}</span>
            </div>
            <p class="lp-step-desc">{{ step.desc }}</p>
            <div v-if="step.prerequisite" class="lp-prereq">
              <span class="lp-prereq-label">前置：</span>
              <span class="lp-prereq-name">{{ getPrereqName(step.prerequisite) }}</span>
              <span v-if="isDone(step.prerequisite)" class="lp-prereq-done">✓</span>
              <span v-else class="lp-prereq-undone">⚠</span>
            </div>
          </div>
        </div>
      </div>

      <button v-if="currentStep" class="lp-cta" @click="startStep(currentStep)">
        {{ currentStep.icon }} 继续「{{ currentStep.title }}」
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: Boolean,
  completed: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['close', 'start'])

const pathSteps = [
  { id: 'led-resistor', icon: '💡', title: 'LED限流电阻', phase: '入门', desc: '理解欧姆定律与限流电阻计算——所有电路入门第一课', prerequisite: null },
  { id: 'gpio-modes', icon: '📋', title: 'GPIO八种模式', phase: '入门', desc: '掌握STM32引脚的8种工作模式，理解输入/输出/复用/模拟', prerequisite: 'led-resistor' },
  { id: 'pwm-tuner', icon: '📶', title: 'PWM调音台', phase: '入门', desc: '学习PWM占空比与频率，驱动舵机/LED调光/蜂鸣器', prerequisite: 'gpio-modes' },
  { id: 'button-debounce', icon: '⏱️', title: '按键消抖', phase: '入门', desc: '硬件消抖 vs 软件消抖，理解机械触点抖动原理', prerequisite: 'pwm-tuner' },
  { id: 'voltage-divider', icon: '📐', title: '分压器计算器', phase: '进阶', desc: '分压原理与ADC量程，传感器信号采集的基础', prerequisite: 'pwm-tuner' },
  { id: 'capacitor-charge', icon: '🔋', title: '电容充放电', phase: '进阶', desc: 'τ=RC时间常数，理解电容的储能与释能特性', prerequisite: 'voltage-divider' },
  { id: 'transistor-switch', icon: '🔘', title: '三极管开关', phase: '进阶', desc: '用小电流控制大电流，饱和/截止/放大三区', prerequisite: 'capacitor-charge' },
  { id: 'rc-filter', icon: '〰️', title: 'RC低通滤波器', phase: '进阶', desc: '截止频率fc=1/(2πRC)，信号处理的基石', prerequisite: 'capacitor-charge' },
  { id: 'ntc-thermistor', icon: '🌡️', title: 'NTC热敏电阻测温', phase: '进阶', desc: '温度→阻值→ADC值，完整传感器链路', prerequisite: 'voltage-divider' },
  { id: 'opamp-comparator', icon: '📐', title: '运放比较器+迟滞', phase: '进阶', desc: '比较器原理与迟滞防抖，模拟电路核心', prerequisite: 'transistor-switch' },
  { id: 'dcdc-buck', icon: '⚡', title: 'DC-DC Buck降压', phase: '进阶', desc: '开关电源原理，纹波/效率/占空比分析', prerequisite: 'transistor-switch' },
  { id: 'i2c-signal', icon: '🔗', title: 'I2C通信时序', phase: '通信', desc: 'SDA/SCL协议，START/STOP/ACK握手', prerequisite: 'gpio-modes' },
  { id: 'logic-analyzer-debug', icon: '🐛', title: 'SPI逻辑分析仪', phase: '调试', desc: 'CPOL/CPHA四种模式，逻辑分析仪解码SPI', prerequisite: 'i2c-signal' },
  { id: 'pcb-trace-impedance', icon: '🎨', title: 'PCB走线阻抗', phase: '设计', desc: '50Ω阻抗匹配，微带线计算与信号完整性', prerequisite: 'rc-filter' },
  { id: 'wifi-signal-attenuation', icon: '📡', title: 'WiFi信号衰减', phase: '无线', desc: '链路预算、RSSI、自由空间路径损耗', prerequisite: 'pcb-trace-impedance' },
  { id: 'photoresistor', icon: '💡', title: '光敏电阻测光', phase: '入门', desc: '光照→阻值→ADC，光传感器信号采集', prerequisite: 'ntc-thermistor' },
  { id: 'uart-signal', icon: '🔗', title: 'UART串口通信', phase: '通信', desc: '异步串口时序，波特率与帧格式', prerequisite: 'i2c-signal' },
  { id: 'lc-bandpass', icon: '〰️', title: 'LC带通滤波器', phase: '进阶', desc: '谐振频率f₀=1/(2π√LC)，Q值与带宽', prerequisite: 'rc-filter' }
]

const completedInPath = computed(() => {
  return pathSteps.filter(s => props.completed[s.id]).length
})

const currentStepIndex = computed(() => {
  for (let i = 0; i < pathSteps.length; i++) {
    if (!props.completed[pathSteps[i].id]) return i
  }
  return pathSteps.length - 1
})

const currentStep = computed(() => pathSteps[currentStepIndex.value])

const pathPercent = computed(() => {
  return Math.round(completedInPath.value / pathSteps.length * 100)
})

function isDone(id) {
  return !!props.completed[id]
}

function getPrereqName(id) {
  const step = pathSteps.find(s => s.id === id)
  return step ? step.title : id
}

function startStep(step) {
  emit('start', step.id)
  emit('close')
}
</script>

<style scoped>
.lp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: 16px;
}
.lp-modal {
  background: var(--surface);
  border-radius: 16px;
  padding: 20px;
  max-width: 480px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  position: relative;
}
.lp-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: 50%;
  width: 30px;
  height: 30px;
  cursor: pointer;
  color: var(--text);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lp-title {
  font-size: 18px;
  color: var(--text);
  text-align: center;
  margin-bottom: 4px;
}
.lp-subtitle {
  font-size: 13px;
  color: var(--text-dim);
  text-align: center;
  margin-bottom: 16px;
}
.lp-overview {
  display: flex;
  justify-content: space-around;
  margin-bottom: 8px;
}
.lp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.lp-stat-val {
  font-size: 22px;
  font-weight: 800;
  color: var(--primary);
  font-family: monospace;
}
.lp-stat-label {
  font-size: 11px;
  color: var(--text-dim);
}
.lp-progress-bar {
  height: 8px;
  background: var(--bg);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
}
.lp-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--success));
  transition: width 0.4s;
  border-radius: 4px;
}
.lp-steps {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.lp-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;
  padding-bottom: 4px;
}
.lp-connector {
  position: absolute;
  left: 15px;
  top: 32px;
  width: 2px;
  height: calc(100% - 12px);
  background: var(--border);
}
.lp-connector-done {
  background: var(--success);
}
.lp-step-indicator {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
  z-index: 1;
  background: var(--surface-light);
  border: 2px solid var(--border);
  color: var(--text-dim);
}
.lp-step-done .lp-step-indicator {
  background: var(--success);
  border-color: var(--success);
  color: #fff;
}
.lp-step-current .lp-step-indicator {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
.lp-check { font-size: 16px; }
.lp-current-dot { font-size: 18px; }
.lp-step-num { font-size: 13px; }
.lp-step-body {
  flex: 1;
  cursor: pointer;
  padding: 6px 0;
  border-radius: 8px;
  transition: background 0.2s;
}
.lp-step-body:hover {
  background: var(--surface-light);
  padding: 6px 8px;
}
.lp-step-header {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.lp-step-icon { font-size: 18px; }
.lp-step-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.lp-step-phase {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  background: var(--surface-light);
  color: var(--text-dim);
}
.lp-step-desc {
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 2px;
  line-height: 1.4;
}
.lp-prereq {
  font-size: 11px;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.lp-prereq-label { color: var(--text-dim); }
.lp-prereq-name { color: var(--text); }
.lp-prereq-done { color: var(--success); }
.lp-prereq-undone { color: var(--warning); }
.lp-step-locked .lp-step-body {
  opacity: 0.5;
}
.lp-cta {
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: transform 0.2s;
}
.lp-cta:hover { transform: translateY(-1px); }
</style>
