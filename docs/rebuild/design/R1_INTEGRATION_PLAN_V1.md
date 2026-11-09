# R1 抢修竖切集成计划（技术，v1）

**版本**：2026-11-10
**关联**：`R1_MISSION_DESIGN_V1.md`、`R1_A2_ASSET_BRIEF_V1.md`、`CORE_GAMEPLAY_V3_REGISTRATION_WAR.md`
**原则**：独立路由、独立状态机、不动教学主线；全部走质量档位与纸面 UI 变量；可被现有 E2E 发现但不阻断。

## 1. 路由与入口

- 新路由参数：`?mission=r1`（与 `quality`/`world`/`demo` 并列，不冲突）。
- 入口：桌面/移动 主界面「校验委托」卡（paper 主题）；开发期可直开 URL。
- 加载：Tier3 场景（复用 `StreetScene` 或新建 `MissionScene`），纸面 HUD 覆盖。

## 2. 文件规划（新增，避免大改旧文件）

```
src/features/mission/            # 新目录
  missionStore.mjs               # zustand store: 状态机/评分/失败次数
  missionData.mjs                # 3 单数据（故障点/判定/文案）
  MissionOverlay.jsx             # HUD：目标/提示/评分/结算
  MissionScene.jsx               # 复用街景 + 3 个交互点 + 合闸点
  mission.css                    # 纸面 HUD + 高亮
  MissionR1Root.jsx              # ?mission=r1 时的根组件（懒加载）
src/features/mission/mission.mjs # 纯逻辑：状态转移/评分（可单测）
```

- `src/App.jsx` 仅加：`const mission = new URLSearchParams(search).get('mission')`，命中时渲染 `<MissionR1Root/>`（其余 phase 逻辑跳过）。
- 复用：`useEvidence`（MeterSim 导出）、`playSound`、`visual-paper.css` 变量、质量档位 store。

## 3. 状态机

```
idle → briefed → powered → isolated → located → repaired → verified → scored
         ↘（危险操作）violated → retry
```

- 每步有 data 属性（`data-mission-step`），供 Playwright 验收。
- 失败：复燃（未验证合闸）→ 回到 isolated，扣分；三次本单重开。
- 计时：从 briefed 开始，结算显示用时。

## 4. 评分

`score = correctness*0.4 + evidence*0.3 + time*0.2 + safety*0.1`（0–100）
- 体验轨提示多、证据分上限低；校验轨必须测量/记录才拿满。
- 结算面板：分数/称号/一句话 NPC 反馈/「下一单」。

## 5. 交互点（3 单递进）

1. 单 A：灯不亮（表箱保险烧）→ 换保险 + 合闸。
2. 单 B：接头过热（压接不良）→ 断电 + 压接 + 绝缘 + 合闸。
3. 单 C：带压抢修（不允许断电）→ 仅验电 + 隔离 + 带电操作（高风险，安全分权重大）。

## 6. 质量与性能

- 复用 `quality` 档位；L0 资产在 Tier3 下使用；LOD1/2 供移动。
- 目标：1080p 桌面 ≥60fps；新增 DC ≤30、tris ≤25k（R1-A2 验收口径）。
- 首屏 ≤6s（懒加载 + 现有 boot 读屏）。

## 7. 测试

- 单测：`tests/mission-r1.unit.mjs` —— 状态机合法/非法转移、评分公式、三次失败重开。
- 验收：`scripts/check-r1-mission.mjs` —— Playwright `?mission=r1` 走完 3 单、截图、0 console error。
- 回归：现有 459 单测 + 67 E2E 不破；`?mission=r1` 不影响主流程。

## 8. 双端验收

- 设计端：循环清楚、爽点落位、教学藏而不丢、两条轨可通。
- 客户端：操作跟手、失败可理解、性能达标、无阻断 bug。
- 通过线：各 ≥7.5/10。
