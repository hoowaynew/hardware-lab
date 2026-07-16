/**
 * 仿真引擎核心
 * 行为规则引擎：电路图 → 拓扑解析 → 连通性检测 → 元件状态计算 → 结果广播
 * MVP阶段支持单路径串联电路
 */

import { Topology } from './topology.js'

export class Simulator {
  constructor() {
    this.topology = new Topology()
    this.results = new Map()   // componentId -> simulation result
    this.errors = []           // 检测到的错误列表
    this.powerSources = []     // 电源元件列表
    this.grounds = []          // 接地元件列表
    this.context = {}          // 当前仿真上下文
  }

  /**
   * 执行仿真
   * @param {Object} canvas - 实验配置中的canvas对象
   * @param {Object} userState - 用户交互状态（如选中的电阻值、GPIO模式等）
   * @returns {Object} { results, errors, context }
   */
  simulate(canvas, userState = {}) {
    this.results.clear()
    this.errors = []
    this.powerSources = []
    this.grounds = []
    // Flatten userState: strip "TARGET_" prefix from keys like "PA0_gpioMode" -> "gpioMode"
    const flatState = {}
    for (const [key, val] of Object.entries(userState)) {
      const dotIdx = key.indexOf('_')
      if (dotIdx > 0) {
        const prefix = key.substring(0, dotIdx)
        const suffix = key.substring(dotIdx + 1)
        // If prefix matches a component id, use suffix as the context key
        const isComponentId = canvas.components.some(c => c.id === prefix)
        flatState[isComponentId ? suffix : key] = val
      } else {
        flatState[key] = val
      }
    }
    this.context = { ...flatState }

    // 1. 构建拓扑
    this.topology.build(canvas)

    // 2. 识别电源和地
    for (const comp of canvas.components) {
      if (comp.type === 'power' || comp.type === 'battery') {
        this.powerSources.push(comp)
      }
      if (comp.type === 'ground') {
        this.grounds.push(comp)
      }
    }

    // 3. 对每个电源，查找到地的路径并计算
    for (const power of this.powerSources) {
      const posPin = `${power.id}.+`
      const voltage = power.voltage || 3.3

      for (const gnd of this.grounds) {
        const gndPin = `${gnd.id}.gnd`
        const paths = this.topology.findAllPaths(posPin, gndPin)

        for (const path of paths) {
          const components = this.topology.getComponentsInPath(path)
          this._simulatePath(components, voltage, path)
        }
      }
    }

    // 4. 处理非电路路径的元件（如GPIO、PWM等独立模块）
    for (const comp of canvas.components) {
      if (!this.results.has(comp.id)) {
        this._simulateStandalone(comp)
      }
    }

    return {
      results: Object.fromEntries(this.results),
      errors: this.errors,
      context: this.context
    }
  }

  /**
   * 仿真串联路径上的元件
   * MVP: 只支持单路径串联电路
   */
  _simulatePath(components, voltage, path) {
    // 过滤掉电源和地，只保留负载元件
    const loadComponents = components.filter(c => 
      c.type !== 'power' && c.type !== 'battery' && c.type !== 'ground'
    )

    if (loadComponents.length === 0) return

    // 计算路径总电阻
    let totalResistance = 0
    for (const comp of loadComponents) {
      const resistance = this._getResistance(comp)
      if (resistance !== null) {
        totalResistance += resistance
      }
    }

    // 检查短路（总电阻为0且有负载元件）
    if (totalResistance === 0 && loadComponents.length > 0) {
      this.errors.push({
        type: 'SHORT_CIRCUIT',
        componentId: loadComponents[0].id,
        title: '短路！',
        explanation: `电路总电阻为0，电流无穷大。检查是否有直接连接电源和地的路径。`,
        path: path
      })
      // 标记路径上所有元件为损坏
      for (const comp of loadComponents) {
        this.results.set(comp.id, {
          state: 'damaged',
          current: Infinity,
          voltage: 0,
          error: 'SHORT_CIRCUIT'
        })
      }
      this.context.current = Infinity
      return
    }

    // 计算电流
    const current = voltage / totalResistance * 1000 // mA
    this.context.current = current
    this.context.voltage = voltage
    this.context.totalResistance = totalResistance

    // 逐个元件计算行为
    for (const comp of loadComponents) {
      const result = this._simulateComponent(comp, {
        voltage,
        current,
        resistance: this._getResistance(comp),
        totalResistance,
        path
      })
      this.results.set(comp.id, result)

      if (result.error) {
        this.errors.push({
          type: result.error,
          componentId: comp.id,
          title: result.errorTitle || '电路错误',
          explanation: result.errorExplanation || '',
          current: current,
          path: path
        })
      }
    }

    // 分压器：检测是否有两个电阻串联并计算分压点电压
    this._checkVoltageDivider(loadComponents, voltage, current)
  }

  /**
   * 分压器检测与计算
   * 如果路径上有R1+R2串联，计算R2上的分压
   */
  _checkVoltageDivider(loadComponents, voltage, current) {
    const resistors = loadComponents.filter(c => c.type === 'resistor')
    if (resistors.length === 2) {
      const r1 = resistors[0]
      const r2 = resistors[1]
      const r1Val = this.context[`${r1.id}_value`] || r1.value || 1000
      const r2Val = this.context[`${r2.id}_value`] || r2.value || 1000
      const vout = voltage * r2Val / (r1Val + r2Val)
      const totalR = r1Val + r2Val
      const powerMW = voltage * voltage / totalR * 1000

      // 将分压结果存到context供探针和错误检测使用
      this.context.vout = vout
      this.context.r1 = r1Val
      this.context.r2 = r2Val
      this.context.current = current
      this.context.power = powerMW
      this.context.totalR = totalR

      // 分压器错误检测
      if (vout > 3.3) {
        this.errors.push({
          type: 'VD_ADC_OVERVOLTAGE',
          componentId: r2.id,
          title: 'ADC输入过压! ⚠️',
          explanation: `Vout = ${vout.toFixed(2)}V 超过STM32 ADC最大输入3.3V，可能损坏引脚。\n建议增大R1或减小R2。`,
          vout: vout
        })
      }
      if (totalR < 500 && current > 10) {
        this.errors.push({
          type: 'VD_HIGH_CURRENT',
          componentId: r1.id,
          title: '功耗过大! 🔥',
          explanation: `总阻值${totalR}Ω，电流${current.toFixed(1)}mA，静态功耗${powerMW.toFixed(0)}mW。\n分压器应使用kΩ级电阻降低功耗。`,
          totalR: totalR,
          current: current,
          power: powerMW
        })
      }

      // 更新R2的结果包含分压信息
      const r2Result = this.results.get(r2.id)
      if (r2Result) {
        r2Result.vout = vout
        r2Result.voltage = vout
      }
    }
  }

  /**
   * 仿真独立元件（非串联路径上的，如GPIO、PWM模块）
   */
  _simulateStandalone(comp) {
    const handlers = {
      gpio: () => this._simulateGPIO(comp),
      pwm: () => this._simulatePWM(comp),
      'capacitor-charge': () => this._simulateCapacitorCharge(comp),
      'transistor-switch': () => this._simulateTransistorSwitch(comp),
      'rc-filter': () => this._simulateRCFilter(comp),
      'i2c-bus': () => this._simulateI2C(comp),
      'ntc-sensor': () => this._simulateNTC(comp),
      'pcb-trace': () => this._simulatePCBTrace(comp),
      'wifi-link': () => this._simulateWiFi(comp),
      'logic-analyzer': () => this._simulateLogicAnalyzer(comp),
      'dcdc-buck': () => this._simulateDCDCBuck(comp),
      'opamp-comparator': () => this._simulateOpAmp(comp),
      'button-debounce': () => this._simulateButtonDebounce(comp),
      'ldo-regulator': () => this._simulateLDO(comp),
      'timer-555': () => this._simulateTimer555(comp),
      'esd-protection': () => this._simulateESD(comp),
      'uart-bus': () => this._simulateUART(comp),
      'photoresistor-sensor': () => this._simulatePhotoresistor(comp),
      'lc-bandpass': () => this._simulateLCBandpass(comp),
      'mosfet-switch': () => this._simulateMOSFET(comp),
      'relay-driver': () => this._simulateRelay(comp),
      'r2r-dac': () => this._simulateR2RDAC(comp),
      'adc-sampling': () => this._simulateADC(comp),
      'pcb-ground-loop': () => this._simulatePcbGroundLoop(comp),
      'oscilloscope-probe': () => this._simulateOscilloscopeProbe(comp),
      'ble-link': () => this._simulateBLELink(comp),
      'rs485-bus': () => this._simulateRS485(comp),
      'sallen-key-filter': () => this._simulateSallenKey(comp),
      'dma-transfer': () => this._simulateDMA(comp),
      'ultrasonic-sensor': () => this._simulateUltrasonic(comp),
      'diff-pair-routing': () => this._simulateDiffPair(comp),
      'lora-link': () => this._simulateLoRa(comp),
      'jtag-boundary': () => this._simulateJTAG(comp)
    }

    const handler = handlers[comp.type]
    if (handler) {
      const result = handler()
      this.results.set(comp.id, result)
      if (result.error) {
        this.errors.push({
          type: result.error,
          componentId: comp.id,
          title: result.errorTitle || '配置错误',
          explanation: result.errorExplanation || ''
        })
      }
    }
  }

  /**
   * 仿真单个元件行为
   */
  _simulateComponent(comp, ctx) {
    const handlers = {
      resistor: () => this._simulateResistor(comp, ctx),
      led: () => this._simulateLED(comp, ctx),
      capacitor: () => this._simulateCapacitor(comp, ctx),
      buzzer: () => this._simulateBuzzer(comp, ctx),
      motor: () => this._simulateMotor(comp, ctx),
      diode: () => this._simulateDiode(comp, ctx)
    }

    const handler = handlers[comp.type]
    return handler ? handler() : { state: 'unknown' }
  }

  _getResistance(comp) {
    if (comp.type === 'resistor') return comp.value || 330
    if (comp.type === 'led') return null // LED不按线性电阻处理
    if (comp.type === 'diode') return null
    return null
  }

  _simulateResistor(comp, ctx) {
    return {
      state: 'normal',
      voltage: ctx.current * comp.value / 1000, // V = IR
      current: ctx.current,
      resistance: comp.value
    }
  }

  _simulateLED(comp, ctx) {
    const maxCurrent = comp.maxCurrent || 20 // mA
    const forwardVoltage = comp.forwardVoltage || 2.0 // V
    const resistance = ctx.resistance || 0

    // 检查极性
    if (comp.polarity === 'reversed' || ctx.polarity === 'reversed') {
      return {
        state: 'off',
        current: 0,
        error: 'LED_REVERSED',
        errorTitle: 'LED不亮',
        errorExplanation: 'LED是二极管，正极需要接高电位。检查接线方向。'
      }
    }

    // 如果路径中有电阻，计算实际电流
    if (ctx.totalResistance > 0) {
      const current = (ctx.voltage - forwardVoltage) / (ctx.totalResistance) * 1000

      if (current > maxCurrent) {
        return {
          state: 'burned',
          current: current,
          brightness: 0,
          error: 'LED_OVERCURRENT',
          errorTitle: 'LED烧毁了！💥',
          errorExplanation: `电流 ${current.toFixed(1)}mA 超过LED额定 ${maxCurrent}mA。\n限流电阻 R = (Vcc - Vf) / If = (${ctx.voltage} - ${forwardVoltage}) / ${maxCurrent / 1000} = ${((ctx.voltage - forwardVoltage) / (maxCurrent / 1000)).toFixed(0)}Ω`,
          animation: 'smoke'
        }
      }

      if (current < 2) {
        return {
          state: 'dim',
          current: current,
          brightness: current / maxCurrent * 100
        }
      }

      return {
        state: 'on',
        current: current,
        brightness: Math.min(current / maxCurrent * 100, 100)
      }
    }

    // 没有电阻直接接LED = 短路
    return {
      state: 'burned',
      current: Infinity,
      brightness: 0,
      error: 'LED_NO_RESISTOR',
      errorTitle: 'LED烧毁了！💥',
      errorExplanation: 'LED直接接电源没有限流电阻，电流无限制。',
      animation: 'smoke'
    }
  }

  _simulateCapacitor(comp, ctx) {
    return {
      state: 'charging',
      current: ctx.current,
      capacitance: comp.value
    }
  }

  _simulateBuzzer(comp, ctx) {
    if (ctx.current > 0 && ctx.current < 100) {
      return { state: 'on', current: ctx.current, frequency: comp.frequency || 2000 }
    }
    return { state: 'off', current: ctx.current }
  }

  _simulateMotor(comp, ctx) {
    if (ctx.current > 0) {
      return { state: 'running', current: ctx.current, speed: Math.min(ctx.current / 50 * 100, 100) }
    }
    return { state: 'stopped', current: 0 }
  }

  _simulateDiode(comp, ctx) {
    if (comp.polarity === 'reversed') {
      return { state: 'blocking', current: 0 }
    }
    return { state: 'conducting', current: ctx.current, forwardVoltage: 0.7 }
  }

  _simulateGPIO(comp) {
    const mode = this.context.gpioMode || comp.defaultMode || 'input_floating'
    const modes = {
      input_floating: {
        state: 'unstable',
        voltage: 'uncertain',
        level: 'floating',
        error: 'GPIO_FLOATING',
        errorTitle: '引脚电平不稳定！',
        errorExplanation: '浮空输入没有上拉/下拉电阻，引脚电平不确定，会受干扰波动。\n建议使用上拉或下拉输入模式。',
        animation: 'wave-jitter'
      },
      input_pullup: {
        state: 'stable-high',
        voltage: 3.3,
        level: 'high'
      },
      input_pulldown: {
        state: 'stable-low',
        voltage: 0,
        level: 'low'
      },
      input_analog: {
        state: 'analog',
        voltage: this.context.analogValue || 1.65,
        level: 'analog'
      },
      output_opendrain: {
        state: 'open-drain',
        voltage: this.context.outputLevel === 'high' ? 'floating-high' : 0,
        level: this.context.outputLevel || 'low',
        error: this.context.outputLevel === 'high' ? 'OPENDRAIN_NO_PULLUP' : null,
        errorTitle: '输出无法拉高',
        errorExplanation: '开漏输出需要外部上拉电阻才能输出高电平。\n当前配置下，输出高电平时引脚处于高阻态。'
      },
      output_pushpull: {
        state: 'push-pull',
        voltage: this.context.outputLevel === 'high' ? 3.3 : 0,
        level: this.context.outputLevel || 'low'
      },
      af_pushpull: {
        state: 'af-push-pull',
        voltage: this.context.outputLevel === 'high' ? 3.3 : 0,
        level: this.context.outputLevel || 'low'
      },
      af_opendrain: {
        state: 'af-open-drain',
        voltage: this.context.outputLevel === 'high' ? 'floating-high' : 0,
        level: this.context.outputLevel || 'low'
      }
    }

    // 推挽输出直接接GND的短路检测
    if (mode === 'output_pushpull' && this.context.connectedToGround && this.context.outputLevel === 'high') {
      return {
        state: 'short',
        voltage: 0,
        level: 'low',
        error: 'GPIO_SHORT',
        errorTitle: '短路警告！⚠️',
        errorExplanation: '推挽输出直接接地且输出高电平，会形成短路。\n推挽输出不应直接连接到低阻抗负载。',
        animation: 'spark'
      }
    }

    return modes[mode] || { state: 'unknown' }
  }

