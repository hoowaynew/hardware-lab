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
  },

  'uart-signal': {
    title: 'UART异步串口通信',
    formulas: [
      { label: '波特率', expr: 'bps = 每秒传输的bit数' },
      { label: '传输时间', expr: 'T_frame = (1+8+P+1) / bps' },
      { label: '采样误差容忍', expr: 'Δf/f < ±2.5% (累计采样)' }
    ],
    concepts: [
      'UART是异步通信，没有时钟线，收发双方必须约定相同波特率',
      '帧格式：空闲(高)→START(低1bit)→数据D0~D7(LSB先)→校验(可选)→STOP(高1~2bit)',
      '波特率误差超过±2.5%时，8位数据末尾采样会错位，导致乱码',
      '常见波特率：9600(经典)、115200(高速)、460800(调试)',
      '校验位：偶校验=数据+校验位中1的个数为偶数，奇校验为奇数'
    ],
    tips: [
      '3.3V MCU通信用TTL电平(0V/3.3V)，远距离需转RS232(±12V)',
      '波特率越高，对时钟精度要求越高——115200需<±1%误差',
      '调试串口乱码第一步：检查收发双方波特率是否一致',
      'UART一对多需要主从模式，多从机共用一根TX线需开漏+上拉'
    ]
  },

  'photoresistor': {
    title: '光敏电阻测光原理',
    formulas: [
      { label: '阻值-光照', expr: 'R(lux) = Rdark × (lux_ref/lux)^γ' },
      { label: '分压输出', expr: 'Vout = Vcc × Rphoto / (Rpullup + Rphoto)' },
      { label: 'ADC值', expr: 'ADC = Vout/Vcc × (2^n - 1)' }
    ],
    concepts: [
      '光敏电阻(GL55系列等)：光照越强阻值越小，暗电阻可达1MΩ，亮电阻低至几百Ω',
      'γ值(0.5~0.8)决定阻值随光照变化的速率，是光敏电阻的非线性参数',
      '分压电路：光敏接GND+上拉到Vcc，或光敏接Vcc+下拉到GND',
      '上拉电阻选择：Rpullup ≈ √(Rdark × Rlight)，使ADC在量程中段',
      'ADC动态范围：强光到暗光ADC变化越大，测光精度越好'
    ],
    tips: [
      'GL5528常用：暗电阻1MΩ，亮电阻500Ω，γ≈0.6',
      '上拉选10kΩ适配大多数场景，室内~日光ADC在30%~70%',
      '测光照度(lux)：需校准表，ADC值→阻值→lux查表或拟合',
      '光敏有响应延迟(~10ms)，不适合高速光通信'
    ]
  },

  'lc-bandpass': {
    title: 'LC带通滤波器原理',
    formulas: [
      { label: '中心频率', expr: 'f₀ = 1 / (2π√LC)' },
      { label: '品质因数', expr: 'Q = ω₀L / R = 1/R × √(L/C)' },
      { label: '带宽', expr: 'BW = f₀ / Q' },
      { label: '增益', expr: '|H| = 1/√(1 + Q²(f/f₀ − f₀/f)²)' }
    ],
    concepts: [
      'LC谐振：电感和电容能量交换，特定频率阻抗最小(串联)或最大(并联)',
      'Q值越高=选择性越好但带宽越窄，Q值越低=通带越宽但选频性差',
      '线圈电阻R是Q值的主要限制因素，R越大Q越低',
      '带宽定义：增益下降到-3dB(0.707)时的频率范围',
      '对数频率响应图：以f₀为中心对称的钟形曲线'
    ],
    tips: [
      'f₀=1MHz：L=100μH时C≈253pF，L=10μH时C≈2.53nF',
      '提高Q值：用粗铜线减小线圈电阻，或用银镀线',
      '实际LC滤波器有寄生电容/电感，高频需用SAW/晶体滤波器',
      '50Ω射频系统中，L和C的Q值决定插入损耗'
    ]
  },

  'mosfet-switch': {
    title: 'MOSFET低边开关原理',
    formulas: [
      { label: '导通条件', expr: 'Vgs > Vth (阈值电压)' },
      { label: '导通电阻', expr: 'Rds(on) = 1 / (β × (Vgs - Vth)) (线性区近似)' },
      { label: '功耗', expr: 'P = Id² × Rds(on)' },
      { label: '负载电流', expr: 'Id = Vcc / (Rload + Rds(on))' }
    ],
    concepts: [
      'N-MOSFET低边开关：负载接Vcc→MOSFET漏极D，源极S接地',
      '三个工作区：截止(Vgs<Vth)、线性(Vth<Vgs<Vth+2V)、完全增强(Vgs>Vth+2V)',
      'Vgs不足时未完全导通，Rds远大于标称值，MOSFET变成电阻发热',
      '完全增强区Rds(on)是固定小值(mΩ级)，功耗极低',
      '逻辑级MOSFET(如IRLZ44N)Vth=1-2V，5V MCU可直接驱动'
    ],
    tips: [
      '选型看Rds(on)@Vgs=4.5V(逻辑级)还是@Vgs=10V(标准级)',
      'IRLZ44N: Rds(on)=28mΩ@Vgs=5V，驱动10A负载仅功耗0.28W',
      'MOSFET栅极电容需要充电，高速开关需栅极驱动器提供大电流',
      '低边开关vs高边开关：低边简单但负载不接地，高边需P-MOS或驱动IC'
    ]
  },

  'relay-driver': {
    title: '继电器驱动与续流保护',
    formulas: [
      { label: '线圈电流', expr: 'I = Vcc / Rcoil' },
      { label: '反电动势', expr: 'Vspike = -L × di/dt (无续流时可达数百V)' },
      { label: '续流电压', expr: 'Vf = 0.7V (二极管正向压降)' },
      { label: '驱动管功耗', expr: 'P = Vce_sat × Ic (约0.2V×Ic)' }
    ],
    concepts: [
      '继电器线圈是电感负载，电流不能突变',
      '断电瞬间电感维持电流，产生反向高压尖峰(V=-L×di/dt)',
      '续流二极管反向并联在线圈两端，断电时提供电流泄放回路',
      '无续流二极管：尖峰电压可达200-500V，瞬间击穿驱动三极管',
      '续流二极管选型：If > 线圈电流，Vrm > Vcc'
    ],
    tips: [
      '常用1N4148(小继电器)或1N4007(大继电器)做续流二极管',
      '续流二极管极性：阴极接Vcc，阳极接三极管集电极',
      '续流使继电器释放变慢(~10ms)，需快速释放可串联电阻或用稳压管',
      '驱动管选型：Ic > 2倍线圈电流，Vceo > Vcc(有续流时)'
    ]
  },

  'r2r-dac': {
    title: 'R-2R梯形DAC原理',
    formulas: [
      { label: '输出电压', expr: 'Vout = Vref × D / 2^n' },
      { label: 'LSB(最小分辨)', expr: 'VLSB = Vref / 2^n' },
      { label: '量化SNR', expr: 'SNR = 6.02n + 1.76 (dB)' },
      { label: '每位权重', expr: 'Wi = Vref × 2^i / 2^n' }
    ],
    concepts: [
      'R-2R梯形网络：只用R和2R两种阻值，每级二进制权重',
      '从MSB到LSB，每位权重减半：Vref/2, Vref/4, Vref/8...',
      '每位开关接Vref(bit=1)或接地(bit=0)，叠加输出',
      '优势：只需两种阻值，精度取决于电阻匹配而非绝对值',
      '位数越多分辨率越高，但电阻匹配要求越严格(8位需0.1%)'
    ],
    tips: [
      '4位DAC：Vref=3.3V → LSB=206mV，16级输出(0~3.09V)',
      '8位DAC：Vref=3.3V → LSB=12.9mV，256级输出',
      '实际DAC有INL/DNL非线性误差，高位数需激光校准电阻',
      '输出阻抗恒定为R(不论开关状态)，可直接驱动高阻负载'
    ]
  },
  'adc-sampling': {
    title: 'ADC采样量化原理',
    formulas: [
      { label: 'LSB(分辨电压)', expr: 'LSB = Vref / 2^N' },
      { label: '量化SNR', expr: 'SNR = 6.02N + 1.76 (dB)' },
      { label: '量化误差', expr: 'ε = ±LSB/2' },
      { label: '数字码值', expr: 'D = round(Vin / LSB)' }
    ],
    concepts: [
      'ADC将连续模拟信号离散为有限数字电平（量化）',
      '位数N越高，LSB越小，精度越高，但转换时间越长',
      '采样保持(S/H)：在转换期间保持输入电压不变',
      '参考电压Vref决定量程：Vin ∈ [0, Vref]',
      '高源阻抗需更长采样时间，否则采样电容充不满'
    ],
    tips: [
      '12位/Vref=3.3V → LSB=0.806mV，SNR≈74dB',
      '8位/Vref=3.3V → LSB=12.9mV，精度差16倍',
      'STM32 ADC采样时间1.5~601.5 cycles，高阻抗选长采样',
      'Vref用专用基准源(如TL431)比电源更稳定'
    ]
  },
  'pcb-ground-loop': {
    title: '地平面回流路径与EMI',
    formulas: [
      { label: 'EMI辐射', expr: 'E ∝ f² × A_loop' },
      { label: '环路面积', expr: 'A = L_trace × L_return' },
      { label: '回流路径', expr: '电流总是走最小阻抗路径' }
    ],
    concepts: [
      '信号电流必须形成完整回路，去程走信号线，回程走地平面',
      '高频信号回流走最小电感路径（紧贴信号线下方）',
      '地平面开槽/分割迫使回流绕行，增大环路面积',
      '环路面积越大，EMI辐射越强（与f²成正比）',
      '地平面分割是PCB设计的大忌——跨分割信号必然EMI超标'
    ],
    tips: [
      '完整地平面：回流紧贴信号线，环路面积最小',
      '开槽5mm在高频(>100MHz)下就可能EMI超标',
      '模拟地和数字地分割需用单点连接(0Ω电阻/磁珠)',
      '高速信号走线下方绝不能有地平面缝隙'
    ]
  },
  'oscilloscope-probe': {
    title: '示波器探头补偿原理',
    formulas: [
      { label: '正确补偿条件', expr: 'R1·C1 = R2·C2' },
      { label: '衰减比', expr: 'Att = (R1+R2) / R2' },
      { label: '带宽', expr: 'BW = 1 / (2π·R·C_total)' }
    ],
    concepts: [
      '10x探头内部有9MΩ串联电阻和可调补偿电容',
      '补偿电容调节RC时间常数匹配，确保全频段平坦衰减',
      '欠补偿：高频衰减过多，方波上升沿变圆',
      '过补偿：高频放大，方波上升沿出现尖峰',
      '1x探头输入电容约100pF，带宽仅6MHz；10x探头降至~10pF，带宽100MHz+'
    ],
    tips: [
      '正确补偿：方波平顶完全平坦，无圆角无尖峰',
      '调节方法：探头接校准方波输出，用绝缘螺丝刀调补偿电容',
      '高频测量(>5MHz)务必用10x探头',
      '100x探头用于高压测量(>40V)，输入电容更小'
    ]
  },
  'ble-link-budget': {
    title: 'BLE蓝牙链路预算原理',
    formulas: [
      { label: '自由空间损耗', expr: 'FSPL = 20log₁₀(d) + 20log₁₀(f_MHz) + 27.55' },
      { label: '接收信号强度', expr: 'RSSI = TxPower + Gains - FSPL - Obstacle' },
      { label: '链路余量', expr: 'Margin = RSSI - RxSensitivity' }
    ],
    concepts: [
      'BLE工作在2.4GHz ISM频段，2402~2480MHz共40个信道',
      '典型BLE发射功率-20~+10dBm，接收灵敏度约-90dBm',
      '人体含水量高，对2.4GHz信号吸收约8dB（一堵墙约15dB）',
      '链路余量<10dB时连接不稳定，<0dB则完全断开',
      'RSSI≥-60dBm为极佳，-70~-80dBm可用，<-90dBm断连'
    ],
    tips: [
      '穿墙/人体遮挡是BLE掉线主因，尽量保持视线可达',
      '将发射功率从0dBm提到+10dBm可增加约3倍覆盖距离',
      '2.4GHz与WiFi/微波炉同频段，密集环境干扰严重',
      'BLE 5.0长距离模式(Coded PHY)可用更低速率换灵敏度+12dB'
    ]
  },
  'rs485-bus': {
    title: 'RS-485差分总线原理',
    formulas: [
      { label: '最大线缆长度', expr: 'L_max ≈ 10⁷ / Baudrate (m·bps)' },
      { label: '终端电阻', expr: 'R_term = Z₀ = 120Ω' },
      { label: '传播延迟', expr: 't_pd = L × 5ns/m (双绞线)' }
    ],
    concepts: [
      'RS-485采用差分信号(A-B)，抗共模干扰能力强',
      '双绞线特征阻抗120Ω，末端必须接终端电阻消除反射',
      '最多32个单位负载(UL)，1/8UL收发器可扩到256节点',
      '无终端电阻时信号在末端反射，产生振铃和误码',
      '临界长度 = rise_time × v/2，短于此长度可不加终端'
    ],
    tips: [
      '总线两端各加一个120Ω终端电阻，中间节点不加',
      '失效偏置电阻(Bias)确保总线空闲时A>B，避免随机翻转',
      '10Mbps下线缆最长约12m，9600bps可达1200m',
      '星型拓扑会引入分支反射，应使用手拉手链式布线'
    ]
  },
  'sallen-key-filter': {
    title: 'Sallen-Key有源滤波器原理',
    formulas: [
      { label: '截止频率', expr: 'fc = 1 / (2πRC)' },
      { label: '品质因数', expr: 'Q = 1 / (3-K)，K为运放增益' },
      { label: '传递函数', expr: 'H(s) = Kωc² / (s² + ωc/Q·s + ωc²)' }
    ],
    concepts: [
      'Sallen-Key是二阶有源滤波器最简结构，仅需1个运放+2R+2C',
      'Q=0.707为Butterworth响应，通带最平坦无纹波',
      'Q>0.707为Chebyshev响应，截止更陡但通带有纹波',
      'Q>1时截止频率附近出现谐振峰，Q过大可能自激振荡',
      '阻带衰减-40dB/十倍频程（二阶滚降），比一阶多20dB/dec'
    ],
    tips: [
      '先用fc=1/(2πRC)算R和C，再调K控制Q值',
      'Butterworth(Q=0.707)是最常用的低通响应',
      'K=1(电压跟随器)时Q=0.5，过阻尼响应不够陡',
      'K接近3时Q趋无穷大，滤波器变成振荡器！K必须<3'
    ]
  }
}
