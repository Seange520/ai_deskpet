# T1 校验之径接入评审

冻结基线：2046eb6228350e09e4aadb2648d0a54ea319df58。独立教学入口、六段运行器、七柱九层 SVG 星图和本机学习档案已接入。零新增依赖、Canvas、WebGL、世界实体或旧进度写入。App 仅增加 lazy 入口、Portal modal 分支及 textarea 焦点环支持。

## 输入与运行边界

图谱及全部 40 节课节逐字节复制，静态 eager import 仅在教学面板 lazy chunk 内执行。schema 单测移植原 38 项课节检查及图谱 1236 项断言，并嵌入冻结 CSV 进行一致性核对。SHA-256 单测同时约束全部冻结文件。

运行器按六段渲染。实践为依据课节步骤的 DOM 操作计划排序；不是原场景接线、真实传感器、分类器训练或网络请求。验证阶段是预置数值/文字测点的 DOM 仪表与容差记录，计算题也使用预置教学数值。原计划媒体仅展示 alt 说明和内联 SVG 示意，未加载不存在的视频或远端资源。

四节冻结课节带 structured-choice 编程选项；另外六节（K3-04/05/06、K4-05、K5-01/02）由 codecheck.mjs 提供题型选项映射。只比较选项白名单，记录所选结构，不执行脚本。L8 的 project 作为实践排序及开放自评处理，不伪造真实项目完成。

图谱是解锁真源。K1-01 课节附加 K0-04 与图谱不同，未改冻结输入；验收仍通过真实 UI 完成 K0-01/02/04 后再做 K1-01。L8 依据 gate.type 与 requiresMinPillars 判断任意三柱；掌握门槛按本任务书 0.7，而非 gate 描述中的旧 0.8。

## 档案与交互

唯一写键为 sparkmate.checksum.profile.v1。mastery 使用 0.6 check + 0.4 transfer + retentionBonus，证据至少三种成功检查类型才可常亮。explain 只记录，不增加分数。复习在 1/3/7/21 天成功时逐次增加 2%，单次复习最多领取一档，上限 8%。runId 去重防止同一次完成重复入账。重置先打开确认区再执行，只替换本档案。

七柱星图按 L8 至 L0 分层，40 星点均为可聚焦按钮和 SVG，四态附文字。侧卡只在 spoilerLevel ≤ 1 展示 storyScene；其余仅显示公开知识。无掌握百分比、排名或剧情真相。今日建议按到期日排序再补可学知识点，时间档仅改变数量。

沿用 App 的 main inert、滚动锁、Esc 和焦点归还。教学弹窗 Portal 到 body，探索的既有 MutationObserver 自动阻止移动。P9 入口在左上角，避开右侧 HUD 与移动小地图；370/390px 验收真实点击。遵循 reduced-motion，课节时间不强制等待，可暂停。

## 验证与证据

最终数据见仓库外 T1_LAST.md。所有原始命令输出、8 张教学截图、teaching-checks.json、逐文件 SHA-256 与专项证据均存放 D:/deepseek_file/work/codex-runs/t1-evidence/。check-teaching 支持 SPARKMATE_TEACHING_OUTPUT 和 SPARKMATE_SPACE_URL；默认路径分别是 test-results/teaching 和 http://127.0.0.1:15262。

脚本从新档开始，用真实键鼠完成前置课节和 K1-01/K1-04、检查常亮与刷新恢复、移动端焦点和重置取消、Tier0 零 Canvas/WebGL、Tier1/2 无新增渲染资产及旧键字节隔离。任务书所列实际为 8 个键（routes 加七个 feature 键），全部纳入断言。页面错误与着色器错误必须为零。

编码检查区分 U+FFFD/损坏文案与合法 JS 空值合并语法。原仓已有 31 处连续问号运算符，保留原代码；新增移植断言同样含合法运算符。字面“连续问号总数为零”与保留现有代码不兼容，不能将该字面指标报告为零。

## 课程映射

