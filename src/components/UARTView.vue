<template>
  <div class="uart-view">
    <div class="uart-formula">
      <span class="formula-text">帧格式: IDLE(高) → START(低) → D0~D7 → [校验] → STOP(高)</span>
    </div>

    <!-- 发送信息 -->
    <div class="uart-header">
      <div class="uart-field">
        <span class="uart-label">发送数据</span>
        <span class="uart-val">{{ dataHex }}</span>
        <span class="uart-bin">{{ dataBin }}</span>
      </div>
      <div class="uart-field">
        <span class="uart-label">波特率</span>
        <span class="uart-val" :class="{ 'uart-err': baudMismatch }">{{ baudrate }}</span>
        <span class="uart-unit">bps</span>
      </div>
    </div>

    <!-- TX 波形 -->
    <div class="uart-waveforms">
      <div class="uart-wave-row">
        <span class="uart-wave-name">TX</span>
        <svg class="uart-svg" :viewBox="`0 0 ${svgW} ${waveH}`" preserveAspectRatio="none">
          <polyline :points="txPoints" fill="none" class="tx-line" />
          <!-- annotations -->
          <text
            v-for="(ann, i) in annotations"
            :key="i"
            :x="(ann.t / maxT) * svgW"
            :y="waveH - 2"
            class="uart-ann"
            text-anchor="middle"
          >{{ ann.label }}</text>
        </svg>
      </div>
    </div>

    <!-- 接收解码 -->
    <div class="uart-rx" v-if="baudMismatch">
      <div class="uart-rx-row">
        <span class="uart-rx-label">接收端解码</span>
        <span class="uart-rx-garbage">{{ rxGarbage }}</span>
      </div>
      <div class="uart-rx-warn">⚠️ 波特率不匹配，数据乱码！</div>
    </div>
    <div class="uart-rx uart-rx-ok" v-else>
      <div class="uart-rx-row">
        <span class="uart-rx-label">接收端解码</span>
        <span class="uart-rx-val">{{ dataHex }}</span>
        <span class="uart-rx-ok-tag">✅ 解码正确</span>
      </div>
    </div>

    <!-- 帧结构 -->
    <div class="uart-frame">
      <div class="uart-frame-item" :class="{ active: true }">
        <span class="frame-label">START</span>
        <span class="frame-bit">0</span>
      </div>
      <div class="uart-frame-item" v-for="(b, i) in dataBitsArray" :key="i">
        <span class="frame-label">D{{ i }}</span>
        <span class="frame-bit">{{ b }}</span>
      </div>
      <div class="uart-frame-item" v-if="parityBit !== null">
        <span class="frame-label">{{ parityLabel }}</span>
        <span class="frame-bit">{{ parityBit }}</span>
      </div>
      <div class="uart-frame-item stop">
        <span class="frame-label">STOP</span>
        <span class="frame-bit">1</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  simResult: { type: Object, default: null }
})

const svgW = 300
const waveH = 60

const dataHex = computed(() => props.simResult?.dataHex || '0x55')
const dataBin = computed(() => props.simResult?.dataBits || '01010101')
const baudrate = computed(() => props.simResult?.baudrate || 9600)
const baudMismatch = computed(() => props.simResult?.baudMismatch || false)
const txWave = computed(() => props.simResult?.txWave || [])
const annotations = computed(() => props.simResult?.annotations || [])
const parityBit = computed(() => props.simResult?.parityBit ?? null)
const parityLabel = computed(() => {
  const p = props.simResult?.parity || 'none'
  return p === 'even' ? 'EVEN' : p === 'odd' ? 'ODD' : ''
})
const rxGarbage = computed(() => props.simResult?.rxGarbage || '0x??')

const dataBitsArray = computed(() => {
  const bits = dataBin.value
  return bits.split('').slice(0, 8)
})

const maxT = computed(() => {
  const wave = txWave.value
  if (!wave.length) return 1
  return wave[wave.length - 1].t || 1
})

const txPoints = computed(() => {
  const wave = txWave.value
  if (!wave.length) return ''
  return wave.map(p => `${(p.t / maxT.value) * svgW},${waveH - p.v * (waveH - 12) - 6}`).join(' ')
})
</script>

<style scoped>
.uart-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 0;
}
.uart-formula {
  text-align: center;
  background: var(--surface-light);
  border-radius: 8px;
  padding: 8px;
}
.formula-text {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: var(--text-dim);
}
.uart-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}
.uart-field {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.uart-label {
  font-size: 12px;
  color: var(--text-dim);
}
.uart-val {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary);
  font-family: monospace;
}
.uart-val.uart-err {
  color: var(--danger);
}
.uart-bin {
  font-size: 11px;
  color: var(--text-dim);
  font-family: monospace;
}
.uart-unit {
  font-size: 11px;
  color: var(--text-dim);
}
.uart-waveforms {
  background: var(--bg);
  border-radius: 8px;
  padding: 8px;
  border: 1px solid var(--border);
}
.uart-wave-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.uart-wave-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-dim);
  width: 28px;
  font-family: monospace;
}
.uart-svg {
  flex: 1;
  height: 60px;
}
.tx-line {
  stroke: var(--primary);
  stroke-width: 2;
}
.uart-ann {
  fill: var(--text-dim);
  font-size: 6px;
  font-family: monospace;
}
.uart-rx {
  background: var(--surface-light);
  border-radius: 8px;
  padding: 8px 12px;
}
.uart-rx-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.uart-rx-label {
  font-size: 12px;
  color: var(--text-dim);
}
.uart-rx-garbage {
  font-size: 16px;
  font-weight: 700;
  color: var(--danger);
  font-family: monospace;
}
.uart-rx-val {
  font-size: 16px;
  font-weight: 700;
  color: var(--primary);
  font-family: monospace;
}
.uart-rx-ok-tag {
  font-size: 11px;
  color: var(--success);
}
.uart-rx-warn {
  font-size: 12px;
  color: var(--danger);
  margin-top: 4px;
}
.uart-frame {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
}
.uart-frame-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  border-radius: 4px;
  background: var(--surface-light);
  min-width: 28px;
}
.uart-frame-item.active {
  border: 1px solid var(--primary);
}
.uart-frame-item.stop {
  border: 1px solid var(--success);
}
.frame-label {
  font-size: 8px;
  color: var(--text-dim);
  font-family: monospace;
}
.frame-bit {
  font-size: 14px;
  font-weight: 700;
  color: var(--primary);
  font-family: monospace;
}
</style>
