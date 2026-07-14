<template>
  <div class="i2c-view">
    <div class="i2c-header">
      <div class="i2c-addr">
        <span class="i2c-label">地址</span>
        <span class="i2c-val">{{ simResult?.address || '0x50' }}</span>
      </div>
      <div class="i2c-data">
        <span class="i2c-label">数据</span>
        <span class="i2c-val">{{ simResult?.data || '0xA5' }}</span>
      </div>
    </div>

    <!-- SDA/SCL 波形 -->
    <div class="i2c-waveforms">
      <div class="i2c-wave-row">
        <span class="i2c-wave-name">SCL</span>
        <svg class="i2c-svg" :viewBox="`0 0 ${svgW} ${waveH}`" preserveAspectRatio="none">
          <polyline :points="sclPoints" fill="none" class="scl-line" />
        </svg>
      </div>
      <div class="i2c-wave-row">
        <span class="i2c-wave-name">SDA</span>
        <svg class="i2c-svg" :viewBox="`0 0 ${svgW} ${waveH}`" preserveAspectRatio="none">
          <polyline :points="sdaPoints" fill="none" class="sda-line" />
          <!-- annotations -->
          <text
            v-for="(ann, i) in annotations"
            :key="i"
            :x="(ann.t / maxT) * svgW"
            :y="waveH - 2"
            class="i2c-ann"
            text-anchor="middle"
          >{{ ann.label }}</text>
        </svg>
      </div>
    </div>

    <!-- 步骤进度 -->
    <div class="i2c-steps">
      <div
        v-for="(s, i) in steps"
        :key="s.id"
        class="i2c-step"
        :class="{
          'step-done': i < currentStepIdx,
          'step-active': i === currentStepIdx,
          'step-pending': i > currentStepIdx
        }"
      >
        <span class="step-num">{{ i + 1 }}</span>
        <span class="step-name">{{ s.name }}</span>
      </div>
    </div>

    <!-- 位详情 -->
    <div class="i2c-bits" v-if="currentStepIdx >= 2">
      <div class="i2c-bit-group" v-if="currentStepIdx >= 2">
        <span class="bit-label">地址(7bit+R/W):</span>
        <span class="bit-value">{{ simResult?.addressBits || '1010000' }}0</span>
      </div>
      <div class="i2c-bit-group" v-if="currentStepIdx >= 4">
        <span class="bit-label">数据(8bit):</span>
        <span class="bit-value">{{ simResult?.dataBits || '10100101' }}</span>
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
const waveH = 50

const steps = [
  { id: 'idle', name: '空闲' },
  { id: 'start', name: 'START' },
  { id: 'address', name: '地址' },
  { id: 'ack1', name: 'ACK1' },
  { id: 'data', name: '数据' },
  { id: 'ack2', name: 'ACK2' },
  { id: 'stop', name: 'STOP' }
]

const currentStepIdx = computed(() => {
  const step = props.simResult?.step || 'idle'
  return steps.findIndex(s => s.id === step)
})

const sdaWave = computed(() => props.simResult?.sdaWave || [])
const sclWave = computed(() => props.simResult?.sclWave || [])
const annotations = computed(() => props.simResult?.annotations || [])

const maxT = computed(() => {
  const wave = sdaWave.value
  if (!wave.length) return 1
  return wave[wave.length - 1].t || 1
})

const sdaPoints = computed(() => {
  const wave = sdaWave.value
  if (!wave.length) return ''
  return wave.map(p => `${(p.t / maxT.value) * svgW},${waveH - p.v * (waveH - 10) - 5}`).join(' ')
})

const sclPoints = computed(() => {
  const wave = sclWave.value
  if (!wave.length) return ''
  return wave.map(p => `${(p.t / maxT.value) * svgW},${waveH - p.v * (waveH - 10) - 5}`).join(' ')
})
</script>

<style scoped>
.i2c-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 0;
}
.i2c-header {
  display: flex;
  gap: 16px;
}
.i2c-addr, .i2c-data {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.i2c-label {
  font-size: 12px;
  color: var(--text-dim);
}
.i2c-val {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary);
  font-family: monospace;
}
.i2c-waveforms {
  background: var(--bg);
  border-radius: 8px;
  padding: 8px;
  border: 1px solid var(--border);
}
.i2c-wave-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.i2c-wave-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-dim);
  width: 28px;
  font-family: monospace;
}
.i2c-svg {
  flex: 1;
  height: 50px;
}
.scl-line {
  stroke: var(--warning);
  stroke-width: 2;
}
.sda-line {
  stroke: var(--primary);
  stroke-width: 2;
}
.i2c-ann {
  fill: var(--text-dim);
  font-size: 6px;
  font-family: monospace;
}
.i2c-steps {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.i2c-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  border-radius: 6px;
  flex: 1;
  min-width: 40px;
}
.step-done {
  background: rgba(46, 204, 113, 0.15);
}
.step-done .step-num { color: var(--success); }
.step-done .step-name { color: var(--success); font-size: 10px; }
.step-active {
  background: var(--surface-light);
  border: 1px solid var(--primary);
}
.step-active .step-num { color: var(--primary); font-weight: 700; }
.step-active .step-name { color: var(--primary); font-size: 10px; font-weight: 600; }
.step-pending {
  background: var(--surface);
  opacity: 0.4;
}
.step-pending .step-num { color: var(--text-dim); }
.step-pending .step-name { color: var(--text-dim); font-size: 10px; }
.step-num { font-size: 14px; }
.i2c-bits {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--surface-light);
  border-radius: 8px;
  padding: 8px;
}
.i2c-bit-group {
  display: flex;
  gap: 8px;
  font-size: 12px;
  font-family: monospace;
}
.bit-label { color: var(--text-dim); }
.bit-value { color: var(--primary); font-weight: 600; letter-spacing: 1px; }
</style>
