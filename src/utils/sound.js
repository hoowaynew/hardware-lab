/**
 * Web Audio API 程序化音效系统 - 无需音频文件
 */

let audioCtx = null
let enabled = true

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

export function setSoundEnabled(v) {
  enabled = v
}

export function isSoundEnabled() {
  return enabled
}

/**
 * 通用音效生成器
 * @param {Object} opts - { freq, duration, type, gain, sweep, decay }
 */
function tone({ freq = 440, duration = 0.1, type = 'sine', gain = 0.15, sweep = 0, decay = true }) {
  if (!enabled) return
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const g = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    if (sweep) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(sweep, 20), ctx.currentTime + duration)
    }

    g.gain.setValueAtTime(gain, ctx.currentTime)
    if (decay) {
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    }

    osc.connect(g)
    g.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch (e) { /* ignore */ }
}

/**
 * 噪音生成器（用于爆炸/烧毁音效）
 */
function noise({ duration = 0.3, gain = 0.2, filterFreq = 1000 }) {
  if (!enabled) return
  try {
    const ctx = getCtx()
    const bufferSize = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    const src = ctx.createBufferSource()
    src.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(filterFreq, ctx.currentTime)
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + duration)

    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

    src.connect(filter)
    filter.connect(g)
    g.connect(ctx.destination)
    src.start()
  } catch (e) { /* ignore */ }
}

export const sfx = {
  /** 按钮点击 - 清脆短音 */
  click() {
    tone({ freq: 800, duration: 0.05, type: 'square', gain: 0.08 })
  },

  /** 切换/选择 - 上升音 */
  toggle() {
    tone({ freq: 400, duration: 0.08, type: 'sine', gain: 0.1 })
    setTimeout(() => tone({ freq: 600, duration: 0.08, type: 'sine', gain: 0.1 }), 40)
  },

  /** 滑块拖动 - 轻微嘀 */
  slide() {
    tone({ freq: 300, duration: 0.03, type: 'sine', gain: 0.04 })
  },

  /** 错误/烧毁 - 爆炸+低频 */
  error() {
    noise({ duration: 0.35, gain: 0.25, filterFreq: 800 })
    setTimeout(() => tone({ freq: 80, duration: 0.2, type: 'sawtooth', gain: 0.15, sweep: 40 }), 50)
  },

  /** 短路 - 电弧声 */
  shortCircuit() {
    noise({ duration: 0.15, gain: 0.15, filterFreq: 3000 })
    tone({ freq: 120, duration: 0.1, type: 'square', gain: 0.12 })
  },

  /** 成功通关 - 上行琶音 */
  success() {
    const notes = [523, 659, 784, 1047]
    notes.forEach((f, i) => {
      setTimeout(() => tone({ freq: f, duration: 0.15, type: 'sine', gain: 0.12 }), i * 80)
    })
  },

  /** 成就解锁 - 华丽琶音 */
  achievement() {
    const notes = [523, 659, 784, 1047, 1319]
    notes.forEach((f, i) => {
      setTimeout(() => tone({ freq: f, duration: 0.2, type: 'triangle', gain: 0.1 }), i * 60)
    })
  },

  /** 蜂鸣器 - 持续蜂鸣 */
  buzzer(freq = 2000) {
    tone({ freq, duration: 0.15, type: 'square', gain: 0.1 })
  }
}
