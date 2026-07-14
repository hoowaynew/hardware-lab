# 硬件实验室 - 互动电路实验 H5

> 把电路仿真引擎变成每篇科普文章的"可玩文末实验"，读者看完文章直接上手操作，犯错即触发教学反馈。

🌐 **线上地址**: https://hardware-lab.pages.dev

## 快速开始

```bash
npm install
npm run dev      # 开发服务器 http://localhost:5180
npm run build    # 构建到 dist/
npm run preview  # 预览构建结果
```

## 12个实验 · 11大分类

| # | 实验 | 分类 | 难度 | 交互 | 错误触发 |
|---|------|------|------|------|----------|
| 1 | LED限流电阻计算器 | ⚡ 电源 | 🟢 入门 | 点击切换电阻值 | 选<65Ω → 烧毁+冒烟+教学弹窗 |
| 2 | GPIO八种模式配置器 | 📋 STM32 | 🟢 入门 | 8模式切换+电平控制 | 浮空输入→波形抖动 / 推挽接地→短路 |
| 3 | PWM占空比可视化调音台 | ⏱️ 定时 | 🟢 入门 | 频率/占空比滑块+负载切换 | 舵机非50Hz→不响应 / 100%占空比→不动 |
| 4 | 分压器计算器 | 📊 模拟 | 🟡 进阶 | R1/R2/Vin滑块 | Vout超出ADC量程 → 警告 |
| 5 | 电容充放电时间常数 | 📊 模拟 | 🟡 进阶 | R/C滑块+充放电切换 | τ过大→充不满 / τ过小→闪烁 |
| 6 | 三极管开关驱动 | 🔌 电路 | 🟡 进阶 | Ib滑块+负载切换 | Ib不足→不饱和 / Ib过大→烧基极 |
| 7 | RC低通滤波器 | 〰️ 信号 | 🟡 进阶 | R/C/频率滑块 | 截止频率不对 → 衰减不够 |
| 8 | I2C通信时序 | 🔗 通信 | 🟡 进阶 | 地址/数据/START/STOP | ACK检测 → NACK错误 |
| 9 | NTC热敏电阻测温 | 📡 传感器 | 🟡 进阶 | 温度/B值/ADC精度滑块 | 温度超限 → ADC溢出 |
| 10 | PCB走线阻抗控制 | 🎨 PCB | 🟡 进阶 | W/H/εr/T滑块 | 阻抗偏离50Ω → 信号反射 |
| 11 | WiFi信号链路预算 | 📡 无线 | 🟡 进阶 | 功率/距离/频率/墙数滑块 | RSSI低于灵敏度 → 链路中断 |
| 12 | SPI逻辑分析仪调试 | 🐛 调试 | 🔴 高级 | CPOL/CPHA选择+数据/频率 | 模式不匹配 → 数据错位 |

## 架构

```
engine/           仿真引擎核心
  topology.js     拓扑解析（DFS连通性+路径查找）
  simulator.js    行为规则引擎（元件行为+电流计算+standalone仿真器）
  error-detector.js  错误检测+教程索引匹配
  components/     元件行为定义
experiments/      实验配置（JSON驱动，无需写代码）
components/       Vue3 UI组件
  CircuitCanvas.vue     SVG电路画布
  ComponentShape.vue    元件形状渲染（12+种SVG图形）
  WaveformView.vue      波形示波器
  InteractionPanel.vue  交互控件（滑块/点击/选择）
  ErrorPopup.vue        错误教学弹窗
  SmokeAnimation.vue    烧毁冒烟动画
  PwmLoadView.vue       PWM负载可视化
  + 6个专用View组件（分压器/电容/三极管/RC/I2C/NTC/PCB/WiFi/LA）
stores/           Pinia状态管理
  experiment.js   实验状态+仿真调度
  progress.js     进度持久化+成就系统（8个成就/12实验）
```

## 进度与成就系统

- 完成实验获得星数（无错误=⭐⭐⭐，有错误=⭐）
- localStorage 持久化保存进度
- 8个成就：纵火犯 → 亮灯人 → 初出茅庐 → 小有所成 → 硬件达人 → 完美主义 → 精益求精 → 零失误大师
- 首页实时显示进度条、星数、成就徽章

## 嵌入公众号文章

在文章 HTML 末尾添加 iframe：

```html
<iframe src="https://hardware-lab.pages.dev/?embed=true"
        style="width:100%;height:500px;border:none;border-radius:8px;"
        scrolling="no">
</iframe>
```

也可指定单个实验嵌入：

```html
<iframe src="https://hardware-lab.pages.dev/?embed=true&exp=led-resistor"
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
  "category": "分类ID",
  "canvas": { "components": [...], "wires": [...] },
  "interactions": [...],
  "error_triggers": [...]
}
```

然后在 `src/App.vue` 的 `allExperiments` 数组中注册即可。

## 技术栈

Vue 3 + Vite + Pinia + SVG，纯前端无后端依赖。

## 主题与音效

- **暗色/亮色双主题**：CSS变量驱动，顶部一键切换(☀️/🌙)，自动检测系统偏好
- **Web Audio音效**：程序化生成无需音频文件——点击/切换/滑块/烧毁/短路/成功琶音/成就解锁
- 音效可随时开关(🔊/🔇)，默认开启

## PWA离线支持

已配置 PWA manifest + service worker，支持添加到主屏幕、离线访问。

## 部署

Cloudflare Pages 自动部署，GitHub Actions CI/CD。

## 版本历史

- **v0.7** — 暗色/亮色主题切换 + Web Audio音效系统 + PWA离线支持
- **v0.5** — 补齐PCB/WiFi/调试3个分类，11/11分类全部激活，12个实验
- **v0.4** — 新增RC滤波器/I2C时序/NTC测温，9个实验8分类
- **v0.3** — 修复电源引脚偏移/连线格式/PWM波形3个Bug
- **v0.2** — 新增分压器/电容充放电/三极管开关，首页11分类卡片网格
- **v0.1** — 仿真引擎核心 + 3个旗舰实验，Cloudflare Pages部署
