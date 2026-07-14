/**
 * 挑战模式数据
 * 每个挑战定义目标、约束条件、时间限制和评分标准
 */

export const challengeData = {
  'led-resistor': {
    title: '挑战：点亮LED不烧毁',
    goal: '让LED正常发光且电流≤15mA',
    constraint: '限流电阻必须≥220Ω',
    timeLimit: 60, // 秒
    check: (result) => {
      const current = result?.context?.current ?? 0
      const led = result?.results?.LED1
      return {
        passed: current > 0 && current <= 15 && led?.state === 'on',
        score: current > 0 && current <= 15 ? 100 : 0,
        detail: `电流 ${current.toFixed(1)}mA, LED ${led?.state === 'on' ? '亮' : '灭'}`
      }
    }
  },

  'gpio-modes': {
    title: '挑战：稳定按键检测',
    goal: '选择正确的GPIO模式使按键读取稳定',
    constraint: '不能使用浮空输入',
    timeLimit: 45,
    check: (result) => {
      const gpio = result?.results?.PA0
      return {
        passed: gpio?.state === 'stable-high' || gpio?.state === 'stable-low',
        score: gpio?.state?.startsWith('stable') ? 100 : 0,
        detail: `状态: ${gpio?.state || '未知'}`
      }
    }
  },

  'pwm-tuner': {
    title: '挑战：90°舵机控制',
    goal: '设置PWM让舵机转到90°',
    constraint: '频率必须50Hz',
    timeLimit: 60,
    check: (result) => {
      const ctx = result?.context
      const freq = ctx?.pwmFrequency ?? 0
      const duty = ctx?.pwmDutyCycle ?? 0
      const angle = freq === 50 ? (duty / 12.5 * 180) : -1
      return {
        passed: freq === 50 && Math.abs(angle - 90) < 5,
        score: Math.max(0, 100 - Math.abs(angle - 90) * 2),
        detail: `${freq}Hz, 占空比${duty}%, 角度${angle.toFixed(0)}°`
      }
    }
  },

  'voltage-divider': {
    title: '挑战：3.3V安全分压',
    goal: '将12V分压到≤3.3V接入ADC',
    constraint: '总功耗≤5mW',
    timeLimit: 90,
    check: (result) => {
      const ctx = result?.context
      const vout = ctx?.voltageDividerOutput ?? 0
      const power = ctx?.totalPower ?? 0
      return {
        passed: vout > 0 && vout <= 3.3 && power <= 5,
        score: vout <= 3.3 ? Math.max(60, 100 - Math.abs(vout - 3.0) * 20) : 0,
        detail: `Vout=${vout.toFixed(2)}V, 功耗=${power.toFixed(2)}mW`
      }
    }
  },

  'capacitor-charge': {
    title: '挑战：5秒内充满电容',
    goal: '设置RC使电容5±0.5秒充满',
    constraint: '5τ ≈ 5s',
    timeLimit: 60,
    check: (result) => {
      const ctx = result?.context
      const tau = ctx?.capTau ?? 0
      const chargeTime = tau * 5
      return {
        passed: Math.abs(chargeTime - 5) < 0.5,
        score: Math.max(0, 100 - Math.abs(chargeTime - 5) * 20),
        detail: `τ=${tau.toFixed(2)}s, 充满=${chargeTime.toFixed(1)}s`
      }
    }
  },

  'transistor-switch': {
    title: '挑战：驱动LED饱和开关',
    goal: '让三极管工作在饱和区驱动LED',
    constraint: 'Ib ≥ Ic_sat/β',
    timeLimit: 90,
    check: (result) => {
      const ts = result?.results?.TS1
      return {
        passed: ts?.state === 'saturation',
        score: ts?.state === 'saturation' ? 100 : 50,
        detail: `工作区: ${ts?.state || '未知'}`
      }
    }
  },

  'rc-filter': {
    title: '挑战：滤除1kHz噪声',
    goal: '设计截止频率1kHz的低通滤波器',
    constraint: '1kHz处衰减≥3dB',
    timeLimit: 60,
    check: (result) => {
      const rf = result?.results?.RF1
      const fc = rf?.fcHz ?? 0
      return {
        passed: Math.abs(fc - 1000) < 100,
        score: Math.max(0, 100 - Math.abs(fc - 1000) / 10),
        detail: `fc=${fc}Hz`
      }
    }
  },

  'ntc-thermistor': {
    title: '挑战：25°C精准测温',
    goal: '设置NTC电路使25°C时ADC≈2048',
    constraint: 'ADC在1800-2300范围内',
    timeLimit: 60,
    check: (result) => {
      const ntc = result?.results?.NTC1
      const adc = ntc?.adcValue ?? 0
      return {
        passed: adc >= 1800 && adc <= 2300,
        score: Math.max(0, 100 - Math.abs(adc - 2048) / 10),
        detail: `ADC=${adc}`
      }
    }
  },

  'dcdc-buck': {
    title: '挑战：5V/85%效率转换',
    goal: '输出5V±0.1V，效率≥85%，纹波<100mV',
    constraint: '纹波电流比<30%',
    timeLimit: 90,
    check: (result) => {
      const buck = result?.results?.BUCK1
      const vout = buck?.vout ?? 0
      const eff = buck?.efficiency ?? 0
      const ripple = buck?.ripple ?? 999
      return {
        passed: Math.abs(vout - 5) < 0.15 && eff >= 85 && ripple < 100,
        score: Math.max(0, 100 - Math.abs(vout - 5) * 100 - (eff < 85 ? (85 - eff) : 0) - (ripple > 100 ? (ripple - 100) / 10 : 0)),
        detail: `Vout=${vout.toFixed(2)}V, η=${eff.toFixed(1)}%, 纹波=${ripple.toFixed(0)}mV`
      }
    }
  },

  'opamp-comparator': {
    title: '挑战：无抖动温度报警',
    goal: '设置迟滞消除抖动，Vin>Vref时报警',
    constraint: '迟滞≥50mV',
    timeLimit: 60,
    check: (result) => {
      const oa = result?.results?.OPAMP1
      return {
        passed: (oa?.hysteresis || 0) >= 50 && !oa?.chattering,
        score: (oa?.hysteresis || 0) >= 50 ? 100 : 0,
        detail: `迟滞=${oa?.hysteresis || 0}mV, 抖动=${oa?.chattering ? '是' : '否'}`
      }
    }
  },

  'button-debounce': {
    title: '挑战：一次按键一次触发',
    goal: '选择正确消抖使MCU只检测到1次触发',
    constraint: '按下时触发数=1',
    timeLimit: 45,
    check: (result) => {
      const btn = result?.results?.BTN1
      return {
        passed: btn?.debounced && btn?.mcuTriggerCount === 1,
        score: btn?.debounced ? 100 : 0,
        detail: `触发${btn?.mcuTriggerCount || 0}次, 消抖=${btn?.debounced ? '成功' : '失败'}`
      }
    }
  },

  'logic-analyzer-debug': {
    title: '挑战：SPI正确通信',
    goal: '主从SPI模式一致，数据正确解码',
    constraint: '收发数据匹配',
    timeLimit: 60,
    check: (result) => {
      const la = result?.results?.LA1
      return {
        passed: !la?.error,
        score: la?.error ? 0 : 100,
        detail: la?.error ? `错误: ${la.errorTitle}` : `TX=${la?.dataHex} → RX=${la?.decodedHex}`
      }
    }
  }
}
