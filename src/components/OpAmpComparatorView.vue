<template>
  <div class="opamp-view">
    <!-- 公式区 -->
    <div class="formula-bar">
      <span class="formula">V<sub>out</sub> = (V+ &gt; V−) ? V<sub>HIGH</sub> : V<sub>LOW</sub></span>
      <span class="formula-sep">|</span>
      <span class="formula">迟滞宽度 = R<sub>f</sub>/(R<sub>1</sub>+R<sub>f</sub>) × ΔV<sub>out</sub></span>
    </div>

    <!-- 运放电路图 -->
    <svg class="opamp-svg" viewBox="0 0 360 200">
      <!-- 运放三角形 -->
      <polygon points="130,60 130,140 210,100" fill="var(--card-bg)" stroke="var(--wire)" stroke-width="2"/>
      <text x="145" y="78" fill="#888" font-size="10">−</text>
      <text x="145" y="128" fill="#888" font-size="10">+</text>
      <text x="168" y="105" text-anchor="middle" fill="var(--text-dim)" font-size="9">A→∞</text>

      <!-- V- 参考电压输入 -->
      <text x="30" y="72" fill="#888" font-size="11">V−={{ vref.toFixed(2) }}V</text>
      <line x1="30" y1="78" x2="130" y2="78" stroke="var(--wire)" stroke-width="2"/>

      <!-- V+ 传感器输入 -->
      <text x="30" y="132" fill="var(--accent)" font-size="11">V+={{ vin.toFixed(2) }}V</text>
      <line x1="30" y1="122" x2="130" y2="122" stroke="var(--wire)" stroke-width="2"/>

      <!-- 传感器图标 -->
      <circle cx="22" cy="122" r="8" fill="none" stroke="var(--accent)" stroke-width="1.5"/>
      <text x="22" y="126" text-anchor="middle" fill="var(--accent)" font-size="8">T°</text>

      <!-- 输出 -->
      <line x1="210" y1="100" x2="290" y2="100" :stroke="outputHigh ? 'var(--accent)' : 'var(--wire)'" stroke-width="2.5"/>
      <text x="240" y="92" :fill="outputHigh ? 'var(--accent)' : '#888'" font-size="12" font-weight="bold">
        {{ outputHigh ? 'HIGH' : 'LOW' }}
      </text>
      <text x="270" y="115" fill="var(--text-dim)" font-size="10">{{ outputVoltage.toFixed(1) }}V</text>

      <!-- 报警LED -->
      <circle cx="310" cy="100" r="12" :fill="outputHigh ? '#ff4444' : '#333'" :opacity="outputHigh ? '1' : '0.3'">
        <animate v-if="outputHigh && chattering" attributeName="opacity" values="1;0.3;1" dur="0.15s" repeatCount="indefinite"/>
      </circle>
      <text x="310" y="104" text-anchor="middle" :fill="outputHigh ? '#fff' : '#666'" font-size="8">ALARM</text>

      <!-- 迟滞反馈电阻 -->
      <path v-if="hysteresis > 0" d="M210 100 L210 160 L290 160 L290 100" fill="none" stroke="#f39c12" stroke-width="1.5" stroke-dasharray="4 2"/>
      <text v-if="hysteresis > 0" x="250" y="175" text-anchor="middle" fill="#f39c12" font-size="9">Rf ({{ hysteresis }}mV)</text>

      <!-- 电源 -->
      <line x1="170" y1="60" x2="170" y2="45" stroke="var(--wire)" stroke-width="1" opacity="0.5"/>
      <text x="170" y="40" text-anchor="middle" fill="#888" font-size="9">VCC={{ vcc }}V</text>
      <line x1="170" y1="140" x2="170" y2="155" stroke="var(--wire)" stroke-width="1" opacity="0.5"/>
      <text x="170" y="168" text-anchor="middle" fill="#888" font-size="9">GND</text>

      <!-- 迟滞传输特性曲线 -->
      <text x="20" y="195" fill="#888" font-size="9">传输特性:</text>
    </svg>

    <!-- 传输特性曲线 -->
    <svg class="transfer-curve" viewBox="0 0 280 80">
      <!-- 坐标轴 -->
      <line x1="10" y1="70" x2="270" y2="70" stroke="var(--wire)" stroke-width="1" opacity="0.5"/>
      <line x1="10" y1="10" x2="10" y2="70" stroke="var(--wire)" stroke-width="1" opacity="0.5"/>
      <text x="5" y="8" fill="#888" font-size="8">Vout</text>
      <text x="265" y="78" fill="#888" font-size="8">Vin</text>

      <!-- 迟滞回线 -->
      <path :d="transferPath" fill="none" :stroke="hysteresis > 0 ? '#f39c12' : 'var(--accent)'" stroke-width="2"/>
      <!-- 当前工作点 -->
      <circle :cx="workPointX" :cy="workPointY" r="4" fill="var(--accent)" stroke="#fff" stroke-width="1">
        <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite"/>
      </circle>
    </svg>

    <!-- 数据面板 -->
    <div class="data-panel">
      <div class="data-row">
        <span class="label">输入差值</span>
        <span class="value" :class="{ warn: Math.abs(vin - vref) < 0.1 }">
          {{ (vin - vref).toFixed(3) }}V
        </span>
      </div>
      <div class="data-row">
        <span class="label">输出状态</span>
        <span class="value" :class="{ high: outputHigh, low: !outputHigh }">
          {{ outputHigh ? '高电平 (报警)' : '低电平 (正常)' }}
        </span>
      </div>
      <div class="data-row">
        <span class="label">迟滞宽度</span>
        <span class="value">{{ hysteresis }}mV</span>
      </div>
      <div class="data-row" v-if="chattering">
        <span class="label">抖动检测</span>
        <span class="value error">⚠️ 输出震荡中</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  simResult: { type: Object, default: () => ({}) }
})

