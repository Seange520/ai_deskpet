# SparkMate 开发日志与规范 3.0

本文档记录了我近期在开发 SparkMate 时，对 3D 架构、软硬结合模块的拆分思考，以及为避免项目后期失控而制定的红线与规范。

## 1. 工作区指纹与封版基线

- 唯一主场：`D:\deepseek_file\ai_deskpet`。禁止在 C 盘旧副本或其他副本操作；每条工具命令显式指定工作目录。
- 分支：`main`；远端：`https://github.com/Seange520/ai_deskpet.git`。
- Phase 4 源代码封版 commit：`fb6e618e384044f854f3e267c6b74524bc6217fc`，已推送并核对 `origin/main` 一致。
- 提交信息：`feat: 集成 AI 手势控制、虚拟串口光感联动与 3D 动作库。`
- 本轮文档整理起点：`1e75d9af82abfc490770d4b4f3b6ed63a4115d40`（仅文档提交，业务代码与上述封版一致）。
- 上一基线：`ee9f1128562f841905869c72c97e26d813c99991`。
- 本次源代码提交共 27 个文件：原 Phase 4 的 25 个文件，加上拆分的 `PetModel.jsx`、`usePetAnimation.js`。
- 开始维护前先运行 `git status --short`、`git rev-parse HEAD`、`git remote -v`，确认目录、基线与用户改动，再按任务读取相关模块。

### 技术栈与实际安装版本

以下来自当前依赖树/锁文件；带范围的 package.json 声明不代表可任意升级。

| 层级                                         | 版本                       |
| -------------------------------------------- | -------------------------- |
| Node / npm（本次验证环境）                   | 24.19.0 / 11.17.0          |
| React / React DOM                            | 18.3.1 / 18.3.1            |
| Vite / React 插件                            | 6.4.5 / 4.7.0              |
| Zustand                                      | 5.0.16                     |
| Tailwind CSS / Framer Motion / Lucide React  | 3.4.19 / 11.18.2 / 0.468.0 |
| React Three Fiber / Drei / Three.js          | 8.18.0 / 9.122.0 / 0.170.0 |
| MediaPipe tasks-vision（直接依赖，精确锁定） | 1.2.2                      |
| Playwright                                   | 1.64.1                     |
| Prettier                                     | 3.9.10                     |

Drei 自带的 tasks-vision 0.10.17 仍保留为嵌套传递依赖。不要为去重而强行升级 Fiber/Drei/React，或使用 `--force`、`--legacy-peer-deps` 掩盖冲突。使用 npm 与现有 package-lock.json；建议 Node 24 LTS，Vite 所需的 Node 22 路径至少为 22.12。

### 已完成验证

- `npm run build:local`：成功。仍有 3D 大 chunk 提示，未把它描述成已解决的首屏性能问题。
- `npx playwright test`：**65 通过 / 0 失败 / 0 跳过，4.7 分钟**；原用例与断言未修改。
- 五组 Node 单元测试：**20/20 通过**（命令见启动章节）。
- Phase 4 六组补充场景：通过，覆盖降级、动作几何、虚拟光照、摄像头取消和业务数据隔离。
- 主线 3D 补充检查：通过，单 Canvas、路由切换实例稳定、模态/后台暂停、WebGL 丢失与缺失时回退 2D。
- 真正的 SDK/WASM/官方模型已用合成视频帧完成加载与推理；手势映射用确定性的测试 Worker 分类结果验证。未实测物理摄像头识别准确率或真实 ESP32，也未据短时采样宣称长期无泄漏。

## 2. 架构与小文件导航

商业级 3D 交互体验由真实沙盒联动、平滑动画、按需渲染、WebGL 降级和摄像头生命周期管理共同支撑；学习业务继续沿用原实现。

