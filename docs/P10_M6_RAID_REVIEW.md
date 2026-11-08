# P10-M6《残响潜行》交付回执（待验收）

基线 HEAD：2f81c2cc6114536c508a478c59d590cc0126cf10。开工工作区干净，15261/15262 无监听；进程核查只发现本轮 Codex 及其浏览器工具，另有与仓库无关的 18787 服务。已全文读取仓库外 work/handoff/LEAD_TO_CODEX_M6.md、CANON_LEDGER.md 和仓库内 M5/M6 上轮审核。用户续轮裁决覆盖旧交接包的方案确认步骤。未暂存、未提交、未推送、未打标签；版本及依赖不变。

## Q1：私有院落与空间边界

`layout.mjs` 是地板、围栏、遮挡箱体、三房位置的单一真源。主院 x=[22,44]、z=[-9,9]（22×18m）；连接段 x=[20.78,22]、z=[-0.8,0.8]，地板顶面 y=0.008，与旧圆台一致。旧圆台半径 4.78；连接段从东切线接出，无面积重叠、无双地板；圆弧与接缝边角的小缝由胶囊正常跨过，未改 KCC。真实键鼠已经双向走通，过缝与三房均保持约 y=0.673。

新几何和 Rapier fixed CuboidCollider 全部位于 `p10-raid-courtyard`；仅 running/checkpoint/extracting（含 entering）挂载，终态立即移除。失败时调用现有硬件台地返回流程；入口及成功撤离均步行，不添加传送或相机逻辑。走出西侧区域、主动返回、页面卸载均放弃单局。撤离按钮还要求回到旧圆台 x≤20.45，避免拆掉玩家脚下的新承载面。

三房目标位于 [25,-3]、[32,-3]、[39,-3]，节点 [41,3]；巡逻折线 [25,7]→[41,7]→[41,8]→[25,8]。箱体可见尺寸、碰撞尺寸与巡逻 AABB 来自同一数组。仅基础几何、现有 ToonMaterial/ToonPalette、既有场景灯光与雾；无 GLB、纹理、Canvas、composer 或额外灯。移动倍率在本区物理步回调中作用于已计算的位移；Exploration.jsx、TerrainColliders、ASSET_LAYOUT、GLB、KCC 常数、相机/传送源码零改动。

## Q2：唯一万用表与单局状态

RaidOverlay 只提供三测点按钮、档位、LCD、专注的紧凑测量条。UI 不与 M1 完整面板并列；远离旧检修范围后才进入院落。逻辑调用 raid.mjs 的 P0 actCircuit/advanceCircuit 适配，保留扫描门控、每测 −12、关闭鹰眼 +6/s、错误档位不作证据、带电通断联锁。未新增万用表 store，未读写 street.v1；单局 kit/专注进入重置，只留内存。

单局只用 raid.v1 的 meta/history/rewards；首通 100XP+1 棱镜独立幂等。六词条、固定核心/材料掉落及三选一、两次节点重组、5s 静默脚步、三种伪代码判分、三核心撤离、失败安抚均已呈现。快熔保险增加第二次停机机会，两次至少间隔 8 秒。文案统一待审 [COPY-PENDING]，见 SCOUT_M6_COPY.md。

StreetScene/StreetOverlay 各仅增加导入和挂载两行；Street/RaidGate.jsx 做 Tier3 lazy 导入，Overlay 以 portal 避免小地图截获操作。390px 面板下移到 216px，保留全局返回按钮；自身返回固定在滚动头部。

## 实测与证据

证据根：D:/deepseek_file/work/codex-runs/m6b-evidence/。最终 M6 以 raid-complete/raid-checks.json 与 legacy-keys.json 为准；前轮 raid-verified/ 已通过十图及旧键字节断言，raid/、raid-final/、raid-pass/ 保留调试失败。

| 检查 | 原始结果 / 日志 |
| --- | --- |
| raid 单测 | tests 37 / pass 37 / fail 0 / skipped 0；raid-final.log |
| 全仓 23 文件 | tests 242 / pass 242 / fail 0 / skipped 0；units-final.log；基线239，新增3项 |
| E2E 15261 | 最终67 passed (2.4m)；e2e-final.log（首轮2.3m也通过） |
| P0 / M1 / 共鸣 | 4/4、6/6、8/8；street-p0-0.log、street-m1-1.log、resonance-final.log |
| 装配 / trust / envstory | 7组、7组、9组；assembly-3.log、trust-4.log、envstory-5.log；持久化保护后 trust-verified.log 再测7组通过 |
| 世界 M1 / M3 | 8/8、6/6；world-m1-6.log、world-m3-7.log |
| rail | 原两轮失败；最终连续3/3、3/3，且目标岛距离断言通过；world-rail-recheck-1794175938605.log、1794175967942.log |
| build:local | 2915 modules transformed（基线2907，+8）；build-final.log；exit 0，仅既有大包提示 |
| M6 / 窄屏 / Tier | 十图、两JSON、七旧键原始字符串、SHA-256、390px、Tier0/1/2无raid请求，最终收尾数据见下 |

