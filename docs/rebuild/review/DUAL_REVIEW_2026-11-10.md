# 双端审核记录 2026-11-10（设计端 × 客户端）

> 依据 `REVIEW_PROTOCOL_V1.md`。材料目录见各条。

## 1. Codex R1 渲染原型（`?quality=3&render=toon|standard`）

材料：`work/acceptance/render-review/`（toon-10h/18h/2h、standard-10h 截图；指标 JSON）
代码：`src/features/render/*`、`scripts/check-render-r1.mjs`、`tests/render-r1.unit.mjs`、`StageLayer.jsx` 路由

### 设计端：有条件通过
- 技术目标达成：ToonMaterial + 背面描边壳、程序化天空、LUT/调色、Bloom/ToneMapping/Noise/Vignette/FXAA、可选 DOF、实时指标（FPS/draw calls/triangles/DPI/renderer）、`?render=` 实验路由不进主线。
- 数据可核对：398 meshes / 36,073 tris / 616 draw calls / 1920×1080 / NVIDIA RTX 5060 Laptop（我们环境复测 121–130 FPS 无上限；实机 60 需再测）。
- **不通过点（艺术方向）**：画面是「糖果色低多边形 diorama」，与 V3 目标（写实自然打底 + 手绘化材质 + 生活质感 + 纸/墨/黄铜 UI）不一致；更像 Animal Crossing 而非「流明域」；场景是浮空展台，不是可玩世界。
- **P0**：品牌漂移（页头写 SparkMate）→ 已改为「第七校验·流明域」，并加 PROTOTYPE 标记。
- **P1**：616 draw calls 偏高（描边壳翻倍），移动端不可用；面板中英混排；标题/彩蛋文案偏文艺、缺玩法信息；没有声音与角色情绪；「PBR 对比」命名玩家看不懂。
- **结论**：可作为 R1 技术竖切入库（实验路由），**不得进商店截图/预告片**；美术方向转 R1-A2（自然季节光、降低马卡龙饱和、材质手绘化、生活陈设），再拍 v2 截图。

### 客户端：有条件通过
- 第一眼：好看、干净、有光；能旋转/缩放（OrbitControls），三档时间切换直观。
- 看不懂的点：这是游戏吗？能操作角色吗？「渲染模型/边缘描边/景深 DOF」是开发者词；底部数字（FPS/616 calls）抢注意力。
- 期待落差：截图很像成品，实际只是视觉研究；若放进商店页会构成误导。
- 建议：默认隐藏技术面板；加「研发预览·非最终画面」水印；把时间滑块改成「白天/黄昏/夜晚」三按钮即可。

## 2. 纸张主题 UI（默认 light，`?theme=light` / 设置内切换）

材料：`work/acceptance/ui-paper/`（00-world / 01-hub / 02-panel / 03-lesson-mission / 04-lesson-observe）
代码：`src/visual-paper.css`、`src/lib/theme.mjs`（默认 light）、`main.jsx` 引入顺序

### 设计端：通过
- 与小说视觉语言统一：纸底/墨字/黄铜/朱印；标题 Noto Serif SC；教学面板「册页感」成立；插图加白边黄铜框（册页图版）。
- 技术：仅 CSS + token，未改 3D 世界；世界页仍是深色（canvas 不受影响），UI 叠加纸面，层次合理；`overflow:false`、无 console 错误。
- P1：暗色 SVG 插图在纸面反差大（已加框缓解）；顶栏在 1080p 略空；深浅主题切换时部分内联深底组件（如「等待与你相遇」胶囊）仍是深色。

### 客户端：有条件通过
- 第一眼：「像一本检修册/工程笔记」，与游戏名和小说气质一致；文字更好读，长时间看不累。
- 问题：纸面偏黄，小字（11–12px 辅助信息）对比略弱；部分按钮仍像网页；教学面板信息密度偏高；移动端顶栏两行（已收敛但仍两行）。
- P0：无；P1：小字对比、移动端顶栏、暗图版。
- 结论：**有条件通过**，可作为默认主题；移动端 390px 复验后转「通过」。

## 3. 教学设计（36 节 v2 + IC 12 节 + 84 项结构测试）

材料：`src/features/learning/data/lessons-v2/`、`tests/teaching-schema.unit.mjs`、`tests/lesson-v2.unit.mjs`、`tests/sims.unit.mjs`；`node --test …` 84/84 通过；`work/acceptance/ic*`、`deskpet-*` 截图。

### 设计端：通过
- 七段任务制（hook/observe/learn/practice/prove/transfer/summary）统一；每课有可验证证据（测量/读数/sim/prove/transfer）；图谱 70 KP/69 边；39 个仿真。
- 教学红线守住：不卖答案、不跳验证、失败可重试但必须留下读数；IC 支线与主线共用同一证据模型。
- P1：文字密度大；图版偏「讲义」；跨课复习入口弱。

### 客户端：有条件通过
- 「每节课都像一次检修委托」这个隐喻成立，任务简报/委托单风格受用；仿真比纯 quiz 有趣。
- 问题：连续三节后疲劳；部分术语先出现后解释；手机端长图版需横向滚动风险（已检 0 溢出，但阅读体验一般）。
- 结论：**有条件通过**；P0 无；P1 排版/复习入口进 v2 排版批次。

## 4. 小说全稿 ch01–ch12

材料：`work/handoff/novel/ch01.md…ch12.md`、`NOVEL_CRITIQUE_CH11_R1.md`、`NOVEL_CRITIQUE_CH01-06_R6.md`。

### 设计端：通过（ch12 待 R12）
- 十二章 54,075 字；ch01–ch11 均分 8.5+（R6 可开更判定 8.60；ch11 R11 8.54 已修 P0/P1）；正典 A1–A22 一致；教学元素从行动/道具漏出，不做课程说教。
- P0：ch12 未双视角复评（R12 进行中）；ch12 与 ch11 的「收灯/另页保管/衡扣格代价」接口需核对。

### 客户端：通过
- 追读感强：ch01 黑九秒/灯自己亮、ch03 井里有电、ch04 量响、「第七响 0.9 秒」等钩子有效；每章有可截图句子。
- 问题：工程测量段仍偏多（ch02/ch05 尤甚），非专业读者会跳读；人物多，前 3 章需记住 8–10 个名字。
- 结论：**有条件通过**（ch12 复评后转通过）；P0 无；P1 术语表/人物表附在全稿开头。
