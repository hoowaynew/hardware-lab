<template>
  <div class="hint-section">
    <!-- 提示按钮 -->
    <div v-if="hintLevel < 3" class="hint-controls">
      <button class="hint-btn" @click="showNextHint" :disabled="hintLevel >= 3">
        <span class="hint-icon">{{ hintLevel === 0 ? '🤔' : '💡' }}</span>
        <span>{{ hintLevel === 0 ? '需要提示' : `提示 ${hintLevel}/3` }}</span>
        <span v-if="hintLevel > 0" class="hint-dots">
          <span class="dot" :class="{ active: hintLevel >= 1 }"></span>
          <span class="dot" :class="{ active: hintLevel >= 2 }"></span>
          <span class="dot" :class="{ active: hintLevel >= 3 }"></span>
        </span>
      </button>
    </div>

    <!-- 提示内容 -->
    <Transition name="hint-slide">
      <div v-if="hintLevel > 0 && currentHint" class="hint-content" :class="hintClass">
        <div class="hint-badge">{{ hintLevel === 3 ? '答案' : `提示${hintLevel}` }}</div>
        <div class="hint-text">{{ currentHint }}</div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  hints: { type: Array, default: () => [] }
})

const hintLevel = ref(0)

const currentHint = computed(() => {
  if (hintLevel.value === 0 || !props.hints?.length) return null
  return props.hints[Math.min(hintLevel.value - 1, props.hints.length - 1)]
})

const hintClass = computed(() => {
  if (hintLevel.value === 3) return 'hint-answer'
  if (hintLevel.value === 2) return 'hint-formula'
  return 'hint-idea'
})

function showNextHint() {
  if (hintLevel.value < 3) hintLevel.value++
}

// 切换实验时重置
watch(() => props.hints, () => { hintLevel.value = 0 })
</script>

<style scoped>
.hint-section {
  margin-top: 8px;
}
.hint-controls {
  display: flex;
  justify-content: center;
}
.hint-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-light);
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  color: var(--text-dim);
  cursor: pointer;
  transition: all 0.2s;
}
.hint-btn:hover:not(:disabled) {
  border-color: var(--warning);
  color: var(--warning);
  border-style: solid;
}
.hint-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.hint-icon { font-size: 14px; }
.hint-dots {
  display: flex;
  gap: 3px;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--border);
}
.dot.active {
  background: var(--warning);
}
.hint-content {
  margin-top: 8px;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.hint-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}
.hint-text {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text);
}
.hint-idea {
  background: rgba(230,126,34,0.08);
  border: 1px solid rgba(230,126,34,0.2);
}
.hint-idea .hint-badge {
  background: rgba(230,126,34,0.15);
  color: var(--warning);
}
.hint-formula {
  background: rgba(52,152,219,0.08);
  border: 1px solid rgba(52,152,219,0.2);
}
.hint-formula .hint-badge {
  background: rgba(52,152,219,0.15);
  color: #3498db;
}
.hint-answer {
  background: rgba(46,204,113,0.08);
  border: 1px solid rgba(46,204,113,0.2);
}
.hint-answer .hint-badge {
  background: rgba(46,204,113,0.15);
  color: var(--success);
}
.hint-answer .hint-text {
  color: var(--text);
  font-weight: 500;
}

/* 动画 */
.hint-slide-enter-active, .hint-slide-leave-active {
  transition: all 0.3s ease;
}
.hint-slide-enter-from, .hint-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
