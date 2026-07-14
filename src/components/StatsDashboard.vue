<template>
  <div class="stats-dashboard">
    <div class="stats-header" @click="expanded = !expanded">
      <span class="stats-icon">📊</span>
      <span class="stats-title">学习统计</span>
      <span class="stats-toggle">{{ expanded ? '▾' : '▸' }}</span>
    </div>

    <Transition name="stats-slide">
      <div v-if="expanded" class="stats-body">
        <!-- 分类完成率 -->
        <div class="stats-section">
          <div class="stats-section-title">分类完成率</div>
          <div v-for="cat in categoryStats" :key="cat.id" class="cat-bar-row">
            <span class="cat-bar-icon">{{ cat.icon }}</span>
            <span class="cat-bar-name">{{ cat.name }}</span>
            <div class="cat-bar-track">
              <div class="cat-bar-fill" :style="{ width: cat.percent + '%' }" :class="{ complete: cat.percent === 100 }"></div>
            </div>
            <span class="cat-bar-count">{{ cat.done }}/{{ cat.total }}</span>
          </div>
        </div>

        <!-- 数据汇总 -->
        <div class="stats-grid">
          <div class="stats-cell">
            <span class="stats-cell-value">{{ totalCompleted }}</span>
            <span class="stats-cell-label">已完成</span>
          </div>
          <div class="stats-cell">
            <span class="stats-cell-value">{{ totalPerfect }}</span>
            <span class="stats-cell-label">完美通关</span>
          </div>
          <div class="stats-cell">
            <span class="stats-cell-value" :class="{ 'text-danger': errorCount > 0 }">{{ errorCount }}</span>
            <span class="stats-cell-label">犯错次数</span>
          </div>
          <div class="stats-cell">
            <span class="stats-cell-value">{{ completionRate }}%</span>
            <span class="stats-cell-label">总完成率</span>
          </div>
        </div>

        <!-- 错误分布饼图(CSS) -->
        <div v-if="errorBySeverity.critical + errorBySeverity.warning > 0" class="stats-section">
          <div class="stats-section-title">错误分布</div>
          <div class="error-distribution">
            <div class="error-bar">
              <div class="error-seg critical" :style="{ width: critPercent + '%' }"></div>
              <div class="error-seg warning" :style="{ width: warnPercent + '%' }"></div>
            </div>
            <div class="error-legend">
              <span class="legend-item"><span class="legend-dot critical"></span>严重 {{ errorBySeverity.critical }}</span>
              <span class="legend-item"><span class="legend-dot warning"></span>警告 {{ errorBySeverity.warning }}</span>
            </div>
          </div>
        </div>

        <!-- 导出/导入 -->
        <div class="stats-actions">
          <button class="stats-btn" @click="$emit('export')">📦 导出进度</button>
          <button class="stats-btn" @click="$emit('import')">📥 导入进度</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  categories: { type: Array, default: () => [] },
  allExperiments: { type: Array, default: () => [] },
  progress: { type: Object, required: true },
  errorCount: { type: Number, default: 0 },
  errorBySeverity: { type: Object, default: () => ({ critical: 0, warning: 0 }) }
})

defineEmits(['export', 'import'])

const expanded = ref(false)

const totalCompleted = computed(() => props.progress.completedCount || 0)
const totalPerfect = computed(() => props.progress.perfectCount || 0)
const completionRate = computed(() => {
  const total = props.allExperiments.length || 1
  return Math.round(totalCompleted.value / total * 100)
})

const categoryStats = computed(() => {
  return props.categories.map(cat => {
    const done = cat.experiments.filter(e => props.progress.completed[e.id]).length
    const total = cat.experiments.length
    return {
      id: cat.id,
      icon: cat.icon,
      name: cat.name,
      done,
      total,
      percent: total > 0 ? Math.round(done / total * 100) : 0
    }
  }).filter(c => c.total > 0)
})

const totalErrors = computed(() => props.errorBySeverity.critical + props.errorBySeverity.warning || 1)
const critPercent = computed(() => Math.round(props.errorBySeverity.critical / totalErrors.value * 100))
const warnPercent = computed(() => 100 - critPercent.value)
</script>

<style scoped>
.stats-dashboard {
  background: rgba(128,128,128,0.06);
  border-radius: 10px;
  overflow: hidden;
}
.stats-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  cursor: pointer;
  user-select: none;
}
.stats-header:hover { background: rgba(128,128,128,0.08); }
.stats-icon { font-size: 16px; }
.stats-title { flex: 1; font-size: 13px; font-weight: 600; color: var(--text); }
.stats-toggle { font-size: 12px; color: var(--text-dim); }
.stats-body { padding: 0 12px 12px; }
.stats-section { margin-bottom: 12px; }
.stats-section-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}
.cat-bar-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.cat-bar-icon { font-size: 12px; width: 16px; text-align: center; }
.cat-bar-name { font-size: 11px; color: var(--text-dim); width: 52px; }
.cat-bar-track {
  flex: 1;
  height: 8px;
  background: rgba(128,128,128,0.12);
  border-radius: 4px;
  overflow: hidden;
}
.cat-bar-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 4px;
  transition: width 0.5s ease;
}
.cat-bar-fill.complete { background: var(--success); }
.cat-bar-count { font-size: 10px; color: var(--text-dim); width: 30px; text-align: right; }

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 8px;
}
.stats-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--surface-light);
  border-radius: 8px;
  padding: 8px 4px;
}
.stats-cell-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}
.stats-cell-value.text-danger { color: var(--danger); }
.stats-cell-label {
  font-size: 10px;
  color: var(--text-dim);
  margin-top: 2px;
}

.error-distribution { display: flex; flex-direction: column; gap: 6px; }
.error-bar {
  display: flex;
  height: 12px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--border);
}
.error-seg { transition: width 0.3s; }
.error-seg.critical { background: var(--danger); }
.error-seg.warning { background: var(--warning); }
.error-legend { display: flex; gap: 12px; }
.legend-item { font-size: 11px; color: var(--text-dim); display: flex; align-items: center; gap: 4px; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; }
.legend-dot.critical { background: var(--danger); }
.legend-dot.warning { background: var(--warning); }

.stats-actions { display: flex; gap: 8px; }
.stats-btn {
  flex: 1;
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px;
  font-size: 12px;
  color: var(--text-dim);
  cursor: pointer;
  transition: all 0.2s;
}
.stats-btn:hover { border-color: var(--primary); color: var(--primary); }

.stats-slide-enter-active, .stats-slide-leave-active {
  transition: all 0.3s ease;
  max-height: 600px;
}
.stats-slide-enter-from, .stats-slide-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
