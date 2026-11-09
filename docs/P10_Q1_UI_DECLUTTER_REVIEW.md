# P10 Q1 UI 降遮挡实测回顾
基线 / 收尾 HEAD：3d372d7b3bedb0b7f70da656450939d5d9454996。未暂存、未提交、未推送、未打标签。

## 四项目标
| 项目 | 实测 |
| --- | --- |
| S2-001 | 1920×1080 常态可见 75.98%；390×844 常态可见 65.80%；常驻容器均 2 个 |
| S3-005 | LCD 9.16:1；按钮 13.64:1；提示 10.95:1；常驻文字 ≥13px，受检按钮 ≥40×40px；390 返回真实点击、无横滚 |
| S3-006 | 一句话提示与四阶段胶囊归入任务容器；提示 3 秒淡出、pointer-events:none、距底 ≥120px；测量结束 2490ms 恢复 |
| S4-008 | 30 秒实采样 fpsAvg=86.25、fpsP5=60.98、drawCalls=668、triangles=1109675、domNodes=218、新增 HUD 子树=9 |

## 实现与复现
任务标题、共鸣状态和笔记本入口合入已有任务容器；商贩交互并入仪表容器。冷库仪表与 P0 仪表互斥。移动端抽屉让出顶部返回区，保留原有模态输入冻结、Esc 和焦点代码。
新增 ui:layout:v1 只存 UI 偏好，损坏时读默认且不覆盖原值。方括号折叠，文本输入与组合键不触发；Tab 从探索输入定位主面板。M 保留原有大地图行为。

启动：npm run dev -- --port 15262 --strictPort。
执行：node scripts/check-ui-declutter.mjs；node scripts/check-ui-perf.mjs。
默认证据目录为仓库外 q1-evidence；可用 SPARKMATE_UI_OUTPUT 覆盖。性能第一次有效 v2 采样创建 docs/ui-perf-baseline.json，此后仅输出对比，不覆盖首次基线。

面积算法逐 CSS 像素行合并可见 HUD 外接矩形，取并集扣除；半透明容器整块扣除，摇杆/跳跃控件计入遮挡但不作为面板计数。正常态在 P0 范围实走进入；手机态由同一探索会话切换分辨率并真实折叠。抽屉展开不适用常态面积门槛。无真实像素透射率估算。
性能来自浏览器 requestAnimationFrame 间隔，p5 为逐帧 FPS 第五百分位；drawCalls/triangles 汇总同一既有 R3F renderer 每次 render 的计数（含后处理），按帧求和后取峰值；采样结束即恢复临时观测包装。未添加 renderer 或运行时调试接口。

## 回归与证据
全量单测 320/320（原 312 + 新 8），E2E 67/67。专项退出码详见仓库外 regressions.json、final-checks.json。
构建模块 2967，对比 2964 为 +3。
首次 raid 在代码热更新期间实走超时，原始失败日志保留；源码固定后的重跑结果见 raid-final.log，不能将初次失败抹除。新增安全区遮挡断言首次失败于按需样式未加载，修复后 ui-safe-area-fixed.log 全通过；历史 ui-safe-area.log 保留。最终教学/raid/envstory/trust/assembly/P0/M1/resonance/世界 M1/M3/rail 两轮均通过。
页面/着色器错误：0。属性边界检查无原有 data-* / aria-label 丢失；package.json 与锁文件的 Git 规范化内容未变。

## 偏差与适用范围
这是四个 Q1 目标的最小切片：小地图在普通探索为紧凑入口，有仪表或模态时隐藏，M 仍为现有大地图；未实现规格后续完整的可拖动小地图位置和提示关闭历史。
当前面积断言覆盖常态 P0 与手机仪表抽屉，不代表全部任务模态的可见面积承诺。v1 帧尾计数只读到后处理末通道，已废弃并留存 ui-perf-unaggregated.json；有效基线为 samplingVersion=2。性能首次有效基线来自本机、本轮改动后的探索态；对比是同机紧接着的第二轮采样，不能据此断言相对补丁前 GPU 性能无回归。
性能目标标志：{"fpsAvgAtLeast55":true,"fpsP5AtLeast40":true,"drawCallsWithin10Pct":true,"hudNodesWithin250":true}；同机基线对比：{"fpsAvgRatio":0.985302538394885,"fpsP5Ratio":0.9939024390244788,"drawCallsRatio":1,"domNodesDelta":0}。若绝对帧率未达规格参考值，作为独立验收缺口保留。
代码没有修改奖励、存档 schema、教学时长或场景/投影/物理；尚待用户独立验收，不发布 v1.0.0。

## 文件
- src/features/env/CaseBoardPanel.jsx
- src/features/env/env.css
- src/features/learning/teaching.css
- src/features/raid/raid.css
- src/features/street/StreetOverlay.jsx
- src/features/world/ExplorationOverlay.jsx
- docs/ui-perf-baseline.json
- scripts/check-ui-declutter.mjs
- scripts/check-ui-perf.mjs
- src/features/hud/HudCapsule.jsx
- src/features/hud/hud.css
- src/features/hud/useHudLayout.js
- tests/ui-layout.unit.mjs
- docs/P10_Q1_UI_DECLUTTER_REVIEW.md

证据根：D:/deepseek_file/work/codex-runs/q1-evidence/。ui-checks.json 含每项值与五张截图路径；ui-perf-first.json 为首次样本，ui-perf.json 为同机复测。SHA256SUMS.txt 为根清单（不自哈希）。
