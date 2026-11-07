# P8-M0 Toon POC 审核说明（阶段历史记录）

以下记录 M0 打样时的状态与证据；后续 M1 调优已通过总指挥视觉审核，并与 M0 一起封板为 `v0.9.5-alpha`，当前状态见 `P8_M1_LIGHTING_REVIEW.md`。

M0 打样时是待总指挥视觉审核的未提交垂直切片。封板 HEAD 仍为 `b05b80d83c557ded3748c69a45c6f32743a93c59`，不修改版本号，不提交或推送。

## 实现范围

- 每个 Canvas 独立持有 CanvasTexture 灰度色阶，Tier 1 三阶，Tier 2/3 四阶，NearestFilter、NoColorSpace、无 mipmap。卸载/切换色阶时释放。
- 方块 PetModel 的所有实体材质改为 MeshToonMaterial。保留 command-pet / command-head / command-eye、动作、摸头、真实 LED 亮度 0.15/2.2。原版基线实际是几何眼睛；本轮补上 256×128 CanvasTexture 屏幕底纹，并继续由几何眼睛承接真实状态。
- Observatory 底座、顶面、环轨 Toon 化，其他岛主体保留基线。公共能量轨和背景山脊接入 Toon，山脊补法线并使用平面色块。
- Observatory 外圈原创程序化浮空幼苗：Tier 2/3 为 28 株、Tier 1 为 12 株，两次 InstancedMesh 绘制。低档、暂停与减少动画时停摆。
- 光照改为弱环境光、强方向主光与弱补光；退出 PMREM，消除桌宠清漆/金属反射。保留昼夜、休眠和岛屿氛围状态消费。
- 沿用一个 Stage composer，选择性泛光只选择眼睛、植物灯和轨道光点；POC 不挂载 SSR/GTAO/DoF/飞行模糊，保留 ACES、轻暗角、FXAA。
- 屏幕描边由 pmndrs 选择 Outline 与基于现有深度缓冲的 DepthInk 补充。所锁定管线中的选择 Outline 在当前机位没有产生可测的可见贡献，因此不能以对象存在判定成功；本轮可见深色轮廓由 DepthInk 确认。DepthInk 不增加 normal pass 或独立 RT，像素消融纳入专项。后续可继续评估选择 Outline 的必要性、透明物 mask 与线宽。
- Tier 3 单盒 24 步轻量体积云，远景低密度，不开新 renderer。Tier 2/1 无云，Tier 1 无描边/后期，Tier 0/quality=dom 零 Canvas。
- Stage 和常驻/聚焦伙伴仍最多两个 renderer。新纹理、后期、selection 层和灯光层有各自释放/恢复路径。PetDissolve 支持 Toon 材质采样和原有消散补丁。

## 可复验命令

先检查端口空闲。E2E 使用自身 regression 服务，专项使用独立正常服务，不混用。

```powershell
$env:SPARKMATE_TEST_PORT='15261'
npm run test:e2e
node --test --test-isolation=none tests/m2-quality.unit.mjs tests/quality-tier.unit.mjs tests/travel-timeline.unit.mjs
npm run build:local
# 另启正常 Vite：npm run dev -- --port 15262 --strictPort
$env:SPARKMATE_SPACE_URL='http://127.0.0.1:15262'
node scripts/check-toon-poc.mjs
```

NPR 专项 9/9：真实材质/共享色阶、屏幕纹理、云档位、最多两个 Canvas、四岛导航/同 Canvas/存档不变、CodeRunner LED、实时降档、真实 WebGL 丢失回退、DOM 工坊、正常动画飞行与快速改向，以及深度描边和选择性泛光的像素消融。

最终冻结后验收：E2E **67/67**，既有画质/飞行单测 **7/7**，NPR 专项 **9/9**（控制台错误 0），生产构建成功（2759 modules，约 6.75 秒）。Three 核心 687.94 kB / 177.41 kB gzip，仍有原分包体积提示。

## 视觉证据

聊天产物目录：`C:\Users\Senage\.codex\visualizations\2026\11\07\01a1b568-23d3-7450-9b50-f707be65c0fd\sparkmate-p8-m0`。

- `comparison-a11-vs-toon.png`：左 a11，右 Toon，同 dashboard 近景机位、1728×1080、DPR 1、Tier 3、减少动画、默认 LED 灭。按原像素横向拼接，上方加标题，无调色或重绘。
- `comparison-pet-1to1.png`：双方同一区域原像素裁切，方便检查边缘。
- `toon-dashboard-ui.png`、`toon-world-ui.png`：保留教学 DOM 的当前界面。
- `toon-led-on.png`：真实运行代码后的点亮效果。
- `toon-dom.png`、`toon-tier1.png`：降级证据。
- `toon-poc-results.json`、`comparison-metadata.json`：专项结果与比较图来源、条件、SHA256。

场景纯画面截图仅在浏览器截图检查时隐藏 HUD；产品内教学 DOM 没有移除。原版图片在修改源码前拍摄。

## 边界与后续审核

本轮没有新增依赖、外部模型、下载贴图或商业资产。原创程序化几何按总指挥本轮要求用于 POC，不作为后续正式角色/生态资产定案。未实现角色面部 SDF、VRM、骨骼或长期剧情，未改教学 store、CodeRunner、XP、关卡与持久化键。

深度描边对透明标签、细轨和远景仍可能出现轮廓叠加/细线跳变，体积云为轻量单盒试验；这些均需视觉审核继续收敛。验收使用本机 Chrome/WebGL，不能推导实体移动设备帧率或长期 GPU 内存结论。原 500 kB 构建分包提示保留。历史后期专项断言包含 PBR/SSR/DoF 方案，本轮未改写它们，也不将历史结果算作 NPR 的通过证据。

技术参考：[MeshToonMaterial](https://threejs.org/docs/#api/en/materials/MeshToonMaterial)、[pmndrs Outline](https://react-postprocessing.docs.pmnd.rs/effects/outline)。
