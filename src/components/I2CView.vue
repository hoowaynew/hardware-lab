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

    <!-- I2C 总线拓扑图 -->
    <svg class="i2c-topology" viewBox="0 0 360 130">
      <!-- SCL 线 -->
      <line x1="50" y1="35" x2="310" y2="35" stroke="#e74c3c" stroke-width="2"/>
      <text x="15" y="38" fill="#e74c3c" font-size="9">SCL</text>

      <!-- SDA 线 -->
      <line x1="50" y1="55" x2="310" y2="55" stroke="#3498db" stroke-width="2"/>
      <text x="15" y="58" fill="#3498db" font-size="9">SDA</text>

      <!-- Vcc -->
      <line x1="50" y1="15" x2="310" y2="15" stroke="var(--text-dim)" stroke-width="1.5" stroke-dasharray="3,2"/>
      <text x="15" y="18" fill="var(--text-dim)" font-size="9">+Vcc</text>

      <!-- 上拉电阻 Rp1 (SCL) -->
      <path d="M55,15 h3 l3,-4 l6,8 l6,-8 l6,8 l6,-8 l3,4 h3" fill="none" stroke="#e67e22" stroke-width="1.5"/>
      <line x1="55" y1="15" x2="55" y2="27" stroke="var(--wire)" stroke-width="1.5"/>
      <text x="75" y="14" fill="#e67e22" font-size="8">Rp</text>
      <text x="75" y="24" fill="#e67e22" font-size="7">4.7k</text>
      <circle cx="55" cy="35" r="2.5" fill="var(--wire)"/>

      <!-- 上拉电阻 Rp2 (SDA) -->
      <path d="M75,15 h3 l3,-4 l6,8 l6,-8 l6,8 l6,-8 l3,4 h3" fill="none" stroke="#e67e22" stroke-width="1.5"/>
      <line x1="75" y1="15" x2="75" y2="47" stroke="var(--wire)" stroke-width="1.5"/>
      <circle cx="75" cy="55" r="2.5" fill="var(--wire)"/>

      <!-- Master 节点 -->
      <rect x="115" y="25" width="50" height="40" rx="3" fill="none" stroke="var(--text)" stroke-width="1.5"/>
      <text x="122" y="40" fill="var(--text)" font-size="8">Master</text>
      <text x="122" y="50" fill="var(--text-dim)" font-size="7">MCU</text>
      <text x="122" y="60" fill="var(--text-dim)" font-size="7">I2C</text>
      <line x1="140" y1="25" x2="140" y2="35" stroke="#e74c3c" stroke-width="1.5"/>
      <line x1="145" y1="25" x2="145" y2="55" stroke="#3498db" stroke-width="1.5"/>
      <circle cx="140" cy="35" r="2.5" fill="var(--wire)"/>
      <circle cx="145" cy="55" r="2.5" fill="var(--wire)"/>

      <!-- Slave 1 -->
      <rect x="195" y="25" width="50" height="40" rx="3" fill="none" stroke="var(--text)" stroke-width="1.5"/>
      <text x="202" y="40" fill="var(--text)" font-size="8">Slave</text>
      <text x="202" y="50" fill="var(--text-dim)" font-size="7">EEPROM</text>
      <text x="202" y="60" fill="var(--text-dim)" font-size="7">0x50</text>
      <line x1="220" y1="25" x2="220" y2="35" stroke="#e74c3c" stroke-width="1.5"/>
      <line x1="225" y1="25" x2="225" y2="55" stroke="#3498db" stroke-width="1.5"/>
      <circle cx="220" cy="35" r="2.5" fill="var(--wire)"/>
      <circle cx="225" cy="55" r="2.5" fill="var(--wire)"/>

      <!-- Slave 2 -->
      <rect x="270" y="25" width="40" height="40" rx="3" fill="none" stroke="var(--text)" stroke-width="1.5"/>
      <text x="275" y="40" fill="var(--text)" font-size="8">Slave</text>
      <text x="275" y="50" fill="var(--text-dim)" font-size="7">Sensor</text>
      <text x="275" y="60" fill="var(--text-dim)" font-size="7">0x68</text>
      <line x1="290" y1="25" x2="290" y2="35" stroke="#e74c3c" stroke-width="1.5"/>
      <line x1="295" y1="25" x2="295" y2="55" stroke="#3498db" stroke-width="1.5"/>
      <circle cx="290" cy="35" r="2.5" fill="var(--wire)"/>
      <circle cx="295" cy="55" r="2.5" fill="var(--wire)"/>

      <!-- GND -->
      <line x1="140" y1="65" x2="140" y2="90" stroke="var(--wire)" stroke-width="1.5"/>
      <line x1="220" y1="65" x2="220" y2="90" stroke="var(--wire)" stroke-width="1.5"/>
      <line x1="290" y1="65" x2="290" y2="90" stroke="var(--wire)" stroke-width="1.5"/>
      <line x1="140" y1="90" x2="290" y2="90" stroke="var(--wire)" stroke-width="1.5"/>
      <line x1="205" y1="90" x2="225" y2="90" stroke="var(--text)" stroke-width="2.5"/>
      <line x1="208" y1="94" x2="222" y2="94" stroke="var(--text)" stroke-width="2"/>
      <line x1="211" y1="98" x2="219" y2="98" stroke="var(--text)" stroke-width="1.5"/>
      <text x="230" y="96" fill="var(--text-dim)" font-size="8">GND</text>

      <!-- 开漏标注 -->
      <text x="105" y="105" fill="var(--text-dim)" font-size="7">开漏输出 + 上拉电阻 = 线与逻辑</text>
    </svg>

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
