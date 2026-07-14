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

    <!-- RC滤波器（standalone） -->
    <template v-else-if="type === 'rc-filter'">
      <rect x="0" y="0" width="50" height="50" rx="8" fill="#2a2a3e" :stroke="color" stroke-width="2"/>
      <text x="25" y="18" text-anchor="middle" :fill="color" font-size="8" font-weight="bold">RC LPF</text>
      <line x1="10" y1="30" x2="20" y2="30" :stroke="color" stroke-width="1.5"/>
      <rect x="20" y="26" width="8" height="8" rx="1" fill="none" :stroke="color" stroke-width="1.5"/>
      <line x1="28" y1="30" x2="38" y2="30" :stroke="color" stroke-width="1.5"/>
      <path d="M38 30 Q40 26 42 30 Q44 34 46 30" fill="none" :stroke="color" stroke-width="1" opacity="0.5"/>
    </template>

    <!-- I2C总线（standalone） -->
    <template v-else-if="type === 'i2c-bus'">
      <rect x="0" y="0" width="50" height="50" rx="8" fill="#2a2a3e" :stroke="color" stroke-width="2"/>
      <text x="25" y="18" text-anchor="middle" :fill="color" font-size="8" font-weight="bold">I2C</text>
      <line x1="10" y1="28" x2="40" y2="28" stroke="#3498db" stroke-width="2"/>
      <text x="12" y="26" fill="#3498db" font-size="7">SDA</text>
      <line x1="10" y1="38" x2="40" y2="38" stroke="#f39c12" stroke-width="2"/>
      <text x="12" y="36" fill="#f39c12" font-size="7">SCL</text>
    </template>

    <!-- NTC测温（standalone） -->
    <template v-else-if="type === 'ntc-sensor'">
      <rect x="0" y="0" width="50" height="50" rx="8" fill="#2a2a3e" :stroke="color" stroke-width="2"/>
      <text x="25" y="18" text-anchor="middle" :fill="color" font-size="8" font-weight="bold">NTC</text>
      <path d="M15 30 L20 25 L25 32 L30 26 L35 31" fill="none" :stroke="color" stroke-width="2"/>
      <text x="25" y="42" text-anchor="middle" :fill="color" font-size="7">10kΩ</text>
    </template>

    <!-- PCB走线（standalone） -->
    <template v-else-if="type === 'pcb-trace'">
      <rect x="0" y="0" width="50" height="50" rx="8" fill="#0a3a1a" :stroke="color" stroke-width="2"/>
      <text x="25" y="15" text-anchor="middle" :fill="color" font-size="7" font-weight="bold">PCB</text>
      <!-- 走线 -->
      <path d="M5 25 L15 25 L15 35 L35 35 L35 25 L45 25" fill="none" stroke="#f1c40f" stroke-width="2.5"/>
      <!-- 焊盘 -->
      <circle cx="5" cy="25" r="2.5" fill="#e67e22"/>
      <circle cx="45" cy="25" r="2.5" fill="#e67e22"/>
      <text x="25" y="45" text-anchor="middle" fill="#888" font-size="6">microstrip</text>
    </template>

    <!-- WiFi链路（standalone） -->
    <template v-else-if="type === 'wifi-link'">
      <rect x="0" y="0" width="50" height="50" rx="8" fill="#2a2a3e" :stroke="color" stroke-width="2"/>
      <text x="25" y="14" text-anchor="middle" :fill="color" font-size="7" font-weight="bold">WiFi</text>
      <!-- WiFi信号弧线 -->
      <path d="M15 35 Q25 20 35 35" fill="none" :stroke="color" stroke-width="2"/>
      <path d="M18 35 Q25 25 32 35" fill="none" :stroke="color" stroke-width="1.5" opacity="0.6"/>
      <path d="M21 35 Q25 30 29 35" fill="none" :stroke="color" stroke-width="1" opacity="0.3"/>
      <circle cx="25" cy="36" r="2" :fill="color"/>
    </template>

    <!-- 逻辑分析仪（standalone） -->
    <template v-else-if="type === 'logic-analyzer'">
      <rect x="0" y="0" width="50" height="50" rx="8" fill="#2a2a3e" :stroke="color" stroke-width="2"/>
      <text x="25" y="13" text-anchor="middle" :fill="color" font-size="7" font-weight="bold">LA</text>
      <!-- 4路信号波形 -->
      <path d="M5 18 L15 18 L15 24 L25 24 L25 18 L35 18 L35 24 L45 24" fill="none" stroke="#e74c3c" stroke-width="1"/>
      <path d="M5 28 L12 28 L12 34 L20 34 L20 28 L28 28 L28 34 L36 34 L36 28 L45 28" fill="none" stroke="#f39c12" stroke-width="1"/>
      <path d="M5 38 L45 38" fill="none" stroke="#2ecc71" stroke-width="1"/>
      <path d="M5 44 L45 44" fill="none" stroke="#3498db" stroke-width="1"/>
    </template>

    <!-- DC-DC Buck（standalone） -->
    <template v-else-if="type === 'dcdc-buck'">
      <rect x="0" y="0" width="50" height="50" rx="8" fill="#2a2a3e" :stroke="color" stroke-width="2"/>
      <text x="25" y="14" text-anchor="middle" :fill="color" font-size="7" font-weight="bold">BUCK</text>
      <!-- 电感符号 -->
      <path d="M10 25 Q14 20 18 25 Q22 20 26 25 Q30 20 34 25 Q38 20 42 25" fill="none" :stroke="color" stroke-width="1.5"/>
      <!-- 降压箭头 -->
      <text x="25" y="42" text-anchor="middle" fill="#e74c3c" font-size="8">12V→5V</text>
    </template>

    <!-- 运放比较器（standalone） -->
    <template v-else-if="type === 'opamp-comparator'">
      <rect x="0" y="0" width="50" height="50" rx="8" fill="#2a2a3e" :stroke="color" stroke-width="2"/>
      <text x="25" y="12" text-anchor="middle" :fill="color" font-size="7" font-weight="bold">OPAMP</text>
      <!-- 运放三角形 -->
      <polygon points="14,20 14,36 36,28" fill="none" :stroke="color" stroke-width="1.5"/>
      <text x="17" y="25" fill="#888" font-size="6">−</text>
      <text x="17" y="34" fill="#888" font-size="6">+</text>
    </template>

    <!-- 按键消抖（standalone） -->
    <template v-else-if="type === 'button-debounce'">
      <rect x="0" y="0" width="50" height="50" rx="8" fill="#2a2a3e" :stroke="color" stroke-width="2"/>
      <text x="25" y="12" text-anchor="middle" :fill="color" font-size="7" font-weight="bold">DEBOUNCE</text>
      <!-- 按键符号 -->
      <rect x="15" y="20" width="20" height="14" rx="2" fill="none" :stroke="color" stroke-width="1.5"/>
      <line x1="10" y1="27" x2="15" y2="27" :stroke="color" stroke-width="1.5"/>
      <line x1="35" y1="27" x2="40" y2="27" :stroke="color" stroke-width="1.5"/>
      <text x="25" y="42" text-anchor="middle" fill="#888" font-size="6">SW+RC</text>
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
