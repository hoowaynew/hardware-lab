<template>
  <div class="pcb-view">
    <div class="pcb-formula">
      <span class="formula-text">Z₀ = 87/√(εr+1.41) × ln(5.98H/(0.8W+T))</span>
    </div>

    <!-- 阻抗大数字显示 -->
    <div class="pcb-imp-display">
      <div class="pcb-imp-value" :class="{ 'pcb-imp-warn': impWarn, 'pcb-imp-ok': impOk }">
        {{ impedance }}Ω
      </div>
      <div class="pcb-imp-target">目标: 50Ω</div>
      <div class="pcb-imp-dev" :class="{ 'pcb-imp-warn': impWarn }">
        {{ deviation > 0 ? '+' : '' }}{{ deviation }}Ω
      </div>
    </div>

    <!-- 阻抗表盘 -->
    <div class="pcb-gauge">
      <div class="pcb-gauge-track">
        <div class="pcb-gauge-safe-zone" style="left: 30%; width: 20%"></div>
        <div class="pcb-gauge-marker" :style="{ left: gaugePercent + '%' }">
          <div class="pcb-gauge-arrow"></div>
        </div>
        <div class="pcb-gauge-target" style="left: 50%"></div>
      </div>
      <div class="pcb-gauge-labels">
        <span>30Ω</span>
        <span class="pcb-safe-text">45-55Ω</span>
        <span>50Ω</span>
        <span>80Ω</span>
      </div>
    </div>

    <!-- 参数读数 -->
    <div class="pcb-readings">
      <div class="pcb-reading">
        <span class="pcb-r-label">有效介电常数</span>
        <span class="pcb-r-value">{{ effectiveEr }}</span>
      </div>
      <div class="pcb-reading">
        <span class="pcb-r-label">单位电容</span>
        <span class="pcb-r-value">{{ capacitance }} pF/cm</span>
      </div>
      <div class="pcb-reading">
        <span class="pcb-r-label">传播延迟</span>
        <span class="pcb-r-value">{{ propDelay }} ps/mm</span>
      </div>
      <div class="pcb-reading">
        <span class="pcb-r-label">匹配状态</span>
        <span class="pcb-r-value" :class="{ 'pcb-imp-warn': impWarn, 'pcb-imp-ok': impOk }">
          {{ impOk ? '✅ 良好匹配' : impWarn ? '⚠️ 失配' : '—' }}
        </span>
      </div>
    </div>

    <!-- 微带线截面图 -->
    <svg class="pcb-cross-section" viewBox="0 0 340 130">
      <!-- 空气层 -->
      <rect x="20" y="10" width="300" height="50" fill="rgba(255,255,255,0.02)"/>
      <text x="25" y="25" fill="var(--text-dim)" font-size="8">空气 (Air, εr=1)</text>

      <!-- 铜走线 (微带线) -->
      <rect x="140" y="58" width="60" height="4" fill="#b87333" stroke="#b87333" stroke-width="0.5"/>
      <text x="170" y="55" text-anchor="middle" fill="#b87333" font-size="9" font-weight="bold">铜走线 W={{ traceWidth }}mm</text>

      <!-- 介电层 (PCB基板) -->
      <rect x="20" y="62" width="300" height="40" fill="rgba(46,204,113,0.08)" stroke="rgba(46,204,113,0.2)" stroke-width="0.5"/>
      <text x="25" y="78" fill="var(--text-dim)" font-size="8">FR-4基板 (εr={{ epsilonR }})</text>
      <text x="25" y="92" fill="var(--text-dim)" font-size="8">H={{ substrateHeight }}mm</text>

      <!-- 电磁场线 (示意) -->
      <path d="M145,62 Q145,75 155,62 Q155,75 165,62 Q165,75 175,62 Q175,75 185,62 Q185,75 195,62"
            fill="none" stroke="var(--accent)" stroke-width="0.8" opacity="0.4" stroke-dasharray="2,2"/>

      <!-- 参考地平面 (GND层) -->
      <rect x="20" y="102" width="300" height="6" fill="#b87333" opacity="0.7"/>
      <text x="170" y="118" text-anchor="middle" fill="var(--accent)" font-size="9" font-weight="bold">GND 参考地平面</text>

      <!-- 阻抗标注 -->
      <text x="310" y="85" text-anchor="end" fill="var(--accent)" font-size="11" font-weight="bold">Z₀={{ impedance }}Ω</text>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  simResult: { type: Object, default: null }
})

const impedance = computed(() => props.simResult?.impedance?.toFixed(1) || '—')
const deviation = computed(() => props.simResult?.deviation || 0)
const effectiveEr = computed(() => props.simResult?.effectiveEr || '—')
const capacitance = computed(() => props.simResult?.capacitance || '—')
const propDelay = computed(() => props.simResult?.propDelay || '—')
const traceWidth = computed(() => props.simResult?.traceWidth ?? '—')
const epsilonR = computed(() => props.simResult?.epsilonR ?? 4.4)
const substrateHeight = computed(() => props.simResult?.substrateHeight ?? '—')

const impWarn = computed(() => (props.simResult?.deviation || 0) > 15)
const impOk = computed(() => (props.simResult?.deviation || 999) <= 5)

// Map impedance 30~80Ω to 0~100%
const gaugePercent = computed(() => {
  const z = props.simResult?.impedance || 50
  return Math.max(0, Math.min(100, ((z - 30) / 50) * 100))
})
</script>

<style scoped>
.pcb-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 0;
}
.pcb-formula {
  text-align: center;
  background: var(--surface-light);
  border-radius: 8px;
  padding: 8px;
}
.formula-text {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--text-dim);
}
.pcb-imp-display {
  display: flex;
  align-items: baseline;
  gap: 12px;
  justify-content: center;
  padding: 8px 0;
}
.pcb-imp-value {
  font-size: 36px;
  font-weight: 800;
  color: var(--primary);
  font-family: monospace;
}
.pcb-imp-ok { color: var(--success); }
.pcb-imp-warn { color: var(--danger); }
.pcb-imp-target {
  font-size: 13px;
  color: var(--text-dim);
}
.pcb-imp-dev {
  font-size: 14px;
  font-weight: 700;
  color: var(--success);
}
.pcb-gauge {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pcb-gauge-track {
  position: relative;
  height: 24px;
  background: var(--surface-light);
  border-radius: 12px;
  overflow: hidden;
}
.pcb-gauge-safe-zone {
  position: absolute;
  height: 100%;
  background: rgba(46, 204, 113, 0.15);
}
.pcb-gauge-marker {
  position: absolute;
  top: 0;
  height: 100%;
  transform: translateX(-50%);
  transition: left 0.3s;
}
.pcb-gauge-arrow {
  width: 4px;
  height: 100%;
  background: var(--primary);
  margin: 0 auto;
  border-radius: 2px;
  box-shadow: 0 0 6px var(--primary);
}
.pcb-gauge-target {
  position: absolute;
  top: -2px;
  height: calc(100% + 4px);
  width: 2px;
  background: var(--success);
  opacity: 0.5;
}
.pcb-gauge-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-dim);
}
.pcb-safe-text { color: var(--success); }
.pcb-readings {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.pcb-reading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--surface-light);
  border-radius: 8px;
  padding: 8px 12px;
}
.pcb-r-label {
  font-size: 11px;
  color: var(--text-dim);
}
.pcb-r-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--primary);
  font-family: monospace;
}
</style>
