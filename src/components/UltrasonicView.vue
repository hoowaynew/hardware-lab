<template>
  <div class="us-view">
    <div class="us-formula">
      <span class="formula-text">d = v × t_echo / 2，v = 331.3 + 0.606 × T (°C)</span>
    </div>

    <div v-if="simResult" class="us-results">
      <div class="us-distance-display">
        <div class="distance-label">测距结果</div>
        <div class="distance-value" :class="{ error: simResult.error }">
          {{ simResult.measuredDistance.toFixed(1) }} <span class="unit">cm</span>
        </div>
        <div class="distance-detail">
          回波时间: {{ simResult.echoTimeUs.toFixed(0) }}μs | 声速: {{ simResult.soundSpeed }}m/s
        </div>
      </div>

      <div class="us-bar-container">
        <div class="bar-label">
          <span>障碍物反射率</span>
          <span>{{ simResult.echoAmplitude }}%</span>
        </div>
        <div class="us-bar">
          <div class="bar-fill reflectivity" :style="{ width: simResult.echoAmplitude + '%' }"></div>
          <div class="bar-threshold" :style="{ left: simResult.detectionThreshold + '%' }"></div>
        </div>
      </div>

      <div class="param-grid">
        <div class="param-item">
          <span class="param-label">目标距离</span>
          <span class="param-val">{{ simResult.targetDistance }}cm</span>
        </div>
        <div class="param-item">
          <span class="param-label">温度误差</span>
          <span class="param-val" :class="{ warn: Math.abs(simResult.tempErrorCm) > 1 }">
            {{ simResult.tempErrorCm > 0 ? '+' : '' }}{{ simResult.tempErrorCm.toFixed(2) }}cm
          </span>
        </div>
        <div class="param-item">
          <span class="param-label">障碍物类型</span>
          <span class="param-val">{{ simResult.obstacleName }}</span>
        </div>
        <div class="param-item">
          <span class="param-label">测量抖动</span>
          <span class="param-val">±{{ simResult.noiseJitter }}cm</span>
        </div>
        <div class="param-item">
          <span class="param-label">检测频率</span>
          <span class="param-val">{{ simResult.maxRate }}Hz</span>
        </div>
        <div class="param-item">
          <span class="param-label">量程范围</span>
          <span class="param-val">{{ simResult.minRange }}~{{ simResult.maxRange }}cm</span>
        </div>
      </div>

      <div v-if="!simResult.detectable && !simResult.error" class="us-info">
        ℹ️ 回波幅度低于检测阈值{{ simResult.detectionThreshold }}%，可能误判
      </div>
    </div>

    <div v-else class="us-placeholder">
      配置超声波参数，模拟测距过程
    </div>
  </div>
</template>

<script setup>
defineProps({ simResult: { type: Object, default: null } })
</script>

<style scoped>
.us-view {
  padding: 12px 16px;
  background: var(--bg-card, #1a1a2e);
  border-radius: 8px;
  margin: 8px 0;
}
.us-formula { text-align: center; margin-bottom: 12px; }
.formula-text { font-size: 12px; color: var(--text-secondary, #888); font-family: monospace; }
.us-results { display: flex; flex-direction: column; gap: 12px; }
.us-distance-display {
  text-align: center;
  padding: 16px;
  background: rgba(52, 152, 219, 0.1);
  border-radius: 8px;
}
.distance-label { font-size: 12px; color: var(--text-secondary, #888); }
.distance-value { font-size: 36px; font-weight: bold; color: #3498db; }
.distance-value.error { color: #e74c3c; }
.unit { font-size: 18px; font-weight: normal; }
.distance-detail { font-size: 11px; color: var(--text-secondary, #888); margin-top: 4px; }
.us-bar-container { display: flex; flex-direction: column; gap: 4px; }
.bar-label { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary, #888); }
.us-bar { position: relative; height: 16px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: visible; }
.bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
.bar-fill.reflectivity { background: linear-gradient(90deg, #e74c3c, #f39c12, #2ecc71); }
.bar-threshold { position: absolute; top: -2px; bottom: -2px; width: 2px; background: #fff; opacity: 0.5; }
.param-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.param-item { display: flex; justify-content: space-between; padding: 6px 10px; background: rgba(255,255,255,0.04); border-radius: 4px; font-size: 12px; }
.param-label { color: var(--text-secondary, #888); }
.param-val { color: var(--text-primary, #ccc); }
.param-val.warn { color: #f39c12; }
.us-info { font-size: 12px; color: #3498db; padding: 6px 10px; background: rgba(52,152,219,0.1); border-radius: 4px; }
.us-placeholder { text-align: center; color: var(--text-secondary, #888); font-size: 13px; padding: 20px; }
</style>