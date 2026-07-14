/**
 * 每个实验的知识点数据
 * 在实验页面展示可折叠的核心公式/概念/提示
 */

export const knowledgeData = {
  'led-resistor': {
    title: 'LED限流电阻原理',
    formulas: [
      { label: '限流电阻', expr: 'R = (Vcc - Vf) / If' },
      { label: '功率', expr: 'P = I² × R' }
    ],
    concepts: [
      'LED是二极管，不是线性元件，不能用欧姆定律直接计算',
      'LED有正向导通压降(Vf)：红光≈2.0V，蓝光/白光≈3.0V',
      '限流电阻承担多余电压，将电流控制在安全范围内（通常≤20mA）',
      '没有限流电阻直接接电源 = 短路，LED瞬间烧毁'
    ],
    tips: [
      '常见5mm LED额定电流20mA，安全工作电流5-15mA',
      'Vf因颜色不同而不同：红<黄<绿<蓝<白',
      '多个LED串联时：R = (Vcc - n×Vf) / If'
    ]
  },

  'gpio-modes': {
    title: 'STM32 GPIO八种模式',
    formulas: [
      { label: '上拉电阻典型值', expr: 'R_pullup ≈ 40kΩ (内部)' }
    ],
    concepts: [
      '输入模式4种：浮空、上拉、下拉、模拟',
      '输出模式4种：推挽、开漏、复用推挽、复用开漏',
      '浮空输入电平不确定，受电磁干扰影响',
      '开漏输出只能拉低，需要外部上拉电阻才能输出高电平',
      '推挽输出内部有上下两个MOS管，不要直接接地'
    ],
    tips: [
      '按键检测用上拉或下拉输入，不要用浮空',
      'I2C总线SDA/SCL必须用开漏+外部上拉',
      '推挽输出驱动大电流负载需要加驱动电路（三极管/MOS管）'
    ]
  },

  'pwm-tuner': {
    title: 'PWM脉冲宽度调制',
    formulas: [
      { label: '平均电压', expr: 'V_avg = Vcc × (Duty / 100%)' },
      { label: '舵机角度', expr: 'θ = (t_pulse - 0.5ms) / 2ms × 180°' }
    ],
    concepts: [
      'PWM通过改变占空比来控制平均功率/电压',
      '占空比 = 高电平时间 / 周期 × 100%',
      '频率决定PWM的"粒度"，频率越高越平滑',
      '舵机需要50Hz(20ms周期)，脉宽0.5~2.5ms对应0~180°'
    ],
    tips: [
      'LED调光：频率>200Hz人眼无闪烁感',
      '舵机控制：100%占空比 = 持续高电平，舵机无法识别',
      '电机调速：频率通常8~20kHz，避免可听噪声'
    ]
  },

  'voltage-divider': {
    title: '分压器原理',
    formulas: [
      { label: '输出电压', expr: 'Vout = Vin × R2 / (R1 + R2)' },
      { label: '分压电流', expr: 'I = Vin / (R1 + R2)' },
      { label: '功耗', expr: 'P = Vin² / (R1 + R2)' }
    ],
    concepts: [
      '两个电阻串联，中间点电压按比例分配',
      '分压器输出阻抗高，不能直接驱动负载（负载会改变分压比）',
      'STM32 ADC输入阻抗建议源阻抗<50kΩ',
      'ADC输入电压不能超过VREF（通常3.3V）'
    ],
    tips: [
      '总阻值太小 → 功耗大；太大 → ADC采样不准',
      '推荐总阻值范围：10kΩ~100kΩ',
      '测量电池电压时，先分压再接ADC，防止过压'
    ]
  },

  'capacitor-charge': {
    title: 'RC充放电时间常数',
    formulas: [
      { label: '时间常数', expr: 'τ = R × C' },
      { label: '充电电压', expr: 'V(t) = Vmax × (1 - e^(-t/τ))' },
      { label: '放电电压', expr: 'V(t) = V0 × e^(-t/τ)' }
    ],
    concepts: [
      'τ = RC 决定充放电速度',
      '1τ充到63%，3τ充到95%，5τ认为充满（99.3%）',
      '电容电压不能突变，电流可以突变',
      '充电和放电时间常数相同（同一个RC）'
    ],
    tips: [
      'R×C 单位：Ω×F = 秒',
      '去耦电容选型：根据负载瞬态电流和容忍压降计算',
      'RC电路也用于上电复位延时，典型τ=100ms'
    ]
  },

  'transistor-switch': {
    title: '三极管开关电路',
    formulas: [
      { label: '基极电流', expr: 'Ib = (Vcc - Vbe) / Rb, Vbe≈0.7V' },
      { label: '饱和电流', expr: 'Ic_sat = (Vcc - Vce_sat) / Rc, Vce_sat≈0.2V' },
      { label: '饱和条件', expr: 'Ib ≥ Ic_sat / β' }
    ],
    concepts: [
      'NPN三极管三个工作区：截止、放大、饱和',
      '开关应用：工作在截止区(OFF)和饱和区(ON)',
      '饱和条件：基极电流足够大，Ib ≥ Ic_sat/β',
      '基极电流不足 → 进入放大区 → 开关不彻底 → 发热'
    ],
    tips: [
      '设计步骤：先定Ic → 算Ic_sat → 算Ib_min → 取Ib=2~5×Ib_min → 算Rb',
      'Vbe≈0.7V是硅管典型值，锗管≈0.3V',
      '集电极功耗 P = Vce × Ic，饱和区Vce≈0.2V所以功耗很小'
    ]
  },

  'rc-filter': {
    title: 'RC低通滤波器',
    formulas: [
      { label: '截止频率', expr: 'fc = 1 / (2πRC)' },
      { label: '增益', expr: 'G = 1 / √(1 + (f/fc)²)' },
      { label: '衰减(dB)', expr: 'A = 20 × log10(G)' }
    ],
    concepts: [
      '低通滤波器：低频通过，高频衰减',
      '截止频率fc处增益=0.707（-3dB）',
      'fc以上每10倍频衰减20dB（-20dB/decade）',
      '一阶RC滤波器衰减斜率固定-20dB/dec，不够陡'
    ],
    tips: [
      'R×C中C的单位是法拉(F)，μF需要÷1e6',
      '抗混叠滤波：ADC采样前用LPF滤除高于Nyquist频率的成分',
      '需要更陡的滤波 → 用二阶/有源滤波器（Sallen-Key等）'
    ]
  },

  'i2c-signal': {
    title: 'I2C通信协议',
    formulas: [
      { label: '地址帧', expr: '[7-bit addr] + [R/W] + [ACK]' },
      { label: '数据帧', expr: '[8-bit data] + [ACK]' }
    ],
    concepts: [
      'I2C是两线制：SDA(数据) + SCLK(时钟)',
      'START: SCL高时SDA由高变低',
      'STOP: SCL高时SDA由低变高',
      '数据在SCL低电平时改变，SCL高电平时采样',
      'ACK: 接收方拉低SDA表示应答；NACK: 不拉低表示无应答'
    ],
    tips: [
      '7位地址 + 1位R/W = 8位地址帧',
      '总线空闲时SDA和SCL都是高电平（上拉电阻维持）',
      '标准模式100kHz / 快速模式400kHz / 快速+模式1MHz',
      '每个从机地址唯一，地址冲突会导致通信混乱'
    ]
  },

  'ntc-thermistor': {
    title: 'NTC热敏电阻测温',
    formulas: [
      { label: 'B参数方程', expr: 'R(T) = R25 × exp(B × (1/T - 1/T25))' },
      { label: '分压输出', expr: 'Vout = Vcc × Rntc / (Rpullup + Rntc)' },
      { label: 'ADC值', expr: 'ADC = Vout/Vcc × (2^bits - 1)' }
    ],
    concepts: [
      'NTC: 温度升高 → 阻值降低（负温度系数）',
      'B参数方程描述R-T关系，B值通常3950',
      '分压电路将阻值变化转换为电压变化',
      'ADC将模拟电压数字化，位数决定精度'
    ],
    tips: [
      '上拉电阻 ≈ R25时，25°C附近灵敏度最高',
      '12位ADC精度0.024%，但受NTC非线性影响实际精度低很多',
      '低温区NTC阻值大 → ADC接近满量程（饱和）',
      '高温区NTC阻值小 → ADC接近0（精度差）'
    ]
  },

  'pcb-trace-impedance': {
    title: 'PCB走线阻抗控制',
    formulas: [
      { label: '微带线阻抗', expr: 'Z0 = 87/√(εr+1.41) × ln(5.98H/(0.8W+T))' },
      { label: '有效介电常数', expr: 'εeff = (εr+1)/2 + (εr-1)/2 × f(W/H)' }
    ],
    concepts: [
      '高频信号走线需要控制阻抗，通常50Ω',
      '阻抗不匹配 → 信号反射 → 信号完整性问题',
      '微带线(microstrip): 顶层走线，一面空气一面介质',
      '影响阻抗的因素：线宽W、介质厚度H、介电常数εr、铜厚T'
    ],
    tips: [
      'FR4的εr ≈ 4.2~4.6，频率越高有效εr越低',
      '50Ω阻抗的常用参数组合：W=0.2mm H=0.1mm (JLC04161H)',
      '高速信号（USB/DDR/RF）必须做阻抗控制',
      '差分对走线需要控制差分阻抗（通常90Ω或100Ω）'
    ]
  },

  'wifi-signal-attenuation': {
    title: 'WiFi链路预算',
    formulas: [
      { label: '自由空间损耗', expr: 'FSPL(dB) = 20log10(d) + 20log10(f_MHz) + 32.44' },
      { label: '接收功率', expr: 'RSSI = TxPower + Gtx + Grx - FSPL - Loss_walls' },
      { label: '链路余量', expr: 'Margin = RSSI - RxSensitivity' }
    ],
    concepts: [
      '链路预算：发射功率 → 路径损耗 → 接收功率 → 余量',
      'FSPL随距离和频率增加而增大',
      '墙壁衰减：2.4GHz约8dB/墙，5GHz约12dB/墙',
      '链路余量<10dB → 不稳定，<0dB → 断连'
    ],
    tips: [
      '5GHz穿透能力差但带宽高，2.4GHz穿墙好但干扰多',
      'RSSI > -50dBm: 优秀, -65: 良好, -75: 较差, < -82: 断连',
      '天线增益dBi是定向增益，全向天线增益越高覆盖越窄'
    ]
  },

  'logic-analyzer-debug': {
    title: 'SPI协议与逻辑分析仪',
    formulas: [
      { label: 'SPI模式', expr: 'Mode = CPOL × 2 + CPHA' },
      { label: '时钟周期', expr: 'T = 1 / f_clk' }
    ],
    concepts: [
      'SPI四线：CS(片选) + SCLK(时钟) + MOSI(主出从入) + MISO(主入从出)',
      'CPOL: 时钟空闲电平（0=低, 1=高）',
      'CPHA: 采样边沿（0=第一个边沿, 1=第二个边沿）',
      '4种模式：Mode0(CPOL=0,CPHA=0)最常用',
      '逻辑分析仪采样所有信号线，按协议解码'
    ],
    tips: [
      '主从模式必须一致，否则数据错位/反转',
      'CS低电平有效，选中从机后开始通信',
      '逻辑分析仪采样率 ≥ 4倍时钟频率才能准确解码',
      '调试SPI问题：先用逻辑分析仪抓波形，确认CPOL/CPHA'
    ]
  },

  'dcdc-buck': {
    title: 'DC-DC Buck降压转换器',
    formulas: [
      { label: '输出电压', expr: 'Vout = Vin × D (D=占空比)' },
      { label: '纹波电流', expr: 'ΔIL = Vin×D×(1-D) / (L×f)' },
      { label: '纹波电压', expr: 'ΔV = ΔIL / (8×f×Cout)' },
      { label: '效率', expr: 'η = Pout / (Pout + Ploss)' }
    ],
    concepts: [
      'Buck电路：高频开关 + 电感储能 + 电容滤波 → 降压',
      '占空比D = Vout/Vin，连续模式(CCM)下输出与负载无关',
      '电感纹波电流ΔIL：L太小纹波大，L太大响应慢体积大',
      '开关频率越高 → 电感可以更小 → 但开关损耗增大',
      '同步整流(用MOSFET替换二极管)可提升效率3-5%'
    ],
    tips: [
      '纹波电流比ΔIL/Iout建议30%-40%为最佳',
      '12V→5V/1A: D≈42%, L=22μH, f=500kHz → ΔIL≈280mA',
      '输出电容ESR越低纹波越小，陶瓷电容优于电解',
      '布局关键：开关节点面积最小化，减小EMI辐射'
    ]
  },

  'opamp-comparator': {
    title: '运放比较器与迟滞',
    formulas: [
      { label: '比较器', expr: 'Vout = (V+ > V−) ? V_High : V_Low' },
      { label: '迟滞宽度', expr: 'Vhys = Rf/(R1+Rf) × ΔVout' },
      { label: '上阈值', expr: 'V_th+ = Vref + Vhys/2' },
      { label: '下阈值', expr: 'V_th− = Vref − Vhys/2' }
    ],
    concepts: [
      '比较器：开环运放，输出只有高/低两种状态',
      '无迟滞时，输入缓慢变化过阈值 → 噪声导致输出抖动',
      '迟滞(正反馈)：引入两个阈值，上升用上阈值，下降用下阈值',
      '开漏/开集输出需要外部上拉电阻才能输出高电平',
      '施密特触发器 = 带迟滞的比较器'
    ],
    tips: [
      '迟滞电压取50-100mV通常能消除大部分抖动',
      '温度报警电路：V+接NTC分压，V−接参考电压',
      '专用比较器(LM393)比运放开环使用更稳定、响应更快',
      '迟滞电阻比Rf:R1 = Vhys:Vout，例如100mV迟滞/5V输出 → 1:50'
    ]
  },

  'button-debounce': {
    title: '按键消抖原理与方案',
    formulas: [
      { label: 'RC时间常数', expr: 'τ = R × C' },
      { label: 'RC滤波截止频率', expr: 'fc = 1/(2πRC)' },
      { label: '软件消抖', expr: 'if (read==0) delay(20ms); if (read==0) confirmed' }
    ],
    concepts: [
      '机械按键按下/释放时触点弹跳，产生5-20ms抖动',
      '无消抖：MCU一次按键检测到多次边沿 → 多次触发',
      'RC硬件消抖：低通滤波器滤除高频抖动，τ > 抖动时间',
      '软件消抖：检测到边沿后延时20ms再确认，简单但占用CPU',
      '硬件消抖不占MCU资源，软件消抖不需要额外元件'
    ],
    tips: [
      '典型RC参数：R=10kΩ C=100nF → τ=1ms（需增大C到1μF）',
      '实际取τ ≈ 3-5倍抖动时间，确保完全滤除',
      '软件消抖推荐：定时器轮询 + 状态机，不用delay阻塞',
      'STM32可利用EXTI + 定时器实现硬件辅助消抖'
    ]
  },

  'ldo-regulator': {
    title: 'LDO线性稳压器原理',
    formulas: [
      { label: '功耗', expr: 'P = (Vin - Vout) × Iload' },
      { label: '效率', expr: 'η = Vout / Vin × 100%' },
      { label: '结温', expr: 'Tj = Ta + P × θJA' },
      { label: '最小压差', expr: 'Vin - Vout ≥ Vdropout (典型0.3V)' }
    ],
    concepts: [
      'LDO = 低压差线性稳压器，内部用误差放大器+调整管控制输出',
      '效率 η = Vout/Vin，压差越大效率越低（多余能量全变热）',
      '功耗 P = (Vin-Vout)×Iload 全部转化为热量',
      '结温 Tj = 环境温度 + 功耗×热阻，超过125°C触发热关断',
      'Dropout电压：LDO能正常稳压的最小Vin-Vout差值'
    ],
    tips: [
      'AMS1117-3.3 dropout约1.1V，5V→3.3V勉强可用，3.6V就不行',
      '低压差LDO(如TLV7333)dropout仅0.1V，3.5V就能输出3.3V',
      '热阻θJA：SOT-23约300°C/W(不加散热)，SOT-89约150°C/W',
      'LDO vs Buck：LDO简单低噪但效率低，Buck高效但复杂有纹波'
    ]
  },

  'timer-555': {
    title: '555定时器无稳态振荡',
    formulas: [
      { label: '频率', expr: 'f = 1.44 / ((Ra + 2Rb) × C)' },
      { label: '占空比', expr: 'D = (Ra + Rb) / (Ra + 2Rb)' },
      { label: '高电平时间', expr: 'tH = 0.693 × (Ra + Rb) × C' },
      { label: '低电平时间', expr: 'tL = 0.693 × Rb × C' }
    ],
    concepts: [
      '555定时器：通用定时芯片，可做无稳态/单稳态/双稳态三种模式',
      '无稳态：不需触发，上电即振荡，输出连续方波',
      '电容通过Ra+Rb充电（tH），通过Rb放电（tL）',
      '占空比始终>50%，因为充电经过Ra+Rb而放电只经过Rb',
      'Ra=0时放电管直接对地短路，过流损坏芯片'
    ],
    tips: [
      '标准555最高频率约500kHz，CMOS版(TLC555)可达2MHz',
      '要50%占空比：用两个二极管分离充放电路径',
      'C取10nF~100μF，R取1kΩ~10MΩ，频率范围0.001Hz~500kHz',
      '555电源范围宽(TTL版4.5~16V)，CMOS版2~18V'
    ]
  },

  'esd-protection': {
    title: 'ESD保护与TVS二极管',
    formulas: [
      { label: '钳位电压', expr: 'Vc = Vwm + ΔV (TVS datasheet)' },
      { label: '峰值电流', expr: 'Ipp = VESD / Zsource (330Ω IEC模型)' },
      { label: '钳位比', expr: 'Ratio = Vc / Vwm (应 < 3)' }
    ],
    concepts: [
      'ESD(静电放电)：人体可带±15kV静电，接触瞬间释放8kV脉冲',
      'IEC 61000-4-2标准：330Ω/150pF模型，±8kV接触放电',
      'TVS二极管：反向击穿钳位，ns级响应，比压敏电阻快100倍',
      'TVS工作电压Vwm > 信号最高电压，否则正常工作就导通',
      '钳位电压Vc：ESD事件时TVS将电压限制到Vc，保护后级芯片'
    ],
    tips: [
      'TVS选型：Vwm > 信号最高电压，Vc < 芯片最大耐受电压',
      'USB2.0 D+/D- 用Vwm=5V TVS，CAN总线用Vwm=24V TVS',
      '双向TVS用于交流信号，单向TVS用于直流信号线',
      '芯片内部ESD保护仅±2kV(HBM)，远不够IEC标准'
    ]
  }
}
