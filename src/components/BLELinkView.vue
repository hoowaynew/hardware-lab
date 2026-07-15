<template>
  <div class="ble-view">
    <div class="ble-formula">
      <span class="formula-text">FSPL = 20log₁₀(d) + 20log₁₀(f_MHz) + 27.55</span>
    </div>

    <!-- BLE 链路拓扑图 -->
    <svg class="ble-topology" viewBox="0 0 360 120">
      <!-- TX 节点 -->
      <rect x="20" y="30" width="55" height="50" rx="3" fill="none" stroke="var(--text)" stroke-width="1.5"/>
      <text x="28" y="45" fill="var(--text)" font-size="9">TX</text>
      <text x="25" y="55" fill="var(--text-dim)" font-size="7">Master</text>
      <text x="25" y="65" fill="var(--text-dim)" font-size="7">BLE</text>
      <!-- TX 天线 -->
      <line x1="47" y1="30" x2="47" y2="15" stroke="var(--wire)" stroke-width="2"/>
      <line x1="42" y1="15" x2="52" y2="15" stroke="var(--wire)" stroke-width="2"/>
      <line x1="44" y1="18" x2="50" y2="18" stroke="var(--wire)" stroke-width="1.5"/>
      <line x1="46" y1="21" x2="48" y2="21" stroke="var(--wire)" stroke-width="1"/>
      <text x="55" y="18" fill="var(--text-dim)" font-size="7">Ant</text>
      <text x="55" y="27" fill="var(--text-dim)" font-size="7">{{ txGain }}dBi</text>

      <!-- 电磁波 (波纹线) -->
      <path d="M55,20 q8,-6 16,0 q8,6 16,0 q8,-6 16,0 q8,6 16,0" fill="none" stroke="var(--accent)" stroke-width="1.5" opacity="0.7"/>
      <!-- 障碍物 -->
      <rect v-if="obstacleLoss > 0" x="140" y="5" width="30" height="30" fill="none" stroke="#e74c3c" stroke-width="1.5" stroke-dasharray="3,2"/>
      <text v-if="obstacleLoss > 0" x="143" y="48" fill="#e74c3c" font-size="7">{{ obstacleName }}</text>
      <text v-if="obstacleLoss > 0" x="143" y="56" fill="#e74c3c" font-size="7">-{{ obstacleLoss }}dB</text>

      <!-- 距离标注 -->
      <text x="155" y="68" fill="var(--text-dim)" font-size="8">d = {{ distance }}m</text>
      <text x="155" y="78" fill="var(--text-dim)" font-size="7">2.4GHz ISM</text>

      <!-- 继续波纹 -->
      <path d="M180,20 q8,-6 16,0 q8,6 16,0 q8,-6 16,0" fill="none" stroke="var(--accent)" stroke-width="1.5" opacity="0.7"/>

      <!-- RX 节点 -->
      <rect x="285" y="30" width="55" height="50" rx="3" fill="none" stroke="var(--text)" stroke-width="1.5"/>
      <text x="293" y="45" fill="var(--text)" font-size="9">RX</text>
      <text x="290" y="55" fill="var(--text-dim)" font-size="7">Slave</text>
      <text x="290" y="65" fill="var(--text-dim)" font-size="7">BLE</text>
      <!-- RX 天线 -->
      <line x1="312" y1="30" x2="312" y2="15" stroke="var(--wire)" stroke-width="2"/>
      <line x1="307" y1="15" x2="317" y2="15" stroke="var(--wire)" stroke-width="2"/>
      <line x1="309" y1="18" x2="315" y2="18" stroke="var(--wire)" stroke-width="1.5"/>
      <line x1="311" y1="21" x2="313" y2="21" stroke="var(--wire)" stroke-width="1"/>
      <text x="272" y="18" fill="var(--text-dim)" font-size="7">{{ rxGain }}dBi</text>

      <!-- 链路预算标注 -->
      <text x="100" y="100" fill="var(--text-dim)" font-size="8">P_tx = {{ txPower }}dBm → FSPL = -{{ fspl }}dB → RSSI = {{ rssi }}dBm</text>
    </svg>

    <!-- RSSI display -->
    <div class="ble-rssi-display">
      <div class="ble-rssi-value" :class="rssiClass">
        {{ rssi }} dBm
      </div>
      <div class="ble-quality" :class="rssiClass">{{ qualityText }}</div>
    </div>

    <!-- Signal bar -->
    <div class="ble-signal-bar-container">
      <div class="ble-signal-bar">
        <div class="ble-signal-safe-zone"></div>
        <div class="ble-signal-fill" :style="{ width: qualityPct + '%', background: signalColor }"></div>
        <div class="ble-sensitivity-marker" :style="{ left: sensitivityPercent + '%' }">
          <span class="ble-sens-label">灵敏度</span>
        </div>
      </div>
      <div class="ble-signal-labels">
        <span>-100dBm</span>
        <span class="ble-safe-label">可用区</span>
        <span>0dBm</span>
      </div>
    </div>

    <!-- Link budget breakdown -->
    <div class="ble-budget">
      <div class="ble-budget-row">
        <span class="ble-b-label">发射功率</span>
        <span class="ble-b-value ble-b-pos">{{ txPower > 0 ? '+' : '' }}{{ txPower }} dBm</span>
      </div>
      <div class="ble-budget-row">
        <span class="ble-b-label">天线增益</span>
        <span class="ble-b-value ble-b-pos">+{{ txGain + rxGain }} dB</span>
      </div>
      <div class="ble-budget-row">
        <span class="ble-b-label">自由空间损耗</span>
        <span class="ble-b-value ble-b-neg">-{{ fspl }} dB</span>
      </div>
      <div class="ble-budget-row" v-if="obstacleLoss > 0">
        <span class="ble-b-label">障碍物衰减 ({{ obstacleName }})</span>
        <span class="ble-b-value ble-b-neg">-{{ obstacleLoss }} dB</span>
      </div>
      <div class="ble-budget-divider"></div>
      <div class="ble-budget-row ble-budget-total">
        <span class="ble-b-label">接收RSSI</span>
        <span class="ble-b-value" :class="rssiClass">{{ rssi }} dBm</span>
      </div>
      <div class="ble-budget-row">
        <span class="ble-b-label">链路余量</span>
        <span class="ble-b-value" :class="{ 'ble-b-warn': margin < 10, 'ble-b-ok': margin >= 10 }">
          {{ margin > 0 ? '+' : '' }}{{ margin }} dB
        </span>
      </div>
      <div class="ble-budget-row">
        <span class="ble-b-label">估算最大距离</span>
        <span class="ble-b-value">{{ maxDistance }} m</span>
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
const txPower = computed(() => props.simResult?.txPower ?? 0)
const txGain = computed(() => props.simResult?.txGain ?? 0)
const rxGain = computed(() => props.simResult?.rxGain ?? 0)
const fspl = computed(() => props.simResult?.fspl ?? 0)
const obstacleLoss = computed(() => props.simResult?.obstacleLoss ?? 0)
const obstacleName = computed(() => props.simResult?.obstacleName ?? '')
const margin = computed(() => props.simResult?.margin ?? 0)
const qualityPct = computed(() => props.simResult?.qualityPct ?? 0)
const maxDistance = computed(() => props.simResult?.maxDistance?.toFixed(1) ?? '—')
const distance = computed(() => props.simResult?.distance ?? 10)

