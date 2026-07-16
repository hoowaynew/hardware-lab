/**
 * 每个实验的渐进提示（3级：思路点拨 → 公式提示 → 答案揭晓）
 */

export const hintsData = {
  'led-resistor': [
    '先想想LED需要多少电流，然后计算电阻要承担多少电压',
    'R = (Vcc - Vf) / If，其中Vf是LED正向压降，If是期望电流',
    '答案是：R = (5V - 2V) / 0.01A = 300Ω，选最接近的标准值330Ω'
  ],
  'gpio-modes': [
    '按键检测需要稳定的电平，浮空输入会随机跳变',
    '上拉输入：按键一端接GPIO，另一端接地。按下时GPIO变低',
    '答案：选择「上拉输入」模式，按键按下读到低电平(0)'
  ],
  'pwm-tuner': [
    '舵机需要特定频率的PWM信号才能工作',
    '舵机控制：50Hz(20ms周期)，脉宽0.5~2.5ms对应0~180°',
    '答案：频率设50Hz，占空比5%~12.5%对应0°~180°'
  ],
  'voltage-divider': [
    'STM32 ADC最大输入3.3V，电池电压超过了需要分压',
    'Vout = Vin × R2/(R1+R2)，要让Vout ≤ 3.3V',
    '答案：R1=10kΩ R2=10kΩ，分压比0.5，12V→6V(仍超)，换R1=30kΩ R2=10kΩ，12V→3V ✓'
  ],
  'capacitor-charge': [
    '充电速度由时间常数τ=RC决定',
    '1τ充到63%，3τ充到95%，5τ基本充满',
    '答案：R=10kΩ C=100μF → τ=1秒，充满约需5秒(5τ)'
  ],
  'transistor-switch': [
    '开关工作在饱和区，需要足够的基极电流',
    '先算Ic_sat=(Vcc-Vce_sat)/Rc，再算Ib_min=Ic_sat/β，实际Ib取2~5倍',
    '答案：Ic_sat≈(5-0.2)/1k=4.8mA，Ib_min=4.8/100=48μA，取5倍=240μA，Rb=(5-0.7)/240μA≈18kΩ'
  ],
  'rc-filter': [
    '截止频率fc是增益下降到0.707(-3dB)的频率点',
    'fc = 1/(2πRC)，要让高于fc的信号被衰减',
    '答案：要滤除1kHz以上噪声，fc设1kHz：R=1.6kΩ C=100nF → fc≈1kHz'
  ],
  'i2c-signal': [
    'I2C通信由START信号开始，STOP信号结束',
    'START: SCL高时SDA下降沿；数据在SCL低时改变，高时采样',
    '答案：依次发送 START → 地址帧(7位+R/W) → ACK → 数据帧(8位) → ACK → STOP'
  ],
  'ntc-thermistor': [
    'NTC温度升高阻值降低，分压输出会变化',
    'Vout=Vcc×Rntc/(Rpullup+Rntc)，ADC=Vout/Vcc×4095(12位)',
    '答案：25°C时Rntc=10kΩ=Rpullup，Vout=1.65V，ADC≈2048；85°C时Rntc≈1.4kΩ，Vout≈0.41V，ADC≈512'
  ],
  'pcb-trace-impedance': [
    '50Ω阻抗需要特定的线宽和介质厚度组合',
    '微带线Z0≈87/√(εr+1.41)×ln(5.98H/(0.8W+T))，εr=4.4(FR4)',
    '答案：JLC04161H板厚0.1mm时，50Ω线宽≈0.2mm；板厚0.2mm时线宽≈0.38mm'
  ],
  'wifi-signal-attenuation': [
    '链路预算：发射功率减去路径损耗和障碍衰减等于接收功率',
    'FSPL(dB)=20log10(d)+20log10(f_MHz)+32.44，RSSI=TxPower-FSPL-WallLoss',
    '答案：2.4GHz 10米 FSPL≈60dB，穿1墙(-8dB)，TxPower=20dBm → RSSI=20-60-8=-48dBm(优秀)'
  ],
  'logic-analyzer-debug': [
    'SPI通信需要主从CPOL/CPHA一致',
    'Mode0: CPOL=0(空闲低) CPHA=0(第一个上升沿采样)',
    '答案：主机Mode0 → 从机也必须Mode0。CS拉低→发8个时钟周期→CS拉高'
  ],
  'dcdc-buck': [
    'Buck的输出电压由占空比决定',
    'Vout = Vin × D，12V→5V需要D≈42%；纹波ΔIL=Vin×D×(1-D)/(L×f)',
    '答案：D=42%，L=22μH，f=500kHz时纹波≈280mA，纹波比<30% ✓'
  ],
  'opamp-comparator': [
    '比较器输出由V+和V−的大小关系决定，但输入接近时容易抖动',
    '加入迟滞(正反馈)可消除抖动，迟滞宽度=Rf/(R1+Rf)×ΔVout',
    '答案：设置50-100mV迟滞，V+>V−时输出高电平报警，消抖成功'
  ],
  'button-debounce': [
    '机械按键有5-20ms抖动，需要硬件或软件消抖',
    'RC消抖: τ=RC > 抖动时间；软件消抖: delay(20ms)后再次读取',
    '答案：选RC消抖 R=10kΩ C=1μF(τ=10ms>抖动)，或软件消抖delay=20ms'
  ],

  'ldo-regulator': [
    'LDO的功耗全部变成热量，想想P=(Vin-Vout)×Iload',
    '结温Tj=环境温度+P×θJA，超过125°C就热关断',
    '答案：5V→3.3V/300mA，P=(5-3.3)×0.3=0.51W，θJA=65°C/W → Tj=25+0.51×65=58°C ✓'
  ],

  'timer-555': [
    '555无稳态频率由Ra、Rb、C决定',
    'f=1.44/((Ra+2Rb)×C)，占空比D=(Ra+Rb)/(Ra+2Rb)',
    '答案：Ra=10kΩ Rb=47kΩ C=10nF → f≈1.06kHz，D≈56%，接近1kHz目标 ✓'
  ],

  'esd-protection': [
    'TVS工作电压Vwm必须大于信号最高电压，否则正常工作时就导通',
    '钳位电压Vc越低越好，Vc/Vwm比值应<3',
    '答案：3.3V信号线选Vwm=5V TVS，Vc=9.8V → 钳位比1.96× < 3 ✓，芯片IO耐压6.6V < Vc=9.8V需更低Vc'
  ],

  'uart-signal': [
    'UART没有时钟线，收发必须用相同波特率',
    '帧格式：START(低) → D0~D7(LSB先) → [校验] → STOP(高)',
    '答案：选波特率9600，关闭波特率不匹配，发送0x55(01010101) → 接收端正确解码 ✓'
  ],

  'photoresistor': [
    '光敏电阻亮阻小暗阻大，上拉电阻要选在两者几何平均附近',
    'Rpullup ≈ √(Rdark × Rlight)，使ADC在量程中段',
    '答案：Rdark=1MΩ，亮阻约500Ω，Rpullup=10kΩ → 室内100lux ADC约50% ✓'
  ],

  'lc-bandpass': [
    '中心频率f₀ = 1/(2π√LC)，调L或C改变通过频率',
    'Q = ω₀L/R，R越小Q越高选择性越好',
    '答案：L=100μH C=100nF → f₀≈50.3kHz，调输入频率=50.3kHz，增益接近1 ✓'
  ],

  'mosfet-switch': [
    'MOSFET需要Vgs超过阈值电压Vth才能导通，想想Vgs够不够',
    '完全增强需要Vgs > Vth+2V；功耗 P = Id²×Rds(on)',
    '答案：Vgs=5V > Vth(2.5V)+2V → 完全增强，Rds(on)=25mΩ，Id=12V/10Ω≈1.2A，P=0.036W ✓'
  ],

  'relay-driver': [
    '电感负载断电时会产生反电动势，想想怎么泄放这个能量',
    '续流二极管反向并联在线圈两端，断电时提供泄放回路',
    '答案：开启续流二极管，断电时尖峰仅0.7V(二极管压降)，驱动管安全 ✓'
  ],

  'r2r-dac': [
    'R-2R网络每位权重翻倍，想想数字输入10对应什么电压',
    'Vout = Vref × D / 2^n，4位时2^4=16',
    '答案：Vref=3.3V，D=10，Vout=3.3×10/16=2.0625V ✓'
  ],
  'adc-sampling': [
    '想想12位ADC在Vref=3.3V下，一个LSB是多少mV',
    'LSB = Vref / 2^N = 3.3 / 4096 ≈ 0.806mV，量化误差±0.4mV',
    '注意输入不能超Vref，采样时间要足够长让电容充满'
  ],
  'pcb-ground-loop': [
    '高频回流走最小电感路径，地平面完整时回流紧贴信号线下方',
    'EMI ∝ f² × A_loop，地平面开槽会增大环路面积',
    '答案：保持地平面完整(solid)，不开槽不分割，EMI最小'
  ],
  'oscilloscope-probe': [
    '正确补偿时R1C1=R2C2，方波平顶完全平坦',
    '补偿系数<1是欠补偿(圆角)，>1是过补偿(尖峰)',
    '答案：设补偿系数=1.0，衰减比10x，方波平顶无失真 ✓'
  ],
  'ble-link-budget': [
    '想想RSSI=TxPower-FSPL-障碍损耗，算一下5m空旷的RSSI',
    'FSPL(5m,2402MHz)=20log5+20log2402+27.55≈40dB',
    '答案：RSSI=0-40-0=-40dBm，余量50dB，信号极佳 ✓'
  ],
  'rs485-bus': [
    'RS-485两端必须有120Ω终端电阻，没终端就反射',
    '最大长度≈10⁷/波特率，115200bps下约87m',
    '答案：加终端电阻，选115.2kbps，30m线缆，信号良好 ✓'
  ],
  'sallen-key-filter': [
    'Butterworth最平坦响应的Q值是多少？',
    'Q=0.707，K=3-1/Q=3-1.414=1.586',
    '答案：设Q=0.707，fc=1/(2π×10k×10nF)≈1.59kHz ✓'
  ],
  'dma-transfer': [
    'CPU轮询每字节约20周期，256字节=5120周期，72MHz下≈71μs',
    'DMA突发4×8bit=4B/次，64次突发×6周期=384周期≈5.3μs',
    '答案：选DMA+突发4，传输时间≈5.3μs，CPU占用0% ✓'
  ],
  'ultrasonic-hc-sr04': [
    '声速v=331.3+0.606×20=343.4m/s，d=50cm时t=2×0.5/343.4≈2.9ms',
    '20°C用343m/s假设刚好，但温度变到40°C时v=355.4m/s，偏差≈3.5%',
    '答案：目标50cm+20°C+硬质平面，回波2.9ms，测距50cm无误差 ✓'
  ],
  'diff-pair-routing': [
    '先算Z₀=87/√(4.3+1.41)×ln(5.98×0.5/(0.8×0.15+0.035))≈67Ω',
    'Z_diff=2×67×(1-0.48×e^(-0.96×0.15/0.5))≈100Ω，刚好匹配！',
    '答案：W=0.15mm S=0.15mm H=0.5mm → Z_diff≈100Ω，Skew=0 ✓'
  ],
  'lora-link-budget': [
    'SF7+125kHz: Ts=128/125=1.024ms，20字节负载空中时间约56ms',
    '链路余量=14-TxPathLoss-(-126)，5km@868MHz FSPL≈105dB',
    '答案：SF7+125kHz+14dBm，5km余量约7dB，空中时间56ms ✓'
  ],
  'jtag-boundary-scan': [
    'EXTEST模式覆盖率95%，1器件128b边界寄存器，TCK=10MHz',
    '扫描周期=(5+4)+(5+128)=142 TCK=14.2μs',
    '答案：EXTEST+10MHz+上拉，检测244/256故障(95%)，无错误 ✓'
  ]
}
