# 重建总纲 README（R0 情报 → R5 上线）

> 本目录是「原神式焕新」的单一事实来源。所有派活（Codex/研究分队）以这里的文档为准；旧 `docs/` 下 0.9.8 文档仅供参考。

## 0. 当前状态

| 项 | 状态 |
| --- | --- |
| 情报研究（原神 10 专题 86,885 字 + 50 款游戏 109,870 字 + 侦察 22,092 字） | ✅ 完成，见 `work/handoff/design-pivot/` |
| 焕新纲要 / 边界红线 | ✅ `PIVOT_GENSHIN_V1.md` |
| 旧资产审计（401 文件分类：保留/改造/重做） | ✅ `LEGACY_AUDIT_AND_REBUILD_PLAN_V1.md` |
| UI 信息架构与线框规范 | ✅ `UI_WIREFRAME_SPEC_V1.md` |
| 大世界重做方案（8 区 + 3 离岛 + 48 课映射） | ✅ `WORLD_REBUILD_PLAN_V1.md` |
| 分工与 Codex CLI 用法 | ✅ `DIVISION_OF_LABOR_V1.md`、`CODEX_CLI_USAGE.md` |
| Codex 任务卡 01–04 | ✅ `CODEX_TASKS/`（未派发） |
| 小说规划 / 版号路线 | ✅ `NOVEL_PLAN_V1.md`、`GAME_LICENSE_ROADMAP_V1.md` |
| 产品代码 | ⏸ 按主策划要求「整理完情报供审阅后再动工」，未改 |

## 1. 阅读顺序（主策划 20 分钟版）

1. `PIVOT_GENSHIN_V1.md` —— 改成什么样、边界在哪、里程碑。
2. `LEGACY_AUDIT_AND_REBUILD_PLAN_V1.md` —— 旧东西哪些留、哪些扔、要多少工作量。
3. `UI_WIREFRAME_SPEC_V1.md` —— 新界面长什么样、键位与面板。
4. `WORLD_REBUILD_PLAN_V1.md` —— 大地图、区域、48 节课怎么搬进世界。
5. `NOVEL_PLAN_V1.md` / `GAME_LICENSE_ROADMAP_V1.md` —— 小说与版号。

深度研究见 `work/handoff/design-pivot/GENSHIN_DESIGN_BIBLE_V1.md`（86,885 字）与 `TOP50_GAMES_ANALYSIS_V1.md`（109,870 字）。

## 2. 待拍板（4 项）

1. **对标程度**：建议「美术 + UX + 世界结构靠拢原神，教学证据链保留；不复制资产与文本」。
2. **开工顺序**：建议先做「1 主城 + 1 野外 + 1 秘境」切片（R3-1）再全量替换。
3. **小说**：平台（番茄/起点）、笔名、AI 辅助比例。
4. **预算**：外包美术/音乐/配音额度。

## 3. 派活方式

```
pwsh -File D:\deepseek_file\work\handoff\RUN_CODEX_TASK.ps1 -Task 01-render-prototype
```

任务卡要求统一：改动文件清单 / 截图或录屏 / 性能数据 / 0 console error / `npm run build` 通过 / E2E 67 不破；证据落仓库 `work/acceptance/<task>/`。

## 4. 红线（不可违反）

- 不复制原神/任何商业游戏的素材、文本、UI 图、角色设计；只学结构与节奏。
- 教学「可验证」不破：接线/读数/发消息/跑通代码，五维评分每项 ≥4.5。
- 零抽卡变强、零战力付费、零 FOMO；外观与选修专题收费需事先拍板。
- 用户数据本地优先；AI 零 API Key 不进客户端。