```text
真实 CodeRunner → useLearningStore.runtime → Companion → DeskPet3DStage
                                                       → PetModel → usePetAnimation
真实 USB / Node 虚拟光感 → useHardwareStore → Companion → usePetActions.setLight
手动按钮 / useHandGesture → usePetActions.trigger ───────→ interaction props
摄像头 → gestureEngine → 独立 gesture.worker → 本地 MediaPipe 模型
WebGL 不可用 / context lost → Companion2D
```

以下路径均相对唯一主场，行数为封版时的参考值。

| 文件                                       | 行数 | 职责                                                |
| ------------------------------------------ | ---: | --------------------------------------------------- |
| src/features/deskpet3d/DeskPet3DStage.jsx  |  128 | Canvas、相机、控制器、错误边界、命令日志            |
| src/features/deskpet3d/PetModel.jsx        |   69 | 几何体、材质、ref 连接，无业务写入                  |
| src/features/deskpet3d/usePetAnimation.js  |   95 | useFrame、阻尼、move/light/jump/spin/sleep 视觉过渡 |
| src/features/interaction/useHandGesture.js |  157 | 授权、视频、识别调度、取消和资源回收                |
| src/features/interaction/gestureEngine.js  |   67 | Worker 请求、单帧在途、超时、销毁                   |
| src/features/interaction/gesture.worker.js |   39 | 本地 SDK/WASM 加载与 GestureRecognizer 推理         |
| src/features/interaction/gestureGate.js    |   25 | 置信度、稳定窗口、冷却与连续手势去重                |
| src/features/interaction/usePetActions.js  |   25 | 独立、无持久化的展示动作状态                        |
| src/features/hardware/serialConnection.js  |  241 | 串口连接、分行解析、异常处理与关闭                  |
| src/features/hardware/useHardwareStore.js  |   67 | 内存遥测、真实/虚拟连接互斥                         |
| src/features/hardware/virtualSerial.js     |   36 | 本机 HTTP 数据流适配器                              |

主线入口是 `src/components/Companion.jsx`，从原学习 store 只读订阅 runtime。`CodeLab.jsx` 内提供硬件面板及 `GestureControlPanel.jsx`。新状态分别放在 useHardwareStore 与 usePetActions，不扩展学习存档。

本次把原场景中的几何体与帧动画抽出；useHandGesture 已小于 300 行，维持现有拆分。动作算法、材质、命名和测试定位保持原样。以后先定位目标小文件，新增职责及时抽离，避免把场景、摄像头、串口重新堆进单个文件；不要靠压缩代码降低行数。

## 3. 虚拟串口与动作触发

### 虚拟光感

`scripts/virtual-esp32.mjs` 每秒输出一行 JSON，默认 `{"light":300}`。`--dark` 为 50，`--light 80` 指定读数。

Node 程序没有创建操作系统 COM 端口。它还提供仅绑定 `127.0.0.1` 的 HTTP NDJSON 桥，默认 8765；前端点击“连接虚拟光感”后，经相同 provider/read loop/decoder 接收。真实 USB 入口仍使用 Web Serial，两者互斥且默认关闭。

协议兼容 `{"light":300}` 和 `{"temp":25,"light":300}`，没有温度时 UI 显示“—”。内存状态不保存到 localStorage。断开或离开工坊会清理遥测；暗光导致的休眠随之解除。

- `d` + Enter：暗光；`b` + Enter：恢复亮光；数字 + Enter：指定值；`q` + Enter：退出。
- `--port 8766`：自定义桥端口，UI 填相同端口；`--port 0`：测试时自动分配。
- `--samples 2 --no-bridge`：仅输出两条标准流数据，供脚本验证。
- 桥提供 `/health`、`/stream`，仅放行本地 HTTP 开发 Origin 和项目两个 HTTPS 域名。线上访问本机仍受浏览器本地网络权限及混合内容政策约束；验收确认的是本地开发路径。

### 展示动作

