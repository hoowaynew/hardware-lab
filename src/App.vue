<template>
  <div class="app" :class="{ 'embed-mode': isEmbed }">
    <!-- 顶部导航 -->
    <header v-if="!isEmbed" class="app-header">
      <h1>🔬 硬件实验室</h1>
      <nav class="exp-nav">
        <button
          v-for="exp in experimentList"
          :key="exp.id"
          :class="['nav-btn', { active: currentExpId === exp.id }]"
          @click="loadExperiment(exp.id)"
        >{{ exp.icon }} {{ exp.shortTitle }}</button>
      </nav>
    </header>

    <!-- 实验区域 -->
    <main class="experiment-area" v-if="store.currentExperiment">
      <div class="experiment-header">
        <h2 class="experiment-title">{{ store.currentExperiment.title }}</h2>
        <p class="experiment-desc">{{ store.currentExperiment.description }}</p>
        <div class="experiment-meta">
          <span class="meta-tag">{{ categoryLabel }}</span>
          <span class="meta-tag">{{ difficultyLabel }}</span>
        </div>
      </div>

      <!-- LED限流电阻实验布局 -->
      <div v-if="currentExpId === 'led-resistor'" class="experiment-content">
        <CircuitCanvas
          :canvas="store.currentExperiment.canvas"
          :simResult="store.simResult"
          :errors="store.errors"
          @component-click="onComponentClick"
        />
        <InteractionPanel
          :interactions="store.currentExperiment.interactions"
          :userState="store.userState"
          @update="onUserUpdate"
        />
        <div class="status-bar" v-if="statusText">
          <span :class="['status-text', { 'status-error': store.hasError, 'status-ok': !store.hasError }]">
            {{ statusText }}
          </span>
        </div>
      </div>

      <!-- GPIO实验布局 -->
      <div v-else-if="currentExpId === 'gpio-modes'" class="experiment-content gpio-layout">
        <div class="gpio-display">
          <CircuitCanvas
            :canvas="store.currentExperiment.canvas"
            :simResult="store.simResult"
            :errors="store.errors"
          />
          <WaveformView
            wave-type="gpio"
            :gpioState="gpioWaveState"
          />
        </div>
        <InteractionPanel
          :interactions="store.currentExperiment.interactions"
          :userState="store.userState"
          :activeMode="store.userState.gpioMode"
          @update="onUserUpdate"
        />
        <div class="status-bar" v-if="statusText">
          <span :class="['status-text', { 'status-error': store.hasError, 'status-ok': !store.hasError }]">
            {{ statusText }}
          </span>
        </div>
      </div>

      <!-- PWM实验布局 -->
      <div v-else-if="currentExpId === 'pwm-tuner'" class="experiment-content pwm-layout">
        <WaveformView
          wave-type="pwm"
          :frequency="store.userState.pwmFrequency || 1000"
          :dutyCycle="store.userState.pwmDutyCycle !== undefined ? store.userState.pwmDutyCycle : 50"
        />
        <div class="pwm-load-display">
          <PwmLoadView
            :loadType="store.userState.pwmLoad || 'led'"
            :simResult="store.simResult?.results?.PWM1"
          />
        </div>
        <InteractionPanel
          :interactions="store.currentExperiment.interactions"
          :userState="store.userState"
          @update="onUserUpdate"
        />
        <div class="status-bar" v-if="statusText">
          <span :class="['status-text', { 'status-error': store.hasError, 'status-ok': !store.hasError }]">
            {{ statusText }}
          </span>
        </div>
      </div>
    </main>

    <!-- 错误弹窗 -->
    <ErrorPopup
      :visible="showErrorPopup"
      :error="store.currentError"
      @close="showErrorPopup = false"
      @retry="onRetry"
      @read-article="onReadArticle"
    />

    <!-- 成功提示 -->
    <Transition name="toast">
      <div v-if="showSuccessToast" class="success-toast">
        ✅ {{ successMessage }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useExperimentStore } from './stores/experiment.js'
import { useProgressStore } from './stores/progress.js'
import CircuitCanvas from './components/CircuitCanvas.vue'
import InteractionPanel from './components/InteractionPanel.vue'
import ErrorPopup from './components/ErrorPopup.vue'
import WaveformView from './components/WaveformView.vue'
import PwmLoadView from './components/PwmLoadView.vue'

import ledConfig from './experiments/led-resistor.json'
import gpioConfig from './experiments/gpio-modes.json'
import pwmConfig from './experiments/pwm-tuner.json'

const store = useExperimentStore()
const progress = useProgressStore()

const experimentList = [
  { id: 'led-resistor', icon: '💡', shortTitle: '限流电阻', config: ledConfig },
  { id: 'gpio-modes', icon: '📋', shortTitle: 'GPIO模式', config: gpioConfig },
  { id: 'pwm-tuner', icon: '📶', shortTitle: 'PWM调音台', config: pwmConfig }
]

const currentExpId = ref('led-resistor')
const showErrorPopup = ref(false)
const showSuccessToast = ref(false)
const successMessage = ref('')
const isEmbed = ref(new URLSearchParams(window.location.search).has('embed'))

// 加载进度
onMounted(() => {
  progress.load()
  loadExperiment('led-resistor')
})

function loadExperiment(id) {
  const exp = experimentList.find(e => e.id === id)
  if (!exp) return
  currentExpId.value = id
  store.loadExperiment(exp.config)
  showErrorPopup.value = false
}

function onUserUpdate(key, value) {
  store.updateUserState(key, value)
  checkSuccess()
}

