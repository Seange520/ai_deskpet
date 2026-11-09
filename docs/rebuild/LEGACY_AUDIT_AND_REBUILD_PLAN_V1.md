# 旧 0.9.8 资产审计与重做计划 V1

> 目的：主策划指出「0.9.8 迭代前的旧产物可能不适配新方案」。本文按「保留 / 改造 / 重做」三类清点现有 401 个源码文件（1.84 MB）与内容资产，给出迁移顺序、工作量估算与风险，作为 Codex 派活依据。**只做审计，不动代码。**

## 一、总览

| 区域 | 文件数 | 体积 | 结论 |
| --- | --- | --- | --- |
| `src/features/learning`（教学引擎/48 节课/39 仿真/图谱/星图/诊断） | 130 | 719 KB | **核心资产，保留**，UI 皮换新 |
| `src/features/space` + `world` + `street` + `stage` + `environment` + `npr`（大世界与场景） | 89 | 352 KB | **重做主体**：旧 9 岛地图与赛博街景不再适配 |
| `src/features/deskpet3d` + `hardware` + `assembly`（桌宠与装配） | 41 | 125 KB | 保留逻辑，视觉重做（卡通化） |
| `src/features/ai` + `identity` + `resonance` + `trust` + `raid` | 37 | 147 KB | 保留（AI 零/UID/共鸣/信任/潜入玩法），面板重皮 |
| `src/components` + `lib` + `platform` + `store(s)` | 58 | 218 KB | 保留基础设施（主题/资源包/音效/存储） |
| 测试与脚本（51 个单测文件、106 个脚本） | — | — | 保留并扩充；旧视觉断言需更新 |

## 二、保留（Reuse）——教学与系统底座

| 模块 | 文件 | 理由 | 迁移动作 |
| --- | --- | --- | --- |
| 学习引擎 `learning.mjs`、Profile 存档、解锁/掌握/evidence | `src/features/learning/learning.mjs` 等 | 教学可验证的根，不能推倒 | 不动逻辑，仅换 UI |
| 课节数据 48 节（v1 36 + v2 桌宠 18 + IC 12；v2 七段任务制） | `lessons-v2/*.json` 36 个、v1 JSON | 内容资产，重写成本最高 | 全部保留，映射到新世界任务 |
| 仿真 39 个（仪表/串联/PWM/IDE/ADC/DAC/版图/流片/意图路由等） | `sims/*.jsx` | 可复用交互资产 | 换皮为「仪器/法术」双形态 |
| 知识图谱 70 KP/69 边、章节、星图、诊断 12 题 | `data/*.json`、`StarMap.jsx`、`DiagnosticPanel.jsx` | 教学骨架 | 星图改「天赋树/星座」视觉 |
| AI 零（provider 抽象、隐藏 API、剧透门控、每用户记忆） | `features/ai/*` | 差异化能力 | 面板与对话演出升级 |
| 身份/UID、共鸣指数、信任、潜入（raid） | `identity/*`、`resonance/*`、`trust/*`、`raid/*` | 系统完整 | 视觉与入口重排 |
| 平台：主题、资源包、原生下载、音效、存储 | `platform/*`、`lib/sounds.js`、`lib/theme.mjs` | 已验收可用 | 主题 token 扩展为原神式两套 |
| 测试：457 单测、67 E2E、验收脚本体系 | `tests/*`、`scripts/check-*.mjs` | 质量基线 | 补新 UI/世界断言，旧断言更新 |

## 三、改造（Refactor）——骨架可用、表现层重写

