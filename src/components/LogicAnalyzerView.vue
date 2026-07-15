<template>
  <div class="la-view">
    <div class="la-formula">
      <span class="formula-text">SPI Mode {{ mode }} (CPOL={{ cpol }}, CPHA={{ cpha }})</span>
    </div>

    <!-- 模式匹配状态 -->
    <div class="la-mode-status" :class="{ 'la-mode-ok': !modeMismatch, 'la-mode-bad': modeMismatch }">
      <span v-if="!modeMismatch">✅ 主从模式匹配，数据正确</span>
      <span v-else>⚠️ 主机 Mode {{ mode }} ≠ 从机 Mode 0，数据错位！</span>
    </div>

    <!-- 4路信号波形 -->
    <div class="la-waveforms">
      <div class="la-channel" v-for="ch in channels" :key="ch.name">
        <span class="la-ch-label" :style="{ color: ch.color }">{{ ch.name }}</span>
        <div class="la-ch-wave">
          <svg :viewBox="`0 0 ${svgWidth} 40`" preserveAspectRatio="none" class="la-svg">
            <polyline
              :points="ch.points"
              fill="none"
              :stroke="ch.color"
              stroke-width="1.5"
            />
          </svg>
        </div>
      </div>
    </div>

    <!-- 数据对比 -->
    <div class="la-data-compare">
      <div class="la-data-col">
        <span class="la-d-label">发送数据 (MOSI)</span>
        <span class="la-d-value" :class="{ 'la-d-corrupt': modeMismatch }">
          {{ dataHex }} ({{ dataBits }})
        </span>
      </div>
      <div class="la-data-arrow">→</div>
      <div class="la-data-col">
        <span class="la-d-label">从机解码</span>
        <span class="la-d-value" :class="{ 'la-d-corrupt': modeMismatch }">
          {{ decodedHex }} ({{ decodedBits }})
        </span>
      </div>
    </div>

    <!-- SPI总线拓扑图 -->
    <svg class="la-topology" viewBox="0 0 340 120">
      <!-- Master (MCU) -->
      <rect x="20" y="30" width="70" height="60" rx="4" fill="var(--card-bg)" stroke="var(--accent)" stroke-width="2"/>
      <text x="55" y="55" text-anchor="middle" fill="var(--accent)" font-size="10" font-weight="bold">Master</text>
      <text x="55" y="70" text-anchor="middle" fill="var(--text-dim)" font-size="8">MCU</text>
      <text x="55" y="82" text-anchor="middle" fill="var(--text-dim)" font-size="7">Mode {{ mode }}</text>

      <!-- Slave -->
      <rect x="250" y="30" width="70" height="60" rx="4" fill="var(--card-bg)" stroke="var(--wire)" stroke-width="2"/>
      <text x="285" y="55" text-anchor="middle" fill="var(--text-dim)" font-size="10" font-weight="bold">Slave</text>
      <text x="285" y="70" text-anchor="middle" fill="var(--text-dim)" font-size="8">Device</text>
      <text x="285" y="82" text-anchor="middle" fill="var(--text-dim)" font-size="7">Mode 0</text>

      <!-- SCLK (时钟线) -->
      <line x1="90" y1="38" x2="250" y2="38" stroke="#e74c3c" stroke-width="1.5"/>
      <circle cx="90" cy="38" r="2.5" fill="#e74c3c"/>
      <circle cx="250" cy="38" r="2.5" fill="#e74c3c"/>
      <text x="170" y="32" text-anchor="middle" fill="#e74c3c" font-size="8">SCLK ({{ clockFreq }}kHz)</text>

      <!-- MOSI (主出从入) -->
      <line x1="90" y1="52" x2="250" y2="52" stroke="#2ecc71" stroke-width="1.5"/>
      <circle cx="90" cy="52" r="2.5" fill="#2ecc71"/>
      <circle cx="250" cy="52" r="2.5" fill="#2ecc71"/>
      <text x="170" y="49" text-anchor="middle" fill="#2ecc71" font-size="8">MOSI</text>
      <path d="M220,49 L228,52 L220,55" fill="none" stroke="#2ecc71" stroke-width="1"/>

      <!-- MISO (主入从出) -->
      <line x1="90" y1="66" x2="250" y2="66" stroke="#3498db" stroke-width="1.5"/>
      <circle cx="90" cy="66" r="2.5" fill="#3498db"/>
      <circle cx="250" cy="66" r="2.5" fill="#3498db"/>
      <text x="170" y="63" text-anchor="middle" fill="#3498db" font-size="8">MISO</text>
      <path d="M120,63 L112,66 L120,69" fill="none" stroke="#3498db" stroke-width="1"/>

      <!-- CS (片选) -->
      <line x1="90" y1="80" x2="250" y2="80" stroke="#f39c12" stroke-width="1.5" stroke-dasharray="3,2"/>
      <circle cx="90" cy="80" r="2.5" fill="#f39c12"/>
      <circle cx="250" cy="80" r="2.5" fill="#f39c12"/>
      <text x="170" y="93" text-anchor="middle" fill="#f39c12" font-size="8">CS (低有效)</text>

      <!-- 模式冲突警告 -->
      <text v-if="modeMismatch" x="170" y="110" text-anchor="middle" fill="var(--danger)" font-size="9" font-weight="bold">⚠ Mode不匹配!</text>
    </svg>

    <!-- 时钟信息 -->
    <div class="la-clock-info">
      <span>时钟: {{ clockFreq }} kHz</span>
      <span>周期: {{ period }} μs</span>
      <span>总传输时间: {{ totalTime }} μs</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  simResult: { type: Object, default: null }
})

