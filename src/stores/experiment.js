import { defineStore } from 'pinia'
import { Simulator } from '../engine/simulator.js'
import { ErrorDetector } from '../engine/error-detector.js'
import '../engine/components/index.js'

const simulator = new Simulator()
const errorDetector = new ErrorDetector()

export const useExperimentStore = defineStore('experiment', {
  state: () => ({
    currentExperiment: null,
    userState: {},
    simResult: null,
    errors: [],
    isRunning: false,
    feedbackHistory: []
  }),

  getters: {
    hasError: (state) => state.errors.length > 0,
    componentStates: (state) => state.simResult?.results || {},
    currentError: (state) => state.errors[0] || null
  },

  actions: {
    loadExperiment(config) {
      this.currentExperiment = config
      // 初始化用户状态（从交互配置中取默认值）
      this.userState = {}
      if (config.interactions) {
        // 将canvas元件的options注入到对应的click-cycle interaction中
        const compMap = new Map((config.canvas?.components || []).map(c => [c.id, c]))
        for (const interaction of config.interactions) {
          if (interaction.default !== undefined) {
            this.userState[interaction.target ? `${interaction.target}_${interaction.property}` : interaction.property] = interaction.default
          }
          // click-cycle类型：从元件options获取
          if (interaction.type === 'click-cycle' && interaction.target) {
            const comp = compMap.get(interaction.target)
            if (comp?.options) {
              interaction.options = comp.options
            }
          }
        }
      }
      // 从canvas元件中取默认值
      if (config.canvas?.components) {
        for (const comp of config.canvas.components) {
          if (comp.value !== undefined) {
            this.userState[comp.id + '_value'] = comp.value
          }
        }
      }
      this.runSimulation()
    },

    updateUserState(key, value) {
      this.userState[key] = value
      // 同步到元件属性
      if (this.currentExperiment?.canvas?.components) {
        for (const comp of this.currentExperiment.canvas.components) {
          if (key === comp.id + '_value') {
            comp.value = value
            comp.label = formatValue(comp.type, value)
          }
        }
      }
      this.runSimulation()
    },

    runSimulation() {
      if (!this.currentExperiment) return
      this.isRunning = true

      const result = simulator.simulate(this.currentExperiment.canvas, this.userState)
      const errors = errorDetector.detect(result)

      this.simResult = result
      this.errors = errors
      this.isRunning = false

      if (errors.length > 0) {
        this.feedbackHistory.push({
          timestamp: Date.now(),
          experimentId: this.currentExperiment.id,
          errors: errors
        })
      }
    }
  }
})

function formatValue(type, value) {
  if (type === 'resistor') {
    if (value >= 1000) return `${value / 1000}kΩ`
    return `${value}Ω`
  }
  return String(value)
}