  _simulatePWM(comp) {
    const frequency = this.context.pwmFrequency || 1000
    const dutyCycle = this.context.pwmDutyCycle !== undefined ? this.context.pwmDutyCycle : 50
    const loadType = this.context.pwmLoad || comp.defaultLoad || 'led'

    const results = {
      frequency,
      dutyCycle,
      avgVoltage: 3.3 * dutyCycle / 100,
      loadType
    }

    // LED负载
    if (loadType === 'led') {
      results.loadState = dutyCycle === 0 ? 'off' : 'on'
      results.brightness = dutyCycle
    }

    // 舵机负载
    if (loadType === 'servo') {
      // 舵机需要20ms周期 (50Hz), 2.5ms=180, 0.5ms=0
      const servoFreq = 50
      if (frequency !== servoFreq) {
        results.loadState = 'error'
        results.error = 'PWM_SERVO_FREQ'
        results.errorTitle = '舵机不动了! ⚙️',
        results.errorExplanation = `舵机需要50Hz(20ms周期)信号.\n当前频率 ${frequency}Hz, 舵机无法识别.`
      } else {
        // 从占空比推算角度 (0.5ms~2.5ms -> 0~180)
        const pulseWidth = dutyCycle / 100 * 20 // ms
        const angle = Math.max(0, Math.min(180, (pulseWidth - 0.5) / 2 * 180))
        results.loadState = 'running'
        results.angle = angle
      }
    }

    // 蜂鸣器负载
    if (loadType === 'buzzer') {
      results.loadState = dutyCycle > 0 ? 'on' : 'off'
      results.tone = frequency
    }

    // 100%占空比 + 舵机 = 舵机不动
    if (loadType === 'servo' && dutyCycle === 100) {
      results.loadState = 'error'
      results.error = 'PWM_SERVO_100'
      results.errorTitle = '舵机不动了! ⚙️',
      results.errorExplanation = '100%占空比意味着持续高电平, 没有周期变化, 舵机无法识别角度信号.'
    }

    return results
  }

  /**
   * 仿真电容充放电
   * tau = RC, V(t) = Vmax * (1 - e^(-t/tau)) charge
   * V(t) = V0 * e^(-t/tau) discharge
   */
  _simulateCapacitorCharge(comp) {
    const R = this.context.ccResistance || comp.defaultR || 1000
    const C = this.context.ccCapacitance || comp.defaultC || 100 // uF
    const Vmax = this.context.ccVoltage || comp.defaultVoltage || 5
    const mode = this.context.ccMode || 'charge'

    // tau = RC (Ohm * uF = us, convert to s: /1000000)
    const tau = R * C / 1000000 // seconds
    const fiveTau = tau * 5

    // generate charge/discharge curve data points
    const points = 60
    const curve = []
    const totalTime = Math.max(fiveTau, 0.01)

    for (let i = 0; i <= points; i++) {
      const t = (i / points) * totalTime
      let voltage
      if (mode === 'charge') {
        voltage = Vmax * (1 - Math.exp(-t / tau))
      } else {
        voltage = Vmax * Math.exp(-t / tau)
      }
      curve.push({ t: t * 1000, v: voltage }) // ms, V
    }

    const result = {
      resistance: R,
      capacitance: C,
      voltage: Vmax,
      tau: tau,
      tauMs: tau * 1000,
      fiveTau: fiveTau,
      fiveTauMs: fiveTau * 1000,
      mode: mode,
      curve: curve,
      loadState: 'running'
    }

    // slow charge warning
    if (tau > 10) {
      result.error = 'CC_SLOW_CHARGE'
      result.errorTitle = '充电太慢了! ⏱️'
      result.errorExplanation = `tau = RC = ${tau.toFixed(1)}s, 5tau = ${fiveTau.toFixed(1)}s to full charge.\nDecrease R or C for faster response.`
    }

    return result
  }

  /**
   * 仿真三极管开关电路
   * NPN: Ib -> Ic = beta*Ib (active), saturation: Ic = (Vcc-Vce_sat)/Rc
   */
  _simulateTransistorSwitch(comp) {
    const Rb = this.context.tsBaseResistor || comp.defaultRb || 1000
    const Rc = this.context.tsCollectorResistor || comp.defaultRc || 220
    const Vcc = this.context.tsVcc || comp.defaultVcc || 5
    const beta = comp.defaultBeta || 100
    const inputHigh = this.context.tsInputHigh !== undefined ? this.context.tsInputHigh : true
    const Vbe = 0.7 // base-emitter junction voltage
    const VceSat = 0.2 // saturation voltage

    let state = 'cutoff'
    let Ib = 0
    let Ic = 0
    let Vce = Vcc
    let power = 0

    if (!inputHigh) {
      // input low -> cutoff
      state = 'cutoff'
      Ib = 0
      Ic = 0
      Vce = Vcc
    } else {
      // input high -> calculate base current
      Ib = (Vcc - Vbe) / Rb * 1000 // mA

      // calculate saturation current
      const IcSat = (Vcc - VceSat) / Rc * 1000 // mA
      const IbMin = IcSat / beta

      if (Ib >= IbMin) {
        // saturation region - switch ON
        state = 'saturation'
        Ic = IcSat
        Vce = VceSat
      } else {
        // active region
        state = 'active'
        Ic = Ib * beta
        Vce = Vcc - Ic * Rc / 1000
      }

      power = Vce * Ic // mW
    }

    const result = {
      state,
      baseResistor: Rb,
      collectorResistor: Rc,
      vcc: Vcc,
      beta,
      inputHigh,
      baseCurrent: Ib,
      collectorCurrent: Ic,
      vce: Vce,
      power: power,
      loadState: 'running',
      icSat: (Vcc - VceSat) / Rc * 1000
    }

    // base overcurrent check
    if (Ib > 20) {
      result.error = 'TS_BASE_OVERCURRENT'
      result.errorTitle = '基极电流过大! 💥'
      result.errorExplanation = `Ib = ${Ib.toFixed(1)}mA exceeds base rated 20mA.\nIncrease Rb to limit base current.`
    }

    // collector overcurrent check
    if (Ic > 500) {
      result.error = 'TS_COLLECTOR_OVERCURRENT'
      result.errorTitle = '集电极电流过大! 💥'
      result.errorExplanation = `Ic = ${Ic.toFixed(1)}mA exceeds collector rated 500mA.\nCheck Vcc/Rc ratio and beta.`
    }

    // power dissipation check
    if (power > 500) {
      result.error = 'TS_POWER_DISSIPATION'
      result.errorTitle = '功耗过大! 🔥'
      result.errorExplanation = `P = Vce x Ic = ${power.toFixed(0)}mW exceeds 500mW.\nTransistor may overheat.`
    }

    return result
  }

  /**
   * 仿真RC低通滤波器
   * fc = 1/(2πRC), 增益 = 1/√(1+(f/fc)²)
   */
  _simulateRCFilter(comp) {
    const R = this.context.rfResistance || comp.defaultR || 1000
    const C = this.context.rfCapacitance || comp.defaultC || 10 // μF
    const inputFreq = this.context.rfFrequency || comp.defaultFreq || 100
    const inputType = this.context.rfInputType || comp.defaultInputType || 'square'

    // fc = 1/(2πRC), R in Ohm, C in μF → convert to F: C/1e6
    const fc = 1 / (2 * Math.PI * R * (C / 1e6))
    // gain at input frequency
    const ratio = inputFreq / fc
    const gain = 1 / Math.sqrt(1 + ratio * ratio)
    const attenuationDB = 20 * Math.log10(gain)

    // generate input + output waveform (60 points, 2 cycles)
    const points = 120
    const inputCurve = []
    const outputCurve = []
    const period = 1 / inputFreq
    const totalTime = period * 2

    for (let i = 0; i <= points; i++) {
      const t = (i / points) * totalTime
      let inputV
      if (inputType === 'square') {
        // square wave: high for first half, low for second half
        const phase = (t % period) / period
        inputV = phase < 0.5 ? 1 : 0
      } else {
        // sine wave
        inputV = 0.5 + 0.5 * Math.sin(2 * Math.PI * inputFreq * t)
      }
      // output: RC low-pass response
      // for square wave, approximate with exponential charge/discharge
      let outputV
      if (inputType === 'square') {
        const phase = (t % period) / period
        const halfPeriod = period / 2
        if (phase < 0.5) {
          // charging: Vout = 1 - exp(-t/halfPeriod * τ_factor)
          const elapsed = phase * period
          const tau = R * (C / 1e6)
          outputV = 1 - Math.exp(-elapsed / tau)
        } else {
          // discharging
          const elapsed = (phase - 0.5) * period
          const tau = R * (C / 1e6)
          const startV = 1 - Math.exp(-halfPeriod / tau)
          outputV = startV * Math.exp(-elapsed / tau)
        }
      } else {
        // sine: attenuated and phase-shifted
        const phaseShift = Math.atan(ratio)
        outputV = gain * 0.5 * Math.sin(2 * Math.PI * inputFreq * t - phaseShift) + 0.5
      }
      inputCurve.push({ t: t * 1000, v: inputV })
      outputCurve.push({ t: t * 1000, v: outputV })
    }

    const result = {
      resistance: R,
      capacitance: C,
      inputFreq,
      fc,
      fcHz: fc < 1 ? fc.toFixed(4) : fc < 1000 ? fc.toFixed(1) : (fc / 1000).toFixed(1) + 'k',
      gain,
      attenuationDB,
      inputType,
      inputCurve,
      outputCurve,
      loadState: 'running'
    }

    // not filtering warning (input freq well below fc)
    if (inputFreq < fc * 0.5) {
      result.error = 'RF_NOT_FILTERING'
      result.errorTitle = '信号直接通过，没有滤波效果'
      result.errorExplanation = `输入频率 ${inputFreq}Hz 低于截止频率 ${fc.toFixed(1)}Hz，信号几乎无衰减通过。\n提高输入频率才能看到滤波效果。`
    }

    return result
  }

  /**
   * 仿真I2C总线时序
   * START → 7-bit地址+R/W → ACK → 8-bit数据 → ACK → STOP
   */
  _simulateI2C(comp) {
    const step = this.context.i2cStep || 'idle'
    const address = this.context.i2cAddress || 80 // 0x50
    const data = this.context.i2cData || 165 // 0xA5
    const ackError = this.context.i2cAckError || false

    // generate SDA/SCL waveform based on current step
    const waveforms = this._generateI2CWaveforms(step, address, data, ackError)

    const result = {
      step,
      address: '0x' + address.toString(16).toUpperCase().padStart(2, '0'),
      addressDec: address,
      data: '0x' + data.toString(16).toUpperCase().padStart(2, '0'),
      dataDec: data,
      dataBits: data.toString(2).padStart(8, '0'),
      addressBits: address.toString(2).padStart(7, '0') + '0', // 7-bit + W(0)
      ackError,
      sdaWave: waveforms.sda,
      sclWave: waveforms.scl,
      annotations: waveforms.annotations,
      loadState: 'running'
    }

    // NACK error
    if (ackError && (step === 'ack1' || step === 'ack2')) {
      result.error = 'I2C_NACK'
      result.errorTitle = 'NACK！从机没有响应 ⚠️'
      result.errorExplanation = `地址 0x${address.toString(16).toUpperCase()} 的设备返回NACK。\n可能原因：设备未连接、地址错误、设备忙。`
    }

    // order error: data/ack2/stop without start
    const stepOrder = ['idle', 'start', 'address', 'ack1', 'data', 'ack2', 'stop']
    const currentIdx = stepOrder.indexOf(step)
    if (currentIdx > 1 && !ackError) {
      // this is fine, just normal progression
    }

    return result
  }

  /**
   * 生成I2C SDA/SCL波形
   */
  _generateI2CWaveforms(step, address, data, ackError) {
    const stepOrder = ['idle', 'start', 'address', 'ack1', 'data', 'ack2', 'stop']
    const currentIdx = stepOrder.indexOf(step)

    // Build cumulative waveform up to current step
    const segments = []
    const sda = []
    const scl = []
    const annotations = []
    let t = 0
    const bitTime = 2 // 2 time units per bit (SCL low + SCL high)

    // Helper: push a bit segment
    const pushBit = (bit, label) => {
      // SCL low phase (data change)
      sda.push({ t, v: bit })
      scl.push({ t, v: 0 })
      t += 1
      // SCL high phase (data stable)
      sda.push({ t, v: bit })
      scl.push({ t, v: 1 })
      annotations.push({ t: t - 0.5, label })
      t += 1
    }

    // Idle
    sda.push({ t, v: 1 })
    scl.push({ t, v: 1 })
    t += 1

    // START condition (SCL high, SDA goes high→low)
    if (currentIdx >= 1) {
      sda.push({ t: t - 0.5, v: 1 })
      scl.push({ t: t - 0.5, v: 1 })
      sda.push({ t, v: 0 })
      scl.push({ t, v: 1 })
      annotations.push({ t, label: 'START' })
      t += 1
    }

    // Address (7 bits + R/W=0)
    if (currentIdx >= 2) {
      const addrBits = address.toString(2).padStart(7, '0')
      for (let i = 0; i < 7; i++) {
        pushBit(parseInt(addrBits[i]), `A${6 - i}`)
      }
      pushBit(0, 'W') // Write bit
    }

    // ACK1
    if (currentIdx >= 3) {
      const ackBit = ackError ? 1 : 0 // NACK=1, ACK=0
      pushBit(ackBit, ackError ? 'NACK' : 'ACK')
    }

    // Data (8 bits)
    if (currentIdx >= 4) {
      const dataBits = data.toString(2).padStart(8, '0')
      for (let i = 0; i < 8; i++) {
        pushBit(parseInt(dataBits[i]), `D${7 - i}`)
      }
    }

    // ACK2
    if (currentIdx >= 5) {
      const ackBit = ackError ? 1 : 0
      pushBit(ackBit, ackError ? 'NACK' : 'ACK')
    }

    // STOP (SCL high, SDA goes low→high)
    if (currentIdx >= 6) {
      sda.push({ t, v: 0 })
      scl.push({ t, v: 0 })
      t += 0.5
      sda.push({ t, v: 0 })
      scl.push({ t, v: 1 })
      t += 0.5
      sda.push({ t, v: 1 })
      scl.push({ t, v: 1 })
      annotations.push({ t, label: 'STOP' })
      t += 1
    }

    // Trailing idle
    sda.push({ t, v: 1 })
    scl.push({ t, v: 1 })
    t += 1

    return { sda, scl, annotations }
  }

