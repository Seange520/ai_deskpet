<div align="center">

# ⚡ SparkMate

**让好奇发光，让代码成为你的第一个 AI 伙伴。**

面向零基础工科大学生的多路线 ESP32-S3 桌宠教学软件 · 第四阶段完成。

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-11-B39AFF?style=flat-square&logo=framer&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-global_state-7abb9b?style=flat-square)
![Version](https://img.shields.io/badge/version-0.1.0-00FFD1?style=flat-square)
![Status](https://img.shields.io/badge/status-interactive_prototype-FFB36B?style=flat-square)

LEARN → CONNECT → CREATE

</div>

SparkMate 把芯片、接线与代码变成可探索的学习体验。从认识物料、连接电源，到亲手改变桌宠表情，每次操作都有可见反馈。面向第一次接触嵌入式开发的大一学生，也面向每一个想把想象做出来的人。

应用中的硬件、屏幕、线路与表情全部通过 CSS、SVG 和 React 绘制，不需要图片素材，也不依赖外部字体或素材 CDN。README 徽章仅用于文档展示，断网不影响应用本身。

## 体验路径

### 多路线硬件架构

首页「选择你的创造路线」可直接进入四种作品，也可先打开对应物料清单；实验室的「切换路线」与物料弹窗的「物料路线」共享选择。

| 路线 ID     | 作品             | 主要部件                                    | 当前连线练习                                |
| ----------- | ---------------- | ------------------------------------------- | ------------------------------------------- |
| `classic`   | 经典方块桌宠     | ESP32-S3、屏幕、麦克风；无舵机              | VCC→3V3、GND→GND                            |
| `quadruped` | 迷你四足机器狗   | ESP32-S3、屏幕、8 个 SG90、机身与独立供电   | 舵机 VCC→独立电源 EXT5V、GND→GND、PWM→GPIO4 |
| `tracked`   | 履带/麦轮小车    | ESP32-S3、履带底盘、L298N 与独立供电        | IN1→GPIO5、IN2→GPIO6、ENA→GPIO7、GND→GND    |
| `spherical` | 球形自平衡机器人 | ESP32-S3、MPU6050、球壳、内部执行机构与供电 | 传感器电源、SDA→GPIO8、SCL→GPIO9            |

`src/data/hardwareRoutes.js` 是配置单一来源：包含 ID、名称、描述、难度、物料单价与数量、内联 SVG、爆炸图零件坐标及教学引脚配对。示例套装价格按「单价 × 数量」求和。`ExplodedView.jsx` 根据配置绘制主板、屏幕、八舵机阵列、底盘、驱动、IMU、球壳和内部机构，不需要外部素材。

`src/hooks/useHardwareProgress.js` 适配统一 Zustand store（`src/stores/useLearningStore.js`），使用 `sparkmate.routes.v2` 保存当前路线、各路线三关状态和静音偏好。旧 `sparkmate.progress.v1` 仅迁移到经典路线，迁移成功后删除旧键，避免重置后恢复旧成就。经验条、侧栏、排行榜显示四路线累计积分（上限 2000 XP），成就墙显示全局徽章。切换路线会清除未完成的拖线、警告和未确认的物料勾选，保留已完成关卡；重置会清空全部路线。

这些是局部概念练习，不是完整制造方案。GPIO 为示例分配，真实硬件与固件需要核对同一配置。舵机、电机须使用匹配的驱动和独立供电并共地，不能让主板 GPIO 或 3V3 承担动力负载。参考：[Espressif 开发板指南](https://documentation.espressif.com/esp-dev-kits/en/latest/esp32s3/esp32-s3-devkitc-1/user_guide_v1.0.html)、[Adafruit 舵机供电和共地说明](https://learn.adafruit.com/using-servos-with-circuitpython/hardware)。

小车路线当前以双电机履带为默认方案；麦轮扩展还需四轮独立驱动和相应通道。代码工坊已按路线提供不同实验；证书只记录虚拟体验完成，不代表已完成实体整机、步态或自平衡固件。

### 第四阶段：全局状态、音效与情感反馈

- **统一状态**：Zustand 是路线完成、XP、徽章、静音与反馈事件的唯一来源。`useHardwareProgress` 只是兼容适配器，不再持有 React 进度副本。XP 由四路线已完成关卡计算，不另存可漂移的积分余额。
- **奖励口径**：每路线首次认识物料 +100、全部正确接线 +250、有效调参后主动领取 +150。参数偏离本路线默认值才可领取；滑动实时预览、恢复默认、重复接线、切换路线与刷新均不额外奖励。每 500 XP 升一级，从 LV.1 到 LV.5；进度条表示全局 0–2000 XP，排行榜按同一累计值实时排序，其他人仍为 Mock。
- **兼容记录**：保持 `sparkmate.routes.v2` 的 `{ routeId, routes }` 原结构，新增 `muted`；原 v2 四路线布尔值直接折算累计 XP。旧 `sparkmate.progress.v1` 只迁移到 classic，成功写入 v2 后删除旧键。非法布尔值、无接线的 code 状态不计分；无法使用存储时降级为内存状态并提示。
- **成就与 Toast**：「初入江湖」初始点亮，「物料侦探」「电路新星」「唤醒伙伴」在任一路线首次完成对应任务时解锁。未解锁呈灰色，首次解锁 Toast 同时显示奖励；跨路线可获取该路线首次 XP，但不会重复发同一徽章。刷新不重播反馈，重置接线或模拟烧板保留已获 XP 和徽章；侧栏重置清空四路线学习记录，保留静音偏好。
- **合成音效**：`src/lib/sounds.js` 通过 Web Audio API 合成清脆点击、双音叮声与低频烧板嗡声，无外部素材。AudioContext 仅在交互后创建或恢复；顶部音量按钮可静音并立即停止已有声音，偏好随刷新保存。API 缺失、构造失败、恢复被拒绝均静默降级，不阻断关卡。
- **桌宠情感**：实际成功、错线、烧板、恢复和升级事件更新气泡及表情/高亮，成功跳跃遵守减少动画偏好。状态渲染本身不会触发音效、奖励或重复成就 Toast。
- **回归验收**：`tests/global.spec.js` 补充全局分数、实时排名、侧栏进度、调参领奖幂等、v2 折算、音频合成/静音/三类降级、失败恢复和存储不可用测试。原有四路线、烧板 Portal、键盘、触屏与微交互测试继续保留。

实现参考：[Zustand 官方源码与用法](https://github.com/pmndrs/zustand)、[AudioContext.resume](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume)。

### 工作台与路线专属实验

- **实验室质感**：仅硬件实验室加入低对比的防静电桌垫网格，保持现有主色。黄色「老创客的避坑笔记」随路线切换：供电极性、八舵机压降/复位、接头性别、L298N 供电和 IMU 角速度误读。
- **经典方块**：保留 `pet.setExpression("happy")`、眨眼间隔、主题和表情预览。
- **四足**：保留 8 个 SG90 的物料与拆解。课程用条件编译展示 `<Servo.h>` 和 ESP32-S3 对应的 `<ESP32Servo.h>`，用 `myServo.write(90)` 演示一个关节；角度控件同步改变代码与腿部预览，不运行八关节步态。
- **履带**：L298N 单通道 H 桥的正转、反转与停机。示例通过 `digitalWrite(MotorA, HIGH)` 等语句控制 IN1/IN2 与 ENA；改向前先停机。方向下拉框驱动模拟轮转，停止时暂停。
- **球形**：使用 `Adafruit_MPU6050` 的 `getEvent()` 展示加速度、角速度与 `atan2` 静态姿态估计。滑块生成假定静止时的重力分量；不读取真实设备，不实现滤波融合、PID 或自平衡闭环。
- **Arduino 风格工具栏**：「验证（模拟）」和「上传（模拟）」只提供浏览器教学反馈，不运行 C++ 编译器、不申请串口权限、不烧录。修改参数后需要重新模拟验证。
- **模拟烧板**：VCC 接到 GND 会进入全屏黑屏/焦糊警告，阻止背景操作并将键盘焦点放到重置按钮。点击「重置模拟开发板」或按 Esc 可恢复；不会产生订单、扣费或清空已获成就。普通信号接错保留红线反馈，不触发烧板。

「通电瞬间冒烟」和「别买公对公」是创客记忆口诀，配有实际条件说明：损坏取决于保护和供电；线材必须按两端接头选择，公对公在面包板等场景仍有用途。

课程集中在 `src/data/routeLessons.js`，预览位于 `ExperimentPreview.jsx`，异常结局位于 `BurnoutOverlay.jsx`，工作台样式位于 `src/workshop.css`。参考：[ESP32Servo 源码与示例](https://github.com/madhephaestus/ESP32Servo)、[ST L298 数据手册](https://www.st.com/resource/en/datasheet/l298.pdf)、[Adafruit MPU6050 Arduino 读取示例](https://learn.adafruit.com/mpu6050-6-dof-accelerometer-and-gyro/arduino)。

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

| 模块         | 学习任务                           | 交互反馈                                        |
| ------------ | ---------------------------------- | ----------------------------------------------- |
| 学习仪表盘   | 认识主控、屏幕、麦克风与线材       | 3D 倾斜关卡卡片、经验条、成就墙                 |
| 硬件实验室   | 理解 3.3V 供电、共地与结构层次     | 2.5D 爆炸图、拖拽接线、错误警告、流动光线和粒子 |
| 代码魔改工坊 | 表情、关节角度、H 桥方向与静态姿态 | 路线专属代码、模拟 IDE 与对应硬件预览           |

每路线三关分别奖励 **100 / 250 / 150 XP**，单路线 500 XP，四路线累计上限 **2000 XP**。完成状态在本机浏览器中保存；重复练习不会重复累计经验。可从侧栏重置全部学习进度。

## 技术栈

- React 18：组件化视图；Zustand 5：统一学习状态、事件反馈与持久化。
- Web Audio API：用户交互触发的本地合成音效。
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
$env:SPARKMATE_TEST_PORT='5219'
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
│   ├── workshop.css              # 工作台纹理、实验预览与异常结局
│   ├── data/
│   │   ├── hardwareRoutes.js     # 四路线配置、SVG、物料与引脚配对
│   │   └── routeLessons.js       # 专属示例代码与创客避坑笔记
│   ├── stores/
│   │   └── useLearningStore.js   # Zustand 路线、全局奖励与反馈事件
│   ├── lib/
│   │   └── sounds.js             # Web Audio 合成与静音
│   ├── hooks/
│   │   └── useHardwareProgress.js # Zustand 兼容适配器
│   └── components/
│       ├── Dashboard.jsx         # 关卡与成就墙
│       ├── HardwareSimulator.jsx # 爆炸图与连线验证
│       ├── ExplodedView.jsx      # 配置驱动的零件拆解
│       ├── RouteGallery.jsx      # 首页路线选择
│       ├── RouteSelect.jsx       # 实验室与物料共用下拉菜单
│       ├── CodeLab.jsx           # 参数控制与实时代码预览
│       ├── ExperimentPreview.jsx # 关节、电机与 MPU6050 模拟预览
│       ├── BurnoutOverlay.jsx    # 全屏模拟烧板与键盘重置
│       ├── Button.jsx            # 统一按钮按压反馈
│       └── Visuals.jsx           # SVG 主板、麦克风与虚拟桌宠
└── tests/
    ├── e2e.spec.js
    ├── layout.spec.js            # 六种屏宽、遮挡及动画验收
    ├── routes.spec.js            # 四条路线与进度迁移验收
    ├── global.spec.js            # 全局 XP、幂等、音效与反馈
    ├── workshop.spec.js          # 四种代码实验、模拟 IDE 与烧板恢复
    └── sparkmate.spec.js
```

## 手动验收

2026-11-03 第四阶段验证：`npm run build` 通过；独占端口 5219 的全量 Playwright **44 项全部通过**（原有 36 项与新增 8 项）。音量和音色仍需在真实浏览器中试听。

1. 在仪表盘打开物料清单，逐项勾选并确认，经验增加至 100 XP。
2. 点击「拆解」，观察显示屏、主板和麦克风分层。
3. 将麦克风 VCC 拖到主板 GND，确认全屏模拟烧板、警告嗡声和焦点锁定，再重置模拟开发板。
4. 将 VCC→3V3、GND→GND 正确连接，确认两条青色线和下一步解锁；可用 Tab、回车及 Esc 完成键盘操作。
5. 进入代码工坊，修改滑块、主题与表情，确认伪代码和桌宠同步变化。
6. 领取成就，返回仪表盘并刷新，确认本路线贡献 500 XP、四枚全局徽章保留；切换路线后全局 XP 不下降。
7. 在另一条路线完成接线，确认全局 XP 和 Mock 排名同步上升；重复练习不加分。点击顶部音量按钮，确认静音与刷新后偏好保持；试听点击、叮声与烧板嗡声。
8. 重置学习进度，确认回到 0 XP，仅「初入江湖」解锁。

应用尊重系统的减少动画偏好。键盘焦点有高亮提示，错误信息带有可访问通知，窄屏自动切换顶部导航。浏览器禁止本地存储时会提示本次进度无法持久保存。

## 教学边界

当前版本是**浏览器交互教学原型**。经典路线的 `SparkMateDemo.h` 与 `pet` API 是教学伪代码。其他路线展示基于常见 Arduino 库的参考片段，但没有进行实体编译和硬件验收；实际使用需安装匹配的库、选择 ESP32-S3 开发环境并核对接线。当前只验证课程配对与浏览器参数，不执行电路仿真，也未接入真实语音识别、模型对话或硬件串口。

实际 ESP32-S3 开发板和屏幕模块的引脚布局、驱动与额定电压可能不同。真实操作前断电并核对对应数据手册；I2S 麦克风还需要音频时钟、字选择与数据线路，不能把这两根电源线当作完整音频接线。I²C 与 I2S 是不同接口。

## Roadmap

- [x] 暗黑科技风学习工作台与组件化结构
- [x] 三关学习路径、经验与本机进度
- [x] SVG 硬件、3D 拆解与接线反馈
- [x] 参数驱动的伪代码与桌宠动画
- [x] 核心交互浏览器测试与手机布局
- [x] 四条路线独立物料、爆炸图、配对规则和学习进度
- [x] 四类代码实验、模拟 IDE 与参数驱动预览
- [x] 分路线避坑笔记与可重置的模拟烧板结局
- [x] Zustand 全局 XP、排行联动、成就 Toast 与事件驱动桌宠
- [x] Web Audio 合成音效、静音持久化与不可用降级
- [ ] 确定具体开发板、屏幕和麦克风型号，提供可复现 BOM
- [ ] 补充 SPI / I2C / I2S 信号与芯片基础课程
- [ ] 提供与指定硬件匹配、可编译的 ESP32-S3 固件
- [ ] 接入真实语音链路与 AI 对话，并提供配置及隐私说明
- [ ] 使用 Electron 或 Tauri 打包桌面应用
- [ ] 完成真实新生试用与硬件验收后发布 v1.0.0

## 贡献与仓库维护

当前 GitHub 仓库为 [Seange520/ai_deskpet](https://github.com/Seange520/ai_deskpet)。本地阶段提交不会自动推送；推送由用户明确授权。使用现有 Git 凭据，禁止把访问令牌写进代码、README 或提交历史。

新想法用 Issues 记录，包含学习目标、使用场景与验收标准；Bug 应提供操作步骤、预期/实际结果、浏览器和截图。首次稳定 Release 在实际验收后发布，不把交互原型误标为稳定硬件方案。

提交遵循 Conventional Commits：`feat:` 功能、`fix:` 修复、`docs:` 文档、`style:` 样式；初始化与工具配置可用 `chore:`。每个阶段完成后提醒测试，通过后提交。首次初始化未配置个人身份时使用临时自动化作者身份，未改动全局 Git 配置；公开推送前可按需设置个人的本仓库作者信息。

项目尚未选择开源许可证；公开发布前需要明确许可证。
