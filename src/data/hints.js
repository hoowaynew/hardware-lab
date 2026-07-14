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
  'pcb-trace': [
    '50Ω阻抗需要特定的线宽和介质厚度组合',
    '微带线Z0≈87/√(εr+1.41)×ln(5.98H/(0.8W+T))，εr=4.4(FR4)',
    '答案：JLC04161H板厚0.1mm时，50Ω线宽≈0.2mm；板厚0.2mm时线宽≈0.38mm'
  ],
  'wifi-attenuation': [
    '链路预算：发射功率减去路径损耗和障碍衰减等于接收功率',
    'FSPL(dB)=20log10(d)+20log10(f_MHz)+32.44，RSSI=TxPower-FSPL-WallLoss',
    '答案：2.4GHz 10米 FSPL≈60dB，穿1墙(-8dB)，TxPower=20dBm → RSSI=20-60-8=-48dBm(优秀)'
  ],
  'logic-analyzer-debug': [
    'SPI通信需要主从CPOL/CPHA一致',
    'Mode0: CPOL=0(空闲低) CPHA=0(第一个上升沿采样)',
    '答案：主机Mode0 → 从机也必须Mode0。CS拉低→发8个时钟周期→CS拉高'
  ]
}
