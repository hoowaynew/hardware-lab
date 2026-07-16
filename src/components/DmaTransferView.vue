<template>
  <div class="dma-view">
    <div class="dma-formula">
      <span class="formula-text">DMA搬运时间 = 总突发数 × 突发周期 / 时钟频率</span>
    </div>

    <div v-if="simResult" class="dma-results">
      <div class="result-row">
        <div class="result-card dma-card">
          <div class="card-title">DMA 直传</div>
          <div class="card-value">{{ simResult.dmaTimeUs }}μs</div>
          <div class="card-sub">CPU占用: {{ simResult.dmaCpuUsage }}%</div>
          <div class="card-throughput">{{ simResult.dmaThroughput }}</div>
        </div>
        <div class="vs-arrow">VS</div>
        <div class="result-card cpu-card">
          <div class="card-title">CPU 轮询</div>
          <div class="card-value">{{ simResult.cpuPollTimeUs }}μs</div>
          <div class="card-sub">CPU占用: {{ simResult.cpuUsagePoll }}%</div>
          <div class="card-throughput">{{ simResult.cpuThroughput }}</div>
        </div>
      </div>

      <div class="speedup-bar">
        <span class="speedup-label">加速比</span>
        <span class="speedup-value">{{ simResult.speedupFactor }}×</span>
        <span class="speedup-desc">DMA比CPU快{{ simResult.speedupFactor }}倍</span>
      </div>

      <div class="param-grid">
        <div class="param-item">
          <span class="param-label">数据路径</span>
          <span class="param-val">{{ simResult.src }} → {{ simResult.dst }}</span>
        </div>
        <div class="param-item">
          <span class="param-label">传输模式</span>
          <span class="param-val">{{ simResult.mode }}</span>
        </div>
        <div class="param-item">
          <span class="param-label">每次突发</span>
          <span class="param-val">{{ simResult.bytesPerBurst }} 字节 × {{ simResult.totalBursts }}次</span>
        </div>
        <div class="param-item">
          <span class="param-label">总线带宽占用</span>
          <span class="param-val">{{ simResult.bandwidthPct }}%</span>
        </div>
      </div>

      <div v-if="simResult.fifoOverflow" class="dma-warning">
        <span>⚠️ FIFO溢出！突发{{ simResult.burstSize }}×{{ simResult.dataWidth }}位={{ simResult.bytesPerBurst }}B > FIFO深度{{ simResult.fifoDepth }}B</span>
      </div>
    </div>

    <div v-else class="dma-placeholder">
      配置DMA通道参数，对比传输效率
    </div>
  </div>
</template>

<script setup>
defineProps({ simResult: { type: Object, default: null } })
</script>

<style scoped>
.dma-view {
  padding: 12px 16px;
  background: var(--bg-card, #1a1a2e);
  border-radius: 8px;
  margin: 8px 0;
}
.dma-formula {
  text-align: center;
  margin-bottom: 12px;
}
.formula-text {
  font-size: 12px;
  color: var(--text-secondary, #888);
  font-family: monospace;
}
.dma-results { display: flex; flex-direction: column; gap: 12px; }
.result-row { display: flex; align-items: center; gap: 8px; }
.result-card {
  flex: 1;
  padding: 12px;
  border-radius: 6px;
  text-align: center;
}
.dma-card { background: rgba(46, 204, 113, 0.15); border: 1px solid #2ecc71; }
.cpu-card { background: rgba(231, 76, 60, 0.15); border: 1px solid #e74c3c; }
.card-title { font-size: 12px; color: var(--text-secondary, #888); margin-bottom: 4px; }
.card-value { font-size: 24px; font-weight: bold; }
.dma-card .card-value { color: #2ecc71; }
.cpu-card .card-value { color: #e74c3c; }
.card-sub { font-size: 11px; color: var(--text-secondary, #888); margin-top: 4px; }
.card-throughput { font-size: 11px; color: var(--text-primary, #ccc); margin-top: 2px; }
.vs-arrow { font-size: 14px; font-weight: bold; color: var(--text-secondary, #888); }
.speedup-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  background: rgba(52, 152, 219, 0.1);
  border-radius: 6px;
}
.speedup-label { font-size: 12px; color: var(--text-secondary, #888); }
.speedup-value { font-size: 18px; font-weight: bold; color: #3498db; }
.speedup-desc { font-size: 11px; color: var(--text-primary, #ccc); margin-left: auto; }
.param-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.param-item {
  display: flex; justify-content: space-between;
  padding: 6px 10px;
  background: rgba(255,255,255,0.04);
  border-radius: 4px;
  font-size: 12px;
}
.param-label { color: var(--text-secondary, #888); }
.param-val { color: var(--text-primary, #ccc); }
.dma-warning {
  color: #e74c3c;
  font-size: 12px;
  padding: 6px 10px;
  background: rgba(231,76,60,0.1);
  border-radius: 4px;
}
.dma-placeholder {
  text-align: center;
  color: var(--text-secondary, #888);
  font-size: 13px;
  padding: 20px;
}
</style>