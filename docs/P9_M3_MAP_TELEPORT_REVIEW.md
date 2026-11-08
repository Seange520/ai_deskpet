# P9-M3 大地图、实时小地图与三段传送（待审核）

日期：2026-11-08。唯一主仓库 D:\deepseek_file\ai_deskpet。

## M2 封板事实

用户批准 M2 并指定提交内容后，README、package.json、package-lock.json 根版本统一为 0.9.7-alpha。构建成功，暂存并提交当时所有 28 个改动文件。完整本地提交：
e507effc08cb153392c7a1429e7b8eb19756a3cd

提交标题与四条正文严格使用用户原文。未打新标签、未推送、未部署。M2 提交完成时工作区干净；之后的改动属于本次 M3，保留未暂存、未提交状态供审核。

## 入口与体验

仍以 ?quality=3&world=p9 进入，点击「开始自由探索」。M 打开群岛大地图，鼠标点击或键盘 Tab/Enter/空格选择 HUB/四岛锚点，从当前 TPS 或 FPS 机位启程；保留到达后的当前视角模式与方向。Esc 优先关闭地图，再按可退出探索返回教学。

右上角小地图为 SVG 2D 俯视简图，与大地图共用同一锚点坐标。SVG 是此处的轻量 2D 实现，没有新增 WebGL renderer、Canvas2D、RT 或地图渲染 pass。玩家位置正常探索约每 100ms 更新，传送期间逐帧更新；箭头显示朝向。北为 -Z，地图 x/z 线性映射到 viewBox [-24,24]。移动端小地图缩小并避开触控区。

地图按钮是真实可聚焦的 SVG 交互锚点，文字用 SVG text，支持鼠标与 Enter/空格；关闭按钮是原生 DOM button。地图包含焦点循环与返回焦点。M 热键忽略输入框、文本域、select、contenteditable 及修饰键/重复键；不会在写代码时抢走 M。打开地图冻结角色物理，清空按住的移动/跳跃/摇杆输入，并释放指针锁定。

## 三段式传送与相机所有权

当前低档 P8 的原航行仍是 2.40 秒五段时间线，未冒称已有三段实现，也没有修改原 travelTimeline.js。本轮按 DSH P9 计划建立新 sampleTeleport：

| 阶段 | 时长 | 行为 |
| --- | --- | --- |
| 蓄力 charge | 0.28s | 当前镜头轻后拉；FOV 相对收窄 7°；人物消散 0→1 |
| 冲刺 dash | 0.55s | buildTravelCurve 的抬升样条，位置 smoothstep；四元数插值；FOV 由 -7° 到 +12°；960 粒子随角色航行 |
| 落位 settle | 0.32s | 小幅垂直回弹；FOV 回原值；粒子聚合、人物恢复，交回 KCC |

总活动时长 1.15s；后台/模态冻结活动计时，恢复时 delta 上限 0.05，不按长墙钟追赶。减少动态效果时直接提交落点，不播放飞行与消散。

传送分支直接集成到现有唯一 Player 相机 useFrame，没有新增会同时写相机的控制器；返回正常角色相机前，精确提交相机终点、角色 kinematic 位置、next kinematic translation，并清除垂直速度。地图打开时 Physics 暂停，飞行时跳过 KCC 自由移动；飞行期间拒绝重入目的地和视角切换。退出探索或切档会取消本次会话传送。

粒子直接复用 P8 PetDissolve 的表面采样、噪声遮罩、960 粒子与 Toon onBeforeCompile 串接，使用其外部 amount 接口和非正 useFrame 优先级；没有复制一套假粒子或新建后期。角色面屏也使用 Toon 材质以参与完整消散。HUB 落点 [0,0.70,1.6]；各岛落点为锚点加 [0,0.70,-2.6]，避开中心建筑，随后由原 KCC 落到约 Y=0.673。

初始化/减少动画专项实际发现 Ecctrl 内部每次重绘创建的新 userData 会令 Rapier 从旧显示矩阵重置刚体位置。为角色传入稳定 userData 引用，并等待真实输入表面就绪才创建物理世界，修复直接落位被出生点覆盖的问题。没有以放宽坐标断言规避。

## 档位与业务隔离

- Tier 3 探索：新三段式传送、粒子重组、实时玩家小地图。
- Tier 3 仅预览：地图锚点选择对应观察机位，不暗改被隐藏的教学路由。
- Tier 1/2 教学：地图锚点触发现有原生导航按钮，保持 App 路由、键盘语义与原 P8 TravelRig 行为；低档不加载新物理/GLB。Tier 1 依现有降级直接切换，Tier 2 保留原航行/减少动画行为。
- Tier 0：同一 DOM/SVG 地图仍可导航，无 Canvas。

导航、地图状态均为会话内存，不写学习或画质存档；没有改 XP/奖励/关卡、USB、真实 CodeRunner 或业务 Store。原 PetDissolve、TravelRig、travelTimeline 未修改。M3 无新增依赖、没有版本再升级。

## 验证与截图

- 原 E2E 67/67（2.8 分钟），失败/跳过 0；原 tests 未修改。
- 既有画质/飞行单测 7/7；新增 teleport-timeline.unit.mjs 1/1，验证两处阶段边界的位移/FOV/消散连续、范围与终点。
- M3 专项 6/6，正常页面 pageerror=0：实际 M/点击、地图冻结、TPS 飞行/960 粒子/落地；FPS 保持与硬件岛落地；真实键盘 Enter 与重复传送至代码岛、HUB；小地图坐标/分层 Esc/同 Canvas/存档不变；Tier 1/2/0 原生导航且首次请求无物理/模型；减少动画直接到排位岛。
- M1 专项复跑 8/8，pageerror=0，保留坡阶、跳跃、视角、触控、暂停/恢复与退出。
- 最终生产构建 2849 modules / 11.56s，入口 482.28kB / gzip 162.57kB。地图 JS 约 3.9kB，独立导航状态块 653 字节；原大包提示保留。
- 全量 E2E 在最后的探索专用 userData/面屏与 SVG 锚点修正前运行；最终 M1/M3 专项及构建在这些修正后通过。没有把早期失败的减少动画试验记为通过。

证据目录：
C:\Users\Senage\.codex\visualizations\2026\11\07\01a1b693-ded6-7e71-9e57-3be30f4fe3f6\sparkmate-p9-m3

m3-world-map.png 为 M 键打开的实际大地图。
m3-flight-mid.png 为点击学习岛锚点后冲刺阶段的真实帧，采样约 0.47s，角色约 [0,3.89,5.32]，相机约 [0,4.94,1.07]，实际 960 粒子可见。
m3-minimap-ui.png 为学习岛落地与实时右上小地图。
三图均 1728×1080 / DPR 1、完整 UI，无相机注入、暂停时钟、调色或重绘。m3-checks.json 保存位姿与结果；m1-regression 保存 M1 复验；review-manifest.json 保存源码和截图哈希。没有宣称实体移动设备、60 FPS 或长期 GPU 内存已验证。

## 复跑

所有命令显式以唯一主仓库为 workdir。正常服务 15262 已核对 PID 8876 的 Vite 命令路径；原 E2E 用独立 15261。

```powershell
$env:SPARKMATE_TEST_PORT='15261'
npm run test:e2e
node --test --test-isolation=none tests/m2-quality.unit.mjs tests/quality-tier.unit.mjs tests/travel-timeline.unit.mjs tests/teleport-timeline.unit.mjs
node scripts/check-world-m3.mjs
node scripts/check-world-m1.mjs
npm run build:local
```


后续视觉换装已将小地图背景升级为 Canvas2D 材质缩略图，SVG 保留玩家箭头与大地图可访问锚点；以上是 M3 最初阶段记录。最新实现与复测见 [视觉换装审核](P9_SKIN_REVIEW.md)。
