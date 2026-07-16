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
  },

  'mosfet-switch': {
    title: '挑战：完全导通MOSFET驱动12V/10Ω负载',
    goal: '工作在完全增强区，功耗<500mW',
    constraint: 'Vgs > Vth+2V，负载电流>1A',
    timeLimit: 60,
    check: (result) => {
      const ph = result?.results?.M1
      const region = ph?.region ?? 'cutoff'
      const power = ph?.powerDissipation ?? 9999
      const current = ph?.loadCurrent ?? 0
      const hasError = ph?.error ? true : false
      return {
        passed: region === 'enhancement' && power < 500 && current > 1000 && !hasError,
        score: Math.max(0, 100 - (region === 'enhancement' ? 0 : 40) - (power < 500 ? 0 : 20) - (current > 1000 ? 0 : 20) - (hasError ? 20 : 0)),
        detail: `区域=${region}, 功耗=${power.toFixed(0)}mW, 电流=${current.toFixed(0)}mA`
      }
    }
  },

  'relay-driver': {
    title: '挑战：安全驱动继电器',
    goal: '续流保护开启，线圈电流<200mA，断电无尖峰',
    constraint: '断电时Vce应力<25V',
    timeLimit: 45,
    check: (result) => {
      const ph = result?.results?.RL1
      const hasFlyback = ph?.hasFlyback ?? false
      const coilCurrent = ph?.coilCurrent ?? 9999
      const vceStress = ph?.vceStress ?? 0
      const hasError = ph?.error ? true : false
      return {
        passed: hasFlyback && coilCurrent < 200 && vceStress < 25 && !hasError,
        score: Math.max(0, 100 - (hasFlyback ? 0 : 40) - (coilCurrent < 200 ? 0 : 30) - (vceStress < 25 ? 0 : 30) - (hasError ? 20 : 0)),
        detail: `续流=${hasFlyback ? '✓' : '✗'}, 线圈电流=${coilCurrent.toFixed(0)}mA, Vce应力=${vceStress.toFixed(0)}V`
      }
    }
  },

  'r2r-dac': {
    title: '挑战：输出精确2V电压',
    goal: 'Vout在1.95~2.10V之间(4位/Vref=3.3V)',
    constraint: '无满量程警告',
    timeLimit: 45,
    check: (result) => {
      const ph = result?.results?.DAC1
      const vout = ph?.vout ?? 0
      const bits = ph?.bits ?? 4
      const vref = ph?.vref ?? 3.3
      const hasError = ph?.error ? true : false
      // 4位/3.3V: D=10 → 2.0625V (在范围内)
      const target = 2.0
      const inRange = vout >= 1.95 && vout <= 2.10
      return {
        passed: inRange && !hasError,
        score: Math.max(0, 100 - Math.abs(vout - target) * 50 - (hasError ? 20 : 0)),
        detail: `${bits}位/Vref=${vref}V: D=${ph?.digitalInput} → Vout=${vout.toFixed(4)}V`
      }
    }
  },
  'adc-sampling': {
    title: '挑战：精确测量1.5V电压',
    goal: '量化误差≤0.5mV，无超量程警告',
    constraint: '分辨率≥12位，采样时间≥7.5μs',
    timeLimit: 45,
    check: (result) => {
      const adc = result?.results?.ADC1
      const bits = adc?.bits ?? 12
      const lsb = adc?.lsb ?? 0
      const overRange = adc?.overRange ?? false
      const hasError = adc?.error ? true : false
      const quantError = (lsb / 2) * 1000 // mV
      return {
        passed: bits >= 12 && !overRange && !hasError && quantError <= 0.5,
        score: Math.max(0, 100 - (overRange ? 50 : 0) - (bits < 12 ? 30 : 0) - (quantError > 0.5 ? 20 : 0)),
        detail: `${bits}位/Vref=${adc?.vref}V: LSB=${(lsb*1000).toFixed(2)}mV, 误差±${quantError.toFixed(2)}mV`
      }
    }
  },
  'pcb-ground-loop': {
    title: '挑战：EMI辐射低于30dB',
    goal: 'EMI等级≤30dB（安全范围）',
    constraint: '不能使用分割地平面',
    timeLimit: 60,
    check: (result) => {
      const pcb = result?.results?.PCB1
      const emi = pcb?.emiLevel ?? 100
      const groundType = pcb?.groundType ?? 'solid'
      const hasError = pcb?.error ? true : false
      return {
        passed: emi <= 30 && groundType !== 'split' && !hasError,
        score: Math.max(0, 100 - emi - (groundType === 'split' ? 50 : 0) - (hasError ? 20 : 0)),
        detail: `地平面=${groundType}, EMI=${emi.toFixed(1)}dB, 环路=${pcb?.loopArea?.toFixed(0)}mm²`
      }
    }
  },
  'oscilloscope-probe': {
    title: '挑战：完美补偿方波',
    goal: '补偿系数在0.97~1.03之间',
    constraint: '衰减比10x，无带宽不足警告',
    timeLimit: 45,
    check: (result) => {
      const probe = result?.results?.PROBE1
      const comp = probe?.compensation ?? 1.0
      const att = probe?.attenuation ?? 10
      const hasError = probe?.error ? true : false
      const compOk = comp >= 0.97 && comp <= 1.03
      return {
        passed: compOk && att === 10 && !hasError,
        score: Math.max(0, 100 - Math.abs(comp - 1) * 200 - (att !== 10 ? 30 : 0) - (hasError ? 20 : 0)),
        detail: `衰减=${att}x, 补偿=${comp.toFixed(3)}, 带宽=${probe?.bandwidth?.toFixed(1)}MHz`
      }
    }
  },
  'ble-link-budget': {
    title: '挑战：穿墙后信号可达',
    goal: 'RSSI ≥ -80dBm（穿一堵墙，5m距离）',
    constraint: '障碍物必须选"一堵墙"',
    timeLimit: 60,
    check: (result) => {
      const ble = result?.results?.BLE1
      const rssi = ble?.rssi ?? -200
      const obstacle = ble?.obstacleName ?? ''
      const hasError = ble?.error ? true : false
      const wallSet = obstacle.includes('墙')
      return {
        passed: rssi >= -80 && wallSet && !hasError,
        score: Math.max(0, 100 + (rssi + 80) - (hasError ? 50 : 0) - (wallSet ? 0 : 30)),
        detail: `RSSI=${rssi}dBm, 障碍=${obstacle}, 余量=${ble?.margin}dB`
      }
    }
  },
  'rs485-bus': {
    title: '挑战：1Mbps长线稳定通信',
    goal: '眼图质量≥80%，无振铃',
    constraint: '波特率1Mbps，线缆≥50m',
    timeLimit: 60,
    check: (result) => {
      const rs = result?.results?.RS1
      const eye = rs?.eyeQuality ?? 0
      const ringing = rs?.ringing ?? false
      const baud = rs?.baudrate ?? 0
      const len = rs?.cableLength ?? 0
      const hasError = rs?.error ? true : false
      const baudOk = baud >= 1000000
      const lenOk = len >= 50
      return {
        passed: eye >= 80 && !ringing && !hasError && baudOk && lenOk,
        score: Math.max(0, eye - (ringing ? 30 : 0) - (hasError ? 20 : 0) - (!baudOk ? 40 : 0) - (!lenOk ? 20 : 0)),
        detail: `眼图=${eye}%, 振铃=${ringing}, 波特=${baud}, 线长=${len}m`
      }
    }
  },
  'sallen-key-filter': {
    title: '挑战：设计Butterworth低通滤波器',
    goal: 'Q=0.707±0.05，增益≤1dB',
    constraint: '截止频率在1kHz~5kHz之间',
    timeLimit: 90,
    check: (result) => {
      const sk = result?.results?.SK1
      const q = sk?.Q ?? 0
      const gainDb = sk?.gainDb ?? 0
      const fc = sk?.fc ?? 0
      const hasError = sk?.error ? true : false
      const qOk = q >= 0.657 && q <= 0.757
      const gainOk = Math.abs(gainDb) <= 1.5
      const fcOk = fc >= 1000 && fc <= 5000
      return {
        passed: qOk && gainOk && fcOk && !hasError,
        score: Math.max(0, 100 - Math.abs(q - 0.707) * 100 - Math.abs(gainDb) * 10 - (!fcOk ? 30 : 0) - (hasError ? 20 : 0)),
        detail: `Q=${q.toFixed(3)}, 增益=${gainDb.toFixed(1)}dB, fc=${fc.toFixed(0)}Hz`
      }
    }
  },
  'dma-transfer': {
    title: '挑战：4KB数据零CPU搬运',
    goal: 'CPU占用=0%，传输时间<100μs',
    constraint: '传输数据量≥2048字节',
    timeLimit: 60,
    check: (result) => {
      const dma = result?.results?.DMA1
      const cpuUsage = dma?.dmaCpuUsage ?? 999
      const time = dma?.dmaTimeUs ?? 9999
      const size = dma?.transferSize ?? 0
      const hasError = dma?.error ? true : false
      const sizeOk = size >= 2048
      return {
        passed: cpuUsage < 1 && time < 100 && sizeOk && !hasError,
        score: Math.max(0, 100 - Math.max(0, time - 50) * 0.5 - (cpuUsage > 0 ? 50 : 0) - (!sizeOk ? 30 : 0) - (hasError ? 20 : 0)),
        detail: `CPU=${cpuUsage}%, 时间=${time}μs, 数据量=${size}B`
      }
    }
  },
  'ultrasonic-hc-sr04': {
    title: '挑战：10米精确测距',
    goal: '测距误差 < 0.5cm',
    constraint: '目标距离=1000cm，温度=30°C',
    timeLimit: 60,
    check: (result) => {
      const us = result?.results?.US1
      const error = us ? Math.abs(us.tempErrorCm) : 999
      const detectable = us?.detectable ?? false
      const hasError = us?.error ? true : false
      return {
        passed: error < 0.5 && detectable && !hasError,
        score: Math.max(0, 100 - error * 20 - (!detectable ? 40 : 0) - (hasError ? 20 : 0)),
        detail: `误差=${error.toFixed(2)}cm, 可检测=${detectable}`
      }
    }
  },
  'diff-pair-routing': {
    title: '挑战：USB3.0差分对设计',
    goal: '阻抗偏差<5%，Skew<5ps',
    constraint: '目标90Ω，频率5GHz',
    timeLimit: 90,
    check: (result) => {
      const dp = result?.results?.DP1
      const impErr = dp ? Math.abs(dp.impErrorPct) : 999
      const skew = dp ? Math.abs(dp.skewPs) : 999
      const hasError = dp?.error ? true : false
      return {
        passed: impErr < 5 && skew < 5 && !hasError,
        score: Math.max(0, 100 - impErr * 5 - skew * 5 - (hasError ? 20 : 0)),
        detail: `阻抗偏差=${impErr.toFixed(2)}%, Skew=${skew.toFixed(1)}ps`
      }
    }
  },
  'lora-link-budget': {
    title: '挑战：10km远距离通信',
    goal: '链路余量>10dB，空中时间<2s',
    constraint: '距离=10km',
    timeLimit: 60,
    check: (result) => {
      const lr = result?.results?.LR1
      const margin = lr?.linkMargin ?? -999
      const airTime = lr?.airTimeMs ?? 99999
      const hasError = lr?.error ? true : false
      return {
        passed: margin > 10 && airTime < 2000 && !hasError,
        score: Math.max(0, margin + 20 - Math.max(0, airTime - 500) * 0.01 - (hasError ? 30 : 0)),
        detail: `余量=${margin.toFixed(1)}dB, 空中时间=${airTime.toFixed(0)}ms`
      }
    }
  },
  'jtag-boundary-scan': {
    title: '挑战：多器件链路故障检测',
    goal: '覆盖率≥90%，无扫描错误',
    constraint: '器件数≥3',
    timeLimit: 60,
    check: (result) => {
      const jt = result?.results?.JT1
      const coverage = jt?.faultCoverage ?? 0
      const devices = jt?.deviceCount ?? 0
      const hasError = jt?.error ? true : false
      const devicesOk = devices >= 3
      return {
        passed: coverage >= 90 && !hasError && devicesOk,
        score: Math.max(0, coverage - (hasError ? 30 : 0) - (!devicesOk ? 40 : 0)),
        detail: `覆盖率=${coverage}%, 器件=${devices}, 错误=${hasError}`
      }
    }
  }
}