  /**
   * 仿真NTC热敏电阻测温
   * R(T) = R25 × exp(B × (1/T - 1/T25))
   * 分压: Vout = Vcc × Rntc/(Rpullup + Rntc)  (NTC接地式)
   * ADC: adcValue = Vout/Vcc × (2^bits - 1)
   */
  _simulateNTC(comp) {
    const tempC = this.context.ntcTemp !== undefined ? this.context.ntcTemp : 25
    const R25 = this.context.ntcR25 || comp.defaultR25 || 10000
    const beta = this.context.ntcBeta || comp.defaultBeta || 3950
    const Rpullup = this.context.ntcPullup || comp.defaultPullup || 10000
    const Vcc = comp.defaultVcc || 3.3
    const adcBits = comp.defaultAdcBits || 12

    // NTC resistance using B-parameter equation
    const T25 = 298.15 // 25°C in Kelvin
    const T = tempC + 273.15
    const Rntc = R25 * Math.exp(beta * (1 / T - 1 / T25))

    // Voltage divider (NTC to GND, pullup to Vcc)
    const Vout = Vcc * Rntc / (Rpullup + Rntc)

    // ADC value
    const adcMax = Math.pow(2, adcBits) - 1
    const adcValue = Math.round(Vout / Vcc * adcMax)

    // Temperature resolution (dADC/dT)
    const temp2 = tempC + 1
    const T2 = temp2 + 273.15
    const Rntc2 = R25 * Math.exp(beta * (1 / T2 - 1 / T25))
    const Vout2 = Vcc * Rntc2 / (Rpullup + Rntc2)
    const adc2 = Math.round(Vout2 / Vcc * adcMax)
    const adcResolution = Math.abs(adcValue - adc2) // ADC counts per °C

    const result = {
      tempC,
      R25,
      beta,
      Rpullup,
      Rntc,
      RntcK: Rntc >= 1000 ? (Rntc / 1000).toFixed(2) + 'kΩ' : Rntc.toFixed(0) + 'Ω',
      Vcc,
      Vout,
      adcBits,
      adcMax,
      adcValue,
      adcPercent: (adcValue / adcMax * 100).toFixed(1),
      adcResolution,
      loadState: 'running'
    }

    // ADC saturation warning
    if (adcValue >= adcMax * 0.95) {
      result.error = 'NTC_ADC_SATURATION'
      result.errorTitle = 'ADC饱和！读数不可靠 ⚠️'
      result.errorExplanation = `ADC读数 ${adcValue} 接近满量程 ${adcMax}。\n低温时NTC阻值大，分压输出接近Vcc。\n减小上拉电阻或换更小R25的NTC。`
    }

    // ADC too low
    if (adcValue <= adcMax * 0.05) {
      result.error = 'NTC_ADC_LOW'
      result.errorTitle = 'ADC读数太低！精度差 ⚠️'
      result.errorExplanation = `ADC读数 ${adcValue} 太小，有效精度不足。\n高温时NTC阻值小，分压输出接近0V。\n增大上拉电阻或换更大R25的NTC。`
    }

    return result
  }

  /**
   * 仿真PCB微带线阻抗
   * Z0 = 87/sqrt(εr+1.41) × ln(5.98×H/(0.8×W+T))
   * 适用范围: 0.1 < W/H < 2.0, 1 < εr < 15
   */
  _simulatePCBTrace(comp) {
    const W = this.context.pcbTraceWidth || comp.defaultW || 0.7 // mm
    const H = this.context.pcbDielectricH || comp.defaultH || 0.36 // mm
    const er = this.context.pcbEr || comp.defaultEr || 4.4
    const T = this.context.pcbCopperT || comp.defaultT || 0.035 // mm

    // Microstrip impedance (Hammerstad-Jensen simplified)
    const effectiveEr = (er + 1) / 2 + (er - 1) / 2 * 1 / Math.sqrt(1 + 12 * H / W)
    const w1 = W
    const w2 = W + T * 0.0 // simplified, ignore T correction for width
    const ratio = 5.98 * H / (0.8 * W + T)
    const z0 = 87 / Math.sqrt(er + 1.41) * Math.log(ratio)

    // Target 50Ω
    const targetZ = 50
    const deviation = Math.abs(z0 - targetZ)

    // Capacitance per unit length (pF/cm): C = sqrt(εeff) / (c × Z0) × 1e12
    // Simplified: C ≈ 1.44×εeff*W/H (pF/cm) for microstrip
    const capacitance = 1.44 * effectiveEr * W / H // pF/cm (approx)

    // Propagation delay (ps/mm): td = sqrt(εeff) / c
    const c_speed = 3e8 // m/s
    const propDelay = Math.sqrt(effectiveEr) / c_speed * 1e12 / 1e3 // ps/mm

    const result = {
      traceWidth: W,
      dielectricH: H,
      er,
      copperT: T,
      effectiveEr: parseFloat(effectiveEr.toFixed(3)),
      impedance: parseFloat(z0.toFixed(1)),
      targetZ,
      deviation: parseFloat(deviation.toFixed(1)),
      capacitance: parseFloat(capacitance.toFixed(2)),
      propDelay: parseFloat(propDelay.toFixed(3)),
      loadState: 'running'
    }

    // Impedance mismatch warning
    if (deviation > 15) {
      result.error = 'PCB_IMP_MISMATCH'
      result.errorTitle = '阻抗失配！信号反射 ⚠️'
      result.errorExplanation = `走线阻抗 ${z0.toFixed(1)}Ω 偏离目标50Ω达${deviation.toFixed(1)}Ω。\n高频信号会产生反射，导致信号完整性问题。\n${z0 > 50 ? '增大线宽W或减小介质厚度H可降低阻抗' : '减小线宽W或增大介质厚度H可提高阻抗'}。`
    }

    return result
  }

  /**
   * 仿真WiFi信号衰减（链路预算）
   * FSPL(dB) = 20log10(d) + 20log10(f_MHz) + 32.44
   * RSSI = TxPower + TxGain + RxGain - FSPL - wallLoss
   */
  _simulateWiFi(comp) {
    const txPower = this.context.wifiTxPower || comp.defaultTxPower || 20 // dBm
    const txGain = comp.defaultTxAntennaGain || 2 // dBi
    const rxGain = comp.defaultRxAntennaGain || 2 // dBi
    const freq = this.context.wifiFreq || comp.defaultRxFreq || 2412 // MHz
    const distance = this.context.wifiDistance || comp.defaultDistance || 10 // m
    const walls = this.context.wifiWalls !== undefined ? this.context.wifiWalls : comp.defaultWalls ?? 1
    const rxSensitivity = comp.defaultRxSensitivity || -82 // dBm

    // Free Space Path Loss
    const fspl = 20 * Math.log10(distance) + 20 * Math.log10(freq) + 32.44

    // Wall attenuation (approx 8dB per wall for 2.4GHz, 12dB for 5GHz)
    const wallLossPerWall = freq > 4000 ? 12 : 8
    const totalWallLoss = walls * wallLossPerWall

    // RSSI at receiver
    const rssi = txPower + txGain + rxGain - fspl - totalWallLoss

    // Signal quality categories
    let quality = 'excellent'
    let qualityPct = 100
    if (rssi < -50) { quality = 'good'; qualityPct = 75 }
    if (rssi < -65) { quality = 'fair'; qualityPct = 50 }
    if (rssi < -75) { quality = 'poor'; qualityPct = 25 }
    if (rssi < rxSensitivity) { quality = 'none'; qualityPct = 0 }

    // Link budget margin
    const margin = rssi - rxSensitivity

    // Determine band
    const band = freq < 3000 ? '2.4GHz' : '5GHz'

    const result = {
      txPower,
      txGain,
      rxGain,
      freq,
      band,
      distance,
      walls,
      wallLossPerWall,
      totalWallLoss,
      fspl: parseFloat(fspl.toFixed(1)),
      rssi: parseFloat(rssi.toFixed(1)),
      rxSensitivity,
      margin: parseFloat(margin.toFixed(1)),
      quality,
      qualityPct,
      loadState: 'running'
    }

    // Signal too weak
    if (rssi < rxSensitivity) {
      result.error = 'WIFI_SIGNAL_TOO_WEAK'
      result.errorTitle = '信号太弱！无法接收 ⚠️'
      result.errorExplanation = `接收信号强度 ${rssi.toFixed(1)}dBm 低于接收灵敏度 ${rxSensitivity}dBm。\n信号被障碍物衰减过多，链路预算不足${margin.toFixed(1)}dB。\n缩短距离、减少障碍、或增大发射功率。`
    } else if (margin < 10) {
      result.error = 'WIFI_MARGIN_LOW'
      result.errorTitle = '链路余量不足！信号不稳定 ⚠️'
      result.errorExplanation = `链路余量仅 ${margin.toFixed(1)}dB，建议至少10dB以上。\n稍有干扰就会断连，考虑缩短距离或减少障碍墙。`
    }

    return result
  }

  /**
   * 仿真逻辑分析仪SPI信号解码
   * SPI 4种模式: CPOL×CPHA = Mode0~3
   * 4路信号: CS, SCLK, MOSI, MISO
   */
  _simulateLogicAnalyzer(comp) {
    const cpol = this.context.laCpol !== undefined ? this.context.laCpol : comp.defaultCpol
    const cpha = this.context.laCpha !== undefined ? this.context.laCpha : comp.defaultCpha
    const clockFreq = this.context.laClockFreq || comp.defaultClockFreq || 1000 // kHz
    const dataByte = this.context.laDataByte !== undefined ? this.context.laDataByte : comp.defaultData

    // SPI mode
    const mode = cpol * 2 + cpha
    const modeNames = ['Mode 0', 'Mode 1', 'Mode 2', 'Mode 3']

    // Expected mode by slave (always Mode 0 for this demo)
    const expectedCpol = 0
    const expectedCpha = 0
    const expectedMode = 0
    const modeMismatch = cpol !== expectedCpol || cpha !== expectedCpha

    // Generate 4-channel waveform
    const waveforms = this._generateSPIWaveforms(cpol, cpha, clockFreq, dataByte)

    // Decode data based on mode
    const decodedByte = modeMismatch ? this._corruptByte(dataByte, mode) : dataByte

    // Timebase
    const period = 1000 / clockFreq // μs per clock cycle
    const totalTime = period * 8 // 8 bits

    const result = {
      cpol,
      cpha,
      mode,
      modeName: modeNames[mode],
      expectedMode,
      expectedModeName: modeNames[expectedMode],
      modeMismatch,
      clockFreq,
      period: parseFloat(period.toFixed(3)),
      totalTime: parseFloat(totalTime.toFixed(3)),
      dataByte,
      dataHex: '0x' + dataByte.toString(16).toUpperCase().padStart(2, '0'),
      dataBits: dataByte.toString(2).padStart(8, '0'),
      decodedByte,
      decodedHex: '0x' + decodedByte.toString(16).toUpperCase().padStart(2, '0'),
      decodedBits: decodedByte.toString(2).padStart(8, '0'),
      csWave: waveforms.cs,
      sclkWave: waveforms.sclk,
      mosiWave: waveforms.mosi,
      misoWave: waveforms.miso,
      annotations: waveforms.annotations,
      loadState: 'running'
    }

    if (modeMismatch) {
      result.error = 'SPI_MODE_MISMATCH'
      result.errorTitle = 'SPI模式不匹配！数据错位 ⚠️'
      result.errorExplanation = `主机用 ${modeNames[mode]}，从机期望 ${modeNames[expectedMode]}。\nCPOL/CPHA不一致导致采样边沿错误。\n发送 ${result.dataHex} → 解码为 ${result.decodedHex}，数据全乱。`
    }

    return result
  }

  /**
   * 生成SPI 4路信号波形
   */
  _generateSPIWaveforms(cpol, cpha, clockFreq, dataByte) {
    const period = 1000 / clockFreq // μs
    const cs = []
    const sclk = []
    const mosi = []
    const miso = []
    const annotations = []

    // Idle SCLK level = CPOL
    const idleLevel = cpol
    const activeLevel = 1 - cpol

    // Pre-CS idle
    const idleTime = period * 0.5
    cs.push({ t: 0, v: 1 })
    sclk.push({ t: 0, v: idleLevel })
    mosi.push({ t: 0, v: 0 })
    miso.push({ t: 0, v: 0 })

    // CS goes low (active)
    cs.push({ t: idleTime, v: 0 })
    sclk.push({ t: idleTime, v: idleLevel })
    annotations.push({ t: idleTime, label: 'CS↓' })

    let t = idleTime
    const dataBits = dataByte.toString(2).padStart(8, '0')

    // MISO responds with complement for demo
    const misoBits = (255 - dataByte).toString(2).padStart(8, '0')

    for (let i = 0; i < 8; i++) {
      const bit = parseInt(dataBits[i])
      const misoBit = parseInt(misoBits[i])

      // Half period low (or high if CPOL=1)
      const half1Start = t
      const half1End = t + period / 2
      const half2Start = half1End
      const half2End = t + period

      // Data changes on first edge (CPHA=0: first edge = clock idle→active, CPHA=1: first edge = active→idle)
      if (cpha === 0) {
        // Data set at start of cycle (before active edge)
        mosi.push({ t: half1Start, v: bit })
        miso.push({ t: half1Start, v: misoBit })
        // SCLK: idle → active at half1End
        sclk.push({ t: half1Start, v: idleLevel })
        sclk.push({ t: half1End, v: activeLevel })
        // Sample at active edge
        annotations.push({ t: half2Start, label: `D${7 - i}=${bit}` })
        // SCLK: active → idle at half2End
        sclk.push({ t: half2End, v: idleLevel })
      } else {
        // CPHA=1: first edge (idle→active) changes data, second edge (active→idle) samples
        sclk.push({ t: half1Start, v: idleLevel })
        sclk.push({ t: half1End, v: activeLevel })
        // Data changes at active edge
        mosi.push({ t: half2Start, v: bit })
        miso.push({ t: half2Start, v: misoBit })
        annotations.push({ t: half2Start, label: `D${7 - i}=${bit}` })
        // Sample at falling edge (active→idle)
        sclk.push({ t: half2End, v: idleLevel })
      }

      t = half2End
    }

    // CS goes high (idle)
    cs.push({ t: t, v: 1 })
    sclk.push({ t: t, v: idleLevel })
    mosi.push({ t: t, v: 0 })
    miso.push({ t: t, v: 0 })
    annotations.push({ t: t, label: 'CS↑' })

    // Post-CS idle
    t += period * 0.5
    cs.push({ t, v: 1 })
    sclk.push({ t, v: idleLevel })

    return { cs, sclk, mosi, miso, annotations }
  }

  /**
   * 模拟SPI模式不匹配导致的数据错位
   */
  _corruptByte(original, mode) {
    // Different corruption patterns per mode mismatch
    if (mode === 1) {
      // CPHA wrong: bits shifted by 1
      return ((original << 1) | (original >> 7)) & 0xFF
    } else if (mode === 2) {
      // CPOL wrong: bits inverted
      return (~original) & 0xFF
    } else if (mode === 3) {
      // Both wrong: shifted + inverted
      const shifted = ((original << 1) | (original >> 7)) & 0xFF
      return (~shifted) & 0xFF
    }
    return original
  }

