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

### 多路线硬件架构

首页「选择你的创造路线」可直接进入四种作品，也可先打开对应物料清单；实验室的「切换路线」与物料弹窗的「物料路线」共享选择。

| 路线 ID | 作品 | 主要部件 | 当前连线练习 |
| --- | --- | --- | --- |
| `classic` | 经典方块桌宠 | ESP32-S3、屏幕、麦克风；无舵机 | VCC→3V3、GND→GND |
| `quadruped` | 迷你四足机器狗 | ESP32-S3、屏幕、8 个 SG90、机身与独立供电 | 单个关节 PWM→GPIO4、GND→GND |
| `tracked` | 履带/麦轮小车 | ESP32-S3、履带底盘、电机驱动与独立供电 | 驱动 IN1→GPIO5、GND→GND |
| `spherical` | 球形自平衡机器人 | ESP32-S3、IMU、球壳、内部执行机构与供电 | IMU 电源、SDA→GPIO8、SCL→GPIO9 |

`src/data/hardwareRoutes.js` 是配置单一来源：包含 ID、名称、描述、难度、物料单价与数量、内联 SVG、爆炸图零件坐标及教学引脚配对。示例套装价格按「单价 × 数量」求和。`ExplodedView.jsx` 根据配置绘制主板、屏幕、八舵机阵列、底盘、驱动、IMU、球壳和内部机构，不需要外部素材。

`src/hooks/useHardwareProgress.js` 使用 `sparkmate.routes.v2` 保存当前路线与各路线的三关状态。旧 `sparkmate.progress.v1` 仅迁移到经典路线，迁移成功后删除旧键，避免重置后恢复旧成就。经验条和排行榜显示当前路线积分。切换路线会清除未完成的拖线、警告和未确认的物料勾选，保留已完成关卡；重置会清空全部路线。

