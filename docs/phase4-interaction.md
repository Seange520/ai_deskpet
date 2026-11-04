# Phase 4：虚拟光感、动作库与本地 AI 手势

入口仍在代码魔改工坊。手动动作、摄像头开关和本地预览在新增“桌宠动作与手势控制”面板中。默认不请求摄像头、不连接模拟器、不加载手势模型。原学习 store、运行器、闯关、XP、Debug、四路线和 2D 爆炸图保持原样。

## Node 虚拟光感

```powershell
node scripts/virtual-esp32.mjs
node scripts/virtual-esp32.mjs --dark
node scripts/virtual-esp32.mjs --light 80 --port 8766
node scripts/virtual-esp32.mjs --dark --samples 2 --no-bridge
```

标准输出每秒一行 JSON，例如 {"light":300}。默认亮度 300；--dark 为 50。交互终端输入 d + Enter 切暗光，b + Enter 恢复亮光，数字 + Enter 设置读数，q + Enter 退出。--samples 限制输出次数，--no-bridge 只输出标准流。模拟器绑定本机 127.0.0.1，默认端口 8765；--port 0 可自动分配空闲端口供测试。

Node 进程不是操作系统 USB COM 设备。页面需要主动点击“连接虚拟光感”，通过 loopback HTTP NDJSON 流读取数据，使用相同的串口 provider/read loop/decoder 清理链路。界面显示虚拟来源，不自动伪装或替换物理端口。自定义端口需在面板中相应填写。允许本地开发与项目线上域名 Origin，拒绝其他站点，接口只读；线上页面访问本机服务仍受浏览器的本地网络权限和混合内容政策约束，已验证的是本机开发路径。

协议兼容 {"light":300} 与 {"temp":25,"light":300}，缺失温度显示“—”。断开或离页会清除遥测并唤醒由暗光导致的休眠。

## 动作与优先级

`usePetActions` 仅保存瞬时展示事件与休眠状态，不包含学习数据或持久化。Companion 读取 hardwareData.light 与动作状态，以 props 传给 DeskPet3DStage。场景不直接导入摄像头、SDK、串口或学习 store。

- jump：约 0.9 秒的平滑抬升和落回。
- spin：约 1.3 秒推进至 360 度，阻尼收敛后归一化角度，避免恢复原向时反转一圈。
- sleep：双眼压缩闭合、发光降低、头部下倾，低幅呼吸浮动；醒来平滑恢复。
- 光照 <100 优先休眠，>=100 自动醒来；光照没有跨越阈值时不重复触发动作。暗光期间忽略视觉上的跳跃/旋转，光照恢复会解除休眠。
- 原 move/light/play 解析与状态未增加指令，原沙盒表现照旧；新动作由独立控制入口触发。减少动画模式禁用大幅跳跃/旋转，采用静态休眠反馈，隐藏时沿用暂停。

## MediaPipe 与摄像头

直接依赖精确锁定 @mediapipe/tasks-vision 1.2.2；Drei 的原 0.10.17 传递依赖保留于其子目录，Fiber/Drei/Three/React 版本没有升级。模型为官方 gesture_recognizer float16/1，来源与 SHA-256 见 public/models/README.md。

useHandGesture 负责用户授权、视频与资源生命周期。用户明确开启后只请求视频（audio:false），优先前置摄像头、320×240 / 10 FPS，使用 ideal facingMode；仅在约束不兼容且会话仍有效时退回通用视频请求，不重试权限拒绝。授权成功后按需创建独立 Worker，以本地 WASM 与模型运行 GestureRecognizer 的 VIDEO 模式。Worker 检测 navigator.gpu，存在时尝试 GPU delegate；初始化异常则重试 CPU，不存在则直接 CPU，两者失败沿用原禁用降级。每次只有一帧在途，推理开始时间间隔至少 100ms，按已耗时调度下一帧，最高 10 FPS；视频不录制、不上传。ImageBitmap 在 Worker 或取消路径释放。

Open_Palm → jump；Closed_Fist → sleep。采用 0.65 置信度、150ms 稳定窗口、1200ms 冷却，并对持续手势去重；识别到其他姿态或丢手后才允许再次触发。手动按钮也能独立预览 jump/spin/sleep/wake。

首次开启按需加载约 14.6MB WASM 与 8.4MB 模型（未压缩体积），不会进入默认首屏下载；由站点同源提供，不依赖运行时模型 CDN。Vite 使用 ES Worker 格式并固定 SDK 开发期预优化，避免首次开启引发整页刷新。

能力检查覆盖安全上下文、getUserMedia、Worker、WebAssembly 和 ImageBitmap。拒绝权限、设备/模型异常、初始化超过 25s 或单帧推理超过 5s 均捕获、关闭摄像头并禁用手势入口，提示刷新/调整权限；课程和手动动作仍可操作。关闭开关、离页、页面进入后台时停止 tracks、定时器和 Worker，清空 video.srcObject；迟到授权得到的流也立即停止，不会重新打开摄像头。

