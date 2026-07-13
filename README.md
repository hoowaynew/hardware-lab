# 硬件实验室 - 互动电路实验 H5

> 把电路仿真引擎变成每篇科普文章的"可玩文末实验"，读者看完文章直接上手操作，犯错即触发教学反馈。

## 快速开始

```bash
npm install
npm run dev      # 开发服务器 http://localhost:5180
npm run build    # 构建到 dist/
npm run preview  # 预览构建结果
```

## 三个旗舰实验

| 实验 | 分类 | 交互 | 错误触发 |
|------|------|------|----------|
| LED限流电阻计算器 | power | 点击切换电阻值 | 选<65Ω → 烧毁+冒烟+教学弹窗 |
| GPIO八种模式配置器 | stm32 | 8模式切换+电平控制 | 浮空输入→波形抖动 / 推挽接地→短路 |
| PWM占空比可视化调音台 | timing | 频率/占空比滑块+负载切换 | 舵机非50Hz→不响应 / 100%占空比→不动 |

## 架构

```
engine/           仿真引擎核心
  topology.js     拓扑解析（DFS连通性+路径查找）
  simulator.js    行为规则引擎（元件行为+电流计算）
  error-detector.js  错误检测+教程索引匹配
  components/     元件行为定义
experiments/      实验配置（JSON驱动，无需写代码）
components/       Vue3 UI组件
  CircuitCanvas.vue     SVG电路画布
  ComponentShape.vue    元件形状渲染
  WaveformView.vue      波形示波器
  InteractionPanel.vue  交互控件
  ErrorPopup.vue        错误教学弹窗
  SmokeAnimation.vue    烧毁冒烟动画
  PwmLoadView.vue       PWM负载可视化
stores/           Pinia状态管理
  experiment.js   实验状态+仿真调度
  progress.js     进度持久化(localStorage)
```

## 嵌入公众号文章

在文章 HTML 末尾添加 iframe：

```html
<iframe src="https://[域名]/lab/?embed=true"
        style="width:100%;height:500px;border:none;border-radius:8px;"
        scrolling="no">
</iframe>
```

## 新增实验

只需在 `src/experiments/` 下新建 JSON 文件，无需写代码：

```json
{
  "id": "新实验ID",
  "title": "实验标题",
  "canvas": { "components": [...], "wires": [...] },
  "interactions": [...],
  "error_triggers": [...]
}
```

## 技术栈

Vue 3 + Vite + Pinia + SVG，纯前端无后端依赖。