  /**
   * DC-DC Buck降压转换器仿真
   */
  _simulateDCDCBuck(comp) {
    const vin = this.context.buckVin || comp.defaultVin || 12
    const freq = (this.context.buckFreq || comp.defaultFreq || 500) * 1000 // kHz → Hz
    const L = (this.context.buckL || comp.defaultL || 22) * 1e-6 // μH → H
    const loadCurrent = (this.context.buckLoadCurrent || comp.defaultLoadCurrent || 500) / 1000 // mA → A
    const dutyPct = this.context.buckDutyPct || comp.defaultDutyPct || 42
    const D = dutyPct / 100

    // 输出电压 (理想)
    const voutIdeal = vin * D
    // 实际考虑损耗 (MOSFET导通+二极管压降)
    const vdropMOS = 0.2
    const vdropDiode = 0.5
    const vout = vin * D - vdropMOS * D - vdropDiode * (1 - D)

    // 纹波电流 ΔIL = Vin * D * (1-D) / (L * f)
    const rippleCurrent = (vin * D * (1 - D) / (L * freq)) * 1000 // mA
    // 纹波电压 ΔVout = ΔIL / (8 * f * Cout), 假设Cout=22μF
    const Cout = 22e-6
    const ripple = (rippleCurrent / 1000) / (8 * freq * Cout) * 1000 // mV

    // 效率 = Pout / (Pout + Ploss)
    const Pout = vout * loadCurrent
    const PcondMOS = loadCurrent * loadCurrent * 0.05 * D // MOSFET导通损耗
    const PcondDiode = vdropDiode * loadCurrent * (1 - D) // 二极管损耗
    const Pswitch = vin * loadCurrent * 0.1 // 开关损耗近似
    const Pinductor = loadCurrent * loadCurrent * 0.03 // 电感DCR损耗
    const Ploss = PcondMOS + PcondDiode + Pswitch + Pinductor
    const efficiency = Pout / (Pout + Ploss) * 100

    // 纹波电流比 = ΔIL / I_load
    const rippleRatio = rippleCurrent / (loadCurrent * 1000)

    // 目标占空比 (5V输出)
    const idealDuty = (5 / vin * 100)
    const dutyMin = idealDuty - 5
    const dutyMax = idealDuty + 5

    const result = {
      vin, vout, ripple, rippleCurrent, efficiency, powerLoss: Ploss,
      freq: this.context.buckFreq || 500, l: this.context.buckL || 22,
      dutyPct, idealDuty, rippleRatio,
      switching: true, loadState: 'running'
    }

    // 错误检测
    if (rippleRatio > 0.3) {
      result.error = 'BUCK_HIGH_RIPPLE'
      result.errorTitle = '纹波太大！输出不稳 ⚠️'
      result.errorExplanation = `电感纹波电流占比 ${(rippleRatio * 100).toFixed(1)}% 超过30%。\n增大电感量L或提高开关频率可降低纹波。\nΔI = Vin×D×(1-D)/(L×f)`
    } else if (dutyPct < dutyMin || dutyPct > dutyMax) {
      result.error = 'BUCK_DUTY_RANGE'
      result.errorTitle = '占空比超出有效范围 ⚠️'
      result.errorExplanation = `目标5V输出需要占空比D=Vout/Vin=${idealDuty.toFixed(1)}%。\n当前占空比${dutyPct}%，输出电压${vout.toFixed(2)}V偏差过大。`
    }

    return result
  }

  /**
   * 运放比较器仿真
   */
  _simulateOpAmp(comp) {
    const vin = this.context.oaVin !== undefined ? this.context.oaVin : (comp.defaultVin || 1.65)
    const vref = this.context.oaVref !== undefined ? this.context.oaVref : (comp.defaultVref || 2.5)
    const vcc = comp.defaultVcc || 5
    const hysteresis = (this.context.oaHysteresis || 0) // mV
    const outputType = this.context.oaOutputType || 'push-pull'

    // 迟滞电压转V
    const hystV = hysteresis / 1000

    // 比较器逻辑 + 迟滞
    let outputHigh
    if (hystV > 0) {
      // 有迟滞：需要知道之前的状态
      const prevHigh = this._opampPrevHigh || false
      const upperThresh = vref + hystV / 2
      const lowerThresh = vref - hystV / 2
      if (vin > upperThresh) outputHigh = true
      else if (vin < lowerThresh) outputHigh = false
      else outputHigh = prevHigh // 在迟滞区间内保持
      this._opampPrevHigh = outputHigh
    } else {
      outputHigh = vin > vref
    }

    // 输出电压
    let outputVoltage
    if (outputType === 'open-collector') {
      outputVoltage = outputHigh ? 0 : 0 // 需要上拉才能输出高
    } else {
      outputVoltage = outputHigh ? vcc : 0
    }

    // 检测抖动 (无迟滞且输入接近参考)
    const chattering = hystV === 0 && Math.abs(vin - vref) < 0.05

    const result = {
      vin, vref, vcc, hysteresis, outputType,
      outputHigh, outputVoltage, chattering,
      hasPullup: outputType !== 'open-collector',
      loadState: 'running'
    }

    if (chattering) {
      result.error = 'OA_CHATTERING'
      result.errorTitle = '输出震荡！比较器抖动 ⚠️'
      result.errorExplanation = `输入电压(${vin.toFixed(2)}V)接近参考电压(${vref.toFixed(2)}V)，无迟滞时噪声导致输出频繁翻转。\n加入迟滞电压(正反馈)可消除抖动。`
    } else if (outputType === 'open-collector') {
      result.error = 'OA_NO_PULLUP'
      result.errorTitle = '开漏输出无法拉高 ⚠️'
      result.errorExplanation = `开漏/集电极开路输出需要外部上拉电阻才能输出高电平。\n当前配置下输出高电平时为高阻态。`
    }

    return result
  }

  /**
   * 按键消抖仿真
   */
  _simulateButtonDebounce(comp) {
    const bounceTime = this.context.btnBounceTime !== undefined ? this.context.btnBounceTime : (comp.defaultBounceTime || 10)
    const mode = this.context.btnDebounceMode || comp.defaultDebounceMode || 'none'
    const rcR = this.context.btnRcR || comp.defaultRcR || 10 // kΩ
    const rcC = this.context.btnRcC || comp.defaultRcC || 100 // nF
    const swDelay = this.context.btnSwDelay || comp.defaultSwDelay || 20 // ms
    const pressed = this.context.btnPress || false

    // RC时间常数 τ = R*C (kΩ * nF = μs)
    const rcTau = rcR * rcC // μs
    const rcTauMs = rcTau / 1000

    // 抖动产生多次边沿
    const bounceCount = pressed ? Math.max(1, Math.floor(bounceTime / 2)) : 0
    const hasBounce = bounceTime > 5 && pressed

    let mcuTriggerCount = 0
    let debounced = false
    let rcTooSmall = false
    let swTooShort = false

    if (!pressed) {
      mcuTriggerCount = 0
      debounced = true
    } else if (mode === 'none') {
      mcuTriggerCount = hasBounce ? bounceCount : 1
      debounced = !hasBounce
    } else if (mode === 'rc') {
      if (rcTauMs < bounceTime) {
        mcuTriggerCount = Math.max(1, Math.floor(bounceTime / rcTauMs))
        rcTooSmall = true
        debounced = false
      } else {
        mcuTriggerCount = 1
        debounced = true
      }
    } else if (mode === 'software') {
      if (swDelay < bounceTime) {
        mcuTriggerCount = Math.max(1, Math.ceil(bounceTime / swDelay))
        swTooShort = true
        debounced = false
      } else {
        mcuTriggerCount = 1
        debounced = true
      }
    }

    const result = {
      pressed, mode, rcR, rcC, swDelay, bounceTime,
      hasBounce, bounceCount, mcuTriggerCount,
      debounced, rcTooSmall, swTooShort,
      rcTau, signalLine: pressed,
      loadState: 'running'
    }

    if (mode === 'none' && hasBounce) {
      result.error = 'BTN_BOUNCING'
      result.errorTitle = '按键抖动！检测到多次触发 ⚠️'
      result.errorExplanation = `无消抖时，${bounceTime}ms抖动期间MCU检测到${bounceCount}次上升/下降沿。\n一次按键变成了${bounceCount}次触发。\n请选择RC硬件消抖或软件消抖。`
    } else if (mode === 'rc' && rcTooSmall) {
      result.error = 'BTN_RC_TOO_SMALL'
      result.errorTitle = 'RC时间常数太小！消抖不充分 ⚠️'
      result.errorExplanation = `τ = R×C = ${rcR}kΩ × ${rcC}nF = ${rcTau}μs (${rcTauMs.toFixed(2)}ms)\n抖动时间${bounceTime}ms >> τ，RC无法滤除抖动。\n增大R或C使τ > 抖动时间。`
    } else if (mode === 'software' && swTooShort) {
      result.error = 'BTN_SW_DELAY_SHORT'
      result.errorTitle = '软件延时太短！仍有抖动 ⚠️'
      result.errorExplanation = `延时${swDelay}ms < 抖动时间${bounceTime}ms。\n消抖延时必须大于抖动时间，通常取20ms。`
    }

    return result
  }

  /**
   * LDO线性稳压器仿真
   */
  _simulateLDO(comp) {
    const vin = this.context.ldoVin ?? comp.defaultVin ?? 5
    const vout = comp.defaultVout ?? 3.3
    const loadCurrent = (this.context.ldoLoadCurrent ?? comp.defaultLoadCurrent ?? 300) / 1000 // mA → A
    const thetaJA = this.context.ldoThetaJA ?? comp.defaultThetaJA ?? 65
    const ambient = this.context.ldoAmbient ?? 25
    const maxTj = comp.defaultMaxTj ?? 125
    const minDropout = 0.3 // 典型LDO最小压差

    const dropout = vin - vout
    const dropoutOk = dropout >= minDropout
    const effectiveVout = dropoutOk ? vout : vin - minDropout * 0.5 // 失稳时估算

    const powerLossW = (vin - effectiveVout) * loadCurrent // W
    const powerLoss = powerLossW * 1000 // mW
    const tempRise = powerLossW * thetaJA
    const junctionTemp = ambient + tempRise
    const efficiency = vin > 0 ? (effectiveVout / vin) * 100 : 0

    const result = {
      vin, vout: effectiveVout, dropout, dropoutOk,
      powerLoss, efficiency, junctionTemp, tempRise,
      ambient, maxTj, thetaJA,
      loadCurrent: loadCurrent * 1000,
      loadState: 'running'
    }

    if (!dropoutOk) {
      result.error = 'LDO_DROPOUT'
      result.errorTitle = '压差不足！输出失稳 ⚠️'
      result.errorExplanation = `Vin - Vout = ${dropout.toFixed(2)}V < 最小压差${minDropout}V。\nLDO无法正常稳压，输出电压低于标称值${vout}V。\n增大Vin或减小负载电流。`
    } else if (junctionTemp > maxTj) {
      result.error = 'LDO_THERMAL'
      result.errorTitle = '热关断！结温过高 ⚠️'
      result.errorExplanation = `功耗${powerLoss.toFixed(0)}mW，温升${tempRise.toFixed(0)}°C，结温${junctionTemp.toFixed(0)}°C > 上限${maxTj}°C。\n功耗 P = (Vin-Vout) × Iload\n温升 ΔT = P × θJA\n减小Vin-Iload或增加散热（减小θJA）。`
    }

    return result
  }

  /**
   * 555定时器无稳态振荡器仿真
   */
  _simulateTimer555(comp) {
    const ra = this.context.timerRa ?? comp.defaultRa ?? 10 // kΩ
    const rb = this.context.timerRb ?? comp.defaultRb ?? 47 // kΩ
    const c = (this.context.timerC ?? comp.defaultC ?? 10) * 1e-9 // nF → F

    const raOhms = ra * 1000
    const rbOhms = rb * 1000

    // 555无稳态公式
    const highTime = 0.693 * (raOhms + rbOhms) * c // 秒
    const lowTime = 0.693 * rbOhms * c
    const period = highTime + lowTime
    const frequency = 1 / period // Hz
    const frequencyKHz = frequency / 1000
    const dutyCycle = (raOhms + rbOhms) / (raOhms + 2 * rbOhms) * 100

    const result = {
      ra, rb, c: c * 1e9, // 转回nF显示
      frequency: frequencyKHz,
      period: period * 1e6, // → μs
      dutyCycle,
      highTime: highTime * 1e6, // → μs
      lowTime: lowTime * 1e6,
      loadState: 'running'
    }

    if (ra <= 1) {
      result.error = 'TIMER_RA_ZERO'
      result.errorTitle = 'Ra过小！芯片过流 ⚠️'
      result.errorExplanation = `Ra=${ra}kΩ，放电管导通期间电流 I=Vcc/Ra=${(5/(ra*1000)*1000).toFixed(1)}mA。\n555放电管最大电流约200mA，过大会烧毁。\nRa至少1kΩ。`
    } else if (frequencyKHz > 500) {
      result.error = 'TIMER_FREQ_HIGH'
      result.errorTitle = '频率过高！波形失真 ⚠️'
      result.errorExplanation = `频率${frequencyKHz.toFixed(1)}kHz，标准555上限约500kHz。\n高频时内部比较器延迟导致周期不准。\n增大R或C降低频率。`
    } else if (dutyCycle > 90) {
      result.error = 'TIMER_DUTY_HIGH'
      result.errorTitle = '占空比过高 ⚠️'
      result.errorExplanation = `占空比=${dutyCycle.toFixed(1)}%。\n555无稳态模式占空比始终>50%。\n要接近50%需Ra<<Rb，但Ra不能为0。`
    }

    return result
  }

  /**
   * ESD保护电路仿真
   */
  _simulateESD(comp) {
    const vwm = this.context.esdVwm ?? comp.defaultVwm ?? 5
    const vc = this.context.esdVc ?? comp.defaultVc ?? 9.8
    const ipp = this.context.esdIpp ?? comp.defaultIpp ?? 20
    const esdVoltage = this.context.esdStrike ?? comp.defaultEsdVoltage ?? 8 // kV

    const hasProtection = true // 始终有TVS（用户调参）
    const signalVoltage = 3.3 // 信号线正常电压

    // IEC61000-4-2 ESD模型：330Ω / 150pF
    const sourceImpedance = 330
    const esdVolts = esdVoltage * 1000 // kV → V
    const peakCurrent = esdVolts / sourceImpedance // A

    // 钳位电压（简化模型）
    const clampV = vc
    const clampingRatio = vc / vwm

    // 芯片IO耐压（典型CMOS 3.3V IO最大Vcc+0.3=3.6V，但ESD耐受约Vcc*2=6.6V）
    const chipMaxVoltage = signalVoltage * 2
    const chipOk = clampV <= chipMaxVoltage

    // 检查Vwm是否低于信号电压
    const vwmOk = vwm >= signalVoltage

    const result = {
      hasProtection, vwm, vc, ipp, esdVoltage,
      clampV, clampingRatio, peakCurrent, chipOk,
      signalVoltage, esdActive: true,
      loadState: 'running'
    }

    if (!vwmOk) {
      result.error = 'ESD_VWM_TOO_LOW'
      result.errorTitle = '工作电压低于信号电压 ⚠️'
      result.errorExplanation = `TVS工作电压 Vwm=${vwm.toFixed(1)}V < 信号电压${signalVoltage}V。\n正常工作时TVS就导通了，信号被钳制。\nVwm必须大于信号最高电压。`
    } else if (clampingRatio > 3) {
      result.error = 'ESD_VC_TOO_HIGH'
      result.errorTitle = '钳位电压过高 ⚠️'
      result.errorExplanation = `钳位电压/工作电压 = ${clampingRatio.toFixed(1)}，超过3倍。\nVc=${vc.toFixed(1)}V >> Vwm=${vwm.toFixed(1)}V，芯片承受过压。\n选择Vc更低（更接近Vwm）的TVS器件。`
    }

    return result
  }

