# SparkMate v0.9.4-beta P0 审核报告

日期：2026-11-05。唯一主场：`D:\deepseek_file\ai_deskpet`。
基线仍为 main / `0e46b4929f792bb6aa3f9de73519962d5318eb7e`。
本报告记录 P0 审核时的工作区，审核时的包版本为 0.9.3-beta。

## 实现与资源边界

- `src/main.jsx` 在原 App 外组装 QualityProvider / StageLayer。固定 CSS 底层 z=0、SceneCanvas z=1、HUD z=2；原 App 状态导航、业务层级、按钮语义和 View Transitions 实现保留。
- SceneCanvas 在原页面状态切换之外保持挂载，使用 Drei View 按 Hero artwork 的 DOM 矩形进行裁切。Hero 离开页面时只隐藏/暂停 Stage，不重建 renderer。滚动和尺寸变化触发必要重绘，绘制前清帧，避免轨迹残留。
- Tier 1–3 最多两个 WebGL renderer/context：新增 Hero Stage，以及原常驻/聚焦伙伴共用的 Canvas。新增 Stage 替代原 Aurora 的 GPU 上下文预算；聚焦只移动原伙伴 Canvas，不创建第三个 renderer。
- Tier 0 无任何 Canvas，保留原 Hero SVG/CSS、DOM 常驻伙伴、文字和操作。原 Aurora 与 HeroParticles 文件保留，但不在本轮主入口挂载；不把其 WebGL/Canvas2D 误称为纯 DOM 降级。
- 使用已有几何组合与圆角外壳作为占位模型，保留 command-pet、command-head、command-eye 命名及原命令、手势、摸头逻辑。材质改为 MeshPhysicalMaterial，外壳 clearcoat=0.85、clearcoatRoughness=0.18；Tier 1 关闭清漆。
- Tier 2–3 使用 Environment resolution=256 / frames=1 与三盏 Lightformer：#ffcf9e、#8ea0d8、#ffb0a8，同步定义于 design.css 的 Stage Token。昼夜切换重新捕获一次，不持续生成环境贴图。
- 无新增模型/纹理请求、实时阴影或后处理 pass；指定后处理依赖已安装，EffectComposer 与高级效果留待后续明确任务。

## 画质策略

| Tier | 入口与资源预算 |
| --- | --- |
| 0 | `quality=dom` / `quality=0`；移动、粗指针、无 hover、低 CPU/内存或省流量默认进入；无 Canvas |
| 1 | `quality=1` 或 GPU/性能降档；Stage DPR 上限 1，无环境贴图、无清漆，静态展示动作反馈 |
| 2 | 普通桌面初始档，或 `quality=2`；Stage DPR 上限 1.25，256 环境贴图与物理材质 |
| 3 | 仅 `quality=3` 显式开启；Stage DPR 上限 1.5，其余沿用 P0 保守效果预算 |

自动 GPU 检测使用 Drei useDetectGPU，复用已创建 Stage 的 glContext；已有 detect-gpu 本地基准数据按需分包，不运行时访问 CDN，不额外创建探测上下文。GPU 结果只能下调设备初始档，不会把移动/低端升为高档；未知 GPU 保持设备默认档。

URL 覆盖用于显式选择画质；WebGL/加载故障仍强制 Tier 0，运行时性能下降可以继续下调。所有画质与故障状态只在 React 内存中。AdaptiveDpr 响应交互负载，PerformanceMonitor 仅在连续帧采样后降档，按需渲染的闲置间隔不作为低 FPS。后台、模态、聚焦、离屏暂停 Stage；减少动画保留静态画面与必要状态反馈。

## 验收证据

- 最终 `npm run test:e2e`：66 expected / 0 unexpected / 0 skipped / 0 flaky，HTML 报告 ok=true。
- 原 65 项的 test 调用 AST（46 个声明展开为 65 个运行用例）与 HEAD 一致，测试正文及断言未改变。
- 默认通过 `SPARKMATE_TEST_QUALITY=dom` 和测试夹具，在 App 初始化前将 `quality=dom` 注入页面 URL。原 2 项真实模型位移/眼睛材质断言显式使用 Tier 2，其余 63 项为 DOM。新增 1 项同时检查 WebGL 上下文、实际三角形绘制、Canvas 导航身份和 DOM 零 Canvas 回退。
- `node --test tests/quality-tier.unit.mjs`：3/3 通过，覆盖 URL、设备门控、GPU 降档边界和 DPR 预算。
- 正常环境独立端口 15262、无 regression 参数：`scripts/check-stage-quality.mjs` 9 组通过；包括实际物理材质/环境贴图、DPR、重复导航身份与 localStorage 不变、模态/后台/离屏暂停、聚焦原 Canvas 复用、真实 context loss、Tier 0/1/2/3、移动/低 CPU、正常动画与原生导航。
- 另补验 WebGL 初始化失败和 Stage JS 模块加载失败：2/2 通过，均保留三个 article 和导航，且无 Canvas。
- `npm run build:local`：成功，2643 modules；主入口 JS 457.24 kB，Stage chunk 23.35 kB，原伙伴 chunk 19.85 kB，共享 3D/环境 chunk 900.83 kB。共享大包告警仍存在，未宣称解决全部加载体积问题。
- React / React DOM 18.3.1、Fiber 8.18.0、Drei 9.122.0、Three 0.170.0 保持不变。新增直接依赖仅精确版本 @react-three/postprocessing 2.19.1、postprocessing 6.39.6；npm 同时新增其正常传递依赖 n8ao 与嵌套 maath。
- 主学习 Store、CodeRunner、硬件 Store/共享串口解码、环境 Store 无改动；无新 localStorage 持久化。

脚本仅精确放行原液态玻璃依赖的 lighting-color / lightingColor 告警；原 E2E 控制台断言未放宽。

## 截图与复跑

审核截图与专项 JSON 已另存至当前聊天的 visualizations/sparkmate-p0 目录，避免后续 Playwright 清理 test-results 时丢失。包含桌面 Tier 2、同尺寸桌面 Tier 0、移动自动 Tier 0 全页及 Hero。

复跑前检查独立端口空闲，所有命令显式 workdir 为主场：

```powershell
$env:SPARKMATE_TEST_PORT='15261'
npm run test:e2e
npm run build:local
node --test tests/quality-tier.unit.mjs
# 另起正常服务，不设置 VITE_SPARKMATE_ENVIRONMENT
$env:SPARKMATE_STAGE_URL='http://127.0.0.1:15262'
node scripts/check-stage-quality.mjs
```

浏览器能力和后台部分分支采用模拟；截图使用桌面 Chrome 的移动视口，不等同于实体手机或所有 GPU 的长期性能验收。当前为几何占位模型，尚未接入 GLTF 资产或后期处理效果。