const vin = computed(() => props.simResult?.vin ?? 0)
const vref = computed(() => props.simResult?.vref ?? 2.5)
const vcc = computed(() => props.simResult?.vcc ?? 5)
const hysteresis = computed(() => props.simResult?.hysteresis ?? 0)
const outputHigh = computed(() => props.simResult?.outputHigh ?? false)
const outputVoltage = computed(() => props.simResult?.outputVoltage ?? 0)
const chattering = computed(() => props.simResult?.chattering ?? false)

// 传输特性曲线
const transferPath = computed(() => {
  const vrefScaled = 10 + (vref.value / 5) * 260
  const hystScaled = (hysteresis.value / 1000) * 5 * (260 / 5)
  const highY = 15, lowY = 65

  if (hystScaled < 1) {
    // 无迟滞：阶跃
    return `M10 ${lowY} L${vrefScaled} ${lowY} L${vrefScaled} ${highY} L270 ${highY}`
  }
  // 有迟滞：回线
  const lowThresh = vrefScaled - hystScaled / 2
  const highThresh = vrefScaled + hystScaled / 2
  // 上升路径
  let path = `M10 ${lowY} L${highThresh} ${lowY} L${highThresh} ${highY} L270 ${highY}`
  // 下降路径
  path += ` M270 ${highY} L${lowThresh} ${highY} L${lowThresh} ${lowY} L10 ${lowY}`
  return path
})

const workPointX = computed(() => 10 + (vin.value / 5) * 260)
const workPointY = computed(() => outputHigh.value ? 15 : 65)
</script>

<style scoped>
.opamp-view { display: flex; flex-direction: column; gap: 8px; }
.formula-bar {
  display: flex; gap: 8px; flex-wrap: wrap;
  padding: 6px 10px; background: var(--card-bg); border-radius: 6px;
  font-size: 12px; color: var(--text-secondary);
}
.formula { color: var(--accent); font-family: monospace; }
.formula-sep { color: var(--text-dim); }
.opamp-svg {
  width: 100%; max-width: 360px; height: auto;
  background: var(--canvas-bg); border-radius: 8px;
}
.transfer-curve {
  width: 100%; max-width: 280px; height: 80px;
  background: var(--canvas-bg); border-radius: 8px;
}
.data-panel { display: flex; flex-direction: column; gap: 4px; }
.data-row {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 8px; font-size: 13px;
}
.data-row .label { width: 80px; color: var(--text-secondary); }
.data-row .value { font-weight: bold; color: var(--accent); }
.data-row .value.warn { color: #f1c40f; }
.data-row .value.high { color: #e74c3c; }
.data-row .value.low { color: #2ecc71; }
.data-row .value.error { color: var(--error); }
</style>
