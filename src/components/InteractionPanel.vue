<template>
  <div class="interaction-panel">
    <div v-for="interaction in visibleInteractions" :key="interaction.property" class="interaction-item">
      <!-- 点击循环切换 -->
      <div v-if="interaction.type === 'click-cycle'" class="click-cycle">
        <label class="interaction-label">{{ interaction.label }}</label>
        <div class="value-buttons">
          <button
            v-for="opt in getOptions(interaction)"
            :key="opt"
            :class="['value-btn', { active: currentValue(interaction) === opt }]"
            @click="updateValue(interaction, opt)"
          >{{ formatResistor(opt) }}</button>
        </div>
      </div>

      <!-- 模式选择（GPIO 8种模式） -->
      <div v-else-if="interaction.type === 'mode-select'" class="mode-select">
        <label class="interaction-label">{{ interaction.label }}</label>
        <div class="mode-grid">
          <button
            v-for="opt in interaction.options"
            :key="opt.value"
            :class="['mode-btn', { active: currentValue(interaction) === opt.value }]"
            @click="updateValue(interaction, opt.value)"
          >
            <span class="mode-icon">{{ opt.icon }}</span>
            <span class="mode-label">{{ opt.label }}</span>
          </button>
        </div>
      </div>

      <!-- 滑块（PWM） -->
      <div v-else-if="interaction.type === 'slider'" class="slider-control">
        <label class="interaction-label">
          {{ interaction.label }}
          <span class="slider-value">{{ formatSliderValue(interaction) }}</span>
        </label>
        <input
          type="range"
          :min="interaction.min"
          :max="interaction.max"
          :step="interaction.step"
          :value="currentValue(interaction)"
          @input="updateValue(interaction, Number($event.target.value))"
          class="slider-input"
        />
      </div>

      <!-- 下拉选择（负载类型） -->
      <div v-else-if="interaction.type === 'select'" class="select-control">
        <label class="interaction-label">{{ interaction.label }}</label>
        <div class="select-buttons">
          <button
            v-for="opt in interaction.options"
            :key="opt.value"
            :class="['select-btn', { active: currentValue(interaction) === opt.value }]"
            @click="updateValue(interaction, opt.value)"
          >
            <span>{{ opt.icon }}</span>
            <span>{{ opt.label }}</span>
          </button>
        </div>
      </div>

      <!-- 开关切换 -->
      <div v-else-if="interaction.type === 'toggle'" class="toggle-control">
        <label class="interaction-label">{{ interaction.label }}</label>
        <div class="toggle-buttons">
          <button
            v-for="val in interaction.values"
            :key="String(val)"
            :class="['toggle-btn', { active: currentValue(interaction) === val }]"
            @click="updateValue(interaction, val)"
          >{{ formatToggleValue(val, interaction) }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  interactions: { type: Array, default: () => [] },
  userState: { type: Object, default: () => ({}) },
  activeMode: { type: String, default: null }
})
const emit = defineEmits(['update'])

const visibleInteractions = computed(() => {
  return props.interactions.filter(i => {
    if (!i.showWhen) return true
    return i.showWhen.includes(props.activeMode)
  })
})

function currentValue(interaction) {
  const key = interaction.target ? `${interaction.target}_${interaction.property}` : interaction.property
  return props.userState[key]
}

function getOptions(interaction) {
  // 从目标元件的 options 属性获取
  return interaction.options || [100, 220, 330, 470, 1000]
}

function updateValue(interaction, value) {
  const key = interaction.target ? `${interaction.target}_${interaction.property}` : interaction.property
  emit('update', key, value)
}

function formatResistor(v) {
  if (v >= 1000000) return `${v / 1000000}MΩ`
  if (v >= 1000) return `${v / 1000}kΩ`
  return `${v}Ω`
}

function formatSliderValue(interaction) {
  const v = currentValue(interaction)
  if (v === undefined) return ''
  if (interaction.unit === 'Hz') {
    return v >= 1000 ? `${(v / 1000).toFixed(1)}kHz` : `${v}Hz`
  }
  if (interaction.unit === 'Ω') {
    return v >= 1000 ? `${(v / 1000).toFixed(1)}kΩ` : `${v}Ω`
  }
  return `${v}${interaction.unit || ''}`
}

function formatToggleValue(val, interaction) {
  // Use custom labels if provided
  if (interaction.labels) {
    const idx = interaction.values.indexOf(val)
    if (idx >= 0 && interaction.labels[idx]) return interaction.labels[idx]
  }
  if (val === true) return '是'
  if (val === false) return '否'
  if (val === 'high') return '高电平'
  if (val === 'low') return '低电平'
  if (val === 'charge') return '充电'
  if (val === 'discharge') return '放电'
  return String(val)
}
</script>

<style scoped>
.interaction-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.interaction-item {
  background: rgba(255,255,255,0.04);
  border-radius: 10px;
  padding: 12px;
}
.interaction-label {
  display: block;
  font-size: 13px;
  color: #888;
  margin-bottom: 8px;
}
.slider-value {
  float: right;
  color: #3498db;
  font-weight: bold;
}
.value-buttons, .select-buttons, .toggle-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.value-btn, .select-btn, .toggle-btn {
  background: #2a2a3e;
  border: 1px solid #333;
  color: #aaa;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.value-btn.active, .select-btn.active, .toggle-btn.active {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: #fff;
  border-color: #3498db;
}
.mode-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.mode-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: #2a2a3e;
  border: 1px solid #333;
  color: #aaa;
  border-radius: 8px;
  padding: 8px 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}
.mode-btn.active {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: #fff;
  border-color: #3498db;
}
.mode-icon { font-size: 18px; }
.slider-input {
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  background: #2a2a3e;
  border-radius: 3px;
  outline: none;
}
.slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3498db;
  cursor: pointer;
}
</style>
