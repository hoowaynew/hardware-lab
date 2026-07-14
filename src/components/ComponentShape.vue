<template>
  <!-- 根据元件类型渲染不同SVG形状 -->
  <g class="component-shape">
    <!-- 电源 -->
    <template v-if="type === 'power'">
      <rect x="10" y="5" width="40" height="30" rx="4" fill="#2a2a3e" :stroke="color" stroke-width="2"/>
      <text x="30" y="22" text-anchor="middle" fill="#e74c3c" font-size="10" font-weight="bold">+|−</text>
      <text x="30" y="35" text-anchor="middle" fill="#666" font-size="8">{{ voltage }}V</text>
    </template>

    <!-- 地 -->
    <template v-else-if="type === 'ground'">
      <line x1="20" y1="5" x2="20" y2="15" :stroke="color" stroke-width="2"/>
      <line x1="8" y1="15" x2="32" y2="15" :stroke="color" stroke-width="2.5"/>
      <line x1="12" y1="20" x2="28" y2="20" :stroke="color" stroke-width="2"/>
      <line x1="16" y1="25" x2="24" y2="25" :stroke="color" stroke-width="1.5"/>
    </template>

    <!-- 电阻 -->
    <template v-else-if="type === 'resistor'">
      <rect x="0" y="6" width="60" height="12" rx="2" fill="#3a2a1a" :stroke="color" stroke-width="1.5"/>
      <line x1="-5" y1="12" x2="0" y2="12" :stroke="color" stroke-width="1.5"/>
      <line x1="60" y1="12" x2="65" y2="12" :stroke="color" stroke-width="1.5"/>
      <!-- 色环（简化） -->
      <rect x="12" y="6" width="3" height="12" fill="#8B4513"/>
      <rect x="22" y="6" width="3" height="12" fill="#FF8C00"/>
      <rect x="32" y="6" width="3" height="12" fill="#2ecc71"/>
      <rect x="42" y="6" width="3" height="12" fill="#FFD700"/>
    </template>

    <!-- LED -->
    <template v-else-if="type === 'led'">
      <!-- LED三角形 -->
      <polygon points="6,8 6,28 22,18" :fill="ledColor" :stroke="ledColor" stroke-width="1" opacity="0.9"/>
      <!-- 阴极线 -->
      <line x1="22" y1="8" x2="22" y2="28" :stroke="ledColor" stroke-width="2"/>
      <!-- 光晕（发光时） -->
      <circle v-if="state === 'on'" cx="18" cy="18" r="16" :fill="ledColor" opacity="0.2">
        <animate attributeName="r" values="14;18;14" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.15;0.3;0.15" dur="2s" repeatCount="indefinite"/>
      </circle>
      <!-- 烧毁效果 -->
      <template v-if="state === 'burned'">
        <line x1="4" y1="6" x2="32" y2="30" stroke="#333" stroke-width="1"/>
        <line x1="32" y1="6" x2="4" y2="30" stroke="#333" stroke-width="1"/>
      </template>
    </template>

    <!-- 电容 -->
    <template v-else-if="type === 'capacitor'">
      <line x1="0" y1="15" x2="15" y2="15" :stroke="color" stroke-width="1.5"/>
      <line x1="15" y1="5" x2="15" y2="25" :stroke="color" stroke-width="2.5"/>
      <line x1="21" y1="5" x2="21" y2="25" :stroke="color" stroke-width="2.5"/>
      <line x1="21" y1="15" x2="36" y2="15" :stroke="color" stroke-width="1.5"/>
    </template>

    <!-- 蜂鸣器 -->
    <template v-else-if="type === 'buzzer'">
      <circle cx="18" cy="18" r="14" fill="#3a3a4e" :stroke="color" stroke-width="2"/>
      <text x="18" y="22" text-anchor="middle" font-size="12">{{ state === 'on' ? '🔔' : '🔕' }}</text>
    </template>

    <!-- 电机 -->
    <template v-else-if="type === 'motor'">
      <circle cx="20" cy="20" r="16" fill="#1a3a3e" :stroke="color" stroke-width="2"/>
      <text x="20" y="24" text-anchor="middle" font-size="14">{{ state === 'running' ? '🔄' : '⚙️' }}</text>
    </template>

    <!-- 二极管 -->
    <template v-else-if="type === 'diode'">
      <polygon points="6,4 6,16 18,10" :fill="color" :stroke="color" stroke-width="1"/>
      <line x1="18" y1="4" x2="18" y2="16" :stroke="color" stroke-width="2"/>
      <line x1="0" y1="10" x2="6" y2="10" :stroke="color" stroke-width="1.5"/>
      <line x1="18" y1="10" x2="40" y2="10" :stroke="color" stroke-width="1.5"/>
    </template>

    <!-- GPIO -->
    <template v-else-if="type === 'gpio'">
      <rect x="5" y="5" width="40" height="40" rx="4" fill="#2a2a3e" :stroke="color" stroke-width="2"/>
      <text x="25" y="22" text-anchor="middle" fill="#aaa" font-size="9" font-weight="bold">MCU</text>
      <text x="25" y="35" text-anchor="middle" fill="#888" font-size="8">{{ stateLabel }}</text>
      <!-- 引脚 -->
      <line x1="45" y1="25" x2="55" y2="25" :stroke="color" stroke-width="2"/>
      <!-- 波形抖动（浮空输入） -->
      <path v-if="state === 'unstable'" d="M48 18 Q51 12 54 20 Q57 28 60 16" fill="none" stroke="#e74c3c" stroke-width="1" opacity="0.7">
        <animate attributeName="d" values="M48 18 Q51 12 54 20 Q57 28 60 16;M48 22 Q51 30 54 14 Q57 22 60 28;M48 18 Q51 12 54 20 Q57 28 60 16" dur="0.5s" repeatCount="indefinite"/>
      </path>
      <!-- 火花（短路） -->
      <g v-if="state === 'short'">
        <line x1="50" y1="15" x2="55" y2="35" stroke="#f39c12" stroke-width="1.5">
          <animate attributeName="opacity" values="1;0;1" dur="0.15s" repeatCount="indefinite"/>
        </line>
        <line x1="55" y1="15" x2="50" y2="35" stroke="#e74c3c" stroke-width="1.5">
          <animate attributeName="opacity" values="0;1;0" dur="0.15s" repeatCount="indefinite"/>
        </line>
      </g>
    </template>

    <!-- PWM -->
    <template v-else-if="type === 'pwm'">
      <rect x="5" y="10" width="40" height="30" rx="4" fill="#2a2a3e" :stroke="color" stroke-width="2"/>
      <text x="25" y="28" text-anchor="middle" fill="#e74c3c" font-size="9" font-weight="bold">PWM</text>
      <!-- 方波图标 -->
      <path d="M10 35 L10 30 L20 30 L20 38 L30 38 L30 30 L40 30 L40 38" fill="none" :stroke="color" stroke-width="1.5" opacity="0.6"/>
    </template>

    <!-- 探针 -->
    <template v-else-if="type === 'probe'">
      <circle cx="15" cy="15" r="8" fill="none" :stroke="color" stroke-width="2"/>
      <line x1="15" y1="7" x2="15" y2="2" :stroke="color" stroke-width="2"/>
      <line x1="15" y1="23" x2="15" y2="28" :stroke="color" stroke-width="2"/>
      <line x1="7" y1="15" x2="2" y2="15" :stroke="color" stroke-width="2"/>
      <line x1="23" y1="15" x2="28" y2="15" :stroke="color" stroke-width="2"/>
      <text x="15" y="18" text-anchor="middle" :fill="color" font-size="8">V</text>
    </template>

    <!-- 电容充放电（standalone） -->
    <template v-else-if="type === 'capacitor-charge'">
      <rect x="0" y="0" width="50" height="50" rx="8" fill="#2a2a3e" :stroke="color" stroke-width="2"/>
      <text x="25" y="20" text-anchor="middle" fill="#3498db" font-size="8" font-weight="bold">RC</text>
      <!-- 电容符号 -->
      <line x1="15" y1="28" x2="15" y2="38" :stroke="color" stroke-width="2.5"/>
      <line x1="20" y1="28" x2="20" y2="38" :stroke="color" stroke-width="2.5"/>
      <!-- 充电图标 -->
      <path d="M28 33 Q33 28 38 33 Q43 38 48 33" fill="none" :stroke="color" stroke-width="1.5" opacity="0.7"/>
    </template>

    <!-- 三极管开关（standalone） -->
    <template v-else-if="type === 'transistor-switch'">
      <rect x="0" y="0" width="50" height="50" rx="8" fill="#2a2a3e" :stroke="color" stroke-width="2"/>
      <!-- NPN符号 -->
      <circle cx="25" cy="25" r="14" fill="none" :stroke="color" stroke-width="1.5"/>
      <line x1="18" y1="25" x2="24" y2="25" :stroke="color" stroke-width="3"/>
      <line x1="24" y1="18" x2="24" y2="32" :stroke="color" stroke-width="2"/>
      <line x1="24" y1="25" x2="35" y2="35" :stroke="color" stroke-width="2"/>
      <polygon points="35,35 31,31 33,37" :fill="color"/>
      <line x1="24" y1="25" x2="35" y2="15" :stroke="color" stroke-width="2"/>
    </template>

    <!-- 默认 -->
    <template v-else>
      <rect x="0" y="0" :width="width" :height="height" fill="#2a2a3e" :stroke="color" stroke-width="1.5" rx="4"/>
    </template>
  </g>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: String,
  width: { type: Number, default: 40 },
  height: { type: Number, default: 30 },
  color: { type: String, default: '#555' },
  state: { type: String, default: 'normal' },
  brightness: { type: Number, default: 0 }
})

const ledColor = computed(() => {
  const colors = { red: '#ff4444', green: '#44ff44', blue: '#4488ff', yellow: '#ffff44', white: '#ffffff' }
  return colors[props.color] || '#ff4444'
})

const stateLabel = computed(() => {
  const labels = {
    unstable: '浮动', 'stable-high': '高电平', 'stable-low': '低电平',
    analog: '模拟', 'open-drain': '开漏', 'push-pull': '推挽',
    'af-push-pull': '复用推挽', 'af-open-drain': '复用开漏',
    short: '短路!'
  }
  return labels[props.state] || props.state
})
</script>
