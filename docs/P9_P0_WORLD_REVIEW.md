# P9 P0 世界骨架：首个灰盒切片（灰盒已获用户认可）

日期：2026-11-07。唯一主仓库 D:\deepseek_file\ai_deskpet；起点 main / b942a1f8da48a9e214bb0da25f16d7489ee99e67 / v0.9.6-beta。版本号未变，无提交、标签或推送。P9 全计划尚未完成。

## 报告与当前源码的映射

依据仓库外 P9_OPEN_WORLD_RECON_REPORT.md（2026-11-07），以当前 P8-M3 源码而非报告的旧 220cee2 为实施基线。保留真实坐标：学习 +Z、硬件 +X、代码 -Z、排位 -X，环半径 16。没有采用报告示意图中的另一套方位。

| 路径/模式 | 场景 | 相机与输入 | 画质与依赖 |
| --- | --- | --- | --- |
| 默认教学，各档 | 原 space/WorldScene | 原 TravelRig、DOM 导航与教学键盘 | 原 v0.9.6-beta 管线；Tier 0 零 Canvas |
| world=p9 且 Tier 3 | 懒加载 world/WorldScene | 独占 SurveyCamera，FOV 65，五个原生按钮机位；Esc 返回教学 | P0 静态原色灰盒，无后期，无物理、贴图或新包 |
| world=p9 且 Tier 1/2 | 原 space/WorldScene | 原 TravelRig 与教学输入 | 不请求 P9 场景模块，不改变既有档位定义 |
| world=p9 且 Tier 0/模块失败/WebGL 丢失 | 原 DOM 教学与 ValleyFallback | 原导航与表单 | 零 Canvas，保留可用教学 |

这是一条明确选择的预览路径，不是将当前 Tier 3 宣称为 P9 极质画质。入口为 http://127.0.0.1:15262/?quality=3&world=p9 。不带 world=p9 的页面不展示预览控件。预览入口没有改学习或画质持久化键。

## 灰盒内容与交互

- src/features/world/poi.js 定义四岛锚点、五个观察位和基本尺度。约定 1 Three 单位为未来 1 米、地面 Y=0、Y 向上；这是设计约定，尚无物理系统验证。
- Macro 为四根偏置标柱与半径 85 的程序化远山；Meso 为四岛、枢纽、书页/芯片/数据幕/尖塔剪影、环形连廊与四条辐射桥；Micro 为近景遗迹块和标牌占位。颜色用于辨认方向。
- 场景复用 Stage renderer。预览挂载时原 WorldScene、TravelRig、后期和旧投影整体卸载，避免同帧争抢相机；退出时原 TravelRig 根据现有 spaceStore 恢复。未修改原飞行时间线或状态枚举。
- 原教学树保留挂载，通过 inert 与 visibility 隔离焦点/命中；预览按钮为真实 DOM，进入和退出恢复焦点，Esc 退出。Canvas 继续 pointer-events:none 和 aria-hidden，不申请指针锁定、不安装全局 WASD。
- 灰盒为 demand 渲染，改变机位时 invalidate。无 useFrame 正优先级，无新增 renderer/composer/RT、计时器或随机动画。几何和材质由 R3F 挂载生命周期释放，继续复用每 Canvas 独立的 ToonPalette。

## 后续 P1 契约（待实现）

P1 在此预览分支内接入 Rapier 原生 KCC，默认 TPS、可切 FPS；初始化成功后再移交相机。TravelRig/SurveyCamera/玩家相机应通过互斥挂载维持单一所有者。选择兼容 React 18 / Fiber 8 的确定版本前，须核验官方文档和 peerDependencies，不能直接安装面向 Fiber 9 的最新版封装。

物理拟采用固定 1/60 秒，每物理子步积分垂直速度、计算 KCC 校正位移，再提交 kinematic body；后台/模态暂停且不补积大段墙钟时间。报告里的 vary 与每帧减 gravity*dt 伪代码不能当作完成的实现。坡度/台阶/snap 参数要通过实际碰撞台验证。灰盒桥面尚为可见几何，环形道路为双面平面，均没有碰撞体，不能宣称现在已经可走。

探索输入只由显式探索表面接收；表单、可编辑区域、模态、焦点离开和教学模式清空输入。指针锁定必须由用户手势触发，Esc/退出/切档/故障/失焦释放。移动端摇杆、相机碰撞、WASM 失败均需单独测试。低档不得强制请求物理 WASM。

P2 传送、P3 PBR/NPR 混合和 P4 地图均未实施。报告帧率/显存目标不是本轮测量；未来地图仍复用 renderer，恢复进入时的 RT/viewport/scissor 状态。

## 证据与复跑

专项 scripts/check-world-p0.mjs：11/11，正常页面 pageerror=0。五个 FOV 65 机位逐一截图，并检查 Macro/Meso/Micro 各有对象中心在相机视锥内；这不是像素级遮挡判定或任意自由机位的三层保证。五方向截图供人工构图审核。

其余六项覆盖：URL 移除预览标记后教学焦点恢复、Esc/同 Canvas/教学导航恢复、实时 3→2→1→3→0 与学习存储不变、首次 Tier 0/1/2 不请求 P9 场景、真实中断模块请求后 DOM 代码工坊可操作、真实 WebGL context loss 后零 Canvas。

本机 Stage 静态采样：全景 51 draw / 1096 三角形；四向近景 13–21 draw / 390–426 三角形。数据不含伙伴 Canvas，无 FPS、实体手机或长时显存结论。

产物：C:\Users\Senage\.codex\visualizations\2026\11\07\01a1b693-ded6-7e71-9e57-3be30f4fe3f6\sparkmate-p9-p0 。p0-0.png 为全景，p0-1..4.png 按学习/硬件/代码/排位排序。1728×1080、DPR 1，真实按钮机位，无调色、重绘或测试专用相机。p0-checks.json 保存专项数据。

回归结果：原 E2E 67/67（4.7 分钟）、画质/飞行单测 7/7、M3 11/11、NPR 9/9。NPR 首次与其他浏览器套件并行时 Stage 初始化超过原 5 秒等待；独立复跑通过，未改原断言。最后仅补 URL 退出保护后，P0 再跑 11/11，原 Stage 导航/Canvas 两项针对最终源码再跑 2/2。最终生产构建成功：2776 modules，24.00 秒；P9 场景约 3.40 kB / gzip 1.34 kB，主入口 480.52 kB / gzip 161.93 kB，原 Three 核心与 500 kB 提示保留。学习/硬件 Store、原 tests、依赖清单及版本均未修改。

用户在后续正式指令中已认可灰盒构图和基线自证；以下为 P0 当时的实现记录，后续物理状态见 P9_M1_EXPLORATION_REVIEW.md。本切片不作为 P9 自由探索或极质画质验收。

所有命令显式以主仓库为 workdir；正常服务 15262 已核对 PID 30316 的 Vite 路径来自主仓库，E2E 使用独立 15261。

```powershell
$env:SPARKMATE_TEST_PORT='15261'
npm run test:e2e
node --test --test-isolation=none tests/m2-quality.unit.mjs tests/quality-tier.unit.mjs tests/travel-timeline.unit.mjs
npm run build:local
node scripts/check-world-p0.mjs
node scripts/check-toon-poc.mjs
node scripts/check-lore-m3.mjs
```
