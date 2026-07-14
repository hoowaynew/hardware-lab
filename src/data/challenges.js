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
  },

  'ldo-regulator': {
    title: '挑战：3.3V/500mA安全供电',
    goal: '输出3.3V稳定，结温<100°C，效率>50%',
    constraint: '压差≥0.3V',
    timeLimit: 90,
    check: (result) => {
      const ldo = result?.results?.LDO1
      const vout = ldo?.vout ?? 0
      const tj = ldo?.junctionTemp ?? 999
      const eff = ldo?.efficiency ?? 0
      const dropoutOk = ldo?.dropoutOk ?? false
      return {
        passed: dropoutOk && Math.abs(vout - 3.3) < 0.05 && tj < 100 && eff > 50,
        score: Math.max(0, 100 - Math.abs(vout - 3.3) * 200 - (tj > 100 ? (tj - 100) : 0) - (eff < 50 ? (50 - eff) : 0)),
        detail: `Vout=${vout.toFixed(2)}V, Tj=${tj.toFixed(0)}°C, η=${eff.toFixed(1)}%`
      }
    }
  },

  'timer-555': {
    title: '挑战：1kHz方波振荡器',
    goal: '频率1kHz±10%，占空比50-60%',
    constraint: 'Ra≥1kΩ',
    timeLimit: 60,
    check: (result) => {
      const tm = result?.results?.TIMER1
      const freq = tm?.frequency ?? 0
      const duty = tm?.dutyCycle ?? 100
      const ra = tm?.ra ?? 0
      return {
        passed: ra >= 1 && Math.abs(freq - 1) < 0.1 && duty >= 50 && duty <= 60,
        score: Math.max(0, 100 - Math.abs(freq - 1) * 100 - Math.abs(duty - 55) * 2),
        detail: `f=${freq.toFixed(2)}kHz, D=${duty.toFixed(1)}%, Ra=${ra}kΩ`
      }
    }
  },

  'esd-protection': {
    title: '挑战：3.3V信号线ESD防护',
    goal: 'Vwm>3.3V，钳位比<2.5，芯片安全',
    constraint: 'Vc < 芯片耐压6.6V',
    timeLimit: 60,
    check: (result) => {
      const esd = result?.results?.ESD1
      const vwm = esd?.vwm ?? 0
      const ratio = esd?.clampingRatio ?? 99
      const chipOk = esd?.chipOk ?? false
      return {
        passed: vwm > 3.3 && ratio < 2.5 && chipOk,
        score: Math.max(0, 100 - (ratio < 2.5 ? 0 : (ratio - 2.5) * 50) - (chipOk ? 0 : 50)),
        detail: `Vwm=${vwm.toFixed(1)}V, 钳位比=${ratio.toFixed(1)}×, 芯片=${chipOk ? '安全' : '损坏'}`
      }
    }
  },

  'uart-signal': {
    title: '挑战：正确发送0xA5并解码',
    goal: '波特率匹配，发送0xA5，接收端正确解码',
    constraint: '不能开启波特率不匹配',
    timeLimit: 45,
    check: (result) => {
      const uart = result?.results?.UART1
      const baud = uart?.baudrate ?? 0
      const mismatch = uart?.baudMismatch ?? true
      const data = uart?.data ?? 0
      return {
        passed: !mismatch && data === 165 && baud === 9600,
        score: Math.max(0, 100 - (mismatch ? 50 : 0) - (data === 165 ? 0 : 30)),
        detail: `数据=0x${data.toString(16)}, 波特率=${baud}, ${mismatch ? '不匹配' : '匹配'}`
      }
    }
  },

  'photoresistor': {
    title: '挑战：让ADC在100lux时读数40%~60%',
    goal: '100lux光照下ADC读数在量程40%~60%',
    constraint: 'ADC不能饱和(<95%)或过低(>5%)',
    timeLimit: 60,
    check: (result) => {
      const ph = result?.results?.PH1
      const adcPct = parseFloat(ph?.adcPercent) || 0
      const hasError = ph?.error ? true : false
      return {
        passed: adcPct >= 40 && adcPct <= 60 && !hasError,
        score: Math.max(0, 100 - Math.abs(adcPct - 50) * 2 - (hasError ? 30 : 0)),
        detail: `100lux ADC=${adcPct.toFixed(1)}%${hasError ? ' (有警告)' : ''}`
      }
    }
  },

  'lc-bandpass': {
    title: '挑战：设计50kHz带通滤波器',
    goal: 'f₀≈50kHz(±5%)，Q值在10~50之间',
    constraint: '输入频率等于f₀时增益>0.9',
    timeLimit: 90,
    check: (result) => {
      const lc = result?.results?.LC1
      const f0 = lc?.f0 ?? 0
      const q = lc?.q ?? 0
      const gain = lc?.gain ?? 0
      const f0Ok = f0 > 47500 && f0 < 52500
      const qOk = q >= 10 && q <= 50
      const gainOk = gain > 0.9
      return {
        passed: f0Ok && qOk && gainOk,
        score: Math.max(0, 100 - (f0Ok ? 0 : Math.abs(f0 - 50000) / 500) - (qOk ? 0 : 20) - (gainOk ? 0 : 20)),
        detail: `f₀=${(f0/1000).toFixed(1)}kHz, Q=${q.toFixed(1)}, 增益=${gain.toFixed(3)}`
      }
    }
  }
}
