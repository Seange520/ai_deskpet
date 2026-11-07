# P8-M2 四岛 Toon 与生态氛围（v0.9.5-beta 封板）

日期：2026-11-07。唯一主仓库 `D:\deepseek_file\ai_deskpet`，基线 main / `fae518f2cb4e042587aaa5b951cdca9a4f3b0fda`。总指挥已确认硬件岛与石碑视觉达标，并授权补足深渊光带后提交、打标签 `v0.9.5-beta` 并推送。README、package.json 与锁文件根版本统一为 `0.9.5-beta`。最终完整 hash 与远端回查见仓库外《Codex 交接提示词 13.0》。

## 本轮实现

- 硬件、代码、排位实体与共享底座、远处轮廓 LOD 均接入既有 MeshToonMaterial 冷暖 RGB 色阶与 Rim，继续使用同一 Stage composer 的 DepthInk。硬件电路纹理成为 Toon albedo，电流脉冲以 emissive shader 叠加；代码字符保留透明、无深度写入、雾衰减，亮度按三段整理；排位金字塔改为分面透明 Toon + Fresnel，移除旧实时折射抓帧和专用 RT。
- 四岛边缘双层发光勾勒，硬件保持方形轮廓；其他三岛复用 deck/cliff 层次。HUB 沙盘实体和地面也使用 Toon。远岛保留芯片/门柱/金字塔的可读轮廓。
- 两层远景塔群和陨石采用 Toon 分面与雾，窗带低亮度发光；新增 8 架合并几何的巡检无人机，独立实例轨迹，不引入新 renderer。远景窗带是发光语义，不是镜面反射。
- 用原创双层六瓣水晶花与垂丝叶藤替代原水晶八面体植被。每岛三个 instanced draw（透明花瓣、不透明花心、叶藤）；Tier 3 每详细岛 28 簇，Tier 2 为 16 簇，Tier 1 整体剔除。风摆在顶点 shader 中计算，每个岛拥有自己的时钟；后台/模态/减少动画停止，释放自持几何。来源与三角形数见 ASSET_LICENSES.md。此路线为程序化资产，没有下载 GLTF，没有声称已导入外部高精模型。
- Observatory 边缘的残缺校验碑有七道亮纹、断角和落石。原生 DOM 按钮投影到石碑上方；鼠标点击或 Enter 触发真实 Stage 桌宠头顶的提示，6.5 秒后清除。Tier 0 提供 DOM 入口。模态、后台、离岛隐藏并清理提示；Canvas 保持点击穿透与 aria-hidden。
- 投影 useFrame 为负优先级，不接管自动绘制。专项明确检查 Tier 1 实际绘制帧与 draw calls，避免仅用空场景 RAF 误报性能。

- 中央深渊新增三条青蓝/淡紫半透明环状光带（AbyssRibbons.jsx）：解析 shader 生成宽雾、细丝与弧段，缓慢流转；共三次 draw，复用 Stage，不新增纹理、RT 或后期。位置高于地面且低于岛屿，depthWrite=false，保留深度测试。Tier 2/3 挂载，Tier 0/1 完整卸载；后台/模态/减少动画冻结时钟。

## 本切片叙事答案与线索

这是本轮环境叙事的局部审核稿，不确立七年全量剧情。

| 答案 | 玩家可见线索 | 本轮揭示 | 后续边界 |
| --- | --- | --- | --- |
| 校验碑是上一任维护者留下的检查装置，保留七道记录，其中末道未闭合 | 断裂石座、七道错位亮纹、按钮上的残缺符号 | 「这是上一任维护者留下的……」「七道刻痕，最后一道仍未闭合。」 | 不定义前任身份、末道答案或收集任务；不解锁关卡，不发 XP，不改变存档 |
| 花藤仍沿旧能源边缘生长，说明群岛的维护网络尚在运转 | 岛缘花心微光、下垂叶藤、独立风摆 | 纯环境可读性 | 不绑定玩家 XP、关卡或剧情进度 |
| 巡检机仍在外围执行无人维护任务 | 远处规律巡航的剪影 | 纯视觉伏笔 | 无任务状态、战斗或交互 AI |

## 验证与证据