- 原 move/light/play 仍由真实沙盒解析并写入原 runtime；本期没有给解析器新增 jump/spin/sleep 指令。
- 手动面板调用 `usePetActions.trigger(type, 'manual')`；手势调用同一展示入口，来源为 gesture。
- jump：约 0.9 秒平滑起落；spin：约 1.3 秒完成一圈并收敛归位。
- sleep：闭眼、暗化、低头、低幅呼吸；wake、jump、spin 可解除手动休眠。
- `hardwareData.light < 100` 优先休眠，恢复到 `>=100` 自动醒来；阈值未跨越时不重复触发。暗光优先于手动/手势动作。
- 减少动画模式关闭大幅跳跃/旋转，保留静态姿态反馈；暂停时停止帧推进，空闲时按需渲染。

## 4. 本地 AI 手势与降级

模型：`public/models/gesture_recognizer.task`，官方 gesture_recognizer / float16 / 1，8,373,440 bytes。SHA-256：`97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482`。来源和模型卡见 `public/models/README.md`。

用户明确开启摄像头后才按需导入引擎并加载同源资源：模型约 8.4MB、WASM 约 14.6MB（未压缩）。WASM 来自安装的 tasks-vision，由 Vite 输出；不是运行时模型 CDN。Vite 使用 ES Worker 与 SDK 开发期预优化，避免首次加载造成整页刷新。

- 仅视频，`audio:false`；优先前置摄像头、320×240、12 FPS。
- 独立 Worker 运行 CPU / VIDEO 模式；每次一帧在途，推理后至少间隔 100ms；视频不录制、不上传。
- Open_Palm → jump；Closed_Fist → sleep。置信度 0.75、稳定 250ms、冷却 1200ms；持续持有同一手势只触发一次，松手或换姿态后再触发。
- 不支持安全上下文、getUserMedia、Worker、WASM 或 ImageBitmap 时禁用入口；权限拒绝、设备/模型异常、初始化 25s 或推理 5s 超时均关闭资源并提示，不阻塞课程。
- 手动关闭、离开页面、切到后台时停止 tracks、Worker、计时器，清空 video.srcObject；晚到的授权流也立即停止。失败后调整权限并刷新再试。

## 5. 必须保持的红线

1. 不改原 useLearningStore 的数据结构、XP/通关/Debug、四路线数据、原沙盒解析规则。学习存档键仍为 `sparkmate.routes.v2`，原 v1 迁移规则保留。
2. 硬件与手势均为隔离展示功能，不触发完成/保存、不写真实学习进度或 localStorage。独立 demo 不得因复用 CodeRunner 意外解锁路线。
3. 保留 Companion2D 与原 2D 资源用于主备切换；四路线教学爆炸图本期保持 2D。主线用真实 runtime，不能换成 DemoCodeRunner。
4. 原 65 E2E 必须全绿，不删、不跳过、不削弱断言。新增测试可以增加总数；测试使用独立端口，不复用或终止用户已有服务。
5. 保留 reduced-motion、后台/模态暂停、焦点与 inert 行为、原音效边界。拒绝权限或缺失能力不能导致白屏；默认不索取摄像头或连接串口。
6. 使用单 SPA 生产入口；不重新引入有部署 404 风险的 demo 多入口。未经任务授权不变更 Vercel 配置、固件或发送硬件控制命令。
7. 后续提交/推送遵循用户当次授权；旧 AGENTS.md 的“验收后自动提交”已被用户交接约定覆盖。禁止擅自发布、打 tag、强推、重置用户改动或修改全局 Git 身份。
8. 若依赖安装/构建出现重大问题，停止并报告，不用强制升级绕过。联网前提醒并确认本机代理可用；本次仅给命令进程设置 `127.0.0.1:7897`，不关闭 TLS 校验、不保存凭据。

## 6. 启动、演示与回归

终端一（PowerShell）：

