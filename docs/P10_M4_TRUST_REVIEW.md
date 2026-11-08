# P10-M4 信任与邀约本地审核

基线：29c06576c46f3107399aa87cb1033c441071f893（M3）。开工工作区干净，15261/15262无监听，无其他写手或测试。本次直发执行任务书优先于旧handoff中的M1基线和二次确认；共鸣隔离按已裁决A执行。未提交、未暂存、未推送、未打标签。

## 实现与接触面

新增 src/features/trust/ 下 trust.mjs（纯函数/schema/幂等/周礼物/选择）、trustStore.js（Zustand、防抖与pagehide落盘、只读M1完成状态、共鸣上报）、forge.mjs（三幕确定性模型）、HefiNpc.jsx（独臂基础几何角色）、TrustPanel.jsx、trust.css、chipEffects.mjs；新增 tests/trust.unit.mjs、scripts/check-trust.mjs。StreetScene/StreetOverlay各仅新增导入和挂载两行；README补充操作指南。未改旧测试、旧模型或旧schema，无物理/相机/传送/碰撞/资产/依赖变更。

赫菲位于(12.4,0,1.7)，与冷库交互点分居街道两侧且距离大于2.5m。仅现有Tier3探索分支加载。面板使用DOM/SVG、Framer Motion和Lucide，沿用既有modal-backdrop暂停输入，支持Esc、焦点回收与Tab循环、390px滚动。无新增Canvas、composer、GLB、纹理。

普通解锁路径：M1完成+2、面板两个白名单价值观交流各+1→4点/2级；第一幕选择+1且完成+1→6点/3级；第二幕选择+1且完成+1→8点/4级。所有选择只记录立场，不显示加分评价，两种第三幕选择均可完成并解锁芯片。每级2句对话，后续直接引用玩家邀约原话。第三幕只说「六」的名字，不说死因或身份真相。芯片仅赫菲视觉层，只读hasChip，不改变旧判定。

## 数据与模型

键 sparkmate.seventh-checksum.trust.v1，保持任务规定version/npcId/levelCap/整数trustPoints/invites/choices/chipUnlocked/dailyGreeting/history字段。礼物半点保留在history，整数trustPoints取累计floor；gift.total为终身累计，每周额度按history的本地ISO周去重，满足giftTotal≤0.4×totalGain。本阶段获取封顶8点，levelFor仍支持0–14映射0–7；canReachSeventh只留真结局判定，不实装剧情。每日问候按本地日期去重。

每幕+1信任、+1棱镜；棱镜派生于合法完成记录并写独立 sparkmate.seventh-checksum.trust.prisms，最多3枚，XP始终0。100ms防抖、pagehide补落盘，重复完成/事件/刷新不重奖；坏档/未来版本回退，完成结果逐幕验证，存储失败有提示。

熔炉：初态带电，离线检测与处理均联锁；断电读∞Ω、观察端子氧化与松动、修端子或重压接后12Ω；升温T=min(200,20+60t)，180–220°C带从t=2.6667s进入，7秒时带内4.3333秒，通过条件同时要求7秒与带内≥3秒。积分按区间交集，不受步长影响，独立于M2 verifyDuration。失焦/隐藏暂停。第二幕三组(1m/.8Ω、2m/.2Ω、2m/∞Ω)，测量的是中段断口隔离后保留线段。第三幕要求断电、24V支路；48V与带电接线均拒绝，点亮或不点亮都保留原话。

## 证据与验证

证据根：D:/deepseek_file/work/codex-runs/m4-evidence/。trust/trust-checks.json保存终态schema、四键原始字节快照和共鸣前后日志；trust/validation-summary.json记录截图与源码SHA-256，根validation-summary.json汇总交付与回归证据。

真实键鼠专项：先沿桥进入原M1微课并真实完成30秒学习（这是快照前准备），再走到赫菲；此后禁止注入状态、快进时间或直接调用store。7组检查覆盖三幕教学、真实7秒、刷新、原话引用、模态输入冻结、奖励与芯片、窄屏、Tier0/1。页面errors/shaders均空。

四键 sparkmate.routes.v2、sparkmate.seventh-checksum.street.v1、kickback.v1、assembly.v1 前后逐字节一致（JSON内保留完整原字符串/null），故旧XP未变。共鸣version=1不变，sync/syncLog改变且存在trust前缀事件。trust代码没有写resonance键，唯一上报为既有emitSyncEvent。新棱镜不进入M2旧案件棱镜余额。

截图：01-hefi-greet.png、02-furnace-measure.png、03-furnace-pass.png、04-restored-choice.png、05-scrap-torch.png、06-grave-safe-branch.png、07-chip-unlocked.png。已人工查看测量与终态截图，无裁切主操作或横向溢出。

最终回归数据见下方追加表。

## 偏差与限制

每幕8–12分钟是尚未验证的体验目标：当前是紧凑的教学交互原型，熟悉答案可明显更快完成，没有强制等待来凑时；因此不宣称该时长门槛已验收。没有收到SCOUT_M4_COPY文案包，使用本轮中文工作文案（无占位符），仍需人工审读。高等级5–7本轮不可获取；reservedUnlocks提供5/6级预留标记，canReachSeventh提供真结局门控，不含后续支援/结局剧情。礼物半点的整数呈现、当前4级获取封顶已在开工回执说明。

首次专项因原M1微课抢焦点而停止行走，保留trust-first.failed.log；修正测试准备路径，未改M1行为/断言。另一次完整通过发生在最终格式化前；trust.log及最终截图为最终源码复测结果。开发服务与E2E服务严格串行。

## 最终实测表（2026-11-09）

| 检查 | 结果 | 原始证据 |
| --- | --- | --- |
| 仓库全部单测 | 176/176；其中信任24项。指定M3基线109+24=133，额外43项旧测试也通过 | units-final.log |
| 信任真实键鼠 | 7组检查、7张PNG；errors/shaders空 | trust.log、trust/ |
| P0 / M1 / 共鸣 | 4/4、6/6、8/8 | p0.log、m1.log、resonance.log |
| 装配专项 | 7组全过、9张PNG、errors/shaders空 | assembly.log、assembly/ |
| 世界 M1 / M3 | 8/8、6/6 | world-m1.log、world-m3.log |
| rail连续两轮 | 第一轮3/3；第二轮原116行grounded断言true/false失败 | rail-1.log、rail-2.log |
| build:local | 通过，2900模块，较2893增加7；仅既有大包提示 | build-final.log |
| 生产调试入口 | dist/assets JS中 data-trust-debug 为0 | validation-summary.json |

rail未改断言、未修P9物理，结果不能标成两轮全过；与M2历史失败位置相同，根因未确认。最后一次schema收紧仅涉及M4，随后已复跑全部单测、完整信任专项和生产构建；旧专项的组件与断言无变化。

E2E最终67/67通过（2.0分钟），见e2e.log；15262先关闭，E2E使用15261自带服务，退出后两个端口均无监听。编码扫描只针对M4新增源/测试/审核文本，连续问号、U+FFFD和文案占位符均0；旧源码自身的既有运算符/注释不纳入新增编码缺陷计数。git diff --check退出0，暂存区为空，仅M4预期13个源码/测试/文档路径变更。日志在收尾统一保存为UTF-8。