- 最终源码完整 E2E：67/67，失败 0、跳过 0，原 tests 未修改。M2 主体首轮为 66/67（伙伴 LED 读值超时），单独及完整重跑通过；深渊补足后又完整重跑。未修改运行器或伙伴动画来规避断言。
- 原 NPR 专项：9/9，覆盖实际 DepthInk/泛光像素消融、真实 CodeRunner LED、四岛导航与 Canvas 身份、实时切档、真实 WebGL 丢失、DOM 工坊、正常飞行/连续改向。
- M2 专项：12/12，覆盖四岛实体实际材质/花藤 LOD、远景 Toon 与雾、石碑键盘触发/学习存档不变、实际编译风摆时钟推进、模态/模拟后台/减少动画、Tier 1 剔除与真实绘制、DOM 彩蛋、Stage 模块及岛屿内容加载失败兜底。正常页面浏览器错误 0；故意中断模块请求的失败页面单独断言降级。
- 深渊补验：4/4，确认三条半透明光带、真实 HUB 同机位像素贡献（RGB 平均绝对差 2.089）、慢速流转/暂停/恢复、减少动画、实时 3→2→1→3→1 剔除与 Tier 0 零 Canvas。
- 既有画质/飞行单测：7/7。生产构建：2764 modules，成功；主入口 472.00 kB / 158.48 kB gzip，Three 核心 687.94 kB / 177.42 kB gzip，原分包大小提示仍在。
- Tier 1 四岛和 HUB：RTX 5060 Laptop / Windows Chrome / ANGLE D3D11，1728×1080、DPR 1、减少动画。强制 demand renderer 连续绘制，每视图记录 99 个实际渲染帧；封板复测均约 165 FPS，P95 6.2 ms（之前主体轮为约 128–130 FPS）。提交正文按总指挥指定使用「Tier 1 跑满 60 FPS」，仅表示本机采样超过 60 FPS。Stage 为 62–68 draw calls，伙伴为 12，两 Canvas 合计 74–80。完整数据见 tier1-budget.json。这是本机桌面采样，不构成实体手机或全部 GPU 的 60 FPS 保证。
- 未改 `src/stores`、`src/store`、`qualityTier.jsx`；依赖清单与锁文件仅更新根版本，无新增包或依赖升级。保留两个 Canvas 上限、真实教学命中和原持久化键。

截图和 JSON 位于：
`C:\Users\Senage\.codex\visualizations\2026\11\07\01a1b610-22d6-7072-9e19-50c9172a9821\sparkmate-p8-m2-beta`

深渊最终全景为 `beta-world.png`，同机位消融图为 `beta-world-no-ribbons.png`。三图复验输出为 `m2-world.png`、`m2-hardware.png`、`m2-relic.png`。补充有 code/ranking 近景、world-ui/relic-ui、Tier 1 和 NPR 消融。全景通过产品「返回大世界」进入，记录相机 `[23,21,29]`、FOV 56；近景通过真实岛屿导航。全图 1728×1080 / DPR 1 / day / 减少动画；纯场景图只临时隐藏教学 HUD，保留石碑入口/气泡；没有调色、重绘、替换相机或从产品删除 HUD。

## 复跑

所有命令 workdir 显式设为主仓库，先核对 15261/15262 端口。正常 Vite 与 regression 分开。

```powershell
$env:SPARKMATE_TEST_PORT='15261'
npm run test:e2e
node --test --test-isolation=none tests/m2-quality.unit.mjs tests/quality-tier.unit.mjs tests/travel-timeline.unit.mjs
npm run build:local
# 已核对的正常服务：http://127.0.0.1:15262
$env:SPARKMATE_SPACE_URL='http://127.0.0.1:15262'
node scripts/check-toon-poc.mjs
node scripts/check-toon-m2.mjs
node scripts/check-toon-m2-budget.mjs
node scripts/check-abyss-ribbons.mjs
```

旧 M1 脚本关于「水晶实例矩阵上下浮动」的断言属于旧资产，未更改以凑通过；本轮用实际编译的顶点风摆 uniform 和冻结/恢复行为验收新植物，不将历史 M1 4/4 当作本次新验收。

## 限制

透明花瓣按实例批次排序，没有物理折射；DepthInk 仍可能对透明标签、细轨产生叠线。景观是原创轻量程序化资产；总指挥已授权本轮封板。没有面部 SDF、VRM、骨骼、高精外部模型、实时反射和长期显存/移动设备性能结论。截图中的原教学 HUD 遮挡程度沿用基线，本轮没有改页面内容布局。
