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
