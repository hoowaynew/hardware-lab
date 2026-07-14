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
      oscilloscope: () => ({ state: 'idle' }),
      probe: () => ({ state: 'idle' })
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
}
