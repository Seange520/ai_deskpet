<div align="center">

# ⚡ SparkMate

**让好奇发光，让代码成为你的第一个 AI 伙伴。**

面向零基础创客的 ESP32-S3 实体桌宠交互教学工作台。

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-11-B39AFF?style=flat-square&logo=framer&logoColor=white)
![Version](https://img.shields.io/badge/version-0.1.0-00FFD1?style=flat-square)
![Status](https://img.shields.io/badge/status-interactive_prototype-FFB36B?style=flat-square)

LEARN → CONNECT → CREATE

</div>

SparkMate 把芯片、接线与代码变成可探索的学习体验。从认识物料、连接电源，到亲手改变桌宠表情，每次操作都有可见反馈。面向第一次接触嵌入式开发的大一学生，也面向每一个想把想象做出来的人。

应用中的硬件、屏幕、线路与表情全部通过 CSS、SVG 和 React 绘制，不需要图片素材，也不依赖外部字体或素材 CDN。README 徽章仅用于文档展示，断网不影响应用本身。

## 体验路径

| 模块         | 学习任务                       | 交互反馈                                        |
| ------------ | ------------------------------ | ----------------------------------------------- |
| 学习仪表盘   | 认识主控、屏幕、麦克风与线材   | 3D 倾斜关卡卡片、经验条、成就墙                 |
| 硬件实验室   | 理解 3.3V 供电、共地与结构层次 | 2.5D 爆炸图、拖拽接线、错误警告、流动光线和粒子 |
| 代码魔改工坊 | 理解参数、时间间隔与程序反馈   | 动态伪代码、实时主题、眨眼频率和表情变化        |

三关分别奖励 **100 / 250 / 150 XP**，总计 500 XP。完成状态在本机浏览器中保存；重复练习不会重复累计经验。可从侧栏重置全部学习进度。

## 技术栈

- React 18：组件化视图与状态管理。
- Tailwind CSS 3：配色主题与工具类；CSS 实现细致硬件视觉。
- Framer Motion 11：页面过渡、卡片视差、反馈与表情动画。
- Lucide React：统一线条图标。
- Vite 6：本地开发和静态构建。
- Playwright：覆盖鼠标、键盘、移动端布局与本地状态的浏览器测试。

## 运行指南

使用 **Node.js 22.12+（或 Node.js 24 LTS）** 与 npm。在本项目根目录执行：

```bash
npm ci
npm run dev
```

打开终端给出的地址，默认是 `http://127.0.0.1:5173/`。开发端口被占用时 Vite 会提示另一个地址。

```bash
# 生成 dist/ 生产文件
npm run build

# 本地预览构建结果
npm run preview

# 浏览器回归测试：默认使用本机 Chrome
npm run test:e2e

# 统一格式化源码和文档
npm run format
```

测试需要已安装 Chrome，也支持 `PLAYWRIGHT_CHANNEL=msedge` 使用本机 Edge。PowerShell 可运行：

```powershell
$env:PLAYWRIGHT_CHANNEL='msedge'
npm run test:e2e
```

Playwright 会启动或复用 `5173` 端口服务。首次下载依赖需要联网；安装完成后本应用的学习功能不调用外部服务。没有云账户、API Key 或后端服务要求。

## 项目结构

```text
SparkMate/
├── .gitignore
├── AGENTS.md                     # 协作与提交约定
├── README.md
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── tailwind.config.js            # 暗色主题与霓虹配色
├── postcss.config.js
├── playwright.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx                   # 导航、进度、经验与弹窗
│   ├── styles.css                # 响应式布局与纯 CSS 硬件视觉
│   └── components/
│       ├── Dashboard.jsx         # 关卡与成就墙
│       ├── HardwareSimulator.jsx # 爆炸图与连线验证
│       ├── CodeLab.jsx           # 参数控制与实时代码预览
│       └── Visuals.jsx           # SVG 主板、麦克风与虚拟桌宠
└── tests/
    └── sparkmate.spec.js
```

## 手动验收

1. 在仪表盘打开物料清单，逐项勾选并确认，经验增加至 100 XP。
2. 点击「拆解」，观察显示屏、主板和麦克风分层。
3. 将麦克风 VCC 拖到主板 GND，确认出现红线与「危险！可能烧毁主板！」警告。
4. 将 VCC→3V3、GND→GND 正确连接，确认两条青色线和下一步解锁；可用 Tab、回车及 Esc 完成键盘操作。
5. 进入代码工坊，修改滑块、主题与表情，确认伪代码和桌宠同步变化。
6. 领取成就，返回仪表盘并刷新，确认 500 XP 与四枚徽章保留。
7. 重置学习进度，确认回到 0 XP，仅「初入江湖」解锁。

应用尊重系统的减少动画偏好。键盘焦点有高亮提示，错误信息带有可访问通知，窄屏自动切换顶部导航。浏览器禁止本地存储时会提示本次进度无法持久保存。

## 教学边界

当前版本是**浏览器交互教学原型**。Arduino 风格代码中的 `SparkMateDemo.h` 与 `pet` API 是教学伪代码，不能直接编译烧录。当前模拟只验证电源配对，不执行电路仿真，也未接入真实语音识别、模型对话或硬件串口。

实际 ESP32-S3 开发板和屏幕模块的引脚布局、驱动与额定电压可能不同。真实操作前断电并核对对应数据手册；I2S 麦克风还需要音频时钟、字选择与数据线路，不能把这两根电源线当作完整音频接线。I²C 与 I2S 是不同接口。

## Roadmap

- [x] 暗黑科技风学习工作台与组件化结构
- [x] 三关学习路径、经验与本机进度
- [x] SVG 硬件、3D 拆解与接线反馈
- [x] 参数驱动的伪代码与桌宠动画
- [x] 核心交互浏览器测试与手机布局
- [ ] 确定具体开发板、屏幕和麦克风型号，提供可复现 BOM
- [ ] 补充 SPI / I2C / I2S 信号与芯片基础课程
- [ ] 提供与指定硬件匹配、可编译的 ESP32-S3 固件
- [ ] 接入真实语音链路与 AI 对话，并提供配置及隐私说明
- [ ] 使用 Electron 或 Tauri 打包桌面应用
- [ ] 完成真实新生试用与硬件验收后发布 v1.0.0

## 贡献与仓库维护

当前尚未绑定远程 GitHub 仓库。提供空仓库后，再配置远程与首次推送。优先使用已有 Git 凭据或 `gh auth login` 浏览器授权；不要把访问令牌写进代码、README 或提交历史。

新想法用 Issues 记录，包含学习目标、使用场景与验收标准；Bug 应提供操作步骤、预期/实际结果、浏览器和截图。首次稳定 Release 在实际验收后发布，不把交互原型误标为稳定硬件方案。

提交遵循 Conventional Commits：`feat:` 功能、`fix:` 修复、`docs:` 文档、`style:` 样式；初始化与工具配置可用 `chore:`。每个阶段完成后提醒测试，通过后提交。首次初始化未配置个人身份时使用临时自动化作者身份，未改动全局 Git 配置；公开推送前可按需设置个人的本仓库作者信息。

项目尚未选择开源许可证；公开发布前需要明确许可证。
