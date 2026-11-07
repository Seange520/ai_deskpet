# P8-M3 世界观与 Kernel 进化（v0.9.6-beta 封板）

日期：2026-11-07。主仓库 `D:\deepseek_file\ai_deskpet`；开发基线 main / `2859551bb4f1e061980eda3a57e4b405c9b27280` / v0.9.5-beta。总指挥已确认本切片视觉与交互验收通过，授权封板提交、打标签 `v0.9.6-beta` 并推送。README、package.json 与锁文件根版本统一为 `0.9.6-beta`；不生成交接文档，等待 P9 指令。

## 世界观数据与揭示边界

`src/data/lore.js` 包含七枚校验符及石碑、SOS、残响议会接收器、循环残骸、流星记忆的答案/线索/时代/教学关联/揭示条件。七枚校验符为未来叙事的作者数据，status=planned，不假装已收集、已开课或已奖励。石碑读取同一数据库。公开线索和底层答案分字段，未来身份与终章不在本轮一次揭底。

| 答案 | 玩家线索 | 教学关联 | 本切片入口 |
| --- | --- | --- | --- |
| 石碑是前任留下的检查装置，末道未完成 | 七道不闭合刻痕 | 观察、记录、验证 | 原石碑 DOM 投影按钮 |
| SOS 是维护网络留下的求救节律 | 三短三长三短 | 时序编码 | 仪表盘岛的独立档案灯 |
| 残响议会接收器保留失联总线心跳 | 断开线路仍留有最后的握手 | 通信与故障定位 | 硬件岛档案按钮与程序化接收器 |
| 旧程序失去终止条件 | 重复的退出检查 | 循环与状态机 | 代码岛档案按钮与残骸；不执行死循环 |
| 流星是维护网络的记忆封包 | 七个微光节点 | 记录与校验 | Tier 3 流星投影按钮，及各档 HUB 静态档案 |

SOS 只播放独立档案灯，不修改 runtime、USB、真实 command-eye 的 LED 或沙盒指令。减少动画时显示静态节律文字。Lore 与成就只用展示内存，不增加持久化键，不写学习存档，不发 XP 或绕过关卡。Lore 同时显示在桌宠气泡及可关闭的档案提示中，离岛、后台或模态时清理。

## XP 与形态

直接只读调用现有 `totalXP(routes, debugProgress)`。实际项目包含故障修复奖励，MAX_XP 为 2200；未将预研的 2000 上限写回业务。500 XP 是本次明确批准的形态阈值：低于 500 为 Spark，达到 500 为 Kernel。后续更高形态未实施。

旧档加载时直接显示对应形态，不播放历史进化、不重发成就；当本次会话从不足 500 跨过阈值，启动约 4.8 秒的中央重组，并显示「系统核心已激活」。重置回退 Spark；不保存形态或额外成就奖励。叙事成就为展示通知，未扩展原持久化徽章规则。

Kernel 是原创程序化小机器人：圆角机壳、悬浮双手、腿部关节与胸部核心环。保留 command-pet/head/eye、真实 LED、指令根、摸头与音效逻辑。通过 props 传给 PetModel，3D 模型不直接读写教学 Store。

重组复用 PetDissolve 的 960 表面采样粒子、消散边缘和 Toon 编译链；通过外部进度驱动散开/聚合，在中点更换几何形态。复用伙伴 Canvas，稳定 portal host 临时移动到 body 中央，结束归位；没有第三个 renderer 或新 composer。手动进化路径的 useFrame 使用负优先级，保留 Tier 1 自动绘制。后台/模态暂停时钟，减少动画和 Tier 0 直接切形态并播报成就。

## 生态与门控

鱼群代表维护光带周围的记忆信使。固定种子布局形成三群，Tier 3 为 72 条，Tier 2 为 40 条，低档卸载；合并低模几何后一个 InstancedMesh/一次 draw，顶点 shader 计算游动、摆尾和错相浮动。后台/模态/减少动画冻结，无交互 AI。