const rssiClass = computed(() => {
  const q = props.simResult?.quality
  if (q === 'none') return 'ble-q-none'
  if (q === 'poor') return 'ble-q-poor'
  if (q === 'fair') return 'ble-q-fair'
  return 'ble-q-good'
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

const sensitivityPercent = computed(() => {
  const s = props.simResult?.rxSensitivity || -90
  return Math.max(0, Math.min(100, (s + 100) / 100 * 100))
})
</script>

<style scoped>
.ble-view { display: flex; flex-direction: column; gap: 10px; padding: 8px 0; }
.ble-formula { text-align: center; background: var(--surface-light); border-radius: 8px; padding: 8px; }
.formula-text { font-family: 'Courier New', monospace; font-size: 12px; color: var(--text-dim); }
.ble-rssi-display { display: flex; align-items: baseline; gap: 12px; justify-content: center; padding: 8px 0; }
.ble-rssi-value { font-size: 32px; font-weight: 800; color: var(--success); font-family: monospace; }
.ble-quality { font-size: 14px; font-weight: 600; }
.ble-q-good { color: var(--success); }
.ble-q-fair { color: var(--warning); }
.ble-q-poor { color: #f39c12; }
.ble-q-none { color: var(--danger); }
.ble-rssi-display .ble-q-none, .ble-rssi-display .ble-q-poor { color: var(--danger); }
.ble-signal-bar-container { display: flex; flex-direction: column; gap: 4px; }
.ble-signal-bar { position: relative; height: 20px; background: var(--surface-light); border-radius: 4px; overflow: hidden; }
.ble-signal-safe-zone { position: absolute; left: 10%; width: 90%; height: 100%; background: rgba(46,204,113,0.1); }
.ble-signal-fill { position: absolute; height: 100%; transition: all 0.3s; border-radius: 4px; }
.ble-sensitivity-marker { position: absolute; top: -2px; height: calc(100% + 4px); width: 2px; background: var(--danger); opacity: 0.7; }
.ble-sens-label { position: absolute; top: -14px; left: 50%; transform: translateX(-50%); font-size: 9px; color: var(--danger); white-space: nowrap; }
.ble-signal-labels { display: flex; justify-content: space-between; font-size: 10px; color: var(--text-dim); }
.ble-safe-label { color: var(--success); }
.ble-budget { display: flex; flex-direction: column; gap: 4px; background: var(--surface-light); border-radius: 8px; padding: 10px 12px; }
.ble-budget-row { display: flex; justify-content: space-between; align-items: center; }
.ble-b-label { font-size: 12px; color: var(--text-dim); }
.ble-b-value { font-size: 14px; font-weight: 700; font-family: monospace; color: var(--text); }
.ble-b-pos { color: var(--success); }
.ble-b-neg { color: var(--danger); }
.ble-b-warn { color: var(--warning); }
.ble-b-ok { color: var(--success); }
.ble-budget-divider { height: 1px; background: var(--border); margin: 4px 0; }
.ble-budget-total .ble-b-value { font-size: 18px; }
.ble-topology {
  width: 100%;
  max-width: 400px;
  height: auto;
}
</style>
