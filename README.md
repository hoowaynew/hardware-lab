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

## 15个实验 · 11大分类

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
| 13 | DC-DC Buck降压转换器 | ⚡ 电源 | 🟡 进阶 | Vin/频率/L/负载/占空比滑块 | 纹波>30% / 占空比偏差过大 |
| 14 | 运放比较器+迟滞 | 📊 模拟 | 🟡 进阶 | V+/Vref/迟滞/输出类型 | 无迟滞→抖动 / 开漏无上拉 |
| 15 | 按键消抖对比 | ⏱️ 定时 | 🟢 入门 | 抖动时间/消抖模式/RC参数 | 无消抖→多次触发 / RC太小 |

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
  + 9个专用View组件（分压器/电容/三极管/RC/I2C/NTC/PCB/WiFi/LA/Buck/运放/消抖）
stores/           Pinia状态管理
  experiment.js   实验状态+仿真调度
  progress.js     进度持久化+成就系统（8个成就/15实验）
  favorites.js    收藏+最近浏览（localStorage）
data/             知识点+提示+挑战数据
  knowledge.js    15个实验核心公式/概念/提示
  hints.js        15个实验3级渐进提示
  challenges.js   15个实验挑战模式配置（目标/约束/计时/评分）
```

## 进度与成就系统

- 完成实验获得星数（无错误=⭐⭐⭐，有错误=⭐）
- localStorage 持久化保存进度
- 8个成就：纵火犯 → 亮灯人 → 初出茅庐 → 小有所成 → 硬件达人 → 完美主义 → 精益求精 → 零失误大师
- 首页实时显示进度条、星数、成就徽章
- 进度导出/导入（JSON备份恢复）

## 学习辅助功能

- **知识点面板**：每个实验可折叠展示核心公式/原理概念/实用提示
- **渐进提示系统**：3级提示（思路点拨→公式提示→答案揭晓），卡住时逐步求助
- **挑战模式**：每个实验都有目标导向+约束条件+计时+评分的挑战关卡
- **难度筛选**：首页按入门/进阶/高级筛选实验
- **统计仪表盘**：分类完成率/完美通关/错误分布可视化
- **首次访问引导**：新用户3步交互引导浮层
- **收藏与最近浏览**：星标常玩实验，快速回访最近6个实验

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

- **v1.2** — 分享卡片(Canvas生成分享图)+学习路径(15步结构化路线)+实验笔记(localStorage自动保存)
- **v1.1** — 新增3个实验(Buck降压/运放比较器/按键消抖)+挑战模式+难度筛选+移动端优化
- **v1.0** — 统计仪表盘+随机实验+进度导出导入+首次访问引导
- **v0.9** — 渐进提示系统+收藏+最近浏览+键盘快捷键
- **v0.8** — 知识点面板+实验搜索+分享深链接+进度重置
- **v0.7** — 暗色/亮色主题切换 + Web Audio音效系统 + PWA离线支持
- **v0.5** — 补齐PCB/WiFi/调试3个分类，11/11分类全部激活，12个实验
- **v0.4** — 新增RC滤波器/I2C时序/NTC测温，9个实验8分类
- **v0.3** — 修复电源引脚偏移/连线格式/PWM波形3个Bug
- **v0.2** — 新增分压器/电容充放电/三极管开关，首页11分类卡片网格
- **v0.1** — 仿真引擎核心 + 3个旗舰实验，Cloudflare Pages部署
形3个Bug
- **v0.2** — 新增分压器/电容充放电/三极管开关，首页11分类卡片网格
- **v0.1** — 仿真引擎核心 + 3个旗舰实验，Cloudflare Pages部署
