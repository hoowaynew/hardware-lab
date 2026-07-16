<template>
  <div class="dp-view">
    <div class="dp-formula">
      <span class="formula-text">Z_diff ≈ 2×Z₀×(1 - 0.48×e^(-0.96×S/H))</span>
    </div>

    <div v-if="simResult" class="dp-results">
      <div class="dp-impedance-display">
        <div class="imp-label">差分阻抗</div>
        <div class="imp-value" :class="{ error: Math.abs(simResult.impErrorPct) > 10 }">
          {{ simResult.zDiff.toFixed(1) }} <span class="unit">Ω</span>
        </div>
        <div class="imp-detail">
          目标: {{ simResult.targetImpedance }}Ω | 偏差: {{ simResult.impErrorPct > 0 ? '+' : '' }}{{ simResult.impErrorPct.toFixed(2) }}%
        </div>
      </div>

      <div class="dp-cross-section">
        <svg class="circuit-svg" viewBox="0 0 300 120" xmlns="http://www.w3.org/2000/svg">
          <!-- substrate -->
          <rect x="20" y="70" width="260" height="30" fill="#8B4513" rx="2" opacity="0.6"/>
          <text x="150" y="90" text-anchor="middle" fill="#fff" font-size="10">FR4 (Er={{ simResult.substrateH }}mm)</text>
          <!-- trace D+ -->
          <rect x="120" y="62" width="20" height="4" fill="#2ecc71" rx="1"/>
          <text x="130" y="58" text-anchor="middle" fill="#2ecc71" font-size="10">D+ W={{ simResult.traceWidth }}mm</text>
          <!-- trace D- -->
          <rect x="160" y="62" width="20" height="4" fill="#3498db" rx="1"/>
          <text x="170" y="58" text-anchor="middle" fill="#3498db" font-size="10">D- W={{ simResult.traceWidth }}mm</text>
          <!-- gap annotation -->
          <line x1="140" y1="55" x2="160" y2="55" stroke="#f39c12" stroke-width="1" marker-end="url(#arrow)" marker-start="url(#arrow)"/>
          <text x="150" y="48" text-anchor="middle" fill="#f39c12" font-size="9">S={{ simResult.traceGap }}mm</text>
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#f39c12"/>
            </marker>
          </defs>
          <!-- ground plane -->
          <rect x="20" y="100" width="260" height="3" fill="#ccc"/>
          <text x="150" y="115" text-anchor="middle" fill="#888" font-size="9">GND Plane</text>
        </svg>
      </div>

      <div class="dp-skew-bar">
        <div class="skew-label">
          <span>时序偏斜 (Skew)</span>
          <span :class="{ ok: simResult.skewOk, bad: !simResult.skewOk }">{{ simResult.skewPs.toFixed(1) }}ps / {{ simResult.maxSkewPs.toFixed(1) }}ps</span>
        </div>
        <div class="skew-bar">
          <div class="skew-fill" :class="{ bad: !simResult.skewOk }" :style="{ width: Math.min(100, Math.abs(simResult.skewPs) / simResult.maxSkewPs * 50) + '%' }"></div>
        </div>
      </div>

      <div class="param-grid">
        <div class="param-item">
          <span class="param-label">单端阻抗</span>
          <span class="param-val">{{ simResult.z0.toFixed(1) }}Ω</span>
        </div>
        <div class="param-item">
          <span class="param-label">耦合系数</span>
          <span class="param-val">{{ simResult.couplingK.toFixed(3) }}</span>
        </div>
        <div class="param-item">
          <span class="param-label">模态转换</span>
          <span class="param-val">{{ simResult.modeConversionDb }}dB</span>
        </div>
        <div class="param-item">
          <span class="param-label">眼图高度</span>
          <span class="param-val" :class="{ warn: simResult.eyeHeightPct < 70 }">{{ simResult.eyeHeightPct }}%</span>
        </div>
        <div class="param-item">
          <span class="param-label">长度失配</span>
          <span class="param-val">{{ simResult.lengthMismatch }}mm</span>
        </div>
        <div class="param-item">
          <span class="param-label">抖动</span>
          <span class="param-val">{{ simResult.jitterPs.toFixed(1) }}ps</span>
        </div>
      </div>
    </div>

    <div v-else class="dp-placeholder">
      配置差分走线参数，分析阻抗与等长
    </div>
  </div>
</template>

<script setup>
defineProps({ simResult: { type: Object, default: null } })
</script>

<style scoped>
.dp-view { padding: 12px 16px; background: var(--bg-card, #1a1a2e); border-radius: 8px; margin: 8px 0; }
.dp-formula { text-align: center; margin-bottom: 12px; }
.formula-text { font-size: 12px; color: var(--text-secondary, #888); font-family: monospace; }
.dp-results { display: flex; flex-direction: column; gap: 12px; }
.dp-impedance-display { text-align: center; padding: 16px; background: rgba(155, 89, 182, 0.1); border-radius: 8px; }
.imp-label { font-size: 12px; color: var(--text-secondary, #888); }
.imp-value { font-size: 36px; font-weight: bold; color: #9b59b6; }
.imp-value.error { color: #e74c3c; }
.unit { font-size: 18px; font-weight: normal; }
.imp-detail { font-size: 11px; color: var(--text-secondary, #888); margin-top: 4px; }
.dp-cross-section { display: flex; justify-content: center; }
.circuit-svg { width: 100%; max-width: 400px; height: auto; }
.dp-skew-bar { display: flex; flex-direction: column; gap: 4px; }
.skew-label { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary, #888); }
.skew-label .ok { color: #2ecc71; }
.skew-label .bad { color: #e74c3c; }
.skew-bar { height: 12px; background: rgba(255,255,255,0.06); border-radius: 4px; }
.skew-fill { height: 100%; border-radius: 4px; background: #2ecc71; transition: width 0.3s; }
.skew-fill.bad { background: #e74c3c; }
.param-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.param-item { display: flex; justify-content: space-between; padding: 6px 10px; background: rgba(255,255,255,0.04); border-radius: 4px; font-size: 12px; }
.param-label { color: var(--text-secondary, #888); }
.param-val { color: var(--text-primary, #ccc); }
.param-val.warn { color: #f39c12; }
.dp-placeholder { text-align: center; color: var(--text-secondary, #888); font-size: 13px; padding: 20px; }
</style>