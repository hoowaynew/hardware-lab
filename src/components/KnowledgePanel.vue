<template>
  <div class="knowledge-panel" :class="{ collapsed: !expanded }">
    <div class="kp-header" @click="expanded = !expanded">
      <span class="kp-icon">📚</span>
      <span class="kp-title">{{ data?.title || '知识点' }}</span>
      <span class="kp-toggle">{{ expanded ? '▾' : '▸' }}</span>
    </div>

    <Transition name="kp-slide">
      <div v-if="expanded && data" class="kp-body">
        <!-- 公式 -->
        <div v-if="data.formulas?.length" class="kp-section">
          <div class="kp-section-title">核心公式</div>
          <div v-for="(f, i) in data.formulas" :key="i" class="kp-formula">
            <span class="kp-formula-label">{{ f.label }}</span>
            <code class="kp-formula-expr">{{ f.expr }}</code>
          </div>
        </div>

        <!-- 概念 -->
        <div v-if="data.concepts?.length" class="kp-section">
          <div class="kp-section-title">原理概念</div>
          <ul class="kp-list">
            <li v-for="(c, i) in data.concepts" :key="i">{{ c }}</li>
          </ul>
        </div>

        <!-- 提示 -->
        <div v-if="data.tips?.length" class="kp-section">
          <div class="kp-section-title">实用提示</div>
          <ul class="kp-list kp-tips">
            <li v-for="(t, i) in data.tips" :key="i">{{ t }}</li>
          </ul>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  data: { type: Object, default: null }
})

const expanded = ref(false)
</script>

<style scoped>
.knowledge-panel {
  background: rgba(128,128,128,0.06);
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.3s;
}
.kp-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}
.kp-header:hover {
  background: rgba(128,128,128,0.08);
}
.kp-icon { font-size: 16px; }
.kp-title {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.kp-toggle {
  font-size: 12px;
  color: var(--text-dim);
}
.kp-body {
  padding: 0 12px 12px;
}
.kp-section {
  margin-bottom: 10px;
}
.kp-section:last-child {
  margin-bottom: 0;
}
.kp-section-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.kp-formula {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.kp-formula-label {
  font-size: 12px;
  color: var(--text-dim);
  white-space: nowrap;
}
.kp-formula-expr {
  font-size: 12px;
  color: var(--success);
  background: var(--popup-code-bg);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'SF Mono', 'Fira Code', monospace;
}
.kp-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.kp-list li {
  font-size: 12px;
  color: var(--text);
  line-height: 1.6;
  padding: 2px 0 2px 14px;
  position: relative;
}
.kp-list li::before {
  content: '▸';
  position: absolute;
  left: 0;
  color: var(--primary);
}
.kp-tips li::before {
  content: '💡';
  font-size: 10px;
}

/* 动画 */
.kp-slide-enter-active, .kp-slide-leave-active {
  transition: all 0.3s ease;
  max-height: 500px;
}
.kp-slide-enter-from, .kp-slide-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
