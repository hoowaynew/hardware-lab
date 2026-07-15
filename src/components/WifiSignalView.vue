<template>
  <div class="wifi-view">
    <div class="wifi-formula">
      <span class="formula-text">FSPL(dB) = 20log₁₀(d) + 20log₁₀(f) + 32.44</span>
    </div>

    <!-- WiFi 链路拓扑图 -->
    <svg class="wifi-topology" viewBox="0 0 360 120">
      <!-- AP 路由器 -->
      <rect x="20" y="30" width="60" height="50" rx="3" fill="none" stroke="var(--text)" stroke-width="1.5"/>
      <text x="30" y="45" fill="var(--text)" font-size="9">AP</text>
      <text x="25" y="55" fill="var(--text-dim)" font-size="7">Router</text>
      <text x="25" y="65" fill="var(--text-dim)" font-size="7">WiFi</text>
      <!-- AP 天线 -->
      <line x1="50" y1="30" x2="50" y2="12" stroke="var(--wire)" stroke-width="2"/>
      <line x1="44" y1="12" x2="56" y2="12" stroke="var(--wire)" stroke-width="2"/>
      <line x1="46" y1="15" x2="54" y2="15" stroke="var(--wire)" stroke-width="1.5"/>
      <line x1="48" y1="18" x2="52" y2="18" stroke="var(--wire)" stroke-width="1"/>
      <text x="58" y="16" fill="var(--text-dim)" font-size="7">{{ txGain }}dBi</text>

      <!-- 电磁波传播 (WiFi 波纹) -->
      <path d="M55,18 q10,-8 20,0 q10,8 20,0 q10,-8 20,0" fill="none" stroke="var(--accent)" stroke-width="1.5" opacity="0.7"/>
      <!-- 穿墙损耗 -->
      <rect v-if="walls > 0" x="135" y="3" width="20" height="35" fill="none" stroke="#e74c3c" stroke-width="1.5" stroke-dasharray="3,2"/>
      <text v-if="walls > 0" x="125" y="50" fill="#e74c3c" font-size="7">{{ walls }}墙</text>
      <text v-if="walls > 0" x="125" y="58" fill="#e74c3c" font-size="7">-{{ totalWallLoss }}dB</text>

      <!-- 距离标注 -->
      <text x="155" y="68" fill="var(--text-dim)" font-size="8">d = {{ distance }}m</text>
      <text x="155" y="78" fill="var(--text-dim)" font-size="7">{{ freqDisplay }}</text>

      <!-- 继续波纹 -->
      <path d="M160,18 q10,-8 20,0 q10,8 20,0 q10,-8 20,0 q10,8 20,0" fill="none" stroke="var(--accent)" stroke-width="1.5" opacity="0.7"/>

      <!-- Client 设备 -->
      <rect x="280" y="30" width="60" height="50" rx="3" fill="none" stroke="var(--text)" stroke-width="1.5"/>
      <text x="290" y="45" fill="var(--text)" font-size="9">Client</text>
      <text x="285" y="55" fill="var(--text-dim)" font-size="7">Device</text>
      <text x="285" y="65" fill="var(--text-dim)" font-size="7">WiFi</text>
      <!-- Client 天线 -->
      <line x1="310" y1="30" x2="310" y2="12" stroke="var(--wire)" stroke-width="2"/>
      <line x1="304" y1="12" x2="316" y2="12" stroke="var(--wire)" stroke-width="2"/>
      <line x1="306" y1="15" x2="314" y2="15" stroke="var(--wire)" stroke-width="1.5"/>
      <line x1="308" y1="18" x2="312" y2="18" stroke="var(--wire)" stroke-width="1"/>
      <text x="265" y="16" fill="var(--text-dim)" font-size="7">{{ rxGain }}dBi</text>

      <!-- 链路预算标注 -->
      <text x="80" y="100" fill="var(--text-dim)" font-size="8">P_tx={{ txPower }}dBm → FSPL=-{{ fspl }}dB → 墙=-{{ totalWallLoss }}dB → RSSI={{ rssi }}dBm</text>
    </svg>

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
const distance = computed(() => props.simResult?.distance ?? 10)
const freqDisplay = computed(() => {
  const f = props.simResult?.frequency ?? 2400
  return f >= 1000 ? (f / 1000).toFixed(1) + 'GHz' : f + 'MHz'
})

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
.wifi-topology {
  width: 100%;
  max-width: 400px;
  height: auto;
}
</style>