| KP | 层 / 柱 | 图谱前置 | 冻结课节 |
|---|---|---|---|
| K0-01 | L0 / foundation |  | data/lessons/K0-01.lesson.json |
| K0-02 | L0 / foundation | K0-01 | data/lessons/K0-02.lesson.json |
| K0-03 | L0 / foundation | K0-01 | data/lessons/K0-03.lesson.json |
| K0-04 | L0 / foundation |  | data/lessons/K0-04.lesson.json |
| K0-05 | L0 / foundation | K0-04 | data/lessons/K0-05.lesson.json |
| K0-06 | L0 / foundation | K0-01 | data/lessons/K0-06.lesson.json |
| K1-01 | L1 / forge | K0-02 | data/lessons/K1-01.lesson.json |
| K1-02 | L1 / forge | K1-01 | data/lessons/K1-02.lesson.json |
| K1-03 | L1 / forge | K1-01 | data/lessons/K1-03.lesson.json |
| K1-04 | L1 / forge | K1-01 | data/lessons/K1-04.lesson.json |
| K1-05 | L1 / forge | K1-04 | data/lessons/K1-05.lesson.json |
| K1-06 | L1 / forge | K1-03 | data/lessons/K1-06.lesson.json |
| K2-01 | L2 / forge | K1-01 | data/lessons/K2-01.lesson.json |
| K2-02 | L2 / forge | K2-01 | data/lessons/K2-02.lesson.json |
| K2-03 | L2 / forge | K2-01 | data/lessons/K2-03.lesson.json |
| K2-04 | L2 / forge | K2-01 | data/lessons/K2-04.lesson.json |
| K2-05 | L2 / forge | K2-01 | data/lessons/K2-05.lesson.json |
| K3-01 | L3 / craft |  | data/lessons/K3-01.lesson.json |
| K3-02 | L3 / craft | K3-01 | data/lessons/K3-02.lesson.json |
| K3-03 | L3 / craft | K3-01 | data/lessons/K3-03.lesson.json |
| K3-04 | L3 / craft | K3-03 | data/lessons/K3-04.lesson.json |
| K3-05 | L3 / craft | K3-04 | data/lessons/K3-05.lesson.json |
| K3-06 | L3 / craft | K3-02 | data/lessons/K3-06.lesson.json |
| K4-01 | L4 / weave | K2-03 | data/lessons/K4-01.lesson.json |
| K4-02 | L4 / weave | K3-02 | data/lessons/K4-02.lesson.json |
| K4-03 | L4 / weave | K3-02 | data/lessons/K4-03.lesson.json |
| K4-04 | L4 / weave | K3-06 | data/lessons/K4-04.lesson.json |
| K4-05 | L4 / weave | K4-02 | data/lessons/K4-05.lesson.json |
| K4-06 | L4 / weave | K4-02, K4-03 | data/lessons/K4-06.lesson.json |
| K5-01 | L5 / echo | K3-02 | data/lessons/K5-01.lesson.json |
| K5-02 | L5 / echo | K5-01 | data/lessons/K5-02.lesson.json |
| K5-03 | L5 / echo | K5-01 | data/lessons/K5-03.lesson.json |
| K5-04 | L5 / echo | K5-03 | data/lessons/K5-04.lesson.json |
| K6-01 | L6 / craft | K1-06, K3-02 | data/lessons/K6-01.lesson.json |
| K6-02 | L6 / craft | K6-01 | data/lessons/K6-02.lesson.json |
| K6-03 | L6 / craft | K6-01 | data/lessons/K6-03.lesson.json |
| K7-01 | L7 / symbiosis | K3-01 | data/lessons/K7-01.lesson.json |
| K7-02 | L7 / symbiosis | K7-01 | data/lessons/K7-02.lesson.json |
| K8-01 | L8 / spire |  gate: gate-three-pillar-basics | data/lessons/K8-01.lesson.json |
| K8-02 | L8 / spire | K8-01 | data/lessons/K8-02.lesson.json |

## 最终验证结果

教学单测 70/70；全仓单测 312/312（原基线 242，新增 70），0 fail/skip。SPARKMATE_TEST_PORT=15261 npm run test:e2e：67/67。npm run build:local：exit 0，2964 modules，相比 2915 基线增加 49（41 数据模块 + 8 教学模块），无新 error，仅既有大 chunk 警告。

check-teaching：11 组全过，8 PNG + JSON + SHA-256。P0 4/4、M1 6/6、共鸣 8/8、信任 7 组、装配 7 组、环境叙事 9 组、潜行 5 组、rail 连续两轮各 3/3，全部 exit 0，页面/着色器错误 0。git diff --check exit 0。编码损坏 0；字面连续问号 75 处，经语法分类全部为合法空值运算符（原基线 31），未将该字面指标报告为零。未提交、未推送、未打标签。
