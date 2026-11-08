# P10-M5 环境叙事与案件板审核

基线 HEAD：00bfa04af43bbf1ac5a74e9e5a8aea2de26c98d0。开工工作区干净，15261/15262无监听；进程48284是当前任务祖先进程。已全文读取 LEAD_TO_CODEX_M5、CANON_LEDGER、M1_M4_CONSISTENCY_AUDIT、M4审核与 Fusion §6。用户直发授权优先于旧交接包的确认步骤，本轮不提交、不推送、不改版本和依赖。

## 实现与边界

新增 src/features/env 下七个文件：env.mjs、caseBoard.mjs、envStore.js、EnvLayer.jsx、CaseBoardPanel.jsx、NpcReactions.jsx、env.css。仅在 StreetScene/StreetOverlay 加层；resonanceBridge 增加 readOnly 事件分支，原调用默认行为不变。没有新增 Canvas、composer、GLB、纹理、碰撞或相机改动。

五条现象具备现象、工程解释、世界暗示、实际测点与学习记录。其余五条仅登记 DEFERRED_CLUES。读数来自确定性低压教学模型：钟柜提供0秒与24小时后-0.7秒两条历史整点记录，花坛比较0.15/2.4V；不强制现实等待24小时。新几何体包括北侧七灯、接地线槽、锈断缺口、半开花坛、猫、钟和巡线工。

案件板为单个DOM模态与SVG地图，N或笔记本按钮进入，Esc关闭，焦点循环并暂停探索输入。已测卡片可在地图钉住，三条预设假设只记录思路。核对仅列缺失证据类别，不指认坏件。结案回看包含修复内容、观察秒数和调查用时。

M1 LENSES与量程定义直接复用，环境探针接入独立案件模型，不调用旧Store写档。电阻/通断/拆检须断电，带电接线被联锁拒绝。四类证据仅由 measureEnvClue 的真实模型读数产生；UI没有直接写 evidence 的接口。通断证据须逐盏记录L2–L8。修复是L8至G0的独立接地；离线复核后才可送电，逐盏负载压差≤0.3V后连续观察10秒，奖励100XP+1棱镜一次。

夜宵摊老板、赫菲和巡线工的环境对话放在案件板街坊区，按最近测量类别与目标反应；每个触发各自24小时去重，不写M4进度。鹰眼保存测过的灯线、现象支线与G0线，最多32条；3m内接点噪声只给轻微视觉提示。

唯一新持久键 sparkmate.seventh-checksum.envstory.v1，schema v1字段遵照交接包；100ms防抖、pagehide补落盘、坏档/未来版本保守回退、不可写时仅会话。历史最多512条，压缩时保留不同测量凭据，避免长会话丢失案件证据。已结案状态不允许再次维修或重奖。

## 时间轴与验收

| 灯 | 东至西变暗起点（秒） |
| --- | --- |
| L8 / L7 / L6 / L5 / L4 / L3 / L2 | 0 / 1 / 2 / 3 / 4 / 5 / 6 |

14秒循环；各灯起点后0.6秒降至暗态；修复后恒亮。验收不受M2协议缩时影响，始终10秒。

原始日志与截图根：D:/deepseek_file/work/codex-runs/m5-evidence/。envstory-final-pass/envstory-checks.json含完整终态schema、七旧存储项原始字符串前后快照、只读桥事件及源码/8张PNG的SHA-256。旧项包含 routes、street、kickback、resonance、assembly、trust 与 trust.prisms。使用新浏览器档案的真实键鼠走到街区，未注入案件进度、未快进观察时间。

最终实测结果在收尾表更新。第一轮案件专项已通过9组检查、页面/着色器错误0、390px无横溢、Tier0/1不加载环境模块；截图经人工查看后修正了SVG标题重叠与结案信息截图位置。

## 偏差与待审

- M2桥原来会写共鸣档，与本任务“旧键字节不变”冲突；M5传 readOnly，通过同一入口发浏览器事件供观察，不增加M2同步率/日志。该分支满足存档隔离，未来若要持久同步率需单独授权。
- 三位NPC环境反应集中在案件板，未改既有P0/M4对白和判定。赫菲的原对话入口保持原样。
- 未收到权威文案包，工作文案标 [COPY-PENDING]，清单见 SCOUT_M5_COPY.md；结案固定原句“我就说嘛，灯不会杀人，人会。”已落地S3，本轮不写后续回收，不改只读正典台账。
- 全仓原有合法空值合并运算符包含连续问号，不能以改旧逻辑满足字面扫描清零。encoding-scan.json列明原有位置；新增环境源码连续问号及U+FFFD为0。禁词扫描覆盖全部新增环境模块。
- rail若出现既有grounded波动，保留原断言与原始失败，不将重跑冒称首次通过。

请在浏览器中测试：走到熔炉外街，N开板；先验证一次缺证失败，再测五条现象和七灯，断电补线、复核、送电观察后结案。文案与NPC呈现位置仍需主策划审读。本轮不暂存、不提交。


## 最终实测表（2026-11-09）

| 检查 | 本轮结果 | 原始证据 |
| --- | --- | --- |
| 新增环境单测 | 28/28，0 skip | env-unit.log |
| 全部单测 | 204/204，0 skip；基线176 | units.log |
| E2E，SPARKMATE_TEST_PORT=15261 npm run test:e2e | 67 passed (2.0m) | e2e.log |
| P0 / M1 / 共鸣 | 4/4、6/6、8/8 | p0.log、m1.log、resonance.log |
| 装配 / trust | 7组、7组全过 | assembly.log、trust.log |
| 世界 M1 / M3 | 8/8、6/6 | world-m1.log、world-m3.log |
| rail连续两轮 | 3/3、3/3；未改断言 | rail-1.log、rail-2.log |
| build:local | 2907 modules transformed；较M4的2900增加7 | build-final.log |
| 最终案件真实键鼠 | 9组、8张PNG、errors=[]、shaders=[] | envstory-final-pass/envstory-checks.json |
| 存档 / 布局 / 降级 | 七旧项原始字节不变；390px无横溢；Tier0/1不加载 | 同上 |
| 编码与diff | 新增交付文本连续问号/U+FFFD=0；全仓原有31个连续问号运算符；diff --check退出0 | encoding-scan.json、final-checks.json |

最终8张图：01-street-notebook、02-insufficient-evidence、03-five-measured-clues、04-four-evidence-categories、05-independent-ground-recheck、06-loaded-observation、07-case-closed、08-restored-390px。已人工查看街区实景、结案与窄屏截图。最终源码、测试及截图SHA-256保存在案件JSON；全交付索引另见证据根 validation-summary.json。

新增鹰眼断言首次在模态暂停Canvas渲染时读到0条可见线路，保留 envstory-attempt1.log 和 envstory-final/失败证据。修正测试时机：关闭案件板恢复场景渲染，再断言七条记忆线路可见，断言本身未减弱；最终完整复测全过。Windows子进程最初缺ProgramFiles导致找不到Chrome，后补标准环境；npm首次cmd启动转义失败，后改用Node直接启动npm CLI，原始失败日志保留。均未改旧测试。

生产构建只有既有大包提示。最终两个测试端口均无监听，暂存区为空，HEAD不变，package.json与lock文件无变化。