function onComponentClick(comp) {
  // 点击电阻切换值
  if (comp.type === 'resistor') {
    const interaction = store.currentExperiment.interactions?.find(i => i.target === comp.id)
    if (interaction) {
      const options = interaction.options || [100, 220, 330, 470, 1000, 10000]
      const key = `${comp.id}_${interaction.property}`
      const currentIdx = options.indexOf(store.userState[key] ?? comp.value)
      const nextIdx = (currentIdx + 1) % options.length
      store.updateUserState(key, options[nextIdx])
      checkSuccess()
    }
  }
}

function onRetry() {
  showErrorPopup.value = false
  // 重置到安全值
  if (currentExpId.value === 'led-resistor') {
    store.updateUserState('R1_value', 330)
  }}

function onReadArticle(articleRef) {
  // 在嵌入模式下可以跳转到文章
  console.log('Read article:', articleRef)
}

function checkSuccess() {
  if (!store.hasError) {
    const expId = currentExpId.value
    if (!progress.completed[expId]) {
      progress.complete(expId, true)
      successMessage.value = '完美通关！无错误完成实验 ⭐⭐⭐'
      showSuccessToast.value = true
      setTimeout(() => { showSuccessToast.value = false }, 2500)
    } else if (!progress.completed[expId]?.firstErrorFree) {
      progress.complete(expId, true)
      successMessage.value = '完美通关！首次无错误 ⭐⭐⭐'
      showSuccessToast.value = true
      setTimeout(() => { showSuccessToast.value = false }, 2500)
    }
  }
}

// 监听错误，自动弹窗
watch(() => store.errors, (errors) => {
  if (errors.length > 0) {
    showErrorPopup.value = true
    // 记录进度（有错误也算完成，但只有1星）
    if (!progress.completed[currentExpId.value]) {
      progress.complete(currentExpId.value, false)
    }
  }
}, { deep: true })

const categoryLabel = computed(() => {
  const map = { power: '⚡ 电源', stm32: '📋 STM32', timing: '⏱️ 定时' }
  return map[store.currentExperiment?.category] || ''
})

const difficultyLabel = computed(() => {
  const map = { beginner: '🟢 入门', intermediate: '🟡 进阶', advanced: '🔴 高级' }
  return map[store.currentExperiment?.difficulty] || ''
})

const statusText = computed(() => {
  if (!store.simResult) return ''
  if (store.hasError) return store.currentError?.title
  const results = store.simResult.results
  if (currentExpId.value === 'led-resistor') {
    const led = results.D1
    if (led?.state === 'on') return `✅ LED正常发光 | 电流 ${led.current?.toFixed(1)}mA | 亮度 ${led.brightness?.toFixed(0)}%`
    if (led?.state === 'dim') return `LED微亮 | 电流 ${led.current?.toFixed(1)}mA`
  }
  if (currentExpId.value === 'gpio-modes') {
    const gpio = results.PA0
    if (gpio?.state === 'unstable') return '⚠️ 引脚电平不稳定'
    return '✅ GPIO配置正常'
  }
  if (currentExpId.value === 'pwm-tuner') {
    const pwm = results.PWM1
    if (pwm?.loadState === 'error') return '⚠️ 负载异常'
    if (pwm?.loadState === 'running') return `✅ ${pwm.loadType} 正常工作`
    return `✅ PWM信号正常`
  }
  return '✅ 实验运行中'
})

const gpioWaveState = computed(() => {
  const gpio = store.simResult?.results?.PA0
  if (!gpio) return 'stable-high'
  const stateMap = {
    unstable: 'unstable',
    'stable-high': 'stable-high',
    'stable-low': 'stable-low',
    analog: 'analog',
    short: 'unstable'
  }
  return stateMap[gpio.state] || 'stable-high'
})
</script>

<style>
:root {
  --bg: #0f0f1e;
  --surface: #1a1a2e;
  --surface-light: #252539;
  --primary: #3498db;
  --primary-dark: #2980b9;
  --success: #2ecc71;
  --danger: #e74c3c;
  --warning: #f39c12;
  --text: #e0e0e0;
  --text-dim: #888;
  --border: #333;
  --radius: 12px;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.app {
  max-width: 600px;
  margin: 0 auto;
  min-height: 100vh;
  padding: 16px;
}
.app.embed-mode {
  padding: 8px;
}

.app-header {
  text-align: center;
  margin-bottom: 16px;
}
.app-header h1 {
  font-size: 20px;
  color: var(--text);
  margin-bottom: 8px;
}
.exp-nav {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
}
.nav-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-dim);
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.nav-btn.active {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: #fff;
  border-color: var(--primary);
}

.experiment-area {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 16px;
}
.experiment-header {
  margin-bottom: 16px;
}
.experiment-title {
  font-size: 18px;
  color: var(--text);
  margin-bottom: 4px;
}
.experiment-desc {
  font-size: 13px;
  color: var(--text-dim);
  margin-bottom: 8px;
}
.experiment-meta {
  display: flex;
  gap: 6px;
}
.meta-tag {
  background: var(--surface-light);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  color: var(--text-dim);
}

.experiment-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.gpio-layout .gpio-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pwm-layout {
  gap: 12px;
}
.pwm-load-display {
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
  padding: 12px;
}

.status-bar {
  background: var(--surface-light);
  border-radius: 8px;
  padding: 10px 12px;
  text-align: center;
}
.status-text {
  font-size: 13px;
  font-family: monospace;
}
.status-ok { color: var(--success); }
.status-error { color: var(--danger); }

.success-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, var(--success), #27ae60);
  color: #fff;
  border-radius: 12px;
  padding: 12px 24px;
  font-size: 14px;
  box-shadow: 0 4px 20px rgba(46,204,113,0.3);
  z-index: 200;
}
.toast-enter-active, .toast-leave-active {
  transition: all 0.3s;
}
.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
