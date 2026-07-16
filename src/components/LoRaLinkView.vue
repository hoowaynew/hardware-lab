<template>
  <div class="lora-view">
    <div class="lora-formula">
      <span class="formula-text">Ts = 2^SF / BW | 链路余量 = RSSI - Sensitivity</span>
    </div>

    <div v-if="simResult" class="lora-results">
      <div class="lora-airtime-display">
        <div class="airtime-label">空中时间</div>
        <div class="airtime-value">{{ simResult.airTimeMs.toFixed(0) }} <span class="unit">ms</span></div>
        <div class="airtime-detail">数据速率: {{ simResult.dataRate }}</div>
      </div>

      <div class="lora-link-bar">
        <div class="link-label">
          <span>链路余量</span>
          <span :class="{ ok: simResult.linkMargin > 10, fair: simResult.linkMargin > 0 && simResult.linkMargin <= 10, bad: simResult.linkMargin <= 0 }">
            {{ simResult.linkMargin.toFixed(1) }}dB
          </span>
        </div>
        <div class="link-bar">
          <div class="link-fill" :class="simResult.quality" :style="{ width: Math.max(0, Math.min(100, (simResult.linkMargin + 20) / 40 * 100)) + '%' }"></div>
        </div>
        <div class="link-sub">
          RSSI: {{ simResult.rssi }}dBm | 灵敏度: {{ simResult.sensitivity }}dBm | 最远: {{ simResult.maxDistanceKm }}km
        </div>
      </div>

      <div class="param-grid">
        <div class="param-item">
          <span class="param-label">扩频因子</span>
          <span class="param-val">SF{{ simResult.sf }}</span>
        </div>
        <div class="param-item">
          <span class="param-label">带宽</span>
          <span class="param-val">{{ simResult.bw }}kHz</span>
        </div>
        <div class="param-item">
          <span class="param-label">编码率</span>
          <span class="param-val">{{ simResult.cr }}</span>
        </div>
        <div class="param-item">
          <span class="param-label">符号时间</span>
          <span class="param-val">{{ simResult.symbolTimeMs }}ms</span>
        </div>
        <div class="param-item">
          <span class="param-label">SNR</span>
          <span class="param-val" :class="{ warn: simResult.snr < 0 }">{{ simResult.snr }}dB</span>
        </div>
        <div class="param-item">
          <span class="param-label">每包能耗</span>
          <span class="param-val">{{ simResult.energyPerPacket }}mA·ms</span>
        </div>
      </div>

      <div v-if="simResult.quality === 'none'" class="lora-warning">
        ⚠️ 链路预算不足！RSSI低于灵敏度{{ (simResult.sensitivity - simResult.rssi).toFixed(1) }}dB
      </div>
    </div>

    <div v-else class="lora-placeholder">
      配置LoRa参数，评估通信距离与功耗
    </div>
  </div>
</template>

<script setup>
defineProps({ simResult: { type: Object, default: null } })
</script>

<style scoped>
.lora-view { padding: 12px 16px; background: var(--bg-card, #1a1a2e); border-radius: 8px; margin: 8px 0; }
.lora-formula { text-align: center; margin-bottom: 12px; }
.formula-text { font-size: 12px; color: var(--text-secondary, #888); font-family: monospace; }
.lora-results { display: flex; flex-direction: column; gap: 12px; }
.lora-airtime-display { text-align: center; padding: 16px; background: rgba(52, 152, 219, 0.1); border-radius: 8px; }
.airtime-label { font-size: 12px; color: var(--text-secondary, #888); }
.airtime-value { font-size: 36px; font-weight: bold; color: #3498db; }
.unit { font-size: 18px; font-weight: normal; }
.airtime-detail { font-size: 11px; color: var(--text-secondary, #888); margin-top: 4px; }
.lora-link-bar { display: flex; flex-direction: column; gap: 4px; }
.link-label { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary, #888); }
.link-label .ok { color: #2ecc71; }
.link-label .fair { color: #f39c12; }
.link-label .bad { color: #e74c3c; }
.link-bar { height: 14px; background: rgba(255,255,255,0.06); border-radius: 4px; }
.link-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
.link-fill.excellent { background: #2ecc71; }
.link-fill.good { background: #27ae60; }
.link-fill.fair { background: #f39c12; }
.link-fill.none { background: #e74c3c; }
.link-sub { font-size: 11px; color: var(--text-secondary, #888); }
.param-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.param-item { display: flex; justify-content: space-between; padding: 6px 10px; background: rgba(255,255,255,0.04); border-radius: 4px; font-size: 12px; }
.param-label { color: var(--text-secondary, #888); }
.param-val { color: var(--text-primary, #ccc); }
.param-val.warn { color: #f39c12; }
.lora-warning { color: #e74c3c; font-size: 12px; padding: 6px 10px; background: rgba(231,76,60,0.1); border-radius: 4px; }
.lora-placeholder { text-align: center; color: var(--text-secondary, #888); font-size: 13px; padding: 20px; }
</style>