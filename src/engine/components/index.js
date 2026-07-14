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
  },
  probe: {
    type: 'probe',
    label: '探针',
    icon: '📌',
    pins: ['probe'],
    svg: {
      width: 30, height: 30,
      shape: 'probe',
      color: '#e91e63'
    }
  },
  'capacitor-charge': {
    type: 'capacitor-charge',
    label: 'RC充放电',
    icon: '🔋',
    pins: [],
    svg: {
      width: 50, height: 50,
      shape: 'capacitor-charge',
      color: '#3498db'
    }
  },
  'transistor-switch': {
    type: 'transistor-switch',
    label: '三极管开关',
    icon: '🔘',
    pins: [],
    svg: {
      width: 50, height: 50,
      shape: 'transistor-switch',
      color: '#e67e22'
    }
  },
  'rc-filter': {
    type: 'rc-filter',
    label: 'RC滤波器',
    icon: '〰️',
    pins: [],
    svg: {
      width: 50, height: 50,
      shape: 'rc-filter',
      color: '#9b59b6'
    }
  },
  'i2c-bus': {
    type: 'i2c-bus',
    label: 'I2C总线',
    icon: '🔗',
    pins: [],
    svg: {
      width: 50, height: 50,
      shape: 'i2c-bus',
      color: '#1abc9c'
    }
  },
  'ntc-sensor': {
    type: 'ntc-sensor',
    label: 'NTC测温',
    icon: '🌡️',
    pins: [],
    svg: {
      width: 50, height: 50,
      shape: 'ntc-sensor',
      color: '#e74c3c'
    }
  },
  'pcb-trace': {
    type: 'pcb-trace',
    label: 'PCB走线',
    icon: '🎨',
    pins: [],
    svg: {
      width: 50, height: 50,
      shape: 'pcb-trace',
      color: '#2ecc71'
    }
  },
  'wifi-link': {
    type: 'wifi-link',
    label: 'WiFi链路',
    icon: '📶',
    pins: [],
    svg: {
      width: 50, height: 50,
      shape: 'wifi-link',
      color: '#3498db'
    }
  },
  'logic-analyzer': {
    type: 'logic-analyzer',
    label: '逻辑分析仪',
    icon: '🐛',
    pins: [],
    svg: {
      width: 50, height: 50,
      shape: 'logic-analyzer',
      color: '#9b59b6'
    }
  },
  'dcdc-buck': {
    type: 'dcdc-buck',
    label: 'DC-DC Buck',
    icon: '⚡',
    pins: [],
    svg: {
      width: 50, height: 50,
      shape: 'dcdc-buck',
      color: '#e74c3c'
    }
  },
  'opamp-comparator': {
    type: 'opamp-comparator',
    label: '运放比较器',
    icon: '📐',
    pins: [],
    svg: {
      width: 50, height: 50,
      shape: 'opamp-comparator',
      color: '#3498db'
    }
  },
  'button-debounce': {
    type: 'button-debounce',
    label: '按键消抖',
    icon: '⏱️',
    pins: [],
    svg: {
      width: 50, height: 50,
      shape: 'button-debounce',
      color: '#f39c12'
    }
  }
}

// 注册所有元件到拓扑引擎
for (const [type, def] of Object.entries(componentDefs)) {
  registerComponent(type, def)
}

export { componentDefs }
