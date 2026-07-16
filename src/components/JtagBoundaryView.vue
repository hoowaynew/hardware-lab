<template>
  <div class="jtag-view">
    <div class="jtag-formula">
      <span class="formula-text">TAP: 16态FSM | 扫描周期 = (5+IR长) + (5+DR长) TCK</span>
    </div>

    <div v-if="simResult" class="jtag-results">
      <div class="jtag-scan-display">
        <div class="scan-label">边界扫描结果</div>
        <div class="scan-value">{{ simResult.detectableFaults }} <span class="unit">/ {{ simResult.stuckAtFaults }} 故障可检测</span></div>
        <div class="scan-detail">覆盖率: {{ simResult.faultCoverage }}% | 扫描时间: {{ simResult.scanTimeUs }}μs</div>
      </div>

      <div class="jtag-tap-diagram">
        <svg class="circuit-svg" viewBox="0 0 300 80" xmlns="http://www.w3.org/2000/svg">
          <!-- TDI -->
          <text x="10" y="20" fill="#2ecc71" font-size="9">TDI →</text>
          <rect x="40" y="10" width="50" height="20" fill="rgba(46,204,113,0.2)" stroke="#2ecc71" rx="3"/>
          <text x="65" y="24" text-anchor="middle" fill="#2ecc71" font-size="8">D1 TAP</text>
          <rect x="100" y="10" width="50" height="20" fill="rgba(52,152,219,0.2)" stroke="#3498db" rx="3"/>
          <text x="125" y="24" text-anchor="middle" fill="#3498db" font-size="8">D2 TAP</text>
          <rect x="160" y="10" width="50" height="20" fill="rgba(155,89,182,0.2)" stroke="#9b59b6" rx="3"/>
          <text x="185" y="24" text-anchor="middle" fill="#9b59b6" font-size="8">D3 TAP</text>
          <text x="225" y="20" fill="#e74c3c" font-size="9">→ TDO</text>
          <!-- Chain -->
          <line x1="90" y1="20" x2="100" y2="20" stroke="#888" stroke-width="1"/>
          <line x1="150" y1="20" x2="160" y2="20" stroke="#888" stroke-width="1"/>
          <line x1="40" y1="20" x2="35" y2="20" stroke="#2ecc71" stroke-width="1"/>
          <line x1="210" y1="20" x2="215" y2="20" stroke="#e74c3c" stroke-width="1"/>
          <!-- TMS/TCK shared -->
          <text x="150" y="50" text-anchor="middle" fill="#888" font-size="9">TMS + TCK → 所有器件</text>
          <line x1="150" y1="30" x2="150" y2="40" stroke="#888" stroke-width="1" stroke-dasharray="2"/>
        </svg>
        <div class="chain-info">扫描链: {{ simResult.deviceCount }}器件 | IR={{ simResult.irLength }}b DR={{ simResult.drLength }}b</div>
      </div>

      <div class="param-grid">
        <div class="param-item">
          <span class="param-label">扫描模式</span>
          <span class="param-val">{{ simResult.scanMode }}</span>
        </div>
        <div class="param-item">
          <span class="param-label">TCK频率</span>
          <span class="param-val">{{ simResult.tckFreq }}MHz</span>
        </div>
        <div class="param-item">
          <span class="param-label">总扫描周期</span>
          <span class="param-val">{{ simResult.totalCycles }} TCK</span>
        </div>
        <div class="param-item">
          <span class="param-label">可测引脚</span>
          <span class="param-val">{{ simResult.pinsTestable }}个</span>
        </div>
        <div class="param-item">
          <span class="param-label">信号质量</span>
          <span class="param-val" :class="{ warn: simResult.glitches > 0 }">{{ simResult.signalIntegrity }}</span>
        </div>
        <div class="param-item">
          <span class="param-label">上拉电阻</span>
          <span class="param-val" :class="{ warn: !simResult.hasPullup }">{{ simResult.hasPullup ? '有(10kΩ)' : '无！⚠️' }}</span>
        </div>
        <div class="param-item">
          <span class="param-label">JTAG引脚数</span>
          <span class="param-val">{{ simResult.jtagPins }} (TDI/TDO/TMS/TCK/TRST)</span>
        </div>
        <div class="param-item">
          <span class="param-label">SWD引脚数</span>
          <span class="param-val">{{ simResult.swdPins }} (SWDIO/SWCLK) 省{{ simResult.pinReduction }}脚</span>
        </div>
      </div>

      <div v-if="simResult.floatingErrors > 0" class="jtag-warning">
        ⚠️ 无上拉电阻！错误率{{ simResult.floatingErrors }}%，TAP状态机失控
      </div>
    </div>

    <div v-else class="jtag-placeholder">
      配置JTAG参数，模拟边界扫描测试
    </div>
  </div>
</template>

<script setup>
defineProps({ simResult: { type: Object, default: null } })
</script>

<style scoped>
.jtag-view { padding: 12px 16px; background: var(--bg-card, #1a1a2e); border-radius: 8px; margin: 8px 0; }
.jtag-formula { text-align: center; margin-bottom: 12px; }
.formula-text { font-size: 12px; color: var(--text-secondary, #888); font-family: monospace; }
.jtag-results { display: flex; flex-direction: column; gap: 12px; }
.jtag-scan-display { text-align: center; padding: 16px; background: rgba(155, 89, 182, 0.1); border-radius: 8px; }
.scan-label { font-size: 12px; color: var(--text-secondary, #888); }
.scan-value { font-size: 28px; font-weight: bold; color: #9b59b6; }
.unit { font-size: 14px; font-weight: normal; color: var(--text-secondary, #888); }
.scan-detail { font-size: 11px; color: var(--text-secondary, #888); margin-top: 4px; }
.jtag-tap-diagram { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.circuit-svg { width: 100%; max-width: 400px; height: auto; }
.chain-info { font-size: 11px; color: var(--text-secondary, #888); }
.param-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.param-item { display: flex; justify-content: space-between; padding: 6px 10px; background: rgba(255,255,255,0.04); border-radius: 4px; font-size: 12px; }
.param-label { color: var(--text-secondary, #888); }
.param-val { color: var(--text-primary, #ccc); }
.param-val.warn { color: #e74c3c; }
.jtag-warning { color: #e74c3c; font-size: 12px; padding: 6px 10px; background: rgba(231,76,60,0.1); border-radius: 4px; }
.jtag-placeholder { text-align: center; color: var(--text-secondary, #888); font-size: 13px; padding: 20px; }
</style>