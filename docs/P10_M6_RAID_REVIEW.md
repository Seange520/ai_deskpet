# P10-M6 潜行切片阶段审核（未完成）

基线 HEAD：af39cf2543cfe5c2e0d72f07c43904e205dca5fd。开工时 git status --porcelain 为空，15261/15262 无监听，唯一 Codex exec 47428 是本次任务进程。已全文读取 LEAD_TO_CODEX_M6、CANON_LEDGER、M4/M5 审核，并读取 PROJECT_PRIMER 的 V2.1-MVP 与数据边界。直发任务授权覆盖旧交接包的预先二次确认。本轮不暂存、不提交、不推送、不打标签、不改版本或依赖。

## 结论与需裁决点

M6 尚未完成。现有 P9 东端承载面是宽 2.4m 连桥与半径 4.78m 的硬件圆台，无法直接沿用为约 22×18m 封闭院落。证据：src/features/world/Exploration.jsx 的 TerrainColliders（34行起），桥半尺寸 [4.5,0.12,1.2]，岛面 CylinderCollider 半径 4.78；src/features/world/poi.js 的硬件中心 [16,0,0]。

已通过异步问题请求裁决：是否允许只在 RaidScene 中新增独立院落地面和围栏碰撞，不改原 P9 TerrainColliders、KCC、相机或传送。未收到答复，依赖此决定的街区集成暂停。

具体可审方案 A：院落范围 x=[12,34]、z=[-18,0]（22×18m），入口 [12.8,0,-0.6]，连接既有东端承载面；局部地面顶面与旧地面齐平，基础几何、现有材质。三房顺序沿东向展开，遮挡使用箱体解析 AABB，同一组尺寸用于本区碰撞与检测；只有一个巡逻机实例。节点设于东北侧，出口回到入口附近。此方案必须增加本区承载面，不会将缺失地形伪装为可行走区域。

## 已完成文件与行为

- src/features/raid/raid.mjs：确定性 seed/RNG、固定三房、状态机、暴露与警报、断电8秒、六词条数据、测量证据、安全联锁、三选一、节点两次重组、代码判分、静默脚步、撤离和失败结算、schema恢复。
- src/features/raid/patrol.mjs：定速折线路径、9m/70度视锥、6m听觉、蹲/静噪声倍率、解析线段遮挡纯函数。
- src/features/raid/raidStore.js：Zustand工厂，唯一持久键 sparkmate.seventh-checksum.raid.v1；仅写meta/history/rewards，单局留内存；关闭/pagehide放弃结算；首通奖励独立且幂等；存储异常会话降级。
- tests/raid.unit.mjs：35项单测。只验证逻辑，不等价于真实键鼠验收。

测量预算调用既有 P0 actCircuit/advanceCircuit，复用扫描门控、每测量扣12、关鹰眼每秒恢复6和带电通断联锁。当前 kit 仅为纯模型测试载体，尚未完成与街区现有仪表共享运行状态及 UI 的集成，不能宣称已满足“无第二套万用表”的端到端要求。词条对实际 KCC 移速、技能后的脚步输入、鹰眼文字等视觉效果尚未接入。

参数：720秒，三房各一核心/10材料；虚接额外+1材料；视线20/s并按距离放大，听觉每次8，火花/短路警报+10；警报100失败；短路基础材料损失5，快熔保险后2；失败保留 floor(materials×0.3)；静默5秒/CD30秒，大电容CD24秒；首通100XP+1棱镜仅写新键rewards。暴露脱离视线每秒降低10为本阶段暂定参数，需体验验证。

## 自测原始输出与证据

证据根 D:/deepseek_file/work/codex-runs/m6-evidence/，日志均UTF-8。

```text
node --test --test-isolation=none tests/raid.unit.mjs
ℹ tests 35
ℹ pass 35
ℹ fail 0
ℹ skipped 0

node --test --test-isolation=none tests/*.unit.mjs（Node枚举展开）
ℹ tests 239
ℹ pass 239
ℹ fail 0
ℹ skipped 0

npm run build:local
✓ 2907 modules transformed.
✓ built in 8.00s
exit=0
```

原始文件 raid.log、units.log、build.log。构建模块数未增长是由于新增 Raid 尚未导入应用，并非预期+6至+14已经达标。构建仅有既有大包提示。

首轮35项中34通过，技能冷却测试误将自动获得大电容的通关样本当成无词条样本；修正测试准备为无词条后35全过，未修改技能30/24秒公式或降低断言。最终重复单测通过。

E2E结果在收尾追加。未执行 P0/M1/共鸣/装配/trust/envstory/世界/rail 浏览器专项；尚无 M6 10图、真实测量JSON、390px或页面/着色器验收，不能标为通过。Tier0/1尚未挂载任何新入口，但没有浏览器资源加载断言。

## 编码、隔离与限制

validation-summary.json记录四个新增代码/测试文件SHA-256、扫描位置。全仓已跟踪文本与本轮新增源测试扫描发现31处原有合法空值合并运算符，新增连续问号及U+FFFD为0；因此字面全仓清零要求未达成，保留旧代码以遵守“不改旧判定”。git diff --check退出0；新文件另做行尾空白检查。

StreetScene/StreetOverlay、旧源码/旧测试、package.json、lock均未更改。七旧键未做浏览器前后原始字符串快照：只能报告存储工厂单测证明它仅访问新键，不能代替专项键隔离证据。

缺失：RaidScene.jsx、RaidOverlay.jsx、raid.css、check-raid.mjs、SCOUT_M6_COPY.md、真实键鼠截图和JSON、共享仪表与KCC集成、完整回归专项、15分钟体验验证。当前不适合用户进行M6整局测试；现有游戏可按原流程回归。收到区域承载裁决后继续实现与验收。

## 收尾结果

SPARKMATE_TEST_PORT=15261 npm run test:e2e 原始输出：67 passed (1.9m)，exit=0，见 e2e.log。其覆盖既有业务回归，不能代替M6整局与3D专项。最终源码格式化后全仓单测239/239，0 skip。HEAD保持基线，暂存区为空。

