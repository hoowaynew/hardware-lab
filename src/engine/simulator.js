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
}
