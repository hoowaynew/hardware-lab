<template>
  <div class="app" :class="{ 'embed-mode': isEmbed }">
    <!-- 顶部导航 -->
    <header v-if="!isEmbed" class="app-header">
      <h1>🔬 硬件实验室</h1>
      <p class="app-subtitle">交互式硬件原理实验平台</p>
    </header>

    <!-- 首页：11分类卡片网格 -->
    <div v-if="!store.currentExperiment && !isEmbed" class="category-grid">
      <div
        v-for="cat in categories"
        :key="cat.id"
        class="category-card"
        :class="{ 'cat-available': cat.available, 'cat-soon': !cat.available }"
        @click="cat.available && selectCategory(cat)"
      >
        <span class="cat-icon">{{ cat.icon }}</span>
        <span class="cat-name">{{ cat.name }}</span>
        <span class="cat-count">{{ cat.available ? cat.experiments.length + '个实验' : '即将上线' }}</span>
      </div>
    </div>

    <!-- 分类下的实验列表 -->
    <div v-if="selectedCategory && !store.currentExperiment && !isEmbed" class="experiment-list">
      <button class="back-btn" @click="goBackToCategories">← 返回分类</button>
      <h2>{{ selectedCategory.icon }} {{ selectedCategory.name }}</h2>
      <div class="exp-cards">
        <div
          v-for="exp in selectedCategory.experiments"
          :key="exp.id"
          class="exp-card"
          @click="loadExperiment(exp.id)"
        >
          <span class="exp-card-icon">{{ exp.icon }}</span>
          <div class="exp-card-info">
            <span class="exp-card-title">{{ exp.shortTitle }}</span>
            <span class="exp-card-desc">{{ exp.desc }}</span>
          </div>
          <span v-if="progress.completed[exp.id]" class="exp-card-done">✓</span>
        </div>
      </div>
    </div>

    <!-- 实验区域 -->
    <main class="experiment-area" v-if="store.currentExperiment">
      <div class="experiment-header">
        <button v-if="!isEmbed" class="back-btn" @click="exitExperiment">← 返回</button>
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

      <!-- 分压器实验布局 -->
      <div v-else-if="currentExpId === 'voltage-divider'" class="experiment-content">
        <CircuitCanvas
          :canvas="store.currentExperiment.canvas"
          :simResult="store.simResult"
          :errors="store.errors"
          @component-click="onComponentClick"
        />
        <VoltageDividerView
          :simResult="dividerSimResult"
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

      <!-- 电容充放电实验布局 -->
      <div v-else-if="currentExpId === 'capacitor-charge'" class="experiment-content">
        <CircuitCanvas
          :canvas="store.currentExperiment.canvas"
          :simResult="store.simResult"
          :errors="store.errors"
        />
        <CapacitorChargeView
          :simResult="store.simResult?.results?.CC1"
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

      <!-- 三极管开关实验布局 -->
      <div v-else-if="currentExpId === 'transistor-switch'" class="experiment-content">
        <CircuitCanvas
          :canvas="store.currentExperiment.canvas"
          :simResult="store.simResult"
          :errors="store.errors"
        />
        <TransistorSwitchView
          :simResult="store.simResult?.results?.TS1"
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
import VoltageDividerView from './components/VoltageDividerView.vue'
import CapacitorChargeView from './components/CapacitorChargeView.vue'
import TransistorSwitchView from './components/TransistorSwitchView.vue'

import ledConfig from './experiments/led-resistor.json'
import gpioConfig from './experiments/gpio-modes.json'
import pwmConfig from './experiments/pwm-tuner.json'
import dividerConfig from './experiments/voltage-divider.json'
import capacitorConfig from './experiments/capacitor-charge.json'
import transistorConfig from './experiments/transistor-switch.json'

const store = useExperimentStore()
const progress = useProgressStore()

const allExperiments = [
  { id: 'led-resistor', icon: '💡', shortTitle: 'LED限流电阻', desc: '计算正确的限流阻值', config: ledConfig },
  { id: 'gpio-modes', icon: '📋', shortTitle: 'GPIO八种模式', desc: '配置STM32引脚模式', config: gpioConfig },
  { id: 'pwm-tuner', icon: '📶', shortTitle: 'PWM调音台', desc: '调节占空比驱动负载', config: pwmConfig },
  { id: 'voltage-divider', icon: '📐', shortTitle: '分压器', desc: 'Vout=Vin×R2/(R1+R2)', config: dividerConfig },
  { id: 'capacitor-charge', icon: '🔋', shortTitle: '电容充放电', desc: 'τ=RC时间常数', config: capacitorConfig },
  { id: 'transistor-switch', icon: '🔘', shortTitle: '三极管开关', desc: '小电流控制大电流', config: transistorConfig }
]