十图顺序：01-entry、02-room1-measure、03-module-choice、04-room2、05-room3、06-checkpoint、07-extracted、08-alarm-failed、09-390px、10-refresh-abandoned（均 PNG）。已人工查看院落、节点和窄屏；JSON 包含真实 probe/mode/value/unit/blocked/time。未注入 Store 进度、未注入奖励、未快进倒计时；唯一页面 evaluate 是读取 DOM、存储、资源与 R3F 场景。

## 偏差、修复与参数暂定

- 落位按本轮 Q1 改为完全外接东圆台，替代上轮 x=[12,34] 的重叠方案；巡逻路线随院落平移重排，检测公式不变。成功路径可沿南侧低风险绕行，属于本切片的保守难度，尚未证明自然玩家有15分钟循环体验。
- 严格刷新字节快照发现两项旧模块空写：共鸣无变化 reconcile 仍更新时间戳、trust 未修改也在 pagehide 写空档。仅在这两个 store 加无变化不落盘保护，保留实际进度变更写盘；新增共鸣幂等单测并重跑对应专项。不是 Raid 写旧键，也未用忽略 updatedAt 的弱化比较。
- 原 rail 脚本截图期间仍按住 S，慢截图会继续走出旧岛，造成 grounded=false。先松键再截图，并等待连续三次 grounded，同时新增距数据瀑布中心 <4.8m 的断言，防止坠落后回枢纽误报。未改世界实现，失败原始日志 world-rail-8/9.log 保留。trust 复测亦遇到旧微课自动暂停/首轮跳过、次轮补做造成快照不同的竞态，改为在隔离快照前明确完成30秒微课，仍要求真实走到 x>11。无共鸣档时用 freshResonance 作为逻辑比较的默认值，不写入存储，不放宽四旧键字节断言。
- 参数沿用：720s；三房各1核心/10材料，虚接额外+1；视线20/s且距离修正、听觉每次8、火花/短路警报+10、100失败；暴露脱离视线 −10/s；断电8s；静默5s/CD30s（大电容24s）；失败 floor(材料×0.3)。这些均为切片体验参数，尚待策划体验后定稿。
- 早期键鼠失败包括旧微课暂停、绕行撞旧箱体/晶簇、小地图拦截节点按钮及旧存档空写。均保留失败证据并修正路线/布局/空写，未削减测量、奖励和存档断言。旧源码原有31处合法空值合并符保留，新增行/新文件的连续问号与 U+FFFD 扫描单列。

## 验收请求

请在 Tier3 进入探索，经熔炉外街抵达东圆台，从东侧旧岩石间空隙进入；开启单局后走三房、测量选点、拿模组、到节点重组和答题，再步行返回撤离。另验证报警失败、刷新放弃、窄屏返回、六词条手感。文案、巡逻难度与15分钟循环体验仍需主策划验收；本轮没有待确认的区域实现授权，也不发布版本。

## 最终 M6 实测收尾

| 场景 | 状态 | 核心/材料与计数 | 实测秒数 |
| --- | --- | --- | --- |
| 三房、节点、答题、技能冷却、步行撤离 | extracted | 携回 30 材料，4 次真实测量 | 52.07 |
| 错测点触发警报100 | failed / alarm | 10 保留 3；13 次测量 | 21.67 |
| 主动走近巡逻机，观察暴露后刷新 | failed / abandoned | 保留0；首通奖励仍100XP+1棱镜 | 13.67 |
| 全部持久终态 | meta | runs=3 / extracted=1 / failed=2 / materials=33 | — |

raid-complete/ 恰好10张PNG、raid-checks.json、legacy-keys.json。passed=true，errors=[]，shaders=[]；JSON内含全部图片和raid源码SHA-256。新浏览器档案未建档的旧键以null原样参与比较；没有填充或归一化旧键。巡逻暴露在第三局用真实键盘走近触发，无调试推进。窄屏终态图已人工查看，全局返回和本局返回均可见。

最终 trust-verified.log：passed=true，7组，errors=[]，shaders=[]。最终 E2E：67 passed (2.4m)，exit=0。单测、E2E、构建的批量日志使用 Node 直接调用 npm 脚本的对应入口（Playwright CLI / scripts/build.mjs），参数、环境及检查内容与 test:e2e / build:local 一致。

最终 git diff --check=0；23个单测文件；新增行和7个新文件的连续问号/U+FFFD均为0，行尾空白0，详见 encoding-scan.json。manifest.json另列全部交付文件与截图的SHA-256。HEAD与暂存区在收尾核验，测试端口关闭。
