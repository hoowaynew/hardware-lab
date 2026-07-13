<template>
  <Transition name="popup">
    <div v-if="visible" class="error-popup-overlay" @click.self="$emit('close')">
      <div class="error-popup">
        <div class="popup-header" :class="severityClass">
          <span class="popup-icon">{{ icon }}</span>
          <span class="popup-title">{{ error?.title }}</span>
          <button class="popup-close" @click="$emit('close')">✕</button>
        </div>

        <div class="popup-body">
          <p class="popup-explanation">{{ error?.explanation }}</p>

          <div v-if="error?.tutorial" class="tutorial-section">
            <div class="tutorial-header">📖 教学卡片</div>
            <div class="tutorial-concept">
              <span class="concept-label">知识点：</span>
              <span class="concept-value">{{ error.tutorial.concept }}</span>
            </div>
            <div v-if="error.tutorial.formula" class="tutorial-formula">
              <code>{{ error.tutorial.formula }}</code>
            </div>
            <ul class="tutorial-tips">
              <li v-for="(tip, i) in error.tutorial.tips" :key="i">{{ tip }}</li>
            </ul>
            <a v-if="error.tutorial.articleRef" class="tutorial-link" href="#" @click.prevent="$emit('read-article', error.tutorial.articleRef)">
              📖 详见完整文章 →
            </a>
          </div>
        </div>

        <div class="popup-footer">
          <button class="btn-retry" @click="$emit('retry')">🔄 重新尝试</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  error: { type: Object, default: null }
})

defineEmits(['close', 'retry', 'read-article'])

const severityClass = computed(() => {
  if (!props.error) return ''
  if (props.error.type?.includes('SHORT') || props.error.type?.includes('OVERCURRENT')) return 'severe'
  return 'warning'
})

const icon = computed(() => {
  if (!props.error) return '⚠️'
  const map = {
    LED_OVERCURRENT: '💥',
    LED_REVERSED: '💡',
    LED_NO_RESISTOR: '💥',
    SHORT_CIRCUIT: '⚡',
    GPIO_FLOATING: '〰️',
    OPENDRAIN_NO_PULLUP: '🔓',
    GPIO_SHORT: '⚡',
    PWM_SERVO_FREQ: '⚙️',
    PWM_SERVO_100: '⚙️'
  }
  return map[props.error.type] || '⚠️'
})
</script>

<style scoped>
.error-popup-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}
.error-popup {
  background: #1e1e30;
  border-radius: 16px;
  max-width: 420px;
  width: 100%;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}
.popup-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  font-size: 16px;
  font-weight: bold;
}
.popup-header.warning { background: linear-gradient(135deg, #f39c12, #e67e22); color: #fff; }
.popup-header.severe { background: linear-gradient(135deg, #e74c3c, #c0392b); color: #fff; }
.popup-icon { font-size: 22px; }
.popup-title { flex: 1; }
.popup-close {
  background: none; border: none; color: rgba(255,255,255,0.7);
  font-size: 18px; cursor: pointer; padding: 4px;
}
.popup-body { padding: 16px; }
.popup-explanation {
  color: #ddd; font-size: 14px; line-height: 1.6;
  white-space: pre-line; margin-bottom: 12px;
}
.tutorial-section {
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 12px;
  border-left: 3px solid #3498db;
}
.tutorial-header {
  font-size: 13px; font-weight: bold; color: #3498db; margin-bottom: 8px;
}
.tutorial-concept {
  font-size: 13px; color: #aaa; margin-bottom: 6px;
}
.concept-label { color: #666; }
.concept-value { color: #fff; }
.tutorial-formula {
  background: rgba(0,0,0,0.3); border-radius: 4px; padding: 6px 8px; margin-bottom: 8px;
}
.tutorial-formula code {
  color: #2ecc71; font-size: 13px; font-family: 'SF Mono', monospace;
}
.tutorial-tips {
  list-style: none; padding: 0; margin: 0 0 8px 0;
}
.tutorial-tips li {
  font-size: 12px; color: #999; padding: 2px 0;
  padding-left: 16px; position: relative;
}
.tutorial-tips li::before {
  content: '▸'; position: absolute; left: 0; color: #3498db;
}
.tutorial-link {
  display: block; text-align: center; color: #3498db;
  text-decoration: none; font-size: 13px; padding: 6px;
  border: 1px solid rgba(52,152,219,0.3); border-radius: 6px;
}
.popup-footer {
  padding: 0 16px 16px; display: flex; justify-content: center;
}
.btn-retry {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: #fff; border: none; border-radius: 8px;
  padding: 10px 24px; font-size: 14px; cursor: pointer;
  transition: transform 0.2s;
}
.btn-retry:active { transform: scale(0.95); }

.popup-enter-active, .popup-leave-active {
  transition: opacity 0.3s;
}
.popup-enter-from, .popup-leave-to {
  opacity: 0;
}
.popup-enter-from .error-popup, .popup-leave-to .error-popup {
  transform: scale(0.8);
}
</style>