const categories = [
  { id: 'power', icon: '⚡', name: '电源与供电', available: true, experiments: allExperiments.filter(e => e.config.category === 'power') },
  { id: 'stm32', icon: '📋', name: 'STM32/GPIO', available: true, experiments: allExperiments.filter(e => e.config.category === 'stm32') },
  { id: 'timing', icon: '⏱️', name: '定时与PWM', available: true, experiments: allExperiments.filter(e => e.config.category === 'timing') },
  { id: 'analog', icon: '📊', name: '模拟电路', available: true, experiments: allExperiments.filter(e => e.config.category === 'analog') },
  { id: 'circuit', icon: '🔌', name: '电路基础', available: true, experiments: allExperiments.filter(e => e.config.category === 'circuit') },
  { id: 'sensor', icon: '📡', name: '传感器接口', available: false, experiments: [] },
  { id: 'comm', icon: '🔗', name: '通信协议', available: false, experiments: [] },
  { id: 'pcb', icon: '🎨', name: 'PCB设计', available: false, experiments: [] },
  { id: 'signal', icon: '〰️', name: '信号处理', available: false, experiments: [] },
  { id: 'wireless', icon: '📶', name: '无线技术', available: false, experiments: [] },
  { id: 'debug', icon: '🐛', name: '调试技巧', available: false, experiments: [] }
]

const currentExpId = ref(null)
const selectedCategory = ref(null)
const showErrorPopup = ref(false)
const showSuccessToast = ref(false)
const successMessage = ref('')
const isEmbed = ref(new URLSearchParams(window.location.search).has('embed'))

// 加载进度
onMounted(() => {
  progress.load()
  // embed模式下自动加载第一个实验
  if (isEmbed.value) {
    loadExperiment('led-resistor')
  }
})

function selectCategory(cat) {
  if (!cat.available) return
  selectedCategory.value = cat
}

function goBackToCategories() {
  selectedCategory.value = null
}

function exitExperiment() {
  store.currentExperiment = null
  currentExpId.value = null
}

function loadExperiment(id) {
  const exp = allExperiments.find(e => e.id === id)
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
  }
}

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
  const map = {
    power: '⚡ 电源', stm32: '📋 STM32', timing: '⏱️ 定时',
    analog: '📊 模拟', circuit: '🔌 电路'
  }
  return map[store.currentExperiment?.category] || ''
})

const difficultyLabel = computed(() => {
  const map = { beginner: '🟢 入门', intermediate: '🟡 进阶', advanced: '🔴 高级' }
  return map[store.currentExperiment?.difficulty] || ''
})

const dividerSimResult = computed(() => {
  if (currentExpId.value !== 'voltage-divider') return null
  const ctx = store.simResult?.context
  if (!ctx) return null
  return {
    vout: ctx.vout || 0,
    vin: store.currentExperiment?.canvas?.components?.find(c => c.type === 'power')?.voltage || 5,
    r1: ctx.r1 || 1000,
    r2: ctx.r2 || 1000,
    current: ctx.current || 0,
    power: ctx.power || 0
  }
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
  if (currentExpId.value === 'voltage-divider') {
    const ctx = store.simResult.context
    return `✅ Vout = ${(ctx?.vout || 0).toFixed(2)}V | I = ${(ctx?.current || 0).toFixed(2)}mA`
  }
  if (currentExpId.value === 'capacitor-charge') {
    const cc = results.CC1
    if (cc?.mode === 'charge') return `✅ 充电中 | τ = ${(cc?.tauMs || 0).toFixed(1)}ms`
    return `✅ 放电中 | τ = ${(cc?.tauMs || 0).toFixed(1)}ms`
  }
  if (currentExpId.value === 'transistor-switch') {
    const ts = results.TS1
    const stateMap = { saturation: '饱和区(ON)', active: '放大区', cutoff: '截止区(OFF)' }
    return `✅ ${stateMap[ts?.state] || '运行中'} | Ic = ${(ts?.collectorCurrent || 0).toFixed(1)}mA`
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
  margin-bottom: 4px;
}
.app-subtitle {
  font-size: 13px;
  color: var(--text-dim);
}

/* 分类网格 */
.category-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}
.category-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 8px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
}
.category-card.cat-available {
  background: var(--surface);
  border: 1px solid var(--border);
}
.category-card.cat-available:hover {
  background: var(--surface-light);
  border-color: var(--primary);
  transform: translateY(-2px);
}
.category-card.cat-soon {
  background: var(--surface);
  border: 1px dashed var(--border);
  opacity: 0.4;
  cursor: not-allowed;
}
.cat-icon { font-size: 24px; }
.cat-name { font-size: 13px; font-weight: 600; color: var(--text); }
.cat-count { font-size: 11px; color: var(--text-dim); }
.cat-soon .cat-count { color: var(--warning); }

/* 实验列表 */
.experiment-list h2 {
  font-size: 18px;
  margin-bottom: 12px;
}
.exp-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.exp-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.exp-card:hover {
  background: var(--surface-light);
  border-color: var(--primary);
}
.exp-card-icon { font-size: 24px; }
.exp-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.exp-card-title { font-size: 14px; font-weight: 600; color: var(--text); }
.exp-card-desc { font-size: 12px; color: var(--text-dim); }
.exp-card-done { color: var(--success); font-size: 16px; }

.back-btn {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 14px;
  cursor: pointer;
  padding: 4px 0;
  margin-bottom: 8px;
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
