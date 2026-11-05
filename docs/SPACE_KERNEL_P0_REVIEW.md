# SparkMate v0.9.4a1-beta Space Kernel P0 审核报告

本轮交付全屏世界基座、四岛机位和空间导航。本报告记录本阶段实现与验收，开发基线为 `a8c389131aac8733f1bcd22586025f5899ed40a2`，阶段版本为 `0.9.4a1-beta`。

四岛坐标、相机姿态和 HUD 侧边依据本轮给出的原点、半径 16 与四岛约束补定，待与 DSH 原稿对照。

| 岛 | 世界坐标 | 相机位置 | FOV | 宽屏 HUD |
| --- | --- | --- | --- | --- |
| dashboard | (0, 0, 16) | (3, 6.7, 27) | 43° | 左 |
| hardware | (16, 0, 0) | (27, 6.7, −3) | 43° | 左 |
| code | (0, 0, −16) | (−3, 6.7, −27) | 42° | 右 |
| ranking | (−16, 0, 0) | (−27, 6.7, 3) | 44° | 右 |

## 实现

- `src/features/space/world.js` 定义 HUB、岛位、注视点与机位。CatmullRomCurve3 以相机当前世界坐标为起点，弧线默认抬升 5 个世界单位。重复改向会收敛到目标高度预算。
- 独立 Zustand store 管理 `idle → departing → traveling → arriving → idle`。请求编号防止过期飞行覆盖新目标。每帧时间、曲线采样、四元数 slerp、FOV 和景深目标插值由 R3F 内部更新。 抵达帧直接应用目标机位和景深坐标，消除末帧浮点残差。
- 全屏 Canvas 承载四个占位岛、发光底座、中心信标、环线、星点和暮色 `fogExp2`。保留 Bloom、ACES、Vignette、FXAA、Tier 3 DoF，以及仪表盘岛的原桌宠与 GPU 粒子。动态景深目标随航段移动并在目标岛落位。
- HUD 继续渲染原页面组件与玻璃层。飞行时退出旧面板，抵达时从配置侧边弹簧滑入。导航坞在飞行中可操作。Tier 0/1 使用原 `navigateWithCamera` 路径，减少动画时执行跳切。模态与后台继续暂停场景。
- 显式 URL 画质用于锁定演示档位。自动选档继续使用 GPU 探测和性能监测。DPR 上限与 WebGL 故障降级继续生效。

## 验收

- `npm run test:e2e` 通过 66/66，失败 0，跳过 0。原用例和断言保留。
- `npm run build:local` 成功。主入口 458.81 kB，Stage 分包 122.09 kB，共享 3D 分包 901.38 kB。Vite 仍报告共享分包体积告警。
- 独立正常服务的 Space Kernel 专项通过 6/6。Tier 3 仪表盘至硬件岛实测 **2.305 秒**，镜头采样高度由 6.73 升至 11.23。专项覆盖四岛、全屏渲染、HUD 出入、景深目标、重定向、Canvas 复用、WebGL 丢失、跳切和 localStorage 隔离。
- Stage 专项通过 9/9，后期专项通过 7/7。检查覆盖玻璃 HUD 对应的导航入口、画质门控、聚焦 Canvas 复用、模态暂停及后期资源抽样。
- 主学习 Store、依赖清单和测试文件均通过工作区差异核对。

Tier 3 飞行途中和硬件岛抵达截图位于当前聊天的 `sparkmate-space-p0` 截图目录。该次测量使用 1728 × 1080 Chrome 视口。

```powershell
$env:SPARKMATE_TEST_PORT='15261'
npm run test:e2e
npm run build:local
# 在独立空闲端口启动正常服务后执行
$env:SPARKMATE_SPACE_URL='http://127.0.0.1:15262'
node scripts/check-space-kernel.mjs
```