## 状态展示与移动端适配

面板在初始化成功后才显示实际 GPU/CPU 模式，同时展示运行指示灯、当前英文手势名和 WebGPU API 能力；没有手势显示 None，关闭/失败后清空引擎和手势状态。GPU 初始化失败时显示已切换 CPU。MediaPipe 的 GPU delegate 不等同于 WebGPU 后端，当前 SDK 使用 WebGL 上下文，部分模型算子仍由 CPU 执行；不把能力探测当成推理后端或性能保证。

USB 串口仍按 getBrowserSerial 的能力探测禁用，不按手机 UA 禁用；缺失能力时明确提示「当前设备不支持 USB 连接，请在电脑端体验」，不会弹权限或自动连接。摄像头能力与 USB 独立，在支持的移动浏览器上继续提供显式开启入口。

硬件控制区用响应式单列/双列/桌面布局；小屏手动动作两列，主要触摸按钮至少 44px。聚焦视图短屏可滚动，加入安全区边距；画布的 touch-action:none 将手势交给 OrbitControls，画布外仍可滚动，不在全局屏蔽触摸。小屏（宽度 <=700px）或 hardwareConcurrency <=4 / deviceMemory <=4 的设备按 DPR 1 渲染，其他聚焦设备上限 1.5；没有 WebGL 时沿用原 2D 回退，不依赖 WebGPU 才能显示 3D。

## 验证边界

- 原 `npx playwright test` 仍为 65 项，未修改已有用例或断言。
- `node --test tests/gesture-adaptive.unit.mjs`：GPU/CPU 成功与失败回退、0.65/150ms 边界、摄像头约束兼容及取消/拒绝时不二次申请。
- `SPARKMATE_ADAPTIVE_URL` 指向独立开发服务后运行 `node scripts/check-adaptive-mobile.mjs`：使用确定性 Worker 分类验证引擎状态、推理限速、单帧在途、移动摄像头约束回退、USB 禁用、低端 DPR、真实浏览器触摸旋转/双指缩放及短屏滚动。报告与截图位于 `test-results/`；真实 SDK 推理另由下列 Phase 4 脚本验证。
- `node --test tests/interaction.unit.mjs tests/serial.unit.mjs`：光照阈值、真实 Node 数据流、手势去重、Worker 取消/超时及原串口生命周期。
- `node scripts/check-phase4-interaction.mjs`（SPARKMATE_INTERACTION_URL 默认 http://127.0.0.1:5252）：权限拒绝/缺失/迟到/模型失败降级，实际几何位置/旋转/闭眼低头，Node 键盘明暗与自动休眠/唤醒，业务内存与存档不变，摄像头关闭和 Worker 释放。
- `--model-only --production` 可对生产预览独立运行真实 MediaPipe 模型，使用合成视频帧；生产模式不依赖 Vite 内部模块探针。

推理启动验证使用真正的本地 SDK/WASM/官方模型；手势到动作的确定性检查使用测试 Worker 分类结果；没有调用真实摄像头或对真人手势准确率作实测保证。合成流、mock 分类结果与物理设备验证分别记录。

参考：[Google Gesture Recognizer Web 指南](https://developers.google.com/edge/mediapipe/solutions/vision/gesture_recognizer/web_js)。

## 本次文件清单

修改文件：

- package.json、package-lock.json：精确锁定直接依赖，保留 Drei 原依赖。
- vite.config.js：ES Worker 与开发期 SDK 预优化。
- src/components/CodeLab.jsx：新增手势面板。
- src/components/Companion.jsx：读取隔离动作与光照状态，传入展示组件。
- src/features/deskpet3d/DeskPet3DStage.jsx：动作与睡眠姿态。
- src/features/hardware/HardwareConnectionPanel.jsx、hardware.css：虚拟入口与来源说明。
- src/features/hardware/serialConnection.js：light-only 兼容与可取消虚拟连接。
- src/features/hardware/useHardwareStore.js：真实/虚拟连接互斥，继续使用临时遥测。
- docs/web-serial.md：更新数据协议与虚拟连接边界。

新增文件：

- scripts/virtual-esp32.mjs、scripts/check-phase4-interaction.mjs。
- src/features/hardware/virtualSerial.js。
- src/features/interaction/usePetActions.js、useHandGesture.js、gestureEngine.js、gesture.worker.js、gestureGate.js、GestureControlPanel.jsx、interaction.css。
- src/features/deskpet3d/PetModel.jsx、src/features/deskpet3d/usePetAnimation.js：分别隔离几何体与帧动画，DeskPet3DStage 仅保留场景编排、相机、降级及日志。
- tests/interaction.unit.mjs。
- public/models/gesture_recognizer.task、public/models/README.md。
- docs/phase4-interaction.md（本文）。

共修改 11 个文件、新增 16 个文件；截图与报告位于已忽略的 test-results，依赖安装内容位于已忽略的 node_modules。
