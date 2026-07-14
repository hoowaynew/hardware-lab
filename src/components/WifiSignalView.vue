<template>
  <div class="wifi-view">
    <div class="wifi-formula">
      <span class="formula-text">FSPL(dB) = 20log₁₀(d) + 20log₁₀(f) + 32.44</span>
    </div>

    <!-- RSSI大数字显示 -->
    <div class="wifi-rssi-display">
      <div class="wifi-rssi-value" :class="rssiClass">
        {{ rssi }} dBm
      </div>
      <div class="wifi-quality" :class="rssiClass">{{ qualityText }}</div>
    </div>

    <!-- 信号强度条 -->
    <div class="wifi-signal-bar-container">
      <div class="wifi-signal-bar">
        <div class="wifi-signal-safe-zone"></div>
        <div class="wifi-signal-fill" :style="{ width: qualityPct + '%', background: signalColor }"></div>
        <div class="wifi-sensitivity-marker" :style="{ left: sensitivityPercent + '%' }">
          <span class="wifi-sens-label">灵敏度</span>
        </div>
      </div>
      <div class="wifi-signal-labels">
        <span>-100dBm</span>
        <span class="wifi-safe-label">可用区</span>
        <span>0dBm</span>
      </div>
    </div>

    <!-- 链路预算分解 -->
    <div class="wifi-budget">
      <div class="wifi-budget-row">
        <span class="wifi-b-label">发射功率</span>
        <span class="wifi-b-value wifi-b-pos">+{{ txPower }} dBm</span>
      </div>
      <div class="wifi-budget-row">
        <span class="wifi-b-label">天线增益</span>
        <span class="wifi-b-value wifi-b-pos">+{{ txGain + rxGain }} dB</span>
      </div>
      <div class="wifi-budget-row">
        <span class="wifi-b-label">自由空间损耗</span>
        <span class="wifi-b-value wifi-b-neg">-{{ fspl }} dB</span>
      </div>
      <div class="wifi-budget-row">
        <span class="wifi-b-label">穿墙损耗 ({{ walls }}×{{ wallLossPerWall }}dB)</span>
        <span class="wifi-b-value wifi-b-neg">-{{ totalWallLoss }} dB</span>
      </div>
      <div class="wifi-budget-divider"></div>
      <div class="wifi-budget-row wifi-budget-total">
        <span class="wifi-b-label">接收RSSI</span>
        <span class="wifi-b-value" :class="rssiClass">{{ rssi }} dBm</span>
      </div>
      <div class="wifi-budget-row">
        <span class="wifi-b-label">链路余量</span>
        <span class="wifi-b-value" :class="{ 'wifi-b-warn': margin < 10, 'wifi-b-ok': margin >= 10 }">
          {{ margin > 0 ? '+' : '' }}{{ margin }} dB
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  simResult: { type: Object, default: null }
})

const rssi = computed(() => props.simResult?.rssi?.toFixed(1) || '—')
const txPower = computed(() => props.simResult?.txPower || 0)
const txGain = computed(() => props.simResult?.txGain || 0)
const rxGain = computed(() => props.simResult?.rxGain || 0)
const fspl = computed(() => props.simResult?.fspl || 0)
const walls = computed(() => props.simResult?.walls || 0)
const wallLossPerWall = computed(() => props.simResult?.wallLossPerWall || 0)
const totalWallLoss = computed(() => props.simResult?.totalWallLoss || 0)
const margin = computed(() => props.simResult?.margin || 0)
const qualityPct = computed(() => props.simResult?.qualityPct || 0)

const rssiClass = computed(() => {
  const q = props.simResult?.quality
  if (q === 'none') return 'wifi-q-none'
  if (q === 'poor') return 'wifi-q-poor'
  if (q === 'fair') return 'wifi-q-fair'
  return 'wifi-q-good'
})

const qualityText = computed(() => {
  const q = props.simResult?.quality
  const map = { excellent: '信号极佳', good: '信号良好', fair: '信号一般', poor: '信号差', none: '无信号' }
  return map[q] || '—'
})

const signalColor = computed(() => {
  const q = props.simResult?.quality
  if (q === 'none') return '#e74c3c'
  if (q === 'poor') return '#f39c12'
  if (q === 'fair') return '#f1c40f'
  return '#2ecc71'
})

// Sensitivity at -82dBm → map -100~0 to 0~100%
const sensitivityPercent = computed(() => {
  const s = props.simResult?.rxSensitivity || -82
  return Math.max(0, Math.min(100, (s + 100) / 100 * 100))
})
</script>

<style scoped>
.wifi-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 0;
}
.wifi-formula {
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
.wifi-rssi-display {
  display: flex;
  align-items: baseline;
  gap: 12px;
  justify-content: center;
  padding: 8px 0;
}
.wifi-rssi-value {
  font-size: 32px;
  font-weight: 800;
  color: var(--success);
  font-family: monospace;
}
.wifi-quality {
  font-size: 14px;
  font-weight: 600;
}
.wifi-q-good { color: var(--success); }
.wifi-q-fair { color: var(--warning); }
.wifi-q-poor { color: #f39c12; }
.wifi-q-none { color: var(--danger); }
.wifi-rssi-display .wifi-q-none,
.wifi-rssi-display .wifi-q-poor { color: var(--danger); }

.wifi-signal-bar-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.wifi-signal-bar {
  position: relative;
  height: 20px;
  background: var(--surface-light);
  border-radius: 4px;
  overflow: hidden;
}
.wifi-signal-safe-zone {
  position: absolute;
  left: 18%;
  width: 82%;
  height: 100%;
  background: rgba(46, 204, 113, 0.1);
}
.wifi-signal-fill {
  position: absolute;
  height: 100%;
  transition: all 0.3s;
  border-radius: 4px;
}
.wifi-sensitivity-marker {
  position: absolute;
  top: -2px;
  height: calc(100% + 4px);
  width: 2px;
  background: var(--danger);
  opacity: 0.7;
}
.wifi-sens-label {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  color: var(--danger);
  white-space: nowrap;
}
.wifi-signal-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-dim);
}
.wifi-safe-label { color: var(--success); }

.wifi-budget {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--surface-light);
  border-radius: 8px;
  padding: 10px 12px;
}
.wifi-budget-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.wifi-b-label {
  font-size: 12px;
  color: var(--text-dim);
}
.wifi-b-value {
  font-size: 14px;
  font-weight: 700;
  font-family: monospace;
  color: var(--text);
}
.wifi-b-pos { color: var(--success); }
.wifi-b-neg { color: var(--danger); }
.wifi-b-warn { color: var(--warning); }
.wifi-b-ok { color: var(--success); }
.wifi-budget-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}
.wifi-budget-total .wifi-b-value {
  font-size: 18px;
}
</style>