```powershell
Set-Location 'D:\deepseek_file\ai_deskpet'
git status --short
git rev-parse HEAD
# 首次或锁文件变化时才 npm ci；沿用现有 node_modules 时无需重装。
npm run dev -- --port 5173 --strictPort
```

浏览器打开 `http://127.0.0.1:5173/`，进入代码魔改工坊。运行真实沙盒 move/light 代码可观察主线桌宠；“桌宠动作与手势控制”面板可先用手动按钮验 jump/spin/sleep/wake。

点击开启摄像头并授权，等提示进入识别状态，再张开手掌或握拳。需要有摄像头的安全上下文（本机 loopback 或 HTTPS），首次模型加载可能耗时；可随时关闭。拒绝授权时应出现禁用提示，原课程仍可继续。

终端二：

```powershell
Set-Location 'D:\deepseek_file\ai_deskpet'
node scripts/virtual-esp32.mjs
# 或以暗光启动：node scripts/virtual-esp32.mjs --dark
```

在硬件面板点击“连接虚拟光感”，端口默认 8765。终端输入 d + Enter 后桌宠休眠，b + Enter 后醒来；确认面板显示虚拟来源。测试真实 USB 时先断开虚拟连接，再用“连接真实 ESP32”选择设备。不支持 Web Serial 时入口禁用。

验收命令（另一个终端，确保所选端口空闲）：

```powershell
Set-Location 'D:\deepseek_file\ai_deskpet'
npm run build:local
$env:SPARKMATE_TEST_PORT='5261'
npx playwright test
node --test tests/interaction.unit.mjs tests/serial.unit.mjs tests/code-runner.unit.mjs tests/levels.unit.mjs tests/debug.unit.mjs
# 补充检查需要前述 dev 服务持续运行，URL 按实际端口填写。
$env:SPARKMATE_INTERACTION_URL='http://127.0.0.1:5173'
node scripts/check-phase4-interaction.mjs
$env:SPARKMATE_MAIN_URL='http://127.0.0.1:5173'
node scripts/check-main-deskpet3d.mjs
```

Windows 本地沿用 build:local 包装器；标准 build、qa 流程保留，不把本地通过误报为 Linux/Vercel 或所有 QA 均通过。生产预览可用 `npm run preview -- --port 5174 --strictPort`，并设置相应检查 URL；手势脚本支持 `--model-only --production` 验证生产真实模型。

## 7. 后续维护的最小阅读路径

先读本文并核对指纹，再按任务选择：动作读 usePetAnimation/PetModel；摄像头生命周期读 useHandGesture；推理通信读 gestureEngine/worker/gate；连接协议读 serialConnection/virtualSerial。避免每次通读 App、全部路线或依赖目录。新增核心文件接近 300 行时按职责抽离，保持生命周期归属清楚，拆分后验证行为不变。

细节参考同目录的 [Phase 4 交互说明](phase4-interaction.md)、[Web Serial 说明](web-serial.md)、[3D 桌宠说明](deskpet3d.md)、[架构说明](architecture.md)。本文整理了 Phase 4 的开发记录与维护规范，后续迭代前先核对仓库状态与任务范围。

## 8. 待办池（Backlog）

以下仅为规划，不构成本轮实现或下一轮自动授权：

- 用真实摄像头在不同光照、距离、肤色和浏览器上实测识别率、延迟与误触；增加快速开关和长时间运行资源观测。
- 优化首次模型/WASM 加载进度、缓存与失败重试；评估分包和首屏 3D 体积，保留用户明确开启后的按需加载。
- 研究用户自定义桌宠颜色与外观；另行约定配置存储，避免污染学习数据。
- 将四路线 3D 爆炸图作为独立立项，先验证教学收益与性能，并保留现有 2D 版本；当前不改。
- 真实 ESP32 只读握手、设备身份和协议版本验证；固件、烧录、执行器控制需单独授权和验收。
- 扩展低端设备性能预算与持续内存检查，补充 WebGL 恢复、串口断连和后台切换的长时回归。