  /**
   * 仿真UART串口通信
   * 帧格式: IDLE(高) → START(低) → D0~D7 → [校验] → STOP(高)
   */
  _simulateUART(comp) {
    const data = this.context.uartData ?? comp.defaultData ?? 0x55
    const baudrate = this.context.uartBaudrate || comp.defaultBaudrate || 9600
    const parity = this.context.uartParity || comp.defaultParity || 'none'
    const baudMismatch = this.context.uartRxMismatch || false

    const dataBits = data.toString(2).padStart(8, '0')
    const dataHex = '0x' + data.toString(16).toUpperCase().padStart(2, '0')

    // Calculate parity bit
    const onesCount = dataBits.split('').filter(b => b === '1').length
    let parityBit = null
    if (parity === 'even') {
      parityBit = onesCount % 2 === 0 ? 0 : 1
    } else if (parity === 'odd') {
      parityBit = onesCount % 2 === 0 ? 1 : 0
    }

    // Generate TX waveform
    const txWave = []
    const annotations = []
    let t = 0
    const bitTime = 4 // time units per bit

    // Idle (high) - 1 bit time
    txWave.push({ t, v: 1 })
    t += bitTime

    // START bit (low)
    txWave.push({ t, v: 0 })
    annotations.push({ t: t + bitTime / 2, label: 'START' })
    t += bitTime

    // Data bits D0~D7 (LSB first)
    for (let i = 0; i < 8; i++) {
      const bit = parseInt(dataBits[7 - i]) // LSB first: D0 is rightmost bit
      txWave.push({ t, v: bit })
      annotations.push({ t: t + bitTime / 2, label: `D${i}` })
      t += bitTime
    }

    // Parity bit (if enabled)
    if (parityBit !== null) {
      txWave.push({ t, v: parityBit })
      annotations.push({ t: t + bitTime / 2, label: parity.toUpperCase().slice(0, 3) })
      t += bitTime
    }

    // STOP bit (high)
    txWave.push({ t, v: 1 })
    annotations.push({ t: t + bitTime / 2, label: 'STOP' })
    t += bitTime

    // Trailing idle
    txWave.push({ t, v: 1 })
    t += bitTime

    // If baud mismatch, generate garbled received data
    let rxGarbage = ''
    if (baudMismatch) {
      // Simulate 2x baud rate mismatch - sample at wrong times
      const rxBaud = baudrate * 2
      const sampleStep = bitTime / 2 // sample twice as fast
      let garbageVal = 0
      for (let i = 0; i < 8; i++) {
        // Sample at wrong times, produce garbage
        const sampleT = bitTime + (i * 2 + 1) * sampleStep
        const wavePoint = txWave.find(w => w.t >= sampleT)
        if (wavePoint && Math.random() > 0.3) {
          garbageVal |= (wavePoint.v ? 1 : 0) << i
        }
      }
      rxGarbage = '0x' + garbageVal.toString(16).toUpperCase().padStart(2, '0')
    }

    const result = {
      data, dataHex, dataBits,
      baudrate, parity, parityBit,
      baudMismatch, rxGarbage,
      txWave, annotations,
      loadState: 'running'
    }

    // Baud rate mismatch error
    if (baudMismatch) {
      result.error = 'UART_BAUD_MISMATCH'
      result.errorTitle = '波特率不匹配！收到乱码 ⚠️'
      result.errorExplanation = `发送端 ${baudrate} bps，接收端按 ${baudrate * 2} bps 解码。\n每位采样时间错位，数据完全错乱。\nUART没有时钟线，收发双方必须约定相同波特率。`
    }

    return result
  }

  /**
   * 仿真光敏电阻测光
   * R(lux) = Rdark × (lux_ref / lux)^γ
   */
  _simulatePhotoresistor(comp) {
    const lux = this.context.luxLevel ?? 100
    const Rdark = this.context.photoDarkR || comp.defaultDarkR || 1000000
    const Rpullup = this.context.photoPullup || comp.defaultPullup || 10000
    const Vcc = comp.defaultVcc || 3.3
    const adcBits = comp.defaultAdcBits || 12
    const gamma = 0.7 // typical photoresistor gamma
    const luxRef = 10 // reference lux

    // Photoresistor resistance using power law
    const Rphoto = Rdark * Math.pow(luxRef / lux, gamma)

    // Voltage divider (photoresistor to GND, pullup to Vcc)
    const Vout = Vcc * Rphoto / (Rpullup + Rphoto)

    // ADC value
    const adcMax = Math.pow(2, adcBits) - 1
    const adcValue = Math.round(Vout / Vcc * adcMax)

    // Dynamic range: ADC at lux=1 vs lux=1000
    const Rdark1 = Rdark * Math.pow(luxRef / 1, gamma)
    const Vout1 = Vcc * Rdark1 / (Rpullup + Rdark1)
    const adc1 = Math.round(Vout1 / Vcc * adcMax)
    const Rlight = Rdark * Math.pow(luxRef / 1000, gamma)
    const VoutL = Vcc * Rlight / (Rpullup + Rlight)
    const adcL = Math.round(VoutL / Vcc * adcMax)
    const dynamicRange = Math.abs(adc1 - adcL)

    const result = {
      luxLevel: lux,
      Rdark,
      Rpullup,
      Rphoto,
      rphotoK: Rphoto >= 1000 ? (Rphoto / 1000).toFixed(2) + 'kΩ' : Rphoto.toFixed(0) + 'Ω',
      Vcc,
      Vout,
      adcBits,
      adcMax,
      adcValue,
      adcPercent: (adcValue / adcMax * 100).toFixed(1),
      dynamicRange,
      loadState: 'running'
    }

    // ADC saturation warning
    if (adcValue >= adcMax * 0.95) {
      result.error = 'PHOTO_ADC_SATURATION'
      result.errorTitle = 'ADC饱和！强光下读数拉满 ⚠️'
      result.errorExplanation = `ADC读数 ${adcValue} 接近满量程 ${adcMax}。\n强光时光敏阻值极小，分压输出接近Vcc。\n减小上拉电阻或增大暗电阻范围。`
    }

    // ADC too low
    if (adcValue <= adcMax * 0.05) {
      result.error = 'PHOTO_ADC_LOW'
      result.errorTitle = 'ADC读数太低！暗光无法区分 ⚠️'
      result.errorExplanation = `ADC读数 ${adcValue} 太小。\n暗光时光敏阻值接近暗电阻，如果上拉太小分压输出接近0V。\n增大上拉电阻使暗光时分压在量程中段。`
    }

    return result
  }

