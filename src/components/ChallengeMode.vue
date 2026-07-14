<template>
  <Transition name="slide-up">
    <div v-if="visible" class="challenge-panel">
      <div class="challenge-header">
        <span class="challenge-badge">🎯 挑战模式</span>
        <span class="challenge-title">{{ challenge?.title }}</span>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="challenge-body">
        <div class="challenge-goal">
          <span class="goal-label">目标:</span>
          <span class="goal-text">{{ challenge?.goal }}</span>
        </div>
        <div class="challenge-constraint">
          <span class="constraint-label">约束:</span>
          <span class="constraint-text">{{ challenge?.constraint }}</span>
        </div>

        <div class="challenge-timer" :class="{ urgent: remainingTime <= 10 }">
          <span class="timer-icon">⏱️</span>
          <span class="timer-value">{{ formatTime(remainingTime) }}</span>
        </div>

        <div class="challenge-stats">
          <div class="stat">
            <span class="stat-label">尝试次数</span>
            <span class="stat-value">{{ attempts }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">最佳分数</span>
            <span class="stat-value">{{ bestScore }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">状态</span>
            <span class="stat-value" :class="statusClass">{{ statusText }}</span>
          </div>
        </div>

        <button
          v-if="!running && !result"
          class="start-btn"
          @click="startChallenge"
        >
          🚀 开始挑战
        </button>

        <button
          v-if="running"
          class="check-btn"
          @click="checkResult"
        >
          ✅ 提交答案
        </button>

        <div v-if="result" class="result-box" :class="{ passed: result.passed, failed: !result.passed }">
          <div class="result-icon">{{ result.passed ? '🎉' : '💔' }}</div>
          <div class="result-score">{{ result.score.toFixed(0) }}分</div>
          <div class="result-detail">{{ result.detail }}</div>
          <div class="result-time">用时 {{ formatTime(elapsedTime) }}</div>
          <button class="retry-btn" @click="resetChallenge">🔄 再来一次</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { challengeData } from '../data/challenges.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  experimentId: { type: String, default: '' },
  simResult: { type: Object, default: null }
})

const emit = defineEmits(['close', 'complete'])

const challenge = computed(() => challengeData[props.experimentId])
const running = ref(false)
const result = ref(null)
const remainingTime = ref(0)
const elapsedTime = ref(0)
const attempts = ref(0)
const bestScore = ref(0)
let timer = null
let startTs = 0

const statusText = computed(() => {
  if (result.value?.passed) return '通关'
  if (result.value) return '未通过'
  if (running.value) return '进行中'
  return '待开始'
})

const statusClass = computed(() => {
  if (result.value?.passed) return 'good'
  if (result.value) return 'bad'
  if (running.value) return 'running'
  return ''
})

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function startChallenge() {
  running.value = true
  result.value = null
  remainingTime.value = challenge.value?.timeLimit || 60
  elapsedTime.value = 0
  startTs = Date.now()
  attempts.value++

  timer = setInterval(() => {
    remainingTime.value--
    elapsedTime.value = Math.floor((Date.now() - startTs) / 1000)
    if (remainingTime.value <= 0) {
      // 时间到，自动检查
      checkResult()
    }
  }, 1000)
}

function checkResult() {
  if (!running.value) return
  clearInterval(timer)
  running.value = false

  const checkFn = challenge.value?.check
  if (checkFn && props.simResult) {
    result.value = checkFn(props.simResult)
    if (result.value.score > bestScore.value) {
      bestScore.value = result.value.score
    }
    if (result.value.passed) {
      emit('complete', { score: result.value.score, time: elapsedTime.value, attempts: attempts.value })
    }
  } else {
    result.value = { passed: false, score: 0, detail: '无法验证，请先操作实验' }
  }
}

function resetChallenge() {
  result.value = null
  running.value = false
  remainingTime.value = 0
  elapsedTime.value = 0
}

watch(() => props.visible, (v) => {
  if (!v) {
    clearInterval(timer)
    running.value = false
    result.value = null
  }
})

watch(() => props.experimentId, () => {
  resetChallenge()
  attempts.value = 0
  bestScore.value = 0
})

onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.challenge-panel {
  position: fixed;
  bottom: 0;
  right: 0;
  width: 360px;
  max-width: calc(100vw - 20px);
  background: var(--bg-secondary, #1a1a2e);
  border: 1px solid var(--border, #333);
  border-radius: 12px 12px 0 0;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
  z-index: 100;
  font-size: 13px;
}

.challenge-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border, #333);
}
.challenge-badge {
  background: linear-gradient(135deg, #e74c3c, #f39c12);
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  white-space: nowrap;
}
.challenge-title {
  flex: 1;
  font-weight: bold;
  color: var(--text, #eee);
}
.close-btn {
  background: none;
  border: none;
  color: var(--text-dim, #888);
  cursor: pointer;
  font-size: 16px;
}

.challenge-body {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.challenge-goal, .challenge-constraint {
  display: flex;
  gap: 6px;
  font-size: 12px;
}
.goal-label, .constraint-label {
  color: var(--text-dim, #888);
  white-space: nowrap;
}
.goal-text { color: var(--accent, #4488ff); }
.constraint-text { color: #f39c12; }

.challenge-timer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px;
  background: var(--card-bg, #2a2a3e);
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  color: #2ecc71;
}
.challenge-timer.urgent { color: #e74c3c; animation: pulse 0.5s infinite; }
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.challenge-stats {
  display: flex;
  gap: 8px;
}
.stat {
  flex: 1;
  text-align: center;
  padding: 4px;
  background: var(--card-bg, #2a2a3e);
  border-radius: 4px;
}
.stat-label { display: block; font-size: 10px; color: var(--text-dim, #888); }
.stat-value { font-size: 13px; font-weight: bold; color: var(--accent, #4488ff); }
.stat-value.good { color: #2ecc71; }
.stat-value.bad { color: #e74c3c; }
.stat-value.running { color: #f39c12; }

.start-btn, .check-btn, .retry-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  color: #fff;
  transition: transform 0.1s;
}
.start-btn { background: linear-gradient(135deg, #2ecc71, #27ae60); }
.check-btn { background: linear-gradient(135deg, #3498db, #2980b9); }
.retry-btn { background: var(--card-bg, #2a2a3e); color: var(--text, #eee); border: 1px solid var(--border, #444); }
.start-btn:hover, .check-btn:hover, .retry-btn:hover { transform: translateY(-1px); }

.result-box {
  text-align: center;
  padding: 12px;
  border-radius: 8px;
}
.result-box.passed { background: rgba(46,204,113,0.15); }
.result-box.failed { background: rgba(231,76,60,0.15); }
.result-icon { font-size: 28px; }
.result-score { font-size: 24px; font-weight: bold; color: var(--accent, #4488ff); }
.result-detail { font-size: 12px; color: var(--text-secondary, #aaa); margin-top: 4px; }
.result-time { font-size: 11px; color: var(--text-dim, #888); }

.slide-up-enter-active, .slide-up-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-up-enter-from, .slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

@media (max-width: 600px) {
  .challenge-panel {
    width: 100%;
    border-radius: 12px 12px 0 0;
  }
}
</style>
