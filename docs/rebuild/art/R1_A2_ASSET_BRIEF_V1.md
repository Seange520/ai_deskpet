# R1-A2 资产简报：晴光街五件套（Blender → GLB → Three.js）

**版本**：v1 / 2026-11-10 04:15
**负责人**：DSH 总指挥（规范/验收/集成）
**建模执行**：Codex（主）；B2 备份产线
**依据**：`ART_DIRECTION_V3.md`（分层合成：现实层写实自然打底+材质手绘化；主城生活细节吉卜力；UI 纸张黄铜深青墨）、B2 渲染配色实测（`work/deliverables/blender-ab/B2-backup-quarter.png`）、`R1_RENDER_SPEC_V1.md`。

## 1. 风格与配色（必须遵守）

- 世界观配色：青灰砖 `#8f9c98` / 深木梁 `#4a3527` / 奶油窗框 `#e8ddc4` / 锈红条纹篷 `#b5543a` + `#efe4cc` / 黄铜 `#b08a3e` / 石板路 `#c9c3b4` 与 `#aaa596` / 树冠 `#7d9457`、树干 `#5a4030`。
- 光照参考：暖色傍晚太阳（右前 45°）+ 天空半球光；金属用低粗糙度黄铜，玻璃用弱发光暖窗。
- 禁止：糖果粉彩、赛博霓虹、纯白塑料感、纯黑描边；不做写实照片贴图。

## 2. 五件套与规格

| 件 | 内容 | 目标 tris/件 | LOD | 备注 |
|---|---|---:|---|---|
| `SM_Wall_Window_Roof` | 4m 宽街屋立面一段：青灰砖墙、深木梁柱、奶油双扇窗、窗台、瓦片檐口 | L0 6–9k / L1 3–4k / L2 1.5–2k | 3 | 模块化，4m 网格对齐，可拼接 |
| `SM_StreetLamp` | 弯臂黄铜街灯（灯杆/弯臂/灯罩/发光灯头/基座） | L0 2–3k / L1 1–1.5k / L2 0.6k | 3 | 灯头单独 mesh 命名 `SM_LampHead`，可替换发光材质 |
| `SM_Bench` | 木条长椅 + 陶土坐垫位 + 铸铁脚 | L0 1.2–2k / L1 0.8–1k / L2 0.4k | 3 | 坐垫为独立 mesh `SM_BenchCushion` |
| `SM_Tree` | 低模行道树：树干 + 2–3 层多面体树冠 | L0 1.5–2.5k / L1 1k / L2 0.5k | 3 | 树冠可换色（`M_Leaf_A/B`） |
| `SM_Paving_Tile` | 3 种石板路瓦片（整砖/半砖/拼角），1m 对齐 | L0 各 100–300 | 2 | 合并成一套 `SM_Paving_Set` |

**统一要求**：
- 单位米，Z-up；原点在地面中心；朝向 +Y（Three.js 导入后转 -Z 需记录）。
- 命名：`SM_`（Static Mesh）/`M_`（Material）/`T_`（Texture）；对象层级按 `LOD0/LOD1/LOD2` 分组。
- UV：L0 必须展开、无重叠；贴图 1024（L0）/512（L1）以内，程序化贴图或纯色+细节法线均可。
- 材质：Principled BSDF，导出 GLB（glTF 2.0，+Y up 转换由导出器处理），单件材质数 ≤4。
- 导出：每件一个 `.glb` + 一张 4 视图渲染（前/侧/背/3-4）+ 一行 `RESULT tris=… objects=… materials=…`。
- 脚本：每个资产一个可复现 bpy 脚本（或一个总脚本带参数），放在 `render-ab/r1a2/`。

## 3. 交付物

```
render-ab/r1a2/
  build_r1a2.py                 # 可复现脚本（参数化或五个函数）
  SM_Wall_Window_Roof_L0.glb / L1 / L2
  SM_StreetLamp_L0.glb / L1 / L2
  SM_Bench_L0.glb / L1 / L2
  SM_Tree_L0.glb / L1 / L2
  SM_Paving_Set_L0.glb / L1
  renders/[asset]_[L0|L1|L2].png   # 4 视图拼图，最多 10 张
  MANIFEST.json                 # 文件名/大小/SHA-256/tris/objects/materials
```

## 4. 验收标准（我端执行）

1. GLB 能在 Three.js 加载，无材质丢失；单件合计 tris 不超 L0 上限；材质数 ≤4。
2. 五件套按 4m 网格摆一段 16m 街景，1080p 下 draw calls 增量 ≤30、triangles 增量 ≤25k（L0 全用）。
3. 风格对照 B2 调色板截图，双端评审「像不像晴光街」≥8/10。
4. 命名/层级/LOD 规范齐全；脚本可一次重跑产出全部包。
5. 不修改现有主线代码与测试；产物放 `render-ab/r1a2/`，不动 `src/`。集成由我端单独做。

## 5. 验收流程（双端）

- 设计端 6 问（比例/构图/材质/风格/叙事/可拼装）
- 客户端 6 问（导入/材质/性能/命名/LOD/复现）
- 任一端 <7/10 打回重做对应件。