  /**
   * 仿真LC带通滤波器
   * f0 = 1/(2π√LC), Q = ω0L/R, BW = f0/Q
   * 增益: |H(jω)| = 1/√(1 + Q²(f/f0 - f0/f)²)
   */
  _simulateLCBandpass(comp) {
    const L = (this.context.lcInductance || comp.defaultL || 100) / 1e6 // μH → H
    const C = (this.context.lcCapacitance || comp.defaultC || 100) / 1e9 // nF → F
    const R = this.context.lcResistance || comp.defaultR || 50 // Ω
    const inputFreq = this.context.lcFrequency || comp.defaultFreq || 1000

    // Resonant frequency
    const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C))
    const omega0 = 2 * Math.PI * f0

    // Q factor
    const q = omega0 * L / R

    // Bandwidth
    const bw = q > 0 ? f0 / q : 0

    // Gain at input frequency
    const ratio = inputFreq / f0
    const denominator = Math.sqrt(1 + q * q * Math.pow(ratio - 1 / ratio, 2))
    const gain = 1 / denominator

    const attenuationDB = 20 * Math.log10(Math.max(0.0001, gain))

    // Generate frequency response curve (log scale)
    const responseCurve = []
    const fMin = 100
    const fMax = 200000
    const numPoints = 60
    for (let i = 0; i <= numPoints; i++) {
      const f = fMin * Math.pow(fMax / fMin, i / numPoints)
      const r = f / f0
      const denom = Math.sqrt(1 + q * q * Math.pow(r - 1 / r, 2))
      const g = 1 / denom
      responseCurve.push({ f, gain: g })
    }

    // Generate input + output waveforms (sine, 2 cycles)
    const points = 120
    const inputCurve = []
    const outputCurve = []
    const period = 1 / inputFreq
    const totalTime = period * 2

    for (let i = 0; i <= points; i++) {
      const t = (i / points) * totalTime
      const inputV = 0.5 + 0.5 * Math.sin(2 * Math.PI * inputFreq * t)
      const outputV = 0.5 + 0.5 * gain * Math.sin(2 * Math.PI * inputFreq * t)
      inputCurve.push({ t: t * 1000, v: inputV })
      outputCurve.push({ t: t * 1000, v: outputV })
    }

    const f0Display = f0 < 1 ? f0.toFixed(2) : f0 < 1000 ? f0.toFixed(0) : f0 < 1000000 ? (f0 / 1000).toFixed(1) + 'k' : (f0 / 1000000).toFixed(1) + 'M'

    const result = {
      L: L * 1e6, // back to μH for display
      C: C * 1e9, // back to nF for display
      R,
      inputFreq,
      f0, f0Display,
      q, bw,
      gain, attenuationDB,
      responseCurve,
      inputCurve, outputCurve,
      loadState: 'running'
    }

    // Off-resonance error
    if (f0 > 0 && Math.abs(inputFreq - f0) / f0 > 0.5 && gain < 0.1) {
      result.error = 'LC_OFF_RESONANCE'
      result.errorTitle = '严重失谐！信号几乎完全被抑制 ⚠️'
      result.errorExplanation = `输入频率 ${inputFreq}Hz 偏离中心频率 ${f0Display}Hz 超过50%。\nLC带通只通过f0附近±BW/2的频率。\n调L或C使f0匹配信号频率。`
    }

    return result
  }

  /**
   * MOSFET低边开关仿真
   * Vgs > Vth → 导通; Rds(on)决定功耗
   * 工作区: 截止(Vgs<Vth) / 线性(Vth<Vgs<Vth+2) / 增强(Vgs>Vth+2)
   */
  _simulateMOSFET(comp) {
    const vgs = this.context.mosVgs ?? comp.defaultVgs ?? 5
    const vcc = this.context.mosVcc ?? comp.defaultVcc ?? 12
    const rdsOn = this.context.mosRdsOn ?? comp.defaultRdsOn ?? 25 // mΩ
    const loadR = this.context.mosLoadR ?? comp.defaultLoadR ?? 10 // Ω
    const vth = comp.defaultVth ?? 2.5
    const beta = comp.defaultBeta ?? 2 // 跨导参数 (简化)

    let region = 'cutoff'
    let rdsActual = Infinity
    let loadCurrent = 0
    let vds = vcc
    let powerDissipation = 0
    let loadVoltage = 0

    if (vgs < vth) {
      region = 'cutoff'
      rdsActual = Infinity
      loadCurrent = 0
      vds = vcc
      loadVoltage = 0
    } else if (vgs < vth + 2) {
      // 线性区（未完全增强），简化模型
      region = 'linear'
      // Rds 远大于标称值
      const overdrive = vgs - vth
      rdsActual = rdsOn * (1 + 50 / Math.max(overdrive, 0.1)) // 近似
      loadCurrent = vcc / (loadR + rdsActual / 1000) * 1000 // mA
      vds = loadCurrent / 1000 * rdsActual / 1000 // V
      loadVoltage = vcc - vds
      powerDissipation = vds * loadCurrent // mW
    } else {
      // 完全增强区
      region = 'enhancement'
      rdsActual = rdsOn // mΩ
      const rdsOhm = rdsOn / 1000
      loadCurrent = vcc / (loadR + rdsOhm) * 1000 // mA
      vds = loadCurrent / 1000 * rdsOhm // V
      loadVoltage = vcc - vds
      powerDissipation = vds * loadCurrent // mW
    }

    const result = {
      vgs, vcc, rdsOn, loadR, vth, beta,
      region, rdsActual, loadCurrent, vds,
      loadVoltage, powerDissipation,
      fullyOn: region === 'enhancement',
      loadState: region === 'cutoff' ? 'stopped' : 'running'
    }

    // Vgs below threshold
    if (vgs < vth) {
      result.error = 'MOS_VGS_BELOW_VTH'
      result.errorTitle = 'MOSFET未导通！负载不工作 ⚠️'
      result.errorExplanation = `Vgs=${vgs.toFixed(1)}V < 阈值电压Vth=${vth}V，MOSFET处于截止区。\n提高栅极驱动电压使Vgs > Vth才能导通。`
    } else if (region === 'linear') {
      // 线性区，功耗过大
      result.error = 'MOS_LINEAR_REGION'
      result.errorTitle = '工作在线性区！发热严重 ⚠️'
      result.errorExplanation = `Vgs=${vgs.toFixed(1)}V仅略高于Vth=${vth}V，MOSFET未完全导通。\n实际Rds=${(rdsActual/1000).toFixed(1)}Ω >> 标称${rdsOn}mΩ，功耗${powerDissipation.toFixed(0)}mW。\n建议Vgs至少比Vth高2V以上进入完全增强区。`
    } else if (powerDissipation > 2000) {
      result.error = 'MOS_POWER_HIGH'
      result.errorTitle = '功耗过大！需散热 🔥'
      result.errorExplanation = `P = I²×Rds(on) = ${powerDissipation.toFixed(0)}mW\n负载电流${loadCurrent.toFixed(0)}mA，Rds(on)=${rdsOn}mΩ。\n减小负载电流或选更低Rds(on)的MOSFET，需加散热片。`
    }

    return result
  }

  /**
   * 继电器驱动电路仿真
   * 线圈电流 I = Vcc / Rcoil
   * 断电时反电动势 V_spike = -L * di/dt（无续流二极管时可达数百伏）
   */
  _simulateRelay(comp) {
    const coilR = this.context.rlCoilR ?? comp.defaultCoilR ?? 100
    const vcc = this.context.rlVcc ?? comp.defaultVcc ?? 12
    const hasFlyback = this.context.rlHasFlyback ?? comp.defaultHasFlyback ?? true
    const state = this.context.rlState ?? 'on'

    const coilCurrent = vcc / coilR * 1000 // mA
    const coilPower = vcc * coilCurrent / 1000 // mW

    // 断电瞬间的反电动势估算
    // 典型继电器线圈电感约100mH~1H，断电时间约1μs
    // V_spike = L * di/dt ≈ L * I / t
    const coilInductance = 0.5 // H (典型值)
    const switchOffTime = 1e-6 // s
    const flybackSpike = hasFlyback ? 0.7 : coilInductance * (coilCurrent / 1000) / switchOffTime

    // 驱动管Vce耐压（典型8050三极管，Vceo=25V）
    const vceMax = 25
    const vceStress = state === 'off' && !hasFlyback ? flybackSpike : 0

    const result = {
      coilR, vcc, hasFlyback, state,
      coilCurrent, coilPower,
      flybackSpike: Math.min(flybackSpike, 999),
      vceMax, vceStress,
      flybackActive: state === 'off' && !hasFlyback,
      loadState: state === 'on' ? 'running' : 'stopped'
    }

    // Flyback spike error
    if (state === 'off' && !hasFlyback) {
      result.error = 'RELAY_FLYBACK_SPIKE'
      result.errorTitle = '反电动势尖峰！击穿三极管 💥'
      result.errorExplanation = `线圈断电瞬间，反电动势V=-L×di/dt≈${flybackSpike.toFixed(0)}V！\n没有续流二极管泄放能量，尖峰直接加在驱动管C-E极。\n三极管Vce耐压${vceMax}V，远小于${flybackSpike.toFixed(0)}V，瞬间击穿。\n加续流二极管反向并联在线圈两端。`
    } else if (coilCurrent > 200) {
      result.error = 'RELAY_OVERCURRENT'
      result.errorTitle = '线圈电流过大！ 🔥'
      result.errorExplanation = `线圈电流 ${coilCurrent.toFixed(0)}mA 超过驱动管极限200mA。\nI = Vcc / Rcoil = ${vcc} / ${coilR} = ${coilCurrent.toFixed(0)}mA\n增大线圈电阻或降低Vcc。`
    }

    return result
  }

  /**
   * R-2R梯形DAC仿真
   * Vout = Vref × D / 2^n
   * D = 数字输入值, n = 位数
   */
  _simulateR2RDAC(comp) {
    const vref = this.context.dacVref ?? comp.defaultVref ?? 3.3
    const bits = this.context.dacBits ?? comp.defaultBits ?? 4
    const digitalInput = this.context.dacDigitalInput ?? comp.defaultDigitalInput ?? 10
    const r = this.context.dacR ?? comp.defaultR ?? 10000 // Ω

    const maxVal = Math.pow(2, bits) - 1
    const vout = vref * digitalInput / Math.pow(2, bits)
    const lsb = vref / Math.pow(2, bits) // 最小分辨电压
    const dnl = 0 // 简化：理想DAC DNL=0
    const inl = 0 // 简化：理想DAC INL=0
    const snr = 6.02 * bits + 1.76 // dB (量化信噪比)
    const settlingTime = bits * 0.1 // μs (简化模型)

    // 生成各位的权重
    const bitWeights = []
    for (let i = 0; i < bits; i++) {
      const bitVal = (digitalInput >> (bits - 1 - i)) & 1
      const weight = vref * Math.pow(2, i) / Math.pow(2, bits)
      bitWeights.push({ bit: bits - 1 - i, value: bitVal, weight: weight })
    }

    // 生成输出阶梯波形
    const staircase = []
    const totalSteps = maxVal + 1
    for (let i = 0; i <= totalSteps; i++) {
      const v = vref * i / Math.pow(2, bits)
      staircase.push({ d: i, v: v })
    }

    const result = {
      vref, bits, digitalInput, r,
      maxVal, vout, lsb,
      snr: parseFloat(snr.toFixed(2)),
      settlingTime,
      bitWeights,
      staircase,
      loadState: 'running'
    }

    // Near full-scale warning
    if (digitalInput >= maxVal * 0.95) {
      result.error = 'DAC_FULLSCALE'
      result.errorTitle = '接近满量程！精度降低 ⚠️'
      result.errorExplanation = `数字输入 ${digitalInput} 接近最大值 ${maxVal}。\n输出 ${vout.toFixed(3)}V 接近Vref ${vref}V。\n实际DAC接近满量程时有非线性误差，建议留10%余量。`
    }

    return result
  }

  /**
   * ADC采样量化仿真
   * LSB = Vref / 2^N
   * SNR = 6.02N + 1.76 dB
   * 量化误差 = ±LSB/2
   */
  _simulateADC(comp) {
    const vref = this.context.adcVref ?? comp.defaultVref ?? 3.3
    const bits = this.context.adcBits ?? comp.defaultBits ?? 12
    const inputV = this.context.adcInputV ?? comp.defaultInputV ?? 1.5
    const acqTime = this.context.adcAcqTime ?? comp.defaultAcqTime ?? 7.5

    const maxCode = Math.pow(2, bits) - 1
    const lsb = vref / Math.pow(2, bits)
    const snr = 6.02 * bits + 1.76

    // Source impedance estimation (based on acquisition time)
    // T_acq > 10 * R_src * C_sample (typical C_sample ≈ 5pF)
    const sampleCap = 5e-12 // 5pF
    const maxSourceR = acqTime * 1e-6 / (10 * sampleCap) // Ω
    const sourceImpedance = 10000 // assumed 10kΩ source

    let digitalCode
    let overRange = false
    if (inputV > vref) {
      digitalCode = maxCode
      overRange = true
    } else if (inputV < 0) {
      digitalCode = 0
    } else {
      digitalCode = Math.round(inputV / lsb)
    }

    const quantError = Math.abs(inputV - digitalCode * lsb)
    const acqSufficient = acqTime >= sourceImpedance * sampleCap * 10 * 1e6 // μs

    const result = {
      vref, bits, inputV, acqTime,
      maxCode, lsb, snr,
      digitalCode,
      overRange,
      quantError,
      acqSufficient,
      sourceImpedance,
      maxSourceR,
      loadState: 'running'
    }

    if (overRange) {
      result.error = 'ADC_INPUT_OVER_RANGE'
      result.errorTitle = '输入超出参考电压范围！⚠️'
      result.errorExplanation = `Vin=${inputV.toFixed(2)}V > Vref=${vref}V，ADC满量程饱和，输出恒为最大值${maxCode}。\n输入电压不得超过Vref，需要分压或升高Vref。`
    } else if (!acqSufficient) {
      result.error = 'ADC_ACQ_TOO_SHORT'
      result.errorTitle = '采样保持时间不足！⚠️'
      result.errorExplanation = `采样保持时间仅${acqTime}μs，高源阻抗(${sourceImpedance}Ω)下采样电容充不满。\n量化结果偏低且不稳定。增大采样时间或降低源阻抗。`
    } else if (bits <= 8) {
      result.error = 'ADC_LOW_RESOLUTION'
      result.errorTitle = '分辨率太低！精度不足 ⚠️'
      result.errorExplanation = `仅${bits}位ADC，LSB=${(lsb*1000).toFixed(1)}mV，量化误差达±${(lsb/2*1000).toFixed(1)}mV。\nSNR仅${snr.toFixed(1)}dB，无法精确测量小信号。建议至少12位。`
    }

    return result
  }

  /**
   * PCB地平面回流路径仿真
   * EMI ∝ f² × A_loop
   * 回流路径长度取决于地平面完整性
   */
  _simulatePcbGroundLoop(comp) {
    const frequency = this.context.pcbFrequency ?? comp.defaultFrequency ?? 100
    const traceLen = this.context.pcbTraceLen ?? comp.defaultTraceLen ?? 50
    const groundType = this.context.pcbGroundType ?? comp.defaultGroundType ?? 'solid'
    const slotWidth = this.context.pcbSlotWidth ?? comp.defaultSlotWidth ?? 0

    let returnLen, loopArea, emiLevel

    if (groundType === 'solid') {
      returnLen = traceLen
      loopArea = traceLen * 2 // minimal: trace directly above return
    } else if (groundType === 'slotted') {
      returnLen = traceLen + slotWidth * 3
      loopArea = traceLen * (slotWidth + 2)
    } else {
      // split
      returnLen = traceLen * 3
      loopArea = traceLen * traceLen * 0.5
    }

    // EMI proportional to f² × A (simplified dB scale)
    const fGHz = frequency / 1000
    emiLevel = 20 * Math.log10(fGHz * loopArea / 10 + 1)
    if (groundType === 'split') emiLevel += 20
    if (groundType === 'slotted' && slotWidth > 5) emiLevel += 10

    const result = {
      frequency, traceLen, groundType, slotWidth,
      returnLen, loopArea, emiLevel,
      loadState: 'running'
    }

    if (groundType === 'split') {
      result.error = 'PCB_GROUND_SPLIT'
      result.errorTitle = '地平面分割！信号跨岛 💥'
      result.errorExplanation = `地平面被分割，信号回流必须跨越缝隙。\n等效阻抗剧增，信号完整性严重退化。\n跨分割信号会产生严重串扰和EMI，绝对禁止。`
    } else if (groundType === 'slotted' && slotWidth > 5) {
      result.error = 'PCB_RETURN_PATH_LONG'
      result.errorTitle = '回流路径绕远！EMI辐射严重 ⚠️'
      result.errorExplanation = `地平面开槽${slotWidth}mm，回流电流被迫绕行。\n环路面积=${loopArea.toFixed(0)}mm²，辐射强度∝f²×A。\n高频信号(${frequency}MHz)下EMI远超标准限制。`
    } else if (emiLevel > 40) {
      result.error = 'PCB_EMI_EXCEED'
      result.errorTitle = 'EMI辐射超标！⚠️'
      result.errorExplanation = `频率${frequency}MHz + 环路面积${loopArea.toFixed(0)}mm² = EMI超标。\n高频电流环路是主要辐射源。\n减小回流路径长度，确保地平面完整。`
    }

    return result
  }

  /**
   * 示波器探头补偿仿真
   * 正确补偿: R1C1 = R2C2 (补偿系数 = 1.0)
   * 1x探头带宽受限于电缆电容; 10x探头带宽高得多
   */
  _simulateOscilloscopeProbe(comp) {
    const attenuation = this.context.probeAttenuation ?? comp.defaultAttenuation ?? 10
    const compensation = this.context.probeCompensation ?? comp.defaultCompensation ?? 1.0
    const signalFreq = this.context.probeSignalFreq ?? comp.defaultSignalFreq ?? 1000
    const signalAmp = this.context.probeSignalAmp ?? comp.defaultSignalAmp ?? 2
    const cableCap = comp.defaultCableCap ?? 100 // pF
    const sourceR = comp.defaultSourceR ?? 50

    const r1 = attenuation === 1 ? 0 : (attenuation - 1) * 1e6 // Ω
    const r2 = 1e6 // scope input 1MΩ

    // Bandwidth: 1x probe limited by cable cap; 10x probe much better
    const totalCap = attenuation === 1 ? cableCap : cableCap / attenuation
    const bandwidth = 1 / (2 * Math.PI * r2 * totalCap * 1e-12) / 1e6 // MHz
    const riseTime = 0.35 / (bandwidth * 1e6) * 1e9 // ns

    const displayVoltage = signalAmp / attenuation

    const result = {
      attenuation, compensation, signalFreq, signalAmp,
      cableCap, sourceR, r1, r2,
      bandwidth: Math.min(bandwidth, attenuation === 1 ? 6 : 200),
      riseTime,
      displayVoltage,
      loadState: 'running'
    }

    if (compensation < 0.85) {
      result.error = 'PROBE_UNDER_COMPENSATION'
      result.errorTitle = '欠补偿！方波圆角下垂 ⚠️'
      result.errorExplanation = `补偿系数=${compensation.toFixed(2)}，探头电容过小。\n高频分量衰减过多，方波上升沿变圆。\n顺时针旋转补偿螺丝，增大补偿电容。`
    } else if (compensation > 1.15) {
      result.error = 'PROBE_OVER_COMPENSATION'
      result.errorTitle = '过补偿！方波尖峰 overshoot ⚠️'
      result.errorExplanation = `补偿系数=${compensation.toFixed(2)}，探头电容过大。\n高频分量被放大，方波上升沿出现尖峰。\n逆时针旋转补偿螺丝，减小补偿电容。`
    } else if (attenuation === 1 && signalFreq > 5000) {
      result.error = 'PROBE_1X_HIGH_FREQ'
      result.errorTitle = '1x探头测高频信号！带宽不足 ⚠️'
      result.errorExplanation = `1x探头输入电容约${cableCap}pF，带宽仅约6MHz。\n测量${signalFreq}Hz信号时波形严重畸变。\n高频测量请切换10x探头（带宽可达100MHz+）。`
    }

    return result
  }

  /**
   * BLE蓝牙链路预算仿真
   * FSPL = 20log10(d) + 20log10(f_MHz) + 27.55
   */
  _simulateBLELink(comp) {
    const txPower = this._getParam(comp, 'bleTxPower', 0)       // dBm
    const distance = this._getParam(comp, 'bleDistance', 5)      // meters
    const freq = this._getParam(comp, 'bleFreq', 2402)            // MHz
    const obstacle = this._getParam(comp, 'bleObstacle', 'none')
    const txGain = 0    // dBi (default BLE chip antenna)
    const rxGain = 0
    const rxSensitivity = -90  // dBm, typical BLE receiver

    // Free Space Path Loss (FSPL) in dB
    const fspl = 20 * Math.log10(Math.max(0.1, distance)) + 20 * Math.log10(freq) + 27.55

    // Obstacle attenuation (dB)
    const obstacleMap = { none: 0, body: 8, wall: 15, pocket: 5 }
    const obstacleNames = { none: '空旷', body: '人体', wall: '墙壁', pocket: '口袋' }
    const obstacleLoss = obstacleMap[obstacle] || 0

    // RSSI = TxPower + TxGain + RxGain - FSPL - ObstacleLoss
    const rssi = txPower + txGain + rxGain - fspl - obstacleLoss

    // Link margin
    const margin = rssi - rxSensitivity

    // Maximum distance (margin = 0)
    // 0 = txPower + gains - 20log10(dmax) - 20log10(f) - 27.55 - obstacleLoss
    // 20log10(dmax) = txPower + gains - 20log10(f) - 27.55 - obstacleLoss
    const totalGain = txPower + txGain + rxGain - 20 * Math.log10(freq) - 27.55 - obstacleLoss - rxSensitivity
    const maxDistance = Math.pow(10, totalGain / 20)

    // Quality classification
    let quality
    if (rssi >= -60) quality = 'excellent'
    else if (rssi >= -70) quality = 'good'
    else if (rssi >= -80) quality = 'fair'
    else if (rssi >= rxSensitivity) quality = 'poor'
    else quality = 'none'

    // Quality percentage for the bar (0dBm = 100%, -100dBm = 0%)
    const qualityPct = Math.max(0, Math.min(100, (rssi + 100) / 100 * 100))

    const result = {
      txPower, txGain, rxGain, fspl: fspl.toFixed(1),
      obstacleLoss, obstacleName: obstacleNames[obstacle] || obstacle,
      rssi: parseFloat(rssi.toFixed(1)),
      rxSensitivity, margin: parseFloat(margin.toFixed(1)),
      maxDistance: Math.max(0.1, maxDistance),
      quality, qualityPct: parseFloat(qualityPct.toFixed(1)),
      freq, distance,
      loadState: 'running'
    }

    if (rssi < rxSensitivity) {
      result.error = 'BLE_SIGNAL_TOO_WEAK'
      result.errorTitle = '信号太弱！连接断开 ⚠️'
      result.errorExplanation = `接收信号强度 ${rssi.toFixed(1)}dBm 低于BLE灵敏度 ${rxSensitivity}dBm。\n2.4GHz信号被障碍物吸收/反射，链路预算不足。\n缩短距离、消除遮挡、或增大发射功率。`
    }

    return result
  }

  /**
   * RS-485差分总线仿真
   * 最大线缆长度 ≈ 10^7 / baudrate
   */
  _simulateRS485(comp) {
    const baudrate = this._getParam(comp, 'rsBaudrate', 9600)
    const cableLength = this._getParam(comp, 'rsCableLength', 30)
    const hasTerminator = this._getParam(comp, 'rsTerminator', true)
    const nodeCount = this._getParam(comp, 'rsNodeCount', 4)

    // Max cable length: 10^7 / baudrate (m·bps guideline)
    const maxCableLength = Math.round(Math.min(1200, 10000000 / baudrate))

    // Propagation delay: ~5ns/m for twisted pair
    const propDelay = cableLength * 5 // ns

    // Unit load: each node = 1 UL, max 32 UL
    const unitLoad = nodeCount

    // Signal rise time ≈ 0.3 / baudrate (s)
    const riseTime = 0.3 / baudrate * 1e9 // ns

    // Critical length: if cable < rise_time * v / 2, no termination needed
    // v = 0.67c ≈ 2e8 m/s
    const criticalLength = riseTime * 1e-9 * 2e8 / 2

    // Eye diagram quality
    let eyeQuality = 100
    let ringing = false

    if (!hasTerminator && cableLength > criticalLength) {
      // Reflection causes ringing
      ringing = true
      const reflectionSeverity = Math.min(80, (cableLength / criticalLength) * 30)
      eyeQuality = Math.max(0, 100 - reflectionSeverity)
    }

    if (cableLength > maxCableLength) {
      eyeQuality = Math.max(0, eyeQuality - 40)
    }

    if (unitLoad > 32) {
      eyeQuality = Math.max(0, eyeQuality - 20)
    }

    // High baudrate degrades signal
    if (baudrate > 1000000) {
      eyeQuality = Math.max(0, eyeQuality - 15)
    }

    eyeQuality = Math.round(Math.max(0, Math.min(100, eyeQuality)))

    const result = {
      baudrate, cableLength, hasTerminator, nodeCount,
      maxCableLength, propDelay, unitLoad,
      riseTime: riseTime.toFixed(1),
      eyeQuality, ringing,
      criticalLength: criticalLength.toFixed(1),
      loadState: 'running'
    }

    if (!hasTerminator && baudrate > 115200) {
      result.error = 'RS485_NO_TERMINATION'
      result.errorTitle = '无终端电阻！信号反射严重 ⚠️'
      result.errorExplanation = `波特率 ${baudrate} bps 下无终端电阻。\n信号到达线缆末端被反射，产生振铃。\nRS-485必须在总线两端各加120Ω终端电阻。`
    } else if (cableLength > maxCableLength * 1.5) {
      result.error = 'RS485_CABLE_TOO_LONG'
      result.errorTitle = '线缆过长！信号严重衰减 ⚠️'
      result.errorExplanation = `${cableLength}m线缆在${baudrate}bps下严重衰减。\n最大建议长度为${maxCableLength}m。\n降低波特率或缩短线缆。`
    } else if (unitLoad > 32) {
      result.error = 'RS485_TOO_MANY_NODES'
      result.errorTitle = '节点过多！总线过载 ⚠️'
      result.errorExplanation = `RS-485最多支持32个单位负载(UL)。\n当前负载为${unitLoad}UL。\n使用低负载收发器(1/4UL/1/8UL)或减少节点数。`
    }

    return result
  }

  /**
   * Sallen-Key有源二阶低通滤波器仿真
   * fc = 1/(2*pi*R*C), Q depends on gain K: Q = 1/(3-K)
   */
  _simulateSallenKey(comp) {
    const R = this._getParam(comp, 'skR', 10000)     // Ohms
    const C = this._getParam(comp, 'skC', 10)         // nF
    const Q = this._getParam(comp, 'skQ', 0.707)      // Quality factor
    const inputFreq = this._getParam(comp, 'skFreq', 100) // Hz

    const C_F = C * 1e-9 // Convert nF to F

    // Cutoff frequency
    const fc = 1 / (2 * Math.PI * R * C_F)

    // Sallen-Key gain from Q: K = 3 - 1/Q
    const K = 3 - 1 / Q

    // Transfer function magnitude at input frequency
    // H(jw) = K / (1 - (w/wc)^2 + j*(w/wc)/Q)
    const w = 2 * Math.PI * inputFreq
    const wc = 2 * Math.PI * fc
    const ratio = wc > 0 ? w / wc : 1
    const denomReal = 1 - ratio * ratio
    const denomImag = ratio / Q
    const denomMag = Math.sqrt(denomReal * denomReal + denomImag * denomImag)
    const gain = denomMag > 0 ? K / denomMag : 0
    const gainDb = 20 * Math.log10(Math.max(0.0001, gain))

    // Peak gain at resonance (if Q > 0.707)
    let gainPeak = 0
    if (Q > 0.707) {
      gainPeak = Q * K / Math.sqrt(1 - 1 / (4 * Q * Q))
    }

    // Attenuation rate: -40dB/decade for 2nd order
    const attenuationDb = -40

    // Generate frequency response curve (log scale: 10Hz to 1MHz)
    const responseCurve = []
    const fMin = 10, fMax = 1000000
    const steps = 60
    for (let i = 0; i <= steps; i++) {
      const f = fMin * Math.pow(fMax / fMin, i / steps)
      const w_i = 2 * Math.PI * f
      const r = fc > 0 ? w_i / (2 * Math.PI * fc) : 1
      const dr = 1 - r * r
      const di = r / Q
      const dm = Math.sqrt(dr * dr + di * di)
      const g = dm > 0 ? K / dm : 0
      responseCurve.push({ f, gain: g })
    }

    // Generate input/output waveforms (sine wave, 2 cycles)
    const inputCurve = []
    const outputCurve = []
    const N = 100
    for (let i = 0; i < N; i++) {
      const t = i / N * 2 * Math.PI
      const vIn = Math.sin(t)
      const vOut = vIn * gain
      inputCurve.push({ t, v: vIn })
      outputCurve.push({ t, v: vOut })
    }

    const result = {
      R, C, Q: parseFloat(Q.toFixed(3)),
      fc: parseFloat(fc.toFixed(1)),
      K: parseFloat(K.toFixed(3)),
      inputFreq,
      gain: parseFloat(gain.toFixed(4)),
      gainDb: parseFloat(gainDb.toFixed(1)),
      gainPeak: parseFloat(gainPeak.toFixed(2)),
      attenuationDb,
      responseCurve, inputCurve, outputCurve,
      loadState: 'running'
    }

    if (Q > 2 && gainPeak > 3) {
      result.error = 'SK_Q_TOO_HIGH'
      result.errorTitle = 'Q值过高！通带内出现谐振峰 ⚠️'
      result.errorExplanation = `Q=${Q.toFixed(2)}导致截止频率附近增益 peaked 到 ${gainPeak.toFixed(1)}。\n高Q值使滤波器在fc附近产生谐振尖峰，甚至可能自激振荡。\nButterworth响应Q=0.707是最平坦通带。`
    }

    return result
  }

  /**
   * DMA数据传输仿真
   * 对比CPU轮询 vs DMA直传效率
   */
  _simulateDMA(comp) {
    const src = this._getParam(comp, 'dmaSrc', 'memory')
    const dst = this._getParam(comp, 'dmaDst', 'uart')
    const transferSize = this._getParam(comp, 'dmaTransferSize', 256)
    const dataWidth = this._getParam(comp, 'dmaDataWidth', 8)
    const burstSize = this._getParam(comp, 'dmaBurstSize', 4)
    const mode = this._getParam(comp, 'dmaMode', 'normal')
    const clockFreq = this._getParam(comp, 'dmaClockFreq', 72) // MHz

    // DMA transfer time: bytes / (clock × burst efficiency)
    // Each burst transfers burstSize × (dataWidth/8) bytes
    const bytesPerBurst = burstSize * (dataWidth / 8)
    const burstCycles = 2 + burstSize // setup + transfer cycles per burst
    const totalBursts = Math.ceil(transferSize / bytesPerBurst)
    const dmaCycles = totalBursts * burstCycles
    const dmaTimeUs = dmaCycles / clockFreq // μs

    // CPU polling: ~20 cycles per byte (read-write-check loop)
    const cpuPollCycles = transferSize * 20
    const cpuPollTimeUs = cpuPollCycles / clockFreq
    const cpuUsagePoll = Math.min(100, (cpuPollCycles / (clockFreq * 1000)) * 100) // % of 1ms window

    // DMA CPU usage: only config overhead (~50 cycles total)
    const dmaCpuUsage = mode === 'double-buffer' ? 0.5 : 0.1

    // FIFO depth (typical STM32: 4 words = 16 bytes)
    const fifoDepth = 16
    const fifoOverflow = burstSize * (dataWidth / 8) > fifoDepth

    // Throughput
    const dmaThroughput = transferSize / (dmaTimeUs / 1e6) // bytes/s
    const cpuThroughput = transferSize / (cpuPollTimeUs / 1e6)

    // Bandwidth utilization
    const bandwidthPct = Math.min(100, (dmaThroughput / (clockFreq * 1e6 / 2)) * 100)

    // Efficiency comparison
    const speedupFactor = cpuPollTimeUs / dmaTimeUs

    // Error conditions
    let error = null, errorTitle = null, errorExplanation = null
    if (fifoOverflow) {
      error = 'DMA_FIFO_OVERFLOW'
      errorTitle = 'FIFO溢出！数据丢失 ⚠️'
      errorExplanation = `突发长度${burstSize}×${dataWidth}位=${burstSize * (dataWidth / 8)}字节超过FIFO深度${fifoDepth}字节。\n数据在搬运途中溢出丢失。\n降低突发长度或减小数据位宽。`
    }

    const srcNames = { memory: '内存(SRAM)', adc: 'ADC DR', spi: 'SPI DR' }
    const dstNames = { uart: 'UART DR', memory: '内存(SRAM)', dac: 'DAC DHR' }
    const modeNames = { normal: '单次传输', circular: '循环传输', 'double-buffer': '双缓冲' }

    const result = {
      src: srcNames[src] || src,
      dst: dstNames[dst] || dst,
      transferSize, dataWidth, burstSize,
      mode: modeNames[mode] || mode,
      dmaTimeUs: parseFloat(dmaTimeUs.toFixed(2)),
      cpuPollTimeUs: parseFloat(cpuPollTimeUs.toFixed(2)),
      cpuUsagePoll: parseFloat(cpuUsagePoll.toFixed(1)),
      dmaCpuUsage: parseFloat(dmaCpuUsage.toFixed(2)),
      speedupFactor: parseFloat(speedupFactor.toFixed(1)),
      dmaThroughput: dmaThroughput > 1e6 ? parseFloat((dmaThroughput / 1e6).toFixed(2)) + ' MB/s' : parseFloat((dmaThroughput / 1e3).toFixed(0)) + ' KB/s',
      cpuThroughput: cpuThroughput > 1e6 ? parseFloat((cpuThroughput / 1e6).toFixed(2)) + ' MB/s' : parseFloat((cpuThroughput / 1e3).toFixed(0)) + ' KB/s',
      bandwidthPct: parseFloat(bandwidthPct.toFixed(1)),
      fifoDepth, fifoOverflow,
      bytesPerBurst, totalBursts,
      loadState: 'running',
      error, errorTitle, errorExplanation
    }

    return result
  }

  /**
   * 超声波HC-SR04测距仿真
   * d = v × t / 2, v=343m/s
   */
  _simulateUltrasonic(comp) {
    const triggerInterval = this._getParam(comp, 'usTriggerInterval', 100) // ms
    const temperature = this._getParam(comp, 'usTemperature', 20) // °C
    const targetDistance = this._getParam(comp, 'usTargetDistance', 50) // cm
    const echoPinMode = this._getParam(comp, 'usEchoPinMode', 'input_floating')
    const hasFilter = this._getParam(comp, 'usFilter', true)
    const obstacleType = this._getParam(comp, 'usObstacleType', 'flat')

    // Speed of sound vs temperature: v = 331.3 + 0.606 × T
    const soundSpeed = 331.3 + 0.606 * temperature // m/s
    const soundSpeedCm = soundSpeed * 100 // cm/s

    // Echo time: t = 2d / v
    const echoTimeUs = (2 * targetDistance / soundSpeedCm) * 1e6 // μs
    const echoTimeMs = echoTimeUs / 1000

    // Temperature error: using fixed 343m/s at different temps
    const assumedSpeed = 343 // m/s at 20°C
    const measuredDistance = targetDistance * (assumedSpeed / soundSpeed) // cm
    const tempErrorCm = measuredDistance - targetDistance
    const tempErrorPct = (tempErrorCm / targetDistance) * 100

    // Obstacle absorption
    const obstacleMap = { flat: 1.0, soft: 0.6, angled: 0.3, mesh: 0.2 }
    const reflectivity = obstacleMap[obstacleType] || 1.0
    const echoAmplitude = reflectivity * 100 // % of trigger amplitude
    const detectionThreshold = 30 // % minimum for reliable detection
    const detectable = echoAmplitude >= detectionThreshold

    // Pin mode effect: floating pin picks up noise
    const pinModeNoise = echoPinMode === 'input_floating' ? 0.5 : 0.1 // cm jitter
    const filteredNoise = hasFilter ? pinModeNoise * 0.2 : pinModeNoise

    // Max range: HC-SR04 spec ~400cm, min ~2cm
    const maxRange = 400, minRange = 2
    const inRange = targetDistance >= minRange && targetDistance <= maxRange

    // Measurement rate
    const maxRate = 1000 / (echoTimeMs + triggerInterval) // Hz

    // Error conditions
    let error = null, errorTitle = null, errorExplanation = null
    if (!inRange) {
      error = 'US_OUT_OF_RANGE'
      errorTitle = targetDistance < minRange ? '距离太近！低于最小量程 ⚠️' : '距离太远！超出最大量程 ⚠️'
      errorExplanation = `目标距离${targetDistance}cm超出HC-SR04量程(${minRange}~${maxRange}cm)。\n${targetDistance < minRange ? '回波太快，MCU来不及捕获。' : '回波衰减过大，检测不到。'}`
    } else if (!detectable) {
      error = 'US_WEAK_ECHO'
      errorTitle = '回波太弱！检测失败 ⚠️'
      errorExplanation = `障碍物反射率${echoAmplitude.toFixed(0)}%低于检测阈值${detectionThreshold}%。\n软质材料/倾斜面/网格状物会大量吸收超声波。\n更换为硬质平面或缩短距离。`
    } else if (Math.abs(tempErrorCm) > 2) {
      error = 'US_TEMP_DRIFT'
      errorTitle = '温度漂移！测距偏差大 ⚠️'
      errorExplanation = `环境温度${temperature}°C时声速${soundSpeed.toFixed(1)}m/s，\n但代码假设343m/s，导致${tempErrorCm > 0 ? '偏大' : '偏小'}${Math.abs(tempErrorCm).toFixed(2)}cm。\n应使用温度补偿公式: v=331.3+0.606×T。`
    }

    const obstacleNames = { flat: '硬质平面', soft: '软质材料(布/海绵)', angled: '倾斜面(>15°)', mesh: '网格/多孔' }

    const result = {
      soundSpeed: parseFloat(soundSpeed.toFixed(1)),
      echoTimeUs: parseFloat(echoTimeUs.toFixed(1)),
      echoTimeMs: parseFloat(echoTimeMs.toFixed(3)),
      targetDistance, measuredDistance: parseFloat(measuredDistance.toFixed(2)),
      tempErrorCm: parseFloat(tempErrorCm.toFixed(2)),
      tempErrorPct: parseFloat(tempErrorPct.toFixed(2)),
      echoAmplitude: parseFloat(echoAmplitude.toFixed(0)),
      reflectivity: parseFloat((reflectivity * 100).toFixed(0)),
      obstacleName: obstacleNames[obstacleType] || obstacleType,
      detectable, detectionThreshold,
      noiseJitter: parseFloat(filteredNoise.toFixed(2)),
      pinModeNoise: parseFloat(pinModeNoise.toFixed(2)),
      hasFilter,
      maxRate: parseFloat(maxRate.toFixed(1)),
      inRange, maxRange, minRange,
      loadState: 'running',
      error, errorTitle, errorExplanation
    }

    return result
  }

  /**
   * 差分走线等长仿真
   * USB3.0/MIPI/LVDS差分对设计
   */
  _simulateDiffPair(comp) {
    const diffImpedance = this._getParam(comp, 'dpTargetImpedance', 100) // Ω, differential
    const traceWidth = this._getParam(comp, 'dpTraceWidth', 0.15) // mm
    const traceGap = this._getParam(comp, 'dpTraceGap', 0.15) // mm
    const substrateH = this._getParam(comp, 'dpSubstrateHeight', 0.5) // mm, dielectric thickness
    const substrateEr = this._getParam(comp, 'dpSubstrateEr', 4.3) // FR4
    const signalFreq = this._getParam(comp, 'dpSignalFreq', 5000) // MHz
    const lengthMismatch = this._getParam(comp, 'dpLengthMismatch', 0) // mm
    const routingMode = this._getParam(comp, 'dpRoutingMode', 'edge-coupled')

    // Edge-coupled microstrip differential impedance
    // Zdiff ≈ 2×Z0 × (1 - 0.48×e^(-0.96×S/H))
    // Single-ended Z0 for microstrip: Z0 = 87/sqrt(Er+1.41) × ln(5.98×H/(0.8×W+T))
    const T = 0.035 // copper thickness mm (1oz)
    const W = traceWidth
    const H = substrateH
    const S = traceGap
    const er = substrateEr

    // Single-ended impedance
    const z0 = (87 / Math.sqrt(er + 1.41)) * Math.log(5.98 * H / (0.8 * W + T))
    // Differential impedance (edge-coupled)
    const zDiff = 2 * z0 * (1 - 0.48 * Math.exp(-0.96 * S / H))
    // Impedance error
    const impError = zDiff - diffImpedance
    const impErrorPct = (impError / diffImpedance) * 100

    // Skew from length mismatch
    // Signal velocity on FR4 microstrip ≈ c / sqrt((Er+1)/2)
    const v = 3e8 / Math.sqrt((er + 1) / 2) // m/s
    const vMm = v * 1000 // mm/s
    const skewPs = (lengthMismatch / vMm) * 1e12 // ps
    // For high-speed: skew should be < 1/(10 × f_max)
    const maxSkewPs = 1e12 / (10 * signalFreq * 1e6)
    const skewOk = Math.abs(skewPs) <= maxSkewPs

    // Mode conversion (common-mode noise)
    // Higher mismatch → more mode conversion
    const modeConversionDb = 20 * Math.log10(Math.max(0.001, lengthMismatch / (100 + lengthMismatch)))

    // Coupling coefficient
    const couplingK = 0.48 * Math.exp(-0.96 * S / H)

    // Eye diagram degradation estimate
    const jitterPs = Math.abs(skewPs) * 0.8
    const eyeHeightPct = Math.max(20, 100 - Math.abs(impErrorPct) * 2 - Math.abs(skewPs) / maxSkewPs * 30)

    // Error conditions
    let error = null, errorTitle = null, errorExplanation = null
    if (Math.abs(impErrorPct) > 10) {
      error = 'DP_IMPEDANCE_MISMATCH'
      errorTitle = '差分阻抗偏差过大！信号反射 ⚠️'
      errorExplanation = `计算阻抗${zDiff.toFixed(1)}Ω，目标${diffImpedance}Ω，偏差${impErrorPct.toFixed(1)}%。\n差分阻抗偏差>10%会导致信号反射和模态转换。\n调整线宽(W=${W}mm)、间距(S=${S}mm)或介质厚度(H=${H}mm)。`
    } else if (!skewOk) {
      error = 'DP_SKEW_TOO_LARGE'
      errorTitle = '长度失配！时序偏斜过大 ⚠️'
      errorExplanation = `长度差${lengthMismatch}mm产生${skewPs.toFixed(1)}ps偏斜。\n${signalFreq}MHz信号最大允许偏斜${maxSkewPs.toFixed(1)}ps。\n差分对必须严格等长：用蛇形走线补偿长度差。`
    } else if (traceGap < 0.1) {
      error = 'DP_GAP_TOO_SMALL'
      errorTitle = '间距太小！串扰严重 ⚠️'
      errorExplanation = `线间距${S}mm小于3倍线宽，差分对间耦合过强。\n间距太小会降低单端阻抗、增加制造难度。\n建议间距 ≥ 3W (=${(3*W).toFixed(2)}mm)。`
    }

    const modeNames = { 'edge-coupled': '边缘耦合微带线', 'broadside': '宽边耦合带状线' }

    const result = {
      z0: parseFloat(z0.toFixed(1)),
      zDiff: parseFloat(zDiff.toFixed(1)),
      targetImpedance: diffImpedance,
      impError: parseFloat(impError.toFixed(1)),
      impErrorPct: parseFloat(impErrorPct.toFixed(2)),
      couplingK: parseFloat(couplingK.toFixed(3)),
      skewPs: parseFloat(skewPs.toFixed(2)),
      maxSkewPs: parseFloat(maxSkewPs.toFixed(2)),
      skewOk,
      modeConversionDb: parseFloat(modeConversionDb.toFixed(1)),
      jitterPs: parseFloat(jitterPs.toFixed(2)),
      eyeHeightPct: parseFloat(eyeHeightPct.toFixed(0)),
      lengthMismatch, traceWidth: W, traceGap: S, substrateH: H,
      routingMode: modeNames[routingMode] || routingMode,
      signalFreq, loadState: 'running',
      error, errorTitle, errorExplanation
    }

    return result
  }

  /**
   * LoRa扩频通信仿真
   * SF(Spreading Factor), BW(Bandwidth), CR(Coding Rate)
   */
  _simulateLoRa(comp) {
    const sf = this._getParam(comp, 'loraSF', 7)        // Spreading Factor 6-12
    const bw = this._getParam(comp, 'loraBW', 125)       // kHz
    const cr = this._getParam(comp, 'loraCR', 5)         // 4/5 to 4/8, codingRate denominator offset (5-8)
    const txPower = this._getParam(comp, 'loraTxPower', 14) // dBm
    const distance = this._getParam(comp, 'loraDistance', 5) // km
    const payloadSize = this._getParam(comp, 'loraPayload', 20) // bytes
    const noiseFloor = this._getParam(comp, 'loraNoiseFloor', -120) // dBm

    // Symbol duration: Ts = 2^SF / BW
    const symbolTimeMs = Math.pow(2, sf) / bw // ms (BW in kHz)

    // Air time calculation
    // Preamble: 8 symbols (default)
    const preambleTimeMs = symbolTimeMs * 8
    // Header: depends on SF
    const headerSymbols = sf >= 10 ? 20 : 12
    const headerTimeMs = symbolTimeMs * headerSymbols
    // Payload symbols: ceil(8*(PL-4*SF+28)/(4*(SF-2*DE))) * CR + 4
    // DE = 1 when SF >= 11 (low data rate optimization)
    const de = sf >= 11 ? 1 : 0
    const numPayloadSymbols = Math.ceil(Math.max(1, (8 * payloadSize - 4 * sf + 28 + 16 * cr - 20) / (4 * (sf - 2 * de)))) * cr + 4
    const payloadTimeMs = symbolTimeMs * numPayloadSymbols
    const airTimeMs = preambleTimeMs + headerTimeMs + payloadTimeMs

    // Data rate: DR = SF × BW / 2^SF × (4/(4+CR-4)) → simplified
    const codingRate = 4 / (4 + cr - 4)
    const dataRate = sf * bw * 1000 / Math.pow(2, sf) * codingRate // bps
    const dataRateKbps = dataRate / 1000

    // Link budget
    // FSPL at sub-GHz: 20log(d_m) + 20log(f_MHz) + 27.55
    // Use 868MHz as typical EU band
    const freqMHz = 868
    const distanceM = distance * 1000
    const fspl = 20 * Math.log10(Math.max(1, distanceM)) + 20 * Math.log10(freqMHz) + 27.55
    const rssi = txPower - fspl
    const snr = rssi - noiseFloor

    // Sensitivity: S = -174 + 10log(BW) + NF + SNR_min
    // SNR_min depends on SF: SF7≈-7.5dB, SF12≈-20dB
    const snrMinMap = { 6: -5, 7: -7.5, 8: -10, 9: -12.5, 10: -15, 11: -17.5, 12: -20 }
    const snrMin = snrMinMap[sf] || -7.5
    const nf = 6 // noise figure dB
    const bwHz = bw * 1000
    const sensitivity = -174 + 10 * Math.log10(bwHz) + nf + snrMin
    const linkMargin = rssi - sensitivity

    // Maximum distance
    const totalGain = txPower - sensitivity - 20 * Math.log10(freqMHz) - 27.55
    const maxDistanceM = Math.pow(10, totalGain / 20)
    const maxDistanceKm = maxDistanceM / 1000

    // Quality classification
    let quality
    if (linkMargin > 20) quality = 'excellent'
    else if (linkMargin > 10) quality = 'good'
    else if (linkMargin > 0) quality = 'fair'
    else quality = 'none'

    // Energy estimate per packet (mA × ms → μC)
    const txCurrent = 120 // mA typical at 14dBm
    const energyPerPacket = txCurrent * airTimeMs // mA·ms

    // Error conditions
    let error = null, errorTitle = null, errorExplanation = null
    if (linkMargin < 0) {
      error = 'LORA_LINK_FAIL'
      errorTitle = '链路预算不足！通信失败 ⚠️'
      errorExplanation = `RSSI=${rssi.toFixed(1)}dBm低于灵敏度${sensitivity.toFixed(1)}dBm，余量${linkMargin.toFixed(1)}dB。\nSF${sf}在${bw}kHz下最远仅${maxDistanceKm.toFixed(1)}km。\n增大SF(降速换距离)、增大发射功率、或缩短距离。`
    } else if (airTimeMs > 3000) {
      error = 'LORA_AIR_TIME_TOO_LONG'
      errorTitle = '空中时间过长！占空比超限 ⚠️'
      errorExplanation = `SF${sf}+${bw}kHz+${payloadSize}字节 → 空中时间${airTimeMs.toFixed(0)}ms。\nEU 868MHz频段占空比限制1%，每小时最多36s发射。\n长时间发送也增加碰撞概率和功耗。`
    } else if (sf > 10 && bw >= 250) {
      error = 'LORA_SF_BW_MISMATCH'
      errorTitle = 'SF/BW组合不当 ⚠️'
      errorExplanation = `SF${sf}配${bw}kHz不推荐。\n高SF应配低BW以获得最大灵敏度，\nSF12+125kHz可覆盖15km+，SF7+250kHz适合高速短距。`
    }

    const result = {
      sf, bw, cr: `4/${cr}`, txPower, distance, payloadSize,
      symbolTimeMs: parseFloat(symbolTimeMs.toFixed(2)),
      airTimeMs: parseFloat(airTimeMs.toFixed(1)),
      dataRate: dataRateKbps > 1 ? parseFloat(dataRateKbps.toFixed(2)) + ' kbps' : parseFloat(dataRate.toFixed(0)) + ' bps',
      rssi: parseFloat(rssi.toFixed(1)),
      snr: parseFloat(snr.toFixed(1)),
      sensitivity: parseFloat(sensitivity.toFixed(1)),
      linkMargin: parseFloat(linkMargin.toFixed(1)),
      maxDistanceKm: parseFloat(maxDistanceKm.toFixed(1)),
      quality, snrMin,
      energyPerPacket: parseFloat(energyPerPacket.toFixed(0)),
      loadState: 'running',
      error, errorTitle, errorExplanation
    }

    return result
  }

  /**
   * JTAG/SWD边界扫描仿真
   * TAP控制器状态机 + 边界扫描测试
   */
  _simulateJTAG(comp) {
    const scanMode = this._getParam(comp, 'jtagScanMode', 'extest')
    const deviceCount = this._getParam(comp, 'jtagDeviceCount', 1)
    const chainLength = this._getParam(comp, 'jtagChainLength', 128) // total boundary cells
    const tckFreq = this._getParam(comp, 'jtagTckFreq', 10) // MHz
    const hasPullup = this._getParam(comp, 'jtagPullup', true)
    const signalIntegrity = this._getParam(comp, 'jtagSignalIntegrity', 'good')

    // TAP state machine: 16 states, each takes 1 TCK cycle to transition
    // To scan IR: Capture-IR → Shift-IR → Exit1-IR → Update-IR (4 + IR_length cycles)
    // To scan DR: Capture-DR → Shift-DR → Exit1-DR → Update-DR (4 + DR_length cycles)
    // IR length typically 4 bits per device, DR = boundary register length

    const irLength = deviceCount * 4
    const drLength = chainLength

    // Total scan cycles: go to Shift-IR (5 TCK) + IR shift + go to Shift-DR (3 TCK) + DR shift
    const irShiftCycles = 5 + irLength
    const drShiftCycles = 5 + drLength
    const totalCycles = irShiftCycles + drShiftCycles
    const scanTimeUs = totalCycles / tckFreq

    // Boundary scan: each cell can capture/update pin state
    // Detection capability
    const pinsTestable = chainLength // one cell per pin
    const faultCoverage = scanMode === 'extest' ? 95 : (scanMode === 'intest' ? 85 : 40) // %

    // Signal integrity effects
    const siMap = { good: 0, marginal: 1, poor: 3 }
    const glitches = siMap[signalIntegrity] || 0
    const glitchEffect = glitches * 2 // % scan failure rate

    // Without pullup: TMS/TDI floating causes random TAP state transitions
    const floatingErrors = hasPullup ? 0 : 15 // % error rate

    // Stuck-at fault detection
    // Each boundary cell can detect stuck-at-0/stuck-at-1 on its pin
    const stuckAtFaults = 2 * pinsTestable // total detectable fault types
    const detectableFaults = Math.floor(stuckAtFaults * faultCoverage / 100 * (1 - glitchEffect / 100) * (1 - floatingErrors / 100))

    // SWD vs JTAG comparison
    const swdPins = 2 // SWDIO + SWCLK
    const jtagPins = 5 // TDI + TDO + TMS + TCK + TRST
    const pinReduction = jtagPins - swdPins

    // Error conditions
    let error = null, errorTitle = null, errorExplanation = null
    if (!hasPullup) {
      error = 'JTAG_NO_PULLUP'
      errorTitle = '缺少上拉电阻！TAP状态失控 ⚠️'
      errorExplanation = `TMS/TDI无上拉时浮空电平随机跳变，\nTAP控制器状态机无法稳定运行。\n错误率约${floatingErrors}%，扫描结果不可靠。\nTMS/TDI/TDO必须加10kΩ上拉到VDD。`
    } else if (signalIntegrity === 'poor' && tckFreq > 5) {
      error = 'JTAG_SIGNAL_INTEGRITY'
      errorTitle = 'TCK信号质量差！扫描错误 ⚠️'
      errorExplanation = `TCK=${tckFreq}MHz下信号完整性差（${signalIntegrity}），\n上升/下降沿退化导致建立/保持时间违例。\n降低TCK频率或改善走线（等长、阻抗匹配、减少过孔）。`
    } else if (deviceCount > 1 && chainLength > 256) {
      error = 'JTAG_CHAIN_TOO_LONG'
      errorTitle = '扫描链过长！时序违例 ⚠️'
      errorExplanation = `${deviceCount}个器件共${chainLength}个边界单元，\nTDO传播延迟累积超过TCK周期。\n降低TCK频率或分割扫描链。`
    }

    const modeNames = { extest: 'EXTEST(外部测试)', intest: 'INTEST(内部测试)', sample: 'SAMPLE(采样)', bypass: 'BYPASS(旁路)' }
    const siNames = { good: '良好', marginal: '临界', poor: '差' }

    const result = {
      scanMode: modeNames[scanMode] || scanMode,
      deviceCount, chainLength, tckFreq,
      irLength, drLength,
      totalCycles, scanTimeUs: parseFloat(scanTimeUs.toFixed(2)),
      pinsTestable, faultCoverage: parseFloat(faultCoverage.toFixed(0)),
      detectableFaults, stuckAtFaults,
      glitches, glitchEffect: parseFloat(glitchEffect.toFixed(1)),
      floatingErrors: parseFloat(floatingErrors.toFixed(0)),
      hasPullup, signalIntegrity: siNames[signalIntegrity] || signalIntegrity,
      swdPins, jtagPins, pinReduction,
      loadState: 'running',
      error, errorTitle, errorExplanation
    }

    return result
  }

  /**
   * 从context或comp默认值获取参数
   * 优先级：this.context[paramName] > comp['default' + Capitalized] > fallback
   */
  _getParam(comp, paramName, fallback) {
    if (this.context && this.context[paramName] !== undefined) {
      return this.context[paramName]
    }
    const defaultKey = 'default' + paramName.charAt(0).toUpperCase() + paramName.slice(1)
    if (comp && comp[defaultKey] !== undefined) {
      return comp[defaultKey]
    }
    return fallback
  }
}