流星只挂 Tier 3，一个透明加色平面，depthWrite=false、保留深度测试；首次在有效活动 150 秒后出现，每次经过约 7 秒，随后间隔 150–230 秒。时钟在后台/模态/减少动画/飞行/进化时停止，不按墙钟补播。真实 Canvas 仍点击穿透，按钮以非正优先级投影到星头处；点击或 Enter 会显示桌宠记忆。所有档位的 HUB 保留静态记忆档案，避免依赖短暂天象获取文字。切档卸载清理流星按钮。

沿用现有两个 Canvas、Stage/伙伴后期与资源释放机制。未引入 VRM/SDF、物理体积特效、外部资产、依赖升级或新存档规则。

## 复验

本轮最终验收：完整原 E2E **67/67**（失败/跳过 0，最终复跑约 2.3 分钟）、M3 专项 **11/11**（正常页面浏览器错误 0）、原 NPR **9/9**、既有画质/飞行单测 **7/7**，生产构建成功（2772 modules）。NPR 描边像素消融平均 RGB 差约 0.77594，真实 LED 泛光消融约 0.46503；没有以 effect 对象存在代替实际贡献。

M3 专项覆盖：石碑与 SOS 真灯态变化、500 XP 表面粒子、模态/模拟后台冻结恢复、475 XP 保持 Spark、重置回退、旧档直接恢复 Kernel、真实两岛导航与 Lore、鱼群 72/40 实例与减少动画冻结、实际流星 shader 和 Enter 捕捉、实时 3→2→1→3 剔除、Tier 1 进化实际绘制（10 draw / 3524 三角形采样）、真实 WebGL context loss 与 Stage 模块加载失败的零 Canvas DOM 兜底。注入完成记录会按项目原订阅正常保存；独立断言 Lore 和进化没有产生注入以外的额外存档变化。

截图与证据目录：
`C:\Users\Senage\.codex\visualizations\2026\11\07\01a1b653-0a17-7e32-aa02-0ca83280af2c\sparkmate-p8-m3`

- `m3-stone.png` / `m3-stone-scene.png`：石碑真实点击后的 UI / 场景图。
- `m3-evolution-mid.png` / `m3-evolution-kernel-mid.png`：散开 / Kernel 聚合中间帧。
- `m3-kernel-achievement.png` / `m3-kernel-scene.png`：成就与完整机器人形态。Kernel 加厚机壳后，面屏/眼睛/嘴部前移以避开共面闪烁，核心环保持正面圆环。
- `m3-world-meteor.png` / `m3-world-ui.png`：真实 HUB 全景与流星（加速下一次天象时钟），对应相机 `[23,21,29]` / FOV 56。
- `m3-meteor-memory.png`、`m3-sos.png`、`m3-echo.png`：具体 Lore 触发证据。
- `m3-checks.json`、`e2e-results.json`、`npr/toon-poc-results.json`：可审计测试结果；截图均为 1728×1080 / DPR 1，无调色或重绘。

原 tests、学习/硬件 Store、qualityTier 未改；依赖清单与锁文件仅更新根版本，无新增依赖或依赖升级。原 500 kB 构建分包提示仍在。总指挥已通过本轮视觉与交互验收。

所有命令显式 workdir 为主仓库。正常 Vite 与 E2E regression 服务分离。

```powershell
$env:SPARKMATE_TEST_PORT='15261'
npm run test:e2e
node --test --test-isolation=none tests/m2-quality.unit.mjs tests/quality-tier.unit.mjs tests/travel-timeline.unit.mjs
npm run build:local
$env:SPARKMATE_SPACE_URL='http://127.0.0.1:15262'
node scripts/check-lore-m3.mjs
```

`check-lore-m3.mjs` 在独立浏览器上下文中用真实 Store.setState 注入完成记录以得到 475/500 XP，不添加假的 xp 字段、不写产品调试入口。旧档专项单独写入该测试浏览器的 localStorage 并刷新。流星截图通过实际场景对象的内存时钟提前下一次天象，不改变路径、相机、shader、图像或产品频率；应明确此加速取证条件，不当作自然等待数分钟的证据。截图纯场景版只临时隐藏教学 HUD，另有 UI 版。