| 模块 | 现状 | 改造内容 |
| --- | --- | --- |
| `src/App.jsx` 壳层 | 顶栏 + 页脚 + 路由式阶段（hub/space/learning） | 去「进入按钮」；改为常驻世界 HUD + 全屏面板栈 |
| `TeachingPanel.jsx` / `LessonRunnerV2` | 已做 v2 视觉但与原神式目标差距大 | 重写版式：全屏左标签+右内容、任务对话式引导、镜头式演出 |
| `src/features/boot` | 启动读条 + CTA | 改为电影化加载 → 直接落地 |
| `src/features/hud` + `street` HUD | 信息堆叠、机感强 | 重排：左上小地图、右侧任务、底部快捷栏、右下交互 |
| `features/space`（9 岛枢纽） | 旧概念：岛屿传送门 | 改为大陆区域与传送锚点，保留「枢纽」概念作为主城 |
| `features/npr`（NPR 着色） | 赛博风调色 | 升级为三渲二管线（Toon + 描边 + 后处理） |
| `features/environment` / `world` 场景 | 旧灯光/材质/贴图 | 重建美术规范：明亮幻想、机械遗迹 |
| `deskpet3d` | 低多边形方块宠 | 保留骨架，重做卡通材质与表情 |

## 四、重做（Rewrite）——明确废弃

1. **旧 9 岛地图布局与任务线**（`features/space` 的岛屿坐标/传送门/UI 名称）：全部作废，按新大陆分区重做。
2. **赛博街景与霓虹材质**（`public/assets/streetTextures`、霓虹灯牌、雨夜调色）：作废；新美术=幻想大陆。
3. **旧「进入自由探索」入口与枢纽页**（WorldPreview/Hub 的按钮与卡片）：作废，改为启动即世界。
4. **旧 starter 引导文案中「赛博/机感」措辞**：重写为幻想冒险语气（保留教学术语）。
5. **旧启动页品牌视觉**（深青网格 + 终端感）：重做（保留品牌名与 logo 几何，换材质/构图）。

## 五、迁移顺序（与 R0–R5 对齐）

| 阶段 | 动作 | 负责 | 预估 |
| --- | --- | --- | --- |
| R1 渲染原型 | 三渲二管线 + 单场景对比 | Codex 卡 01 | 3–5 天 |
| R2 UI 框架 | 设计 token + HUD + 5 面板骨架 + 无按钮启动流 | Codex 卡 02/03 | 7–10 天 |
| R3 世界切片 | 1 主城 + 1 野外 + 1 秘境灰盒（含 1 节课节） | Codex 卡 04 | 10–15 天 |
| R4 内容迁移 | 48 节课节映射到新世界任务；旧岛废弃；素材重制 | DSH 主导 + Codex 协助 | 4–6 周 |
| R5 上线准备 | 小说/商店页/版号材料/双端打包 | DSH + 主策划 | 4–6 周 |

## 六、风险与对策

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| 全量重做导致教学断档 | 高 | 教学引擎不动；每阶段保留可玩课节 |
| 三渲二性能不达标（手机） | 高 | R1 先做性能预算；手机降级方案（烘焙光照/LOD/少后处理） |
| 美术资产产能不足 | 高 | 用 CC0 素材 + 程序化材质过渡；Codex 生成灰盒，正式资产后续替换 |
| "像原神"侵权 | 高 | 只学结构/节奏，不复制资产与文本；法务清单见 `PIVOT_GENSHIN_V1.md` |
| 旧代码包袱拖慢重构 | 中 | 新模块并列 `src/render/toon`、`src/ui/framework`、`src/world/regions`，验收后替换旧入口 |

## 七、新代码结构建议

```
src/
  render/        # toon 管线、后处理、天空/天气、材质库
  ui/            # tokens.css、HUD、面板框架、动效
  world/         # regions、streaming、POI、传送、任务触发
  character/     # 主角/桌宠卡通化、表情、动作
  quest/         # 主线/支线/日常任务数据与状态机
  learning/      # 现有教学引擎（保持）
  platform/      # 现有平台层（保持）
```

## 八、立即可派给 Codex 的验收口径

- 每个任务卡独立分支/目录，产物必须含：改动文件清单、截图或录屏、性能数据、0 console error、`npm run build` 通过、E2E 67 不破。
- 证据写仓库 `work/acceptance/<task>/`，由 DSH 复核后合并主干。
