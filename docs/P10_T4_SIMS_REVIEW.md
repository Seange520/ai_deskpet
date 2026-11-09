# T4 动手校验 · 仿真组件库 v1

基线与收尾 HEAD：`a58307340fe3a4ce33e39a6e55879a1faf86ee1f`。本批不提交、推送或打标签。

## 入口与边界

启动 `npm.cmd run dev -- --port 15262 --strictPort`，打开 `http://127.0.0.1:15262/?quality=3&sims=1`，点击“动手校验 · DEV”。仅 DEV、Tier3、sims=1 同时满足时渲染 lazy 入口。原生 dialog 提供焦点约束、Escape 关闭与关闭后焦点恢复。

唯一既有文件变更为 `src/App.jsx` 两行新增。新增目录 `src/features/learning/sims/` 包含 registry、checks、四个仿真、CSS、演示面板与入口；另新增 `tests/sims.unit.mjs`、`scripts/check-sims.mjs`、本审阅文档。无新增依赖、课节/冻结哈希/README/存档键变更。v1 不接 LessonRunner，T4.2 接入。

## 判定与复用契约

每个仿真导出 `data = {id,title,instructions,elements,checks,evidenceTypes}` 和默认 React 组件。registry 是冻结的四项 import loader 白名单；`getSim(未知id)` 返回 null，面板提供文字回退。新增内容不得从外部字符串拼接模块路径。

`evaluate({values,evidence}, checks)` 返回 `{passed,checks:[{id,type,passed}],evidence}`。task 是 values 的字面自有属性键；numeric 只接受有限数值，边界包含容差；choice 严格比较基本类型；sequence 严格比较长度、顺序、基本类型。未知类型失败。无检查时 passed=false。

evidence 按 type/id 合并，每次显式校验追加 `{value,passed}` 到 attempts 数组；不原地修改输入。组件只保留当前挂载实例的内存证据，切换仿真会开始新会话。可展开“校验证据”查看次数与最新结果；清空接线或修改程序会作废受影响的通过状态。数据和尝试次数不进入任何持久化存储。

## 教学模型与限制

| 仿真 | 可验证目标 | 可重试提示 |
|---|---|---|
| Meter | 60V 直流档测 24.0V；通断档判断通/断；Ω 档测 220Ω | 20V 量程溢出、带电测通断/电阻的保险丝风险、断电对象档位不匹配 |
| SeriesVoltage | 电源→220Ω→LED→回流闭合；电阻 3.1V、LED 1.9V、电源 5V、电流 14.09mA | 未闭合测量、接线顺序错误 |
| PWM | 25/50/75/10%；四通道实时显示平均电压；C 为 2.475V，满足 2.5±0.2V | 全低电平、通道密码不匹配 |
| IDE | 白名单 setup/pinMode/loop/digitalWrite/delay；亮灭各 250ms 得 2Hz | 缺块、顺序错误、未编译先运行、500ms 导致 1Hz |

串联模型假设 LED 恒定压降 1.9V、导线电阻为零。PWM 是 0/3.3V 理想方波的平均值，不模拟仪表滤波。IDE 的“编译”是块序列校验，预览为完整固定模板；串口是模板状态轨迹，不是真实编译器、解释器或串口设备。循环以固定多行轨迹表示，LED 由 CSS 闪烁；减少动态效果时显示静态亮灯。所有模型均在演示页标注“仿真 ≠ 真机”。

## 验收与证据

`node --test tests/sims.unit.mjs`：32 项，覆盖数值边界/拒绝类型、choice/sequence、证据去重/重试/不变性、白名单/回退、执行和存储禁用检查、390 CSS 约束、Tier/DEV 隔离。

`node scripts/check-sims.mjs`：八组真实键鼠场景，每组件正确完成与错误路径各一组；每组都测 1280×900 和 390×844，统计 DOM ≤120 与横向溢出，检查旧存档不变；四个隔离 URL 确认无 sims 模块请求。正确路径截图为桌面，失败路径截图为手机，手机截图滚至反馈位置。页面 evaluate 仅观察布局与存档，不注入仿真状态。

默认输出 `D:/deepseek_file/work/codex-runs/t4-evidence`，可用 `SPARKMATE_SIMS_OUTPUT` 覆盖，服务地址可用 `SPARKMATE_SPACE_URL` 覆盖。输出八张 PNG、`sims-check.json`、`SHA256SUMS`、`ROOT_SHA256`。JSON 包含 checks、耗时、读数/提示、证据摘要、截图清单、隔离结果与错误。

完整回归结果、原始日志位置和最终哈希见 `D:/deepseek_file/work/codex-runs/T4_LAST.md`。Windows 默认 TEMP 曾触发 esbuild 清理文件权限错误；仓库已有 `npm.cmd run build:local` 使用项目临时目录，也可为 `npm.cmd run build` 设置同一 TEMP/TMP。

最终结果：单测 413/413（新增 32）、E2E 67/67、仿真八组（24 项检查 + 四项隔离）、P0、M1、教学专项、build、git diff --check 均 exit 0。仿真页面/着色器错误均为 0，单组件最多 35 个元素节点。首轮并行浏览器回归出现两项 E2E 失败与 M1 Tier2 就绪超时；串行完整 E2E 与单独 M1 复验通过，未修改这些范围外代码，失败日志仍保留。八张截图已逐张视觉检查，哈希逐项复核；生产产物无仿真组件 chunk。完整编码与范围检查见同目录外部回执 `T4_boundary.json`。

未覆盖：真人零基础学习计时、屏幕阅读器人工评估、真实硬件/外部 IDE；正式课节接入、证据持久化和服务端复验留待后续批次。