const cpol = computed(() => props.simResult?.cpol ?? 0)
const cpha = computed(() => props.simResult?.cpha ?? 0)
const mode = computed(() => props.simResult?.mode ?? 0)
const modeMismatch = computed(() => props.simResult?.modeMismatch || false)
const clockFreq = computed(() => props.simResult?.clockFreq || 1000)
const period = computed(() => props.simResult?.period || 1)
const totalTime = computed(() => props.simResult?.totalTime || 8)
const dataHex = computed(() => props.simResult?.dataHex || '0x00')
const dataBits = computed(() => props.simResult?.dataBits || '00000000')
const decodedHex = computed(() => props.simResult?.decodedHex || '0x00')
const decodedBits = computed(() => props.simResult?.decodedBits || '00000000')

const svgWidth = 300

function waveToPoints(wave, maxT) {
  if (!wave || wave.length === 0) return ''
  return wave.map(p => {
    const x = (p.t / maxT) * svgWidth
    const y = p.v === 1 ? 6 : 30
    return `${x.toFixed(1)},${y}`
  }).join(' ')
}

const maxT = computed(() => {
  const waves = [props.simResult?.csWave, props.simResult?.sclkWave, props.simResult?.mosiWave]
  let max = 1
  for (const w of waves) {
    if (w) for (const p of w) if (p.t > max) max = p.t
  }
  return max
})

const channels = computed(() => {
  const s = props.simResult
  if (!s) return []
  return [
    { name: 'CS', color: '#e74c3c', points: waveToPoints(s.csWave, maxT.value) },
    { name: 'SCLK', color: '#f39c12', points: waveToPoints(s.sclkWave, maxT.value) },
    { name: 'MOSI', color: '#3498db', points: waveToPoints(s.mosiWave, maxT.value) },
    { name: 'MISO', color: '#2ecc71', points: waveToPoints(s.misoWave, maxT.value) }
  ]
})
</script>

<style scoped>
.la-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 0;
}
.la-formula {
  text-align: center;
  background: var(--surface-light);
  border-radius: 8px;
  padding: 8px;
}
.formula-text {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: var(--text-dim);
}
.la-mode-status {
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  padding: 6px;
  border-radius: 6px;
}
.la-mode-ok {
  color: var(--success);
  background: rgba(46, 204, 113, 0.1);
}
.la-mode-bad {
  color: var(--danger);
  background: rgba(231, 76, 60, 0.1);
}
.la-waveforms {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--surface-light);
  border-radius: 8px;
  padding: 10px;
}
.la-channel {
  display: flex;
  align-items: center;
  gap: 8px;
}
.la-ch-label {
  font-size: 11px;
  font-weight: 700;
  width: 40px;
  flex-shrink: 0;
}
.la-ch-wave {
  flex: 1;
  height: 36px;
  background: var(--bg);
  border-radius: 4px;
  overflow: hidden;
}
.la-svg {
  width: 100%;
  height: 100%;
}
.la-data-compare {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--surface-light);
  border-radius: 8px;
  padding: 10px 12px;
}
.la-data-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.la-d-label {
  font-size: 11px;
  color: var(--text-dim);
}
.la-d-value {
  font-size: 14px;
  font-weight: 700;
  font-family: monospace;
  color: var(--success);
}
.la-d-corrupt {
  color: var(--danger);
}
.la-data-arrow {
  font-size: 18px;
  color: var(--text-dim);
}
.la-clock-info {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-dim);
  font-family: monospace;
  justify-content: center;
}
.la-topology {
  width: 100%;
  max-width: 400px;
  height: auto;
}
</style>
