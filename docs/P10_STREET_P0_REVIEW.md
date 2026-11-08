# P10-P0《会呼吸的路灯》切片封板

状态：主策划已授权以 `v0.9.8-alpha` 封板并推送。本切片从 P9 基线 `0ee667fd702367fe158472b2e5ff15a427e161fe` / `v0.9.7-beta` 接续；代码封板与 README、包版本重构分为两个提交，标签定位于第一个代码提交。

## 设计依据与范围

依据 `D:/deepseek_file/THE_SEVENTH_CHECKSUM_V2_FULL.md`、`D:/deepseek_file/SEVENTH_CHECKSUM_V21_V22_GLOBAL_FUSION.md` 及本轮 P10 开火指令。只实现熔炉外街的一个本地教学切片，不提前接入在线世界或 ESP32。未恢复被中止的旧草稿。

街区沿 P9 枢纽通往硬件台地的原连桥布置，两个出口开放；店面、配电盒、路灯和夜宵摊均为视觉组件。原 TerrainColliders、GLB 包围盒、KCC、相机与传送逻辑保持原样。新增组件只在自由探索内挂载，复用 ToonPalette 和唯一 SkinEffects composer。

## 操作与可验证证据

1. 打开 `http://127.0.0.1:15262/?quality=3&world=p9`，开始自由探索。沿东侧连桥前往硬件台地，途中自动出现万用表检修面板。
2. 开鹰眼、电压档，依次点击 L1 路灯、G0 回流接点、M1 压缩机测点，记录周期电压与回流压降；每次消耗 12 专注，关闭鹰眼以恢复专注。
3. 可尝试“未排障，强行跨接供电”，观察线路发红、白烟、火花、局部明火与保险丝熔断。熔断后无法上电，必须断电检查并更换保险丝。
4. 断电隔离，切通断档并测 G0。结合两组证据确认接地不良与启动过载，再修复回流接点、为压缩机加入软启动。
5. 恢复供电并观察完整 7 秒周期；完成后路灯稳定，夜宵摊老板说“今晚灯没眨，客人多了一倍。”。获得 120 知识 XP 和 1 枚记忆棱镜，刷新仍保留且不会重复奖励。

24 V SELV 仿真中的 G0 指 **0 V 工作回流接点**，不是保护接地 PE；不教玩家用 PE 充当工作回流。电压读数来自串并联等效电路的周期包络。热故障使用 I²R 发热、散热与 I²t 熔断的确定性教学模型；其数值与时间压缩用于演示，不代表真实器件的认证保护曲线。

探索奖励单独存入 `sparkmate.seventh-checksum.street.v1`，不读写 `sparkmate.routes.v2`，不修改原学习积分、关卡或排名。地图、传送、模态与失焦暂停故障时间轴；离开探索关闭鹰眼。

## 实现与验证入口

- `src/features/street/circuit.mjs`：等效电路、故障链、安全联锁、诊断与 7 秒验收。
- `streetStore.js`：范围/暂停门控、独立存档和幂等奖励。
- `StreetScene.jsx`：原地形上的视觉街区、穿墙暗线、热故障动画、世界坐标投影。
- `StreetOverlay.jsx` / `street.css`：万用表、空间测点、检修操作、NPC 对话。
- `tests/street-circuit.unit.mjs`：新增 6 项单测。
- `scripts/check-street-p0.mjs`：真实键鼠走入街区、点击测量、熔断与修复闭环、刷新防刷奖、教学存档隔离和截图/连续帧。

## 本轮实测结果（2026-11-08）

- 最终源码原有 E2E：67/67；首次集成回归也为 67/67。原断言未删除、跳过或弱化。
- 原质量/传送单测 8/8 + 新增电路单测 6/6，共 14/14。
- 新增 P10 浏览器专项 4/4：空间测点与专注、短路热链/熔断更换、修复/台词/奖励/教学存档隔离、刷新防重复领奖；页面与着色器错误均为 0。
- P9 物理 M1：复验 8/8；地图传送 M3：6/6；光轨渲染：3/3。
- `npm run build:local`：通过，2876 模块；保留既有大包体积提示。
- 本地验收时 `git diff --check` 通过，HEAD 与 beta 标签仍为原基线，暂存区为空；此为提交前的历史验证状态。

**M1 复测记录**：首轮在原脚本第 169 行“模态关闭 300ms 后物理步数应增加”断言失败（1900 未增加）；同一份源码、同一份原脚本与断言重跑后 8/8 通过。本轮未改物理或相机逻辑，尚不能仅凭一次重跑认定该时序波动的根因，保留首轮与重跑证据供后续观察。

## 截图与连续帧

证据目录：`C:/Users/Senage/.codex/visualizations/2026/11/08/01a1bb92-3350-7081-97b4-2ae7efa3272d/sparkmate-p10-street/`。

- `01-street-normal.png`：正常街区。
- `02-street-eagle-eye.png`：鹰眼透视、暗线和三个空间测点。
- `03-street-short-circuit-fire.png`：局部明火与火花。
- `04-street-fuse-tripped.png`：保险丝熔断后的安全切断。
- `npc-frame-00-before.png`、`npc-frame-01-after.png` 至 `npc-frame-04-after.png`：实际浏览器连续帧，记录校验完成与 NPC 台词触发。
- `npc-dialogue-sequence.gif`：上述连续帧的缩放播放版，不是实时录屏；原始 PNG 保留。
- `street-checks.json`、`p9-m1/m1-checks.json`、`p9-m1-recheck/m1-checks.json`、`p9-m3/m3-checks.json`、`p9-rail/rail-checks.json`：专项证据。
- `validation-summary.json`：最终验证清单与源码 SHA-256。
- `e2e-report.html` / `e2e-last-run.json`：最终 67 项回归报告与状态。

移动浏览器模拟不等于实体机性能认证。本轮仅为本地教学仿真，不包含 ESP32 真机测量、硬件保护认证或在线系统。