这些是局部概念练习，不是完整制造方案。GPIO 为示例分配，真实硬件与固件需要核对同一配置。舵机、电机须使用匹配的驱动和独立供电并共地，不能让主板 GPIO 或 3V3 承担动力负载。参考：[Espressif 开发板指南](https://documentation.espressif.com/esp-dev-kits/en/latest/esp32s3/esp32-s3-devkitc-1/user_guide_v1.0.html)、[Adafruit 舵机供电和共地说明](https://learn.adafruit.com/using-servos-with-circuitpython/hardware)。

小车路线当前以双电机履带为默认方案；麦轮扩展还需四轮独立驱动和相应通道。球形路线不提供姿态解算或闭环平衡算法，仅接 IMU 不会让球体自平衡。代码工坊沿用共享表情伪代码，证书只记录该路线虚拟体验完成，不代表已完成步态或平衡固件。

`tests/routes.spec.js` 覆盖四路线入口、拆解、错误与正确配对、动态物料和数量、刷新恢复、旧进度迁移、隔离、损坏记录及 320px 手机布局。

本次产品体验面向零基础工科学生：蓝灰背景、琥珀与薄荷绿主色、柔和玻璃卡片。首页的「零门槛体验」直接进入虚拟连线或代码调参，不需要登录、购买硬件或提供 API Key。

- **常驻伙伴**：右下角的 CSS 桌宠会眨眼、悬浮时好奇张望，首次完成关卡时跳跃庆祝；点击可收起，减少动画偏好下关闭跳跃。
- **物料卡片**：部件用途、示例价格和认识勾选合为一张卡。新手套装可加入本次会话的愿望清单；所有价格为产品演示值，不是实时市场报价。
- **创客排位**：其他同学、大学与积分为明确标记的 Mock 数据；你的排名按本机 XP 计算，不上传个人信息。
- **毕业纪念**：完成虚拟接线和代码调参后获得体验课程证书。分享按钮优先调用系统分享，不支持时下载 SVG 作品卡；不会自动发布作品。
- **商城入口**：毕业证书中的入口可查看套装和保存意向；尚无真实商品型号、库存、支付或订单系统，不能进行实际购买。

产品组件位于 `src/components/Companion.jsx`、`Materials.jsx`、`MakerRanking.jsx`、`Graduation.jsx`；温暖主题位于 `src/product.css`。

### 微交互与字体

保留蓝灰与薄荷绿布局，使用 [React Liquid Glass](https://github.com/Parsa-29/react-liquid-glass)（ISC）绘制首页的背景折射层，使用 [React Tilt](https://github.com/gfazioli/react-tilt)（MIT）提供导航和教程卡片的分层视差。玻璃不包裹文字，所有装饰层均不捕获点击。

- Google Fonts 的 Inter / JetBrains Mono 通过 Fontsource 可变字体包本地加载（OFL-1.1）；运行时无需访问 Google，也不需要外部字体请求。
- `src/motion.js` 统一有限动画为 0.4 秒；默认缓动为 `[0.16, 1, 0.3, 1]`，按压回弹使用指定 0.4 秒的弹簧。眨眼动作也是 0.4 秒，课程滑块改变的是两次动作之间的等待时间。
- `src/micro.css` 管理微弱的聚光灯（0.12）、流光边框（0.15）、背景色彩流动（0.14）与涟漪（起始 0.16）。慢速装饰使用 CSS，主色不变。
- 磁吸限幅横向 3px、纵向 2px。鼠标更新经 requestAnimationFrame 合并，离开、取消或卸载时清理；只在互动区域内监听，不替换系统光标。
- 玻璃背景离屏或页面隐藏时暂停流动；触屏关闭磁吸、倾斜和 SVG 折射，保留原生滚动。减少动画模式进一步关闭涟漪与遮罩运动，保留功能及语义定位。
- `tests/micro.spec.js` 包含字体、材质覆盖面积、分层视差、鼠标/键盘、触屏和减少动画回归；帧间隔采样附件用于评估当前无头浏览器环境，不代表所有设备的帧率保证。

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
- 全局视觉：Grid / Flex 留白布局、统一深色毛玻璃卡片、按钮按压反馈和分层弹窗；布局样式集中在 `src/design.css`，硬件绘图保留在 `src/styles.css`。
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

如果 5173 正在运行另一份项目副本，请用独立端口验收当前工作区，避免复用旧页面：

```powershell
$env:SPARKMATE_TEST_PORT='5187'
npm run test:e2e
```

测试会独占指定端口，不复用其他运行中的源码副本；端口被占用时请换一个空闲端口。

测试需要已安装 Chrome，也支持 `PLAYWRIGHT_CHANNEL=msedge` 使用本机 Edge。PowerShell 可运行：

```powershell
$env:PLAYWRIGHT_CHANNEL='msedge'
npm run test:e2e
```

Playwright 会独占启动 `5173` 端口服务。首次下载依赖需要联网；安装完成后本应用的学习功能不调用外部服务。没有云账户、API Key 或后端服务要求。

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
│   ├── styles.css                # 纯 CSS 硬件视觉
│   ├── design.css                # 全局布局、玻璃材质与层级规则
│   ├── routes.css                # 多路线卡片、下拉菜单与图例
│   ├── data/
│   │   └── hardwareRoutes.js     # 四路线配置、SVG、物料与引脚配对
│   ├── hooks/
│   │   └── useHardwareProgress.js # 路线选择、独立进度与旧记录迁移
│   └── components/
│       ├── Dashboard.jsx         # 关卡与成就墙
│       ├── HardwareSimulator.jsx # 爆炸图与连线验证
│       ├── ExplodedView.jsx      # 配置驱动的零件拆解
│       ├── RouteGallery.jsx      # 首页路线选择
│       ├── RouteSelect.jsx       # 实验室与物料共用下拉菜单
│       ├── CodeLab.jsx           # 参数控制与实时代码预览
│       ├── Button.jsx            # 统一按钮按压反馈
│       └── Visuals.jsx           # SVG 主板、麦克风与虚拟桌宠
└── tests/
    ├── e2e.spec.js
    ├── layout.spec.js            # 六种屏宽、遮挡及动画验收
    ├── routes.spec.js            # 四条路线与进度迁移验收
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
