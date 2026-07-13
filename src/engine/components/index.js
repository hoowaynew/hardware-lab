/**
 * 元件行为规则定义
 * 每个元件类型的行为和渲染规则
 */

import { registerComponent } from '../topology.js'

// 元件渲染定义（SVG形状参数）
const componentDefs = {
  power: {
    type: 'power',
    label: '电源',
    icon: '⚡',
    pins: ['+', '-'],
    svg: {
      width: 60, height: 40,
      shape: 'battery',
      color: '#e74c3c'
    }
  },
  ground: {
    type: 'ground',
    label: 'GND',
    icon: '⏚',
    pins: ['gnd'],
    svg: {
      width: 40, height: 30,
      shape: 'ground',
      color: '#333'
    }
  },
  resistor: {
    type: 'resistor',
    label: '电阻',
    icon: '🔧',
    pins: ['1', '2'],
    svg: {
      width: 60, height: 24,
      shape: 'resistor',
      color: '#e67e22'
    }
  },
  led: {
    type: 'led',
    label: 'LED',
    icon: '💡',
    pins: ['anode', 'cathode'],
    svg: {
      width: 36, height: 36,
      shape: 'led',
      color: '#f39c12'
    }
  },
  capacitor: {
    type: 'capacitor',
    label: '电容',
    icon: '🔗',
    pins: ['1', '2'],
    svg: {
      width: 36, height: 30,
      shape: 'capacitor',
      color: '#3498db'
    }
  },
  buzzer: {
    type: 'buzzer',
    label: '蜂鸣器',
    icon: '🔊',
    pins: ['+', '-'],
    svg: {
      width: 36, height: 36,
      shape: 'circle',
      color: '#9b59b6'
    }
  },
  motor: {
    type: 'motor',
    label: '电机',
    icon: '⚙️',
    pins: ['+', '-'],
    svg: {
      width: 40, height: 40,
      shape: 'circle',
      color: '#1abc9c'
    }
  },
  diode: {
    type: 'diode',
    label: '二极管',
    icon: '➡️',
    pins: ['anode', 'cathode'],
    svg: {
      width: 40, height: 20,
      shape: 'diode',
      color: '#2ecc71'
    }
  },
  gpio: {
    type: 'gpio',
    label: 'GPIO',
    icon: '📋',
    pins: ['pin'],
    svg: {
      width: 50, height: 50,
      shape: 'chip-pin',
      color: '#34495e'
    }
  },
  pwm: {
    type: 'pwm',
    label: 'PWM',
    icon: '📶',
    pins: ['out'],
    svg: {
      width: 50, height: 50,
      shape: 'signal',
      color: '#e74c3c'
    }
  },
  oscilloscope: {
    type: 'oscilloscope',
    label: '示波器',
    icon: '📊',
    pins: ['probe'],
    svg: {
      width: 50, height: 40,
      shape: 'scope',
      color: '#2c3e50'
    }
  }
}

// 注册所有元件到拓扑引擎
for (const [type, def] of Object.entries(componentDefs)) {
  registerComponent(type, def)
}

export { componentDefs }
