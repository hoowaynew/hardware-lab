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
