# 预告片 V4（A 基线 · 单机先行）

- 日期：2026-11-10
- 形态：49 秒静态缓推式实机预告（无配音，中/英双字幕），用于官网、社媒与 Steam 页首轮素材。
- 成片：`work/deliverables/trailer-v4/seventh-checksum-teaser-v4-cn.mp4`（13,944,135 B）、`...-en.mp4`（13,988,161 B）；1920×1080 / 30fps / H.264 / AAC 128k / 49.01s。

## 分段（8 段）

| # | 段 | 素材 | 时长 | 字幕（CN） |
|---|---|---|---|---|
| 1 | 标题卡 | `card-title.png`（3840×2160 渲染） | 3.5s | — |
| 2 | 抢修任务 | `shots-a-v2/06-r1-mission.png` | 8.0s | 灯一盏盏灭下去。先从表箱开始查。 |
| 3 | 教学面板 | `shots-a-v2/02-teaching.png` | 7.0s | 三十六节课，从毫安与伏特开始。 |
| 4 | 委托板 | `shots-a-v2/03-commission.png` | 6.0s | 委托板上的单子，修一条街。 |
| 5 | 爆炸图 | `shots-a-v2/04-exploded.png` | 8.0s | 八个零件，一根线一根线认清。 |
| 6 | 街坊工坊 | `shots-a-v2/07-workshop.png` | 6.0s | 接错就重来，读数会说话。 |
| 7 | 流明域 | `shots-a-v2/01-hub-3d.png` | 6.0s | 流明域的下一座岛，等你修亮。 |
| 8 | 尾卡 | `card-end.png`（3840×2160 渲染） | 4.5s | —（卡面文字：免费 Web 试玩 / 单机先行 · 4v1 下一个大版本） |

## 制作

- 卡片：`work/tmp/card-title.html` / `card-end.html`，Playwright 1920×1080 @2x 截图。
- 分段：ffmpeg `zoompan` 缓推（1.0→~1.22 倍，8s 段）+ 0.5s 淡入淡出，`-crf 18`。
- 合成：8 段 concat filter + `subtitles=build/subs.ass`（CN）/`subs-en.ass`（EN）+ 3 层 lavfi 氛围声（55Hz/110Hz sine + brown noise，音量 0.09/0.05/0.5，loudnorm I=-20），`-crf 19`。
- 字幕：ASS，Noto Serif SC 54px、墨色字 + 纸色描边、底部居中、边距 88。

## 约束与检查

- 全部画面来自 A 基线实机/网页区（非概念图）；字幕为说明性文案，不承诺未实现功能；尾卡明确「4v1 下一个大版本」。
- 已知：静态图缓推非动态实机（V1.0 宣发形态取舍）；字幕与面板内容有局部重叠（教学段），可接受。
- 校验：ffprobe 49.01s、1080p30、双声道 AAC；抽帧 9 张人工检查（标题/任务/教学/委托/爆炸图/工坊/流明域/尾卡）。
