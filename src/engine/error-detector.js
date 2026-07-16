/**
 * 错误检测器
 * 从仿真结果中提取错误，匹配教程索引，生成教学弹窗内容
 */

// 错误类型 → 教程片段映射
const errorTutorialMap = {
  LED_OVERCURRENT: {
    category: 'power',
    concept: '限流电阻',
    formula: 'R = (Vcc - Vf) / If',
    articleRef: 'power-001',
    tips: [
      'LED不是线性元件，不能用欧姆定律直接计算',
      'LED有正向导通压降(Vf)，红光约2.0V，蓝光/白光约3.0V',
      '限流电阻的作用是将多余电压分担掉，控制电流在安全范围'
    ]
  },
  LED_REVERSED: {
    category: 'circuit',
    concept: 'LED极性',
    articleRef: 'circuit-001',
    tips: [
      'LED本质是二极管，只允许电流从正极流向负极',
      '长脚为正极(anode)，短脚为负极(cathode)',
      '接反不会损坏，但不会发光'
    ]
  },
  LED_NO_RESISTOR: {
    category: 'power',
    concept: '限流电阻',
    articleRef: 'power-001',
    tips: [
      'LED没有内阻，直接接电源会导致电流无限大',
      '必须串联限流电阻',
      '最小限流电阻 R = (Vcc - Vf) / Imax'
    ]
  },
  SHORT_CIRCUIT: {
    category: 'circuit',
    concept: '短路保护',
    articleRef: 'circuit-002',
    tips: [
      '短路是电源正极直接连接到地，无负载',
      '短路电流 = V / 0 = ∞，会瞬间烧毁元件',
      '设计电路时始终确保电源和地之间有负载'
    ]
  },
  GPIO_FLOATING: {
    category: 'stm32',
    concept: 'GPIO浮空输入',
    articleRef: 'stm32-002',
    tips: [
      '浮空输入引脚的电平由空间电磁干扰决定',
      '手指靠近就会改变引脚电平',
      '实际应用中几乎不使用浮空输入'
    ]
  },
  OPENDRAIN_NO_PULLUP: {
    category: 'stm32',
    concept: '开漏输出',
    articleRef: 'stm32-002',
    tips: [
      '开漏输出只能拉低，不能拉高',
      '需要外部上拉电阻才能输出高电平',
      'I2C总线就是典型的开漏输出应用'
    ]
  },
  GPIO_SHORT: {
    category: 'stm32',
    concept: '推挽输出短路',
    articleRef: 'stm32-002',
    tips: [
      '推挽输出内部有上下两个MOS管',
      '输出高电平时上管导通，直接接地会烧管',
      '驱动大电流负载时需要加驱动电路'
    ]
  },
  PWM_SERVO_FREQ: {
    category: 'timing',
    concept: '舵机控制',
    articleRef: 'timing-005',
    tips: [
      '标准舵机控制信号：50Hz，周期20ms',
      '脉冲宽度0.5ms~2.5ms对应0°~180°',
      '频率不对舵机完全不响应'
    ]
  },
  PWM_SERVO_100: {
    category: 'timing',
    concept: 'PWM占空比',
    articleRef: 'timing-005',
    tips: [
      '100%占空比 = 直流电，不是PWM',
      '舵机需要周期性的脉冲信号',
      '占空比范围通常在2.5%~12.5%之间'
    ]
  },
  BLE_OBSTACLE_TOO_MANY: {
    category: 'wireless',
    concept: 'BLE障碍物穿透损耗',
    articleRef: 'wireless-001',
    tips: [
      '2.4GHz信号穿墙损耗：木板墙3-5dB，混凝土墙10-15dB',
      'BLE发射功率仅0~4dBm，穿墙后余量不足',
      '多墙场景建议使用BLE Mesh组网扩展覆盖'
    ]
  },
  CC_OVERVOLTAGE: {
    category: 'analog',
    concept: '电容耐压选型',
    formula: 'V_rating ≥ 1.5 × Vcc',
    articleRef: 'analog-001',
    tips: [
      '电容击穿是永久性损坏，不可恢复',
      '铝电解电容额定电压需≥1.5倍工作电压',
      '陶瓷电容耐压可降额到50%使用更安全'
    ]
  },
  DP_OVER_COUPLING: {
    category: 'pcb',
    concept: '差分对耦合控制',
    articleRef: 'pcb-001',
    tips: [
      '耦合系数K建议0.2~0.4，过强导致差模/共模转换',
      '线间距≥3倍线宽时耦合较弱，阻抗独立',
      '使用阻抗计算器而非经验值确定线宽'
    ]
  },
  JTAG_TCK_TOO_FAST: {
    category: 'debug',
    concept: 'JTAG链路信号完整性',
    articleRef: 'debug-001',
    tips: [
      '长链路建议TCK≤10MHz，每级缓冲器可恢复边沿',
      'TCK上升/下降时间应＜链路传播延迟的1/3',
      '加缓冲器或减少链路深度可提高最大TCK'
    ]
  },
  LC_Q_TOO_LOW: {
    category: 'signal',
    concept: 'LC谐振Q值',
    formula: 'Q = ω₀L / R_esr',
    articleRef: 'signal-001',
    tips: [
      'Q值决定选频能力，越高选择性越好',
      '线圈直流电阻和电容ESR是Q值的主要限制因素',
      '空芯线圈Q值可达100+，铁芯线圈Q值约20-50'
    ]
  },
  LA_UNDERSAMPLING: {
    category: 'debug',
    concept: '奈奎斯特采样定理',
    formula: 'fs ≥ 2 × f_signal',
    articleRef: 'debug-001',
    tips: [
      '采样率低于信号频率2倍会产生混叠(Aliasing)',
      '实际工程中建议5~10倍过采样以还原波形',
      '逻辑分析仪触发设置可帮助捕获关键事件'
    ]
  },
  LORA_DUTY_CYCLE_VIOLATION: {
    category: 'wireless',
    concept: 'LoRa占空比限制',
    articleRef: 'wireless-001',
    tips: [
      'EU868频段法规限制占空比≤1%',
      '空中时间越长，单小时允许发送次数越少',
      '降低SF(如SF7→SF5)可大幅缩短空中时间'
    ]
  },
  PCB_SUBSTRATE_EXTREME: {
    category: 'pcb',
    concept: 'PCB基板介电常数',
    articleRef: 'pcb-001',
    tips: [
      'FR4的εr约4.2~4.8，是标准选择',
      '高频(>1GHz)建议Rogers RO4350B(εr=3.48)',
      'εr随频率和温度变化，高速设计需考虑频散'
    ]
  },
  RF_CUTOFF_TOO_HIGH: {
    category: 'signal',
    concept: 'RC低通滤波器截止频率',
    formula: 'fc = 1 / (2πRC)',
    articleRef: 'signal-001',
    tips: [
      '截止频率应设置在信号频率和噪声频率之间',
      'fc过高时信号和噪声都能通过，无滤波效果',
      '阶数越高(多级RC)，过渡带越陡'
    ]
  },
  RS485_OVERLOADED: {
    category: 'comm',
    concept: 'RS-485总线负载',
    formula: 'UL_total = Σ(1/UL_n)',
    articleRef: 'comm-001',
    tips: [
      '标准RS-485收发器为1UL，最多32个节点',
      '1/8 UL收发器(如SN65HVD3088)可挂256个节点',
      '超过32 UL需加中继器分段'
    ]
  },
  SK_Q_TOO_LOW: {
    category: 'signal',
    concept: 'Sallen-Key滤波器Q值',
    articleRef: 'signal-001',
    tips: [
      'Q=0.707为Butterworth响应(最平坦通带)',
      'Q=0.5为Bessel响应(线性相位，过渡缓慢)',
      'Q过低时截止特性差，Q过高时通带波动大'
    ]
  },
  UART_LINE_TOO_LONG: {
    category: 'comm',
    concept: 'UART传输距离限制',
    articleRef: 'comm-001',
    tips: [
      'UART/TTL电平在PCB板上传输，不适合长距离',
      'RS-232电平(±12V)可传15m，RS-485可传1200m',
      '长距离通信建议转换为差分信号(RS-485/CAN)'
    ]
  },
  US_NOISE_INTERFERENCE: {
    category: 'sensor',
    concept: '超声波抗干扰',
    articleRef: 'sensor-001',
    tips: [
      '近距离回波强但多径反射干扰大',
      '多次采样取中值滤波可有效抑制随机噪声',
      '加温度补偿可消除声速变化引起的误差'
    ]
  },
  WIFI_TOO_MANY_WALLS: {
    category: 'wireless',
    concept: 'WiFi穿墙衰减',
    articleRef: 'wireless-001',
    tips: [
      '5GHz穿墙衰减大于2.4GHz但速率更高',
      '每面混凝土墙衰减约15dB，3面墙≈45dB',
      'Mesh组网或有线AP回程是解决穿墙的最佳方案'
    ]
  },
  // ── v2.1: 补全45个缺失错误的教学映射 ──
  ADC_INPUT_OVER_RANGE: {
    category: 'stm32',
    concept: 'ADC输入电压范围',
    formula: 'Vin ≤ Vref',
    articleRef: 'stm32-002',
    tips: [
      'ADC输入电压不得超过参考电压Vref',
      '超出范围时ADC饱和，输出恒为最大码值，无法分辨',
      '测量高电压时需用分压电阻将Vin降到Vref以内'
    ]
  },
  ADC_ACQ_TOO_SHORT: {
    category: 'stm32',
    concept: 'ADC采样保持时间',
    formula: 't_s ≥ k × (R_s + R_adc) × C_adc',
    articleRef: 'stm32-002',
    tips: [
      '高源阻抗时采样电容充电慢，需要更长的采样时间',
      'STM32 ADC内部采样电容约5pF，源阻抗>50kΩ时需增大采样周期',
      '降低源阻抗(加运放跟随器)比增加采样时间更有效'
    ]
  },
  ADC_LOW_RESOLUTION: {
    category: 'stm32',
    concept: 'ADC分辨率与量化误差',
    formula: 'SNR = 6.02N + 1.76 dB',
    articleRef: 'stm32-002',
    tips: [
      '8位ADC的LSB较大，量化误差显著',
      '每增加1位分辨率，SNR提升约6dB',
      '测量小信号时建议使用12位或16位ADC'
    ]
  },
  BLE_SIGNAL_TOO_WEAK: {
    category: 'wireless',
    concept: 'BLE接收灵敏度',
    articleRef: 'wireless-002',
    tips: [
      'BLE典型灵敏度为-90dBm，低于此值连接断开',
      '2.4GHz自由空间损耗随距离平方增长',
      '缩短通信距离或使用高增益天线可改善链路余量'
    ]
  },
  BTN_BOUNCING: {
    category: 'timing',
    concept: '按键机械抖动',
    articleRef: 'timing-002',
    tips: [
      '机械触点闭合/断开时会产生5~20ms的抖动',
      '无消抖时MCU会检测到多次虚假触发',
      '硬件RC滤波或软件延时是最常用的消抖方案'
    ]
  },
  BTN_RC_TOO_SMALL: {
    category: 'timing',
    concept: 'RC消抖时间常数',
    formula: 'τ = R × C',
    articleRef: 'timing-002',
    tips: [
      'RC时间常数必须大于抖动时间(通常20ms)',
      'τ太小无法滤除抖动，MCU仍会检测到多次触发',
      '典型值：R=10kΩ, C=1μF, τ=10ms'
    ]
  },
  BTN_SW_DELAY_SHORT: {
    category: 'timing',
    concept: '软件消抖延时',
    articleRef: 'timing-002',
    tips: [
      '软件消抖延时必须大于机械抖动时间',
      '通常取15~30ms，过短则消抖无效',
      '延时期间应屏蔽中断或使用状态机避免阻塞'
    ]
  },
  BUCK_HIGH_RIPPLE: {
    category: 'power',
    concept: 'Buck纹波电压',
    formula: 'ΔV = ΔI_L × ESR / 2',
    articleRef: 'power-002',
    tips: [
      '纹波过大通常因电感量不足或ESR过大',
      '增大电感量可降低电流纹波斜率',
      '低ESR陶瓷电容比电解电容纹波更小'
    ]
  },
  BUCK_DUTY_RANGE: {
    category: 'power',
    concept: 'Buck占空比限制',
    formula: 'D = Vout / Vin',
    articleRef: 'power-002',
    tips: [
      'Buck只能降压，Vout必须小于Vin',
      '占空比理论范围0~100%，实际受最小导通时间限制',
      '接近100%时需检查芯片是否支持100%占空比模式'
    ]
  },
  CC_SLOW_CHARGE: {
    category: 'timing',
    concept: 'RC充电时间常数',
    formula: 'τ = R × C, 5τ ≈ 完全充电',
    articleRef: 'timing-004',
    tips: [
      '时间常数τ=RC过大时，电容充电极慢',
      '5τ后电容充电达99%，工程上视为完全充电',
      '需要快速响应时应减小R或C'
    ]
  },
  DAC_FULLSCALE: {
    category: 'analog',
    concept: 'DAC满量程精度',
    formula: 'LSB = Vref / 2^N',
    articleRef: 'analog-004',
    tips: [
      '接近满量程时DAC的差分非线性(DNL)增大',
      '高位DAC在满量程附近精度下降明显',
      '建议工作在满量程的80%以内以获得最佳线性度'
    ]
  },
  ESD_VWM_TOO_LOW: {
    category: 'circuit',
    concept: 'TVS工作电压选型',
    formula: 'Vwm ≥ 1.25 × V_signal',
    articleRef: 'circuit-002',
    tips: [
      'TVS工作电压(Vwm)必须高于信号最高电压',
      'Vwm过低会导致正常信号被误钳位',
      '一般取Vwm ≥ 1.25倍最大工作电压'
    ]
  },
  ESD_VC_TOO_HIGH: {
    category: 'circuit',
    concept: 'TVS钳位电压',
    formula: 'Vc < V_max_rating',
    articleRef: 'circuit-002',
    tips: [
      '钳位电压(Vc)必须低于被保护器件的耐压',
      'Vc过高时ESD事件会击穿下游器件',
      '低钳位比(Vc/Vwm)的TVS保护效果更好'
    ]
  },
  LC_OFF_RESONANCE: {
    category: 'signal',
    concept: 'LC谐振频率匹配',
    formula: 'f₀ = 1 / (2π√LC)',
    articleRef: 'signal-002',
    tips: [
      '输入频率偏离谐振频率时信号被大幅衰减',
      'LC滤波器的通带宽度由Q值决定',
      '调整L或C使f₀对准目标信号频率'
    ]
  },
  LDO_DROPOUT: {
    category: 'power',
    concept: 'LDO压差',
    formula: 'Vdropout = Vin - Vout',
    articleRef: 'power-003',
    tips: [
      'LDO需要Vin - Vout > 压差(Vdropout)才能正常稳压',
      '压差不足时输出跟随输入下降，失去稳压功能',
      '低压差LDO(LDO)的dropout可低至100mV'
    ]
  },
  LDO_THERMAL: {
    category: 'power',
    concept: 'LDO热设计',
    formula: 'P_loss = (Vin - Vout) × I_load, Tj = Ta + P × θja',
    articleRef: 'power-003',
    tips: [
      'LDO功耗全部转化为热量：P=(Vin-Vout)×I',
      '结温Tj超过125°C会触发热关断保护',
      '增大散热铜面积或降低压差可减少发热'
    ]
  },
  MOS_VGS_BELOW_VTH: {
    category: 'circuit',
    concept: 'MOSFET导通阈值',
    formula: 'Vgs > Vth (导通条件)',
    articleRef: 'circuit-003',
    tips: [
      'Vgs低于阈值电压Vth时MOSFET不导通',
      '逻辑级MOSFET的Vth约1~2V，功率MOSFET约2~4V',
      '驱动电压应留有余量：Vgs ≥ Vth + 2V确保完全导通'
    ]
  },
  MOS_LINEAR_REGION: {
    category: 'circuit',
    concept: 'MOSFET工作区',
    articleRef: 'circuit-003',
    tips: [
      'Vds < Vgs - Vth时MOSFET工作在线性区(可变电阻区)',
      '线性区导通电阻大，功耗高，发热严重',
      '开关应用应确保Vgs足够大使MOSFET进入欧姆区'
    ]
  },
  MOS_POWER_HIGH: {
    category: 'circuit',
    concept: 'MOSFET功耗限制',
    formula: 'P = I² × Rds(on)',
    articleRef: 'circuit-003',
    tips: [
      'MOSFET导通功耗P=I²×Rds(on)，电流越大功耗越高',
      'Rds(on)随温度升高而增大，形成热失控正反馈',
      '选用低Rds(on)的MOSFET或加散热片降低结温'
    ]
  },
  NTC_ADC_SATURATION: {
    category: 'sensor',
    concept: 'NTC测温ADC饱和',
    articleRef: 'sensor-001',
    tips: [
      '低温时NTC阻值很大，分压输出接近Vref导致ADC饱和',
      '调整分压电阻或改用反向分压可避免饱和',
      'ADC饱和后温度读数固定为最大值，失去分辨能力'
    ]
  },
  NTC_ADC_LOW: {
    category: 'sensor',
    concept: 'NTC测温ADC过低',
    articleRef: 'sensor-001',
    tips: [
      '高温时NTC阻值很小，分压输出接近0V导致ADC读数过低',
      '增大分压电阻或改用恒流源驱动可改善',
      'ADC读数过低时量化误差占比增大，精度下降'
    ]
  },
  OA_CHATTERING: {
    category: 'analog',
    concept: '比较器抖动(Chattering)',
    articleRef: 'analog-003',
    tips: [
      '无迟滞的比较器在输入接近阈值时会高速翻转',
      '噪声导致输出在0/1之间反复跳变(chattering)',
      '加入正反馈迟滞(3~50mV)可消除抖动'
    ]
  },
  OA_NO_PULLUP: {
    category: 'analog',
    concept: '开漏输出上拉',
    articleRef: 'analog-003',
    tips: [
      '开漏输出比较器只能拉低，需要外部上拉电阻',
      '无上拉时输出悬空，后续电路读到的电平不确定',
      '上拉电阻 typically 4.7kΩ~10kΩ'
    ]
  },
  PCB_IMP_MISMATCH: {
    category: 'pcb',
    concept: 'PCB阻抗匹配',
    formula: 'Z₀ = 87/√(εr+1.41) × ln(5.98H/(0.8W+T))',
    articleRef: 'pcb-001',
    tips: [
      '阻抗偏差>10%会导致信号反射，眼图劣化',
      '微带线阻抗由线宽W、介质厚度H、εr共同决定',
      '使用阻抗计算器或SI仿真工具精确设计'
    ]
  },
  PCB_RETURN_PATH_LONG: {
    category: 'pcb',
    concept: '回流路径设计',
    articleRef: 'pcb-002',
    tips: [
      '信号回流路径过长会增大电流环路面积',
      '环路面积越大，EMI辐射越强',
      '高速信号下方应保持完整地平面提供低阻抗回流路径'
    ]
  },
  PCB_GROUND_SPLIT: {
    category: 'pcb',
    concept: '地平面分割',
    articleRef: 'pcb-002',
    tips: [
      '地平面分割会在回流路径上形成"孤岛"',
      '信号跨越分割缝隙时回路面积暴增，EMI严重',
      '如必须分割，应在跨越处加桥接电容或保持缝下方无高速信号'
    ]
  },
  PCB_EMI_EXCEED: {
    category: 'pcb',
    concept: 'EMI辐射控制',
    articleRef: 'pcb-002',
    tips: [
      'EMI超标通常因环路面积过大或回流路径不连续',
      '减少信号上升沿速率可降低高频辐射',
      '屏蔽罩和吸收材料是最后的补救手段'
    ]
  },
  PHOTO_ADC_SATURATION: {
    category: 'sensor',
    concept: '光敏电阻ADC饱和',
    articleRef: 'sensor-002',
    tips: [
      '强光时光敏电阻阻值很小，分压输出接近Vref导致ADC饱和',
      '调整分压电阻或减小上拉可避免饱和',
      'ADC饱和后光强读数固定为最大值，无法分辨亮度变化'
    ]
  },
  PHOTO_ADC_LOW: {
    category: 'sensor',
    concept: '光敏电阻ADC过低',
    articleRef: 'sensor-002',
    tips: [
      '暗环境时光敏电阻阻值很大，分压输出接近0V',
      '增大上拉电阻或改用反向分压电路可改善',
      'ADC读数过低时量化误差占比大，暗光精度差'
    ]
  },
  PROBE_UNDER_COMPENSATION: {
    category: 'debug',
    concept: '示波器探头欠补偿',
    articleRef: 'debug-002',
    tips: [
      '欠补偿时方波上升沿变圆，高频被衰减',
      '调节探头补偿电容使方波顶部平坦',
      '10x探头带宽更高但需要正确补偿'
    ]
  },
  PROBE_OVER_COMPENSATION: {
    category: 'debug',
    concept: '示波器探头过补偿',
    articleRef: 'debug-002',
    tips: [
      '过补偿时方波上升沿出现尖峰(overshoot)',
      '高频被放大导致测量波形失真',
      '用标准方波校准信号调节补偿电容至平坦响应'
    ]
  },
  RELAY_FLYBACK_SPIKE: {
    category: 'power',
    concept: '继电器续流保护',
    formula: 'V_spike = -L × (dI/dt)',
    articleRef: 'power-004',
    tips: [
      '继电器线圈断电时电感产生反向高压尖峰',
      'V = -L×(dI/dt)，断电瞬间dI/dt极大，尖峰可达数百伏',
      '续流二极管(1N4148)反向并联在线圈两端可吸收尖峰'
    ]
  },
  RELAY_OVERCURRENT: {
    category: 'power',
    concept: '继电器线圈驱动电流',
    articleRef: 'power-004',
    tips: [
      '线圈电流超过驱动管额定值会烧毁三极管/MOSFET',
      '计算线圈电流I = Vcc / R_coil，确保驱动管Id/Ic有余量',
      '大功率继电器需要用三极管+MOSFET两级驱动'
    ]
  },
  RF_NOT_FILTERING: {
    category: 'signal',
    concept: 'RC滤波器截止频率',
    formula: 'fc = 1 / (2πRC)',
    articleRef: 'signal-001',
    tips: [
      '截止频率设置过高时噪声和信号都能通过',
      'fc应设置在信号最高频率和噪声最低频率之间',
      '增大R或C可降低截止频率，增强滤波效果'
    ]
  },
  SK_Q_TOO_HIGH: {
    category: 'signal',
    concept: 'Sallen-Key Q值过高',
    formula: 'Q = 1/(3 - gain)',
    articleRef: 'signal-003',
    tips: [
      'Q值过高会在截止频率附近产生谐振峰',
      '谐振峰导致通带内出现增益隆起，信号失真',
      'Q>2时可能自激振荡，Butterworth响应Q=0.707最平坦'
    ]
  },
  SPI_MODE_MISMATCH: {
    category: 'debug',
    concept: 'SPI极性/相位模式',
    articleRef: 'debug-001',
    tips: [
      'CPOL(时钟极性)和CPHA(时钟相位)4种组合定义4种SPI模式',
      '主从设备模式不一致会导致数据采样错位',
      '用逻辑分析仪查看时序，确认采样沿在数据稳定期中间'
    ]
  },
  TIMER_RA_ZERO: {
    category: 'timing',
    concept: '555定时器Ra电阻',
    formula: 'f = 1.44 / ((Ra + 2Rb) × C)',
    articleRef: 'timing-003',
    tips: [
      'Ra=0时充电时间极短，频率飙升超出器件极限',
      'Ra还限制放电管电流，过小会损坏芯片',
      '建议Ra ≥ 1kΩ以保护内部放电管'
    ]
  },
  TIMER_FREQ_HIGH: {
    category: 'timing',
    concept: '555定时器频率限制',
    articleRef: 'timing-003',
    tips: [
      '555定时器最高频率约500kHz(NE555)，超出后波形失真',
      '高频时传播延迟和上升时间不可忽略',
      'CML/TTL高速定时器(如LMC555)可达3MHz'
    ]
  },
  TIMER_DUTY_HIGH: {
    category: 'timing',
    concept: '555定时器占空比',
    formula: 'D = (Ra + Rb) / (Ra + 2Rb)',
    articleRef: 'timing-003',
    tips: [
      '无稳态模式下占空比始终>50%(充电时间>放电时间)',
      '要实现<50%占空比需加二极管旁路Ra',
      'D = (Ra+Rb)/(Ra+2Rb)，Ra越大占空比越高'
    ]
  },
  TS_BASE_OVERCURRENT: {
    category: 'circuit',
    concept: '三极管基极电流限制',
    formula: 'Ib = (Vcc - 0.7) / Rb',
    articleRef: 'circuit-001',
    tips: [
      '基极电流过大烧毁发射结，Ib应<数据手册最大值',
      '基极限流电阻Rb = (Vcc - Vbe) / Ib',
      '饱和区Ib = Ic / hFE(min)，留2~5倍余量'
    ]
  },
  TS_COLLECTOR_OVERCURRENT: {
    category: 'circuit',
    concept: '三极管集电极电流限制',
    articleRef: 'circuit-001',
    tips: [
      '集电极电流超过最大额定值会烧毁三极管',
      '查阅数据手册的Ic(max)并留有降额余量(70%)',
      '大电流负载应使用功率三极管或MOSFET替代'
    ]
  },
  TS_POWER_DISSIPATION: {
    category: 'circuit',
    concept: '三极管功耗',
    formula: 'P = Vce × Ic',
    articleRef: 'circuit-001',
    tips: [
      '线性区功耗P=Vce×Ic，热量集中在芯片结上',
      'Tj = Ta + P × θja，超过150°C会损坏',
      '开关应用应确保快速通过线性区(导通/截止切换)'
    ]
  },
  UART_BAUD_MISMATCH: {
    category: 'comm',
    concept: 'UART波特率匹配',
    articleRef: 'comm-002',
    tips: [
      '收发双方波特率不一致会导致采样点错位，数据乱码',
      '误差>3%时开始出错，>5%时严重乱码',
      '使用常用波特率(9600/115200)可减少晶振分频误差'
    ]
  },
  WIFI_MARGIN_LOW: {
    category: 'wireless',
    concept: 'WiFi链路余量',
    articleRef: 'wireless-001',
    tips: [
      '链路余量<10dB时连接不稳定，容易丢包断连',
      '余量=接收功率-灵敏度，余量越大抗干扰能力越强',
      '增加发射功率、减少距离或换高增益天线可提升余量'
    ]
  },
  WIFI_SIGNAL_TOO_WEAK: {
    category: 'wireless',
    concept: 'WiFi接收灵敏度',
    articleRef: 'wireless-001',
    tips: [
      'RSSI低于接收灵敏度时无法解调信号',
      '2.4GHz典型灵敏度为-75dBm(11Mbps)',
      '穿墙、距离、干扰都会导致RSSI下降'
    ]
  },
  // ── v2.1: v1.8新增实验的错误映射 ──
  DMA_FIFO_OVERFLOW: {
    category: 'stm32',
    concept: 'DMA FIFO溢出',
    articleRef: 'stm32-003',
    tips: [
      '突发传输大小不能超过FIFO深度',
      'FIFO溢出会导致数据丢失，搬运结果不完整',
      '降低突发长度或增大FIFO深度可解决'
    ]
  },
  DP_IMPEDANCE_MISMATCH: {
    category: 'pcb',
    concept: '差分阻抗匹配',
    formula: 'Z_diff = 2×Z₀×(1 - 0.48×e^(-0.96×S/H))',
    articleRef: 'pcb-003',
    tips: [
      '差分阻抗偏差>10%会导致信号反射和模态转换',
      '差分阻抗由线宽W、间距S、介质厚度H共同决定',
      'USB3.0要求90Ω差分，HDMI要求100Ω差分'
    ]
  },
  DP_SKEW_TOO_LARGE: {
    category: 'pcb',
    concept: '差分对等长控制',
    articleRef: 'pcb-003',
    tips: [
      '差分对长度失配产生时序偏斜，影响建立/保持时间',
      '高速信号(>1GHz)要求偏斜<10ps',
      '蛇形走线补偿是最常用的等长调整方法'
    ]
  },
  DP_GAP_TOO_SMALL: {
    category: 'pcb',
    concept: '差分对线间距',
    articleRef: 'pcb-003',
    tips: [
      '间距<3W时差分对间耦合过强，单端阻抗下降',
      '间距太小增加制造难度，蚀刻容差敏感',
      '建议间距 ≥ 3倍线宽(3W规则)'
    ]
  },
  JTAG_NO_PULLUP: {
    category: 'debug',
    concept: 'JTAG上拉电阻',
    articleRef: 'debug-001',
    tips: [
      'TMS/TDI无上拉时浮空电平随机跳变，TAP状态机失控',
      'TAP控制器状态机不稳定导致扫描结果不可靠',
      'TMS/TDI/TDO必须加10kΩ上拉到VDD'
    ]
  },
  JTAG_SIGNAL_INTEGRITY: {
    category: 'debug',
    concept: 'TCK信号完整性',
    articleRef: 'debug-001',
    tips: [
      'TCK频率过高时上升/下降沿退化，建立/保持时间违例',
      '信号完整性差导致边界扫描数据错误',
      '降低TCK频率或改善走线(等长、阻抗匹配、减少过孔)'
    ]
  },
  JTAG_CHAIN_TOO_LONG: {
    category: 'debug',
    concept: 'JTAG扫描链长度',
    articleRef: 'debug-001',
    tips: [
      '扫描链过长时TDO传播延迟累积超过TCK周期',
      '多器件级联时延迟逐级叠加',
      '降低TCK频率或分割扫描链'
    ]
  },
  LORA_LINK_FAIL: {
    category: 'wireless',
    concept: 'LoRa链路预算',
    formula: 'Link Budget = Pt + Gt + Gr - Sensitivity',
    articleRef: 'wireless-003',
    tips: [
      'RSSI低于灵敏度时通信失败',
      '增大SF(扩频因子)可提升灵敏度但降低速率',
      '链路余量<0dB无法通信，建议>10dB保证可靠性'
    ]
  },
  LORA_AIR_TIME_TOO_LONG: {
    category: 'wireless',
    concept: 'LoRa空中时间与占空比',
    articleRef: 'wireless-003',
    tips: [
      '高SF+大payload导致空中时间过长',
      'EU 868MHz频段占空比限制1%，每小时最多36s发射',
      '降低SF或减小payload可缩短空中时间'
    ]
  },
  LORA_SF_BW_MISMATCH: {
    category: 'wireless',
    concept: 'LoRa SF/BW组合',
    articleRef: 'wireless-003',
    tips: [
      '高SF应配低BW以获得最大灵敏度',
      'SF12+125kHz可覆盖15km+但速率极低',
      'SF7+250kHz适合高速短距通信'
    ]
  },
  US_OUT_OF_RANGE: {
    category: 'sensor',
    concept: '超声波测距量程',
    articleRef: 'sensor-003',
    tips: [
      'HC-SR04量程2cm~400cm，超出范围无法检测',
      '距离太近时回波太快，MCU来不及捕获',
      '距离太远时回波衰减过大，检测不到'
    ]
  },
  US_WEAK_ECHO: {
    category: 'sensor',
    concept: '超声波回波强度',
    articleRef: 'sensor-003',
    tips: [
      '软质材料、倾斜面、网格状物会大量吸收超声波',
      '反射率低于检测阈值时无法检测回波',
      '更换为硬质平面或缩短距离可改善'
    ]
  },
  US_TEMP_DRIFT: {
    category: 'sensor',
    concept: '超声波温度补偿',
    formula: 'v = 331.3 + 0.606 × T (m/s)',
    articleRef: 'sensor-003',
    tips: [
      '声速随温度变化：v=331.3+0.606×T m/s',
      '假设固定343m/s(20°C)在不同温度下产生测距偏差',
      '加入温度传感器实时补偿声速可消除漂移'
    ]
  },
  I2C_NACK: {
    category: 'comm',
    concept: 'I2C NACK应答',
    articleRef: 'comm-001',
    tips: [
      'NACK表示从机未响应，可能原因：设备未连接、地址错误、设备忙',
      'I2C协议要求每字节后从机拉低SDA发送ACK确认',
      '检查设备地址(7bit)、上拉电阻(4.7kΩ)、供电是否正常'
    ]
  },
  RS485_NO_TERMINATION: {
    category: 'comm',
    concept: 'RS-485终端电阻',
    articleRef: 'comm-002',
    tips: [
      'RS-485总线两端必须各加120Ω终端电阻',
      '无终端电阻时信号在末端反射，产生振铃',
      '终端电阻匹配线缆特性阻抗(120Ω双绞线)'
    ]
  },
  RS485_CABLE_TOO_LONG: {
    category: 'comm',
    concept: 'RS-485线缆长度限制',
    articleRef: 'comm-002',
    tips: [
      '线缆最大长度与波特率成反比：9600bps可传1200m，115200bps约100m',
      '降低波特率可延长传输距离',
      '使用低电容双绞线可改善信号质量'
    ]
  },
  RS485_TOO_MANY_NODES: {
    category: 'comm',
    concept: 'RS-485节点负载',
    articleRef: 'comm-002',
    tips: [
      '标准RS-485最多支持32个单位负载(UL)',
      '使用1/4UL或1/8UL收发器可增加节点数至128/256个',
      '总线上拉/下拉偏置电阻确保总线空闲电平确定'
    ]
  }
}

export class ErrorDetector {
  /**
   * 检测仿真结果中的错误并生成教学反馈
   * @param {Object} simResult - simulator.simulate() 的返回值
   * @returns {Array} 错误反馈数组
   */
  detect(simResult) {
    const feedbacks = []

    for (const error of simResult.errors) {
      const tutorial = errorTutorialMap[error.type]
      const feedback = {
        type: error.type,
        componentId: error.componentId,
        title: error.title,
        explanation: error.explanation,
        animation: error.animation || null,
        current: error.current,
        tutorial: tutorial ? {
          category: tutorial.category,
          concept: tutorial.concept,
          formula: tutorial.formula || null,
          articleRef: tutorial.articleRef,
          tips: tutorial.tips
        } : null
      }
      feedbacks.push(feedback)
    }

    return feedbacks
  }

  /**
   * 检查是否触发了特定错误
   */
  hasError(feedbacks, errorType) {
    return feedbacks.some(f => f.type === errorType)
  }

  /**
   * 获取第一个错误的完整教学信息
   */
  getFirstTutorial(feedbacks) {
    if (feedbacks.length === 0) return null
    return feedbacks[0].tutorial
  }
}

export { errorTutorialMap }
