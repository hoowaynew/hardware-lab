<template>
  <Transition name="onboard">
    <div v-if="visible" class="onboard-overlay" @click.self="skip">
      <div class="onboard-card">
        <div class="onboard-step-indicator">
          <span v-for="i in 3" :key="i" class="step-dot" :class="{ active: i <= step, current: i === step }"></span>
        </div>

        <!-- Step 1: 欢迎 -->
        <template v-if="step === 1">
          <div class="onboard-emoji">🔬</div>
          <h2 class="onboard-title">欢迎来到硬件实验室</h2>
          <p class="onboard-desc">这里有12个交互式电路实验，覆盖11大硬件知识分类。通过动手操作和犯错反馈来学习硬件原理。</p>
        </template>

        <!-- Step 2: 玩法 -->
        <template v-if="step === 2">
          <div class="onboard-emoji">⚡</div>
          <h2 class="onboard-title">犯错即学习</h2>
          <p class="onboard-desc">调节参数 → 观察仿真结果 → 犯错时触发教学弹窗 → 理解原理 → 修正后通关获得星数。</p>
          <div class="onboard-tips">
            <div class="onboard-tip">📚 知识点面板：查看公式和原理</div>
            <div class="onboard-tip">🤔 提示按钮：卡住时3级渐进提示</div>
            <div class="onboard-tip">⭐ 完美通关（无错误）= 3星</div>
          </div>
        </template>

        <!-- Step 3: 快捷键 -->
        <template v-if="step === 3">
          <div class="onboard-emoji">⌨️</div>
          <h2 class="onboard-title">快捷操作</h2>
          <div class="onboard-shortcuts">
            <div class="shortcut-row"><kbd>ESC</kbd> 返回首页</div>
            <div class="shortcut-row"><kbd>←</kbd> <kbd>→</kbd> 切换实验</div>
            <div class="shortcut-row"><kbd>🔍</kbd> 搜索实验名称/分类</div>
            <div class="shortcut-row"><kbd>⭐</kbd> 收藏常玩实验</div>
          </div>
        </template>

        <div class="onboard-actions">
          <button v-if="step > 1" class="onboard-btn secondary" @click="step--">上一步</button>
          <button class="onboard-btn skip" @click="skip">跳过</button>
          <button v-if="step < 3" class="onboard-btn primary" @click="step++">下一步</button>
          <button v-if="step === 3" class="onboard-btn primary" @click="finish">开始实验 🚀</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref } from 'vue'

const ONBOARD_KEY = 'hw-lab-onboarded'

const visible = ref(!localStorage.getItem(ONBOARD_KEY))
const step = ref(1)

function skip() {
  localStorage.setItem(ONBOARD_KEY, '1')
  visible.value = false
}

function finish() {
  localStorage.setItem(ONBOARD_KEY, '1')
  visible.value = false
}
</script>

<style scoped>
.onboard-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.onboard-card {
  background: var(--popup-bg, #1a1a2e);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px 24px;
  max-width: 380px;
  width: 100%;
  text-align: center;
}
.onboard-step-indicator {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
}
.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border);
  transition: all 0.3s;
}
.step-dot.active { background: var(--primary); }
.step-dot.current { width: 24px; border-radius: 4px; }

.onboard-emoji { font-size: 48px; margin-bottom: 12px; }
.onboard-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
}
.onboard-desc {
  font-size: 14px;
  color: var(--text-dim);
  line-height: 1.6;
  margin-bottom: 16px;
}
.onboard-tips {
  text-align: left;
  background: rgba(128,128,128,0.06);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 16px;
}
.onboard-tip {
  font-size: 12px;
  color: var(--text);
  padding: 3px 0;
}
.onboard-shortcuts {
  text-align: left;
  margin-bottom: 16px;
}
.shortcut-row {
  font-size: 13px;
  color: var(--text);
  padding: 6px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
kbd {
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  font-family: monospace;
  color: var(--text);
}
.onboard-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}
.onboard-btn {
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid var(--border);
  transition: all 0.2s;
}
.onboard-btn.secondary {
  background: transparent;
  color: var(--text-dim);
}
.onboard-btn.skip {
  background: transparent;
  color: var(--text-dim);
  border: none;
}
.onboard-btn.primary {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
  font-weight: 600;
}
.onboard-btn.primary:hover { opacity: 0.9; }

.onboard-enter-active, .onboard-leave-active { transition: opacity 0.4s; }
.onboard-enter-from, .onboard-leave-to { opacity: 0; }
</style>
