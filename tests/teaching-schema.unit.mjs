import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const csvText =
  'id,name,layer,pillar,prereq,oneLiner,practice,check,media,story,status,priority\r\nK0-01,用电安全与断电原则,L0,foundation,,先断电再动手，命比灯重要,安全情景判断,quiz:安全判断题100%,card+anim,维修间,planned,P0\r\nK0-02,万用表电压通断电阻档,L0,foundation,K0-01,先选对档，再碰电路,测电池与通断,measurement:选档并读数,card+sim,P10鹰眼面板/街灯配电盒,partial,P0\r\nK0-03,面包板与杜邦线极性,L0,foundation,K0-01,面包板是地图，电源轨是主干道,搭一个点灯电路,sim-task:接对不短路,card+sim,训练场,planned,P1\r\nK0-04,单位与量级,L0,foundation,,毫安不是安，千欧不是欧,单位换算,quiz:5题换算,card,维修间,planned,P0\r\nK0-05,查资料与引脚图,L0,foundation,K0-04,资料不会骗你，引脚图会,从图中找引脚,quiz:定位引脚,card+pdf,虚拟资料库,planned,P1\r\nK0-06,焊接与接线安全,L0,foundation,K0-01,烙铁很烫，松香很香，安全第一,安全检查清单,quiz:安全检查,card+video,维修间,planned,P2\r\nK1-01,欧姆定律与串联分压,L1,forge,K0-02,电压会按电阻分蛋糕,算并测分压,sim-task:算电压,card+sim,P10配电盒,partial,P0\r\nK1-02,并联与分流,L1,forge,K1-01,两条路都走，电阻小的多走,判断断支路,sim-task:找断线,card+sim,训练场,planned,P1\r\nK1-03,功率与发热,L1,forge,K1-01,发热是能量在找出口,解释保险丝熔断,quiz:解释功率与熔断,card+sim,P10热故障,partial,P0\r\nK1-04,压降线损与接触电阻,L1,forge,K1-01,远端不亮，先量两端,测压差定位,measurement:压降诊断,card+sim,P10 G0回流,partial,P0\r\nK1-05,接地与回流,L1,forge,K1-04,回流的终点不是地，是电源,G0诊断,quiz:区分回流与PE,card+sim,P10接地,partial,P0\r\nK1-06,保险丝与保护,L1,forge,K1-03,保险丝是替你烧的那根线,选型并解释,quiz:保险丝选型与熔断,card+sim,P10熔断链,partial,P1\r\nK2-01,高低电平与数字输入,L2,forge,K1-01,0和1也有脾气,判断逻辑电平,sim-task:读电平,card+sim,织网入口,planned,P0\r\nK2-02,PWM与占空比,L2,forge,K2-01,亮不亮看时间比例,4通道解码,sim-task:占空比解码,sim+anim,调光谜题,planned,P0\r\nK2-03,ADC采样与阈值,L2,forge,K2-01,模拟世界要划一条线,设阈值验证,sim-task:调阈值,card+sim,传感器台,planned,P1\r\nK2-04,上拉下拉与去抖,L2,forge,K2-01,按钮会抖，逻辑要稳,修正抖动,code:去抖逻辑,card+sim,按钮谜题,planned,P1\r\nK2-05,逻辑门与真值表,L2,forge,K2-01,门电路是判决书,填真值表,quiz:真值表,card+sim,校验室,planned,P2\r\nK3-01,第一个程序,L3,craft,,编辑校验运行，三步走,跑通点灯,code:跑通程序,card+ide,虚拟IDE,planned,P0\r\nK3-02,GPIO输出与输入,L3,craft,K3-01,引脚是手，电是动作,输入控输出,code:按钮点灯,card+ide,虚拟开发板,planned,P0\r\nK3-03,变量类型与运算符,L3,craft,K3-01,变量是盒子，类型是形状,改到目标值,code:填值,card+ide,课节卡,planned,P1\r\nK3-04,条件与循环,L3,craft,K3-03,循环是让灯呼吸的肺,写呼吸灯,code:循环实现,ide,灯效谜题,planned,P1\r\nK3-05,定时器与延时,L3,craft,K3-04,时间也是参数,调周期,code:调频率,card+ide,PWM谜题,planned,P1\r\nK3-06,串口打印与调试,L3,craft,K3-02,看不见就打印出来,读日志定位,code:修bug,card+ide,虚拟串口,planned,P1\r\nK4-01,传感器模拟与数字,L4,weave,K2-03,传感器是城市的皮肤,选型读数,sim-task:选对传感器,card+sim,织网回廊,planned,P1\r\nK4-02,I2C地址与时序,L4,weave,K3-02,一条线两个地址，冲突就找冒名者,隔离找冲突,sim-task:找冲突地址,sim,地址迷宫,planned,P1\r\nK4-03,SPI主从与时钟,L4,weave,K3-02,时钟一响，数据排队,解释四线,quiz:四线作用,card+sim,显示模块,planned,P2\r\nK4-04,UART与串口协议,L4,weave,K3-06,波特率不对，全是乱码,还原报文,sim-task:拼报文,card+sim,报文谜题,planned,P1\r\nK4-05,显示与存储,L4,weave,K4-02,屏是眼睛，存储是记忆,显示指定内容,code:显示,ide+sim,织网任务,planned,P2\r\nK4-06,总线排障,L4,weave,K4-02;K4-03,先分段，再二分,二分找故障线,sim-task:定位断线,sim,织网案件,planned,P1\r\nK5-01,WiFi连接与状态,L5,echo,K3-02,联网先看状态灯,读状态排错,code:连接并读状态,card+sim,回声集市,planned,P2\r\nK5-02,HTTP与JSON,L5,echo,K5-01,请求要有格式，数据要有结构,构造请求,code:发请求,card+sim,数据交换台,planned,P2\r\nK5-03,MQTT主题负载QoS,L5,echo,K5-01,发对主题，才有人听,拼报文,sim-task:拼发布订阅,card+sim,报文拼图,planned,P2\r\nK5-04,断线重连与完整性,L5,echo,K5-03,网会断，账要对,找丢失报文,sim-task:查丢包,sim,异步残响,planned,P3\r\nK6-01,电机与驱动含续流,L6,craft,K1-06;K3-02,电感断电会反咬一口,选驱动加保护,sim-task:加续流,card+sim,M1反峰,planned,P1\r\nK6-02,PID概念,L6,craft,K6-01,先P起来，再看I和D,调参稳定,sim-task:调参,sim+anim,机械臂挑战,planned,P2\r\nK6-03,安全联锁与限位,L6,craft,K6-01,机器会伤人，联锁先装,设计联锁,quiz:安全联锁设计,card+sim,意匠工坊,planned,P2\r\nK7-01,AI是什么,L7,symbiosis,K3-01,数据进，推理出，结果要对,解释分类器,quiz:解释行为,card+anim,共生温室,planned,P2\r\nK7-02,视觉语音LLM边界,L7,symbiosis,K7-01,AI会答，但不是神,判断能力边界,explain:边界判断,card+sim,零的对话,planned,P3\r\nK8-01,需求拆解与项目计划,L8,spire,三柱基础校验,先写清做什么，再动手,写任务单,project:任务单,card,回响塔委托,planned,P3\r\nK8-02,调试方法论与复盘,L8,spire,K8-01,先复现，再二分，最后复盘,定位综合故障,project:综合修复,card,终局项目,planned,P3\r\nAD-01,桌宠壳体与装配顺序,L0,craft,,先认清零件，再开始装,按序装配六件并确认安全,sim-task:装配顺序与安全确认,card+sim,P10维修间,partial,P0\r\nAD-02,主控与电源树,L1,forge,AD-01,逻辑与动力分开取电，但必须共地,测 5V/3V3/共地三组读数,measurement:电源树三轨测量,card+sim,P10维修间,partial,P0\r\n\r\nAD-03,驱动与执行器：舵机与续流,L2,forge,AD-02,让电变成动作，也要留条退路,解码舵机 PWM 并验证续流,sim-task:PWM 舵机信号解码,card+sim,P10维修间,partial,P0\r\nAD-04,感知与总线：I2C 扫描,L2,weave,AD-03,先问地址，再读世界,扫描 I2C 地址并测上拉,sim-task:I2C 设备地址扫描,card+sim,P10维修间,partial,P0\r\nAD-05,组装与联锁：上电前预检,L3,craft,AD-04,装完不算完，先过五道关,按序完成五项上电前检查并验证联锁,sim-task:上电预检与联锁放行,card+sim,P10维修间,partial,P0\r\nAD-06,屏幕与表情：帧缓冲里的眼神,L3,weave,AD-05,一张脸，只是一块会改字节的屏,算清屏幕显存并把表情定位到正确的页,sim-task:帧缓冲与表情页定位,card+sim,P10维修间,partial,P0\r\nAD-07,动作与声音：给桌宠一个节拍,L4,weave,AD-06,动作要准，声音要跟得上拍,把脉宽与音高配对并预演节拍,sim-task:动作与声音节拍同步,card+sim,P10维修间,partial,P0\r\nAD-08,状态机：让桌宠自己醒来,L4,weave,AD-07,先定状态，再定转移,把路径与两个转移条件配对,sim-task:合法状态转移与出口,card+sim,P10维修间,partial,P0\r\nAD-09,对话：先听懂意图,L5,weave,AD-08,先分类，再回答,把三句话路由到正确的意图,sim-task:意图分类与澄清,card+sim,P10维修间,partial,P0';
function parseCsvText(text) {
  text = text.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = lines[0].split(',').map((s) => s.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(',').map((s) => s.trim());
    const row = {};
    header.forEach((h, i) => {
      row[h] = cells[i] ?? '';
    });
    return row;
  });
  return { header, rows };
}

const dir = new URL('../src/features/learning/data/lessons/', import.meta.url);
const names = readdirSync(dir).filter((n) => n.endsWith('.lesson.json'));
test('all 40 frozen lessons present', () => assert.equal(names.length, 40));
for (const name of names)
  test('lesson schema 38 assertions ' + name, () => {
    const results = [];
    function check(name, ok, detail = '') {
      results.push({ name, ok: Boolean(ok), detail });
    }
    const lesson = JSON.parse(readFileSync(new URL(name, dir), 'utf8'));
    check('JSON parsed', true);
    // 1. schema 与 meta
    check(
      'schema 为 lesson.v1',
      lesson.schema === 'lesson.v1',
      String(lesson.schema),
    );
    check(
      'meta.template 为六段模板',
      lesson.meta?.template === 'six-segment-v1',
      String(lesson.meta?.template),
    );
    check(
      'lessonId 非空',
      typeof lesson.lessonId === 'string' && lesson.lessonId.length > 0,
      String(lesson.lessonId),
    );

    // 2. KP 与 CSV 一致性
    let csvRows = [];
    try {
      csvRows = parseCsvText(csvText).rows;
      check('CSV 可解析', csvRows.length > 0, `${csvRows.length} 行`);
    } catch (err) {
      check('CSV 可解析', false, String(err));
    }
    const csvRow = csvRows.find((r) => r.id === lesson.kp?.id);
    check('KP id 存在于 KP_MVP40.csv', Boolean(csvRow), String(lesson.kp?.id));
    if (csvRow) {
      check(
        'KP 名称与 CSV 一致',
        csvRow.name === lesson.kp.name,
        `${csvRow.name} / ${lesson.kp.name}`,
      );
      check(
        'KP 层与柱与 CSV 一致',
        csvRow.layer === lesson.kp.layer && csvRow.pillar === lesson.kp.pillar,
        `${csvRow.layer}/${csvRow.pillar} vs ${lesson.kp.layer}/${lesson.kp.pillar}`,
      );
    }
    check(
      'kp.prereq 为数组',
      Array.isArray(lesson.kp?.prereq),
      JSON.stringify(lesson.kp?.prereq),
    );
    check(
      'kp.oneLiner 不超过 30 字',
      typeof lesson.kp?.oneLiner === 'string' &&
        lesson.kp.oneLiner.length <= 30,
      `${lesson.kp?.oneLiner?.length ?? 0} 字`,
    );
    check(
      'spoilerLevel 为 0–7 整数',
      Number.isInteger(lesson.kp?.spoilerLevel) &&
        lesson.kp.spoilerLevel >= 0 &&
        lesson.kp.spoilerLevel <= 7,
      String(lesson.kp?.spoilerLevel),
    );
    check(
      'L1 课节 spoilerLevel ≤ 1',
      lesson.kp?.layer !== 'L1' || lesson.kp.spoilerLevel <= 1,
      String(lesson.kp?.spoilerLevel),
    );

    // 3. 六段结构与时长
    const expected = [
      'hook',
      'explain',
      'practice',
      'verify',
      'transfer',
      'recap',
    ];
    const segments = Array.isArray(lesson.segments) ? lesson.segments : [];
    check(
      '六段齐全且顺序正确',
      segments.length === 6 && segments.every((s, i) => s.type === expected[i]),
      segments.map((s) => s.type).join(','),
    );
    const bounds = {
      hook: [30, 60],
      explain: [60, 120],
      practice: [120, 300],
      verify: [90, 180],
      transfer: [90, 180],
      recap: [20, 40],
    };
    for (const seg of segments) {
      const [min, max] = bounds[seg.type] ?? [0, 9999];
      check(
        `段 ${seg.type} 时长 ${seg.durationSec}s 在 [${min},${max}]`,
        Number.isFinite(seg.durationSec) &&
          seg.durationSec >= min &&
          seg.durationSec <= max,
        String(seg.durationSec),
      );
    }
    const totalSec = segments.reduce(
      (sum, s) => sum + (Number(s.durationSec) || 0),
      0,
    );
    check('总时长 ≤ 900s（15 分钟）', totalSec <= 900, `${totalSec}s`);
    const minutes = lesson.meta?.estimatedMinutes;
    check(
      'estimatedMinutes 与段时长一致（差值 ≤ 3 分钟）',
      Number.isFinite(minutes) && Math.abs(totalSec / 60 - minutes) <= 3,
      `${(totalSec / 60).toFixed(1)} vs ${minutes}`,
    );

    // 4. 媒体矩阵
    const media = Array.isArray(lesson.segments[1]?.media)
      ? lesson.segments[1].media
      : [];
    check('每 KP ≥ 2 个媒体', media.length >= 2, `${media.length} 个`);
    const srcs = new Set();
    for (const m of media) {
      const ok =
        typeof m.kind === 'string' &&
        typeof m.src === 'string' &&
        m.src.length > 0 &&
        typeof m.alt === 'string' &&
        m.alt.length > 0 &&
        typeof m.status === 'string' &&
        typeof m.license === 'string';
      check(
        `媒体 ${m.src ?? '?'} 字段完整`,
        ok,
        `${m.kind}/${m.status}/${m.license}`,
      );
      check(`媒体 ${m.src ?? '?'} 路径唯一`, !srcs.has(m.src), String(m.src));
      srcs.add(m.src);
    }

    // 5. 评估与检查
    const checks = Array.isArray(lesson.checks) ? lesson.checks : [];
    check('课节检查项 ≥ 3', checks.length >= 3, `${checks.length} 项`);
    const checkTypes = new Set(checks.map((c) => c.type));
    check(
      '检查项包含 measurement',
      checkTypes.has('measurement'),
      [...checkTypes].join(','),
    );
    check(
      '检查项包含 quiz 或 sim-task',
      checkTypes.has('quiz') || checkTypes.has('sim-task'),
      [...checkTypes].join(','),
    );
    const weights = lesson.assessment?.masteryWeights ?? {};
    const weightSum = Object.values(weights).reduce(
      (a, b) => a + (Number(b) || 0),
      0,
    );
    check(
      'masteryWeights 合计为 1（±0.001）',
      Math.abs(weightSum - 1) <= 0.001,
      weightSum.toFixed(3),
    );
    const passScore = lesson.assessment?.passScore;
    check(
      'passScore 在 (0,1]',
      Number.isFinite(passScore) && passScore > 0 && passScore <= 1,
      String(passScore),
    );

    // 6. 教学红线（叙事字段不得出现剧透/破圈词）
    const forbidden = lesson.redLines?.forbiddenNarrationTokens ?? [];
    const narrationTexts = [
      segments[0]?.narration,
      segments[1]?.narration,
      segments[2]?.task,
      segments[4]?.prompt,
      ...(segments[4]?.options ?? []).map((o) => o.why),
      ...(segments[5]?.lines ?? []),
      lesson.storyBinding?.dialogueHint,
    ].filter((s) => typeof s === 'string');
    const hitTokens = new Set();
    for (const text of narrationTexts) {
      for (const token of forbidden) {
        if (text.includes(token)) hitTokens.add(token);
      }
    }
    check(
      '叙事字段无剧透/破圈词',
      hitTokens.size === 0,
      [...hitTokens].join(',') || 'none',
    );
    check(
      'redLines.aiDoesNotDecide 为 true',
      lesson.redLines?.aiDoesNotDecide === true,
      String(lesson.redLines?.aiDoesNotDecide),
    );

    // 7. 安全联锁
    const safety = lesson.safety ?? {};
    check(
      '禁用带电改线标记存在',
      safety.requiresPowerOffBeforeRewire === true,
      String(safety.requiresPowerOffBeforeRewire),
    );
    check(
      '带电禁用电阻/二极管档标记存在',
      safety.resistanceModeBlockedWhenLive === true,
      String(safety.resistanceModeBlockedWhenLive),
    );
    check(
      'verify 段包含安全说明',
      typeof segments[3]?.safety === 'string' && segments[3].safety.length > 0,
      segments[3]?.safety ?? '',
    );

    // 8. 剧情绑定
    check(
      'storyBinding.scene 非空',
      typeof lesson.storyBinding?.scene === 'string' &&
        lesson.storyBinding.scene.length > 0,
      String(lesson.storyBinding?.scene),
    );
    check(
      'storyBinding.npc 非空',
      typeof lesson.storyBinding?.npc === 'string' &&
        lesson.storyBinding.npc.length > 0,
      String(lesson.storyBinding?.npc),
    );

    assert.ok(results.length >= 38);
    assert.deepEqual(
      results.filter((r) => !r.ok),
      [],
    );
  });
test('graph validator migrated: structure, gates, DAG, CSV and counts', () => {
  const EXPECTED_LAYER_COUNTS = {
    L0: 7,
    L1: 7,
    L2: 7,
    L3: 8,
    L4: 8,
    L5: 5,
    L6: 3,
    L7: 2,
    L8: 2,
  };
  const EXPECTED_PILLAR_COUNTS = {
    foundation: 6,
    forge: 13,
    weave: 11,
    echo: 4,
    symbiosis: 2,
    craft: 11,
    spire: 2,
  };
  const EXPECTED_STATUS = { partial: 15, planned: 34, ready: 0 };
  const SPOILER_BY_LAYER = {
    L0: 0,
    L1: 1,
    L2: 2,
    L3: 3,
    L4: 4,
    L5: 5,
    L6: 6,
    L7: 6,
    L8: 7,
  };
  const CHECK_TYPES = [
    'quiz',
    'sim-task',
    'measurement',
    'code',
    'project',
    'explain',
  ];
  const MEDIA_KINDS = ['card', 'sim', 'anim', 'ide', 'pdf', 'video'];
  const GATE_ID = 'gate-three-pillar-basics';

  let pass = 0;
  const fails = [];
  const warnings = [];

  function ok(cond, label, detail = '') {
    if (cond) {
      pass += 1;
      return true;
    }
    fails.push(`${label}${detail ? ` -> ${detail}` : ''}`);
    return false;
  }

  function sameCounts(actual, expected, label) {
    const keys = new Set([
      ...Object.keys(actual ?? {}),
      ...Object.keys(expected),
    ]);
    const problems = [];
    for (const key of keys) {
      if ((actual?.[key] ?? 0) !== (expected[key] ?? 0))
        problems.push(`${key}: ${actual?.[key] ?? 0} != ${expected[key] ?? 0}`);
    }
    ok(problems.length === 0, label, problems.join('; '));
  }

  function parseCsv(text) {
    const clean = text
      .replace(/^\uFEFF/, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
    const lines = clean.split('\n').filter((l) => l.trim().length > 0);
    const header = lines[0].split(',').map((h) => h.trim());
    return {
      header,
      rows: lines.slice(1).map((line) => {
        const cells = line.split(',');
        if (cells.length !== header.length)
          throw new Error(`CSV 行列数异常：${line.slice(0, 50)}`);
        const row = {};
        header.forEach((key, i) => {
          row[key] = cells[i].trim();
        });
        return row;
      }),
    };
  }

  function main() {
    const graph = JSON.parse(
      readFileSync(
        new URL(
          '../src/features/learning/data/knowledge-graph.v1.json',
          import.meta.url,
        ),
        'utf8',
      ),
    );
    const { rows } = parseCsv(csvText);

    // A. 顶层结构
    ok(graph.schema === 'knowledge-graph.v1', 'A1 schema 字段', graph.schema);
    ok(
      /^\d+\.\d+\.\d+$/.test(graph.version ?? ''),
      'A2 version 语义化版本',
      graph.version,
    );
    ok(
      /^\d{4}-\d{2}-\d{2}$/.test(graph.updatedAt ?? ''),
      'A3 updatedAt 日期格式',
      graph.updatedAt,
    );
    ok(graph.pillars?.length === 7, 'A4 七柱', `${graph.pillars?.length}`);
    ok(
      graph.layers?.length === 9,
      'A5 层数（L0–L8）',
      `${graph.layers?.length}`,
    );
    ok(
      Array.isArray(graph.kps) && graph.kps.length === 49,
      'A6 KP 数量 = 49',
      `${graph.kps?.length}`,
    );
    ok(
      Array.isArray(graph.edges) && graph.edges.length > 0,
      'A7 edges 非空',
      `${graph.edges?.length}`,
    );
    ok(
      Array.isArray(graph.gates) && graph.gates.length === 1,
      'A8 gates 数量 = 1',
      `${graph.gates?.length}`,
    );

    const layerIds = (graph.layers ?? []).map((l) => l.id);
    ok(
      ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8'].every((id) =>
        layerIds.includes(id),
      ),
      'A9 层 id 完整',
    );
    (graph.layers ?? []).forEach((l) =>
      ok(l.order === Number(l.id.slice(1)), `A10 层序 ${l.id}`, `${l.order}`),
    );
    const pillarIds = (graph.pillars ?? []).map((p) => p.id);
    ok(
      [
        'foundation',
        'forge',
        'weave',
        'echo',
        'symbiosis',
        'craft',
        'spire',
      ].every((id) => pillarIds.includes(id)),
      'A11 柱 id 完整',
    );
    ok(
      graph.pillars.every((p) => p.name && p.nameEn && p.domain),
      'A12 柱名称/英文/领域齐全',
    );

    // B. gate
    const gate = graph.gates?.[0] ?? {};
    ok(gate.id === GATE_ID, 'B1 gate id', gate.id);
    ok(gate.type === 'any-three-pillars', 'B2 gate 类型', gate.type);
    ok(
      gate.requiresMinPillars === 3,
      'B3 gate 最少柱数 = 3',
      `${gate.requiresMinPillars}`,
    );
    ok(graph.stats?.gateReferenced === true, 'B4 gate 被引用标记');

    // C. KP 字段
    const ids = new Set();
    const layerCounts = {};
    const pillarCounts = {};
    const statusCounts = { partial: 0, planned: 0, ready: 0 };
    const priorityCounts = { P0: 0, P1: 0, P2: 0, P3: 0 };
    const gapList = [];
    const kpById = new Map();

    for (const kp of graph.kps ?? []) {
      const tag = kp.id ?? '<missing id>';
      ok(/^(?:K\d|AD)-\d{2}$/.test(kp.id ?? ''), `C1 ${tag} id 格式`);
      ok(!ids.has(kp.id), `C2 ${tag} id 唯一`);
      ids.add(kp.id);
      kpById.set(kp.id, kp);
      ok(layerIds.includes(kp.layer), `C3 ${tag} layer 合法`, kp.layer);
      ok(pillarIds.includes(kp.pillar), `C4 ${tag} pillar 合法`, kp.pillar);
      ok(
        typeof kp.name === 'string' && kp.name.length > 0,
        `C5 ${tag} name 非空`,
      );
      ok(
        typeof kp.oneLiner === 'string' &&
          kp.oneLiner.length > 0 &&
          kp.oneLiner.length <= 40,
        `C6 ${tag} oneLiner ≤40 字`,
        `${kp.oneLiner?.length}`,
      );
      ok(Array.isArray(kp.prereq), `C7 ${tag} prereq 数组`);
      ok(
        Array.isArray(kp.media) && kp.media.length > 0,
        `C8 ${tag} media 非空`,
      );
      ok(
        (kp.media ?? []).every((m) => MEDIA_KINDS.includes(m)),
        `C9 ${tag} media 枚举`,
        (kp.media ?? []).join('+'),
      );
      if ((kp.media ?? []).length < 2) gapList.push(`${tag}:media<2`);
      ok(
        typeof kp.practice === 'string' && kp.practice.length > 0,
        `C10 ${tag} practice 非空`,
      );
      ok(
        CHECK_TYPES.includes(kp.check?.type),
        `C11 ${tag} check.type 枚举`,
        kp.check?.type,
      );
      ok(
        typeof kp.check?.task === 'string' && kp.check.task.length > 0,
        `C12 ${tag} check.task 非空`,
      );
      ok(
        Number.isInteger(kp.check?.passScore) &&
          kp.check.passScore >= 0 &&
          kp.check.passScore <= 100,
        `C13 ${tag} passScore 0–100`,
        `${kp.check?.passScore}`,
      );
      ok(
        kp.transfer === null || typeof kp.transfer === 'string',
        `C14 ${tag} transfer 字段存在（MVP 可为 null）`,
      );
      if (kp.transfer === null) gapList.push(`${tag}:transfer`);
      ok(
        typeof kp.storyScene === 'string' && kp.storyScene.length > 0,
        `C15 ${tag} storyScene 非空`,
      );
      ok(
        kp.spoilerLevel === SPOILER_BY_LAYER[kp.layer],
        `C16 ${tag} spoilerLevel 按层`,
        `${kp.spoilerLevel} vs ${SPOILER_BY_LAYER[kp.layer]}`,
      );
      ok(
        typeof kp.license === 'string' && kp.license.length > 0,
        `C17 ${tag} license 非空`,
      );
      ok(
        ['partial', 'planned', 'ready'].includes(kp.status),
        `C18 ${tag} status 枚举`,
        kp.status,
      );
      ok(
        /^P[0-3]$/.test(kp.priority ?? ''),
        `C19 ${tag} priority 枚举`,
        kp.priority,
      );
      ok(
        kp.gatePrereq === null || kp.gatePrereq === GATE_ID,
        `C20 ${tag} gatePrereq 合法`,
        String(kp.gatePrereq),
      );
      ok(
        kp.lessonAvailable ===
          [
            'K0-01',
            'K0-02',
            'K0-03',
            'K0-04',
            'K0-05',
            'K0-06',
            'K1-01',
            'K1-02',
            'K1-03',
            'K1-04',
            'K1-05',
            'K1-06',
            'K2-01',
            'K2-02',
            'K2-03',
            'K2-04',
            'K2-05',
            'K3-01',
            'K3-02',
            'K3-03',
            'K3-04',
            'K3-05',
            'K3-06',
            'K4-01',
            'K4-02',
            'K4-03',
            'K4-04',
            'K4-05',
            'K4-06',
            'K5-01',
            'K5-02',
            'K5-03',
            'K5-04',
            'K6-01',
            'K6-02',
            'K6-03',
            'K7-01',
            'K7-02',
            'K8-01',
            'K8-02',
            'AD-01',
            'AD-02',
            'AD-03',
            'AD-04',
            'AD-05',
            'AD-06',
            'AD-07',
            'AD-08',
            'AD-09',
          ].includes(kp.id),
        `C21 ${tag} lessonAvailable 标记`,
        String(kp.lessonAvailable),
      );
      (kp.prereq ?? []).forEach((p) =>
        ok(ids.has(p) || p === GATE_ID, `C22 ${tag} prereq 存在`, p),
      );
      if (kp.layer === 'L8') {
        const hasGate =
          kp.gatePrereq === GATE_ID ||
          (kp.prereq ?? []).some((p) => kpById.get(p)?.gatePrereq === GATE_ID);
        ok(hasGate, `C23 ${tag} L8 必经三柱 gate（直达或经 L8 前置）`);
      }
      if (kp.gatePrereq) ok(kp.layer === 'L8', `C24 ${tag} gatePrereq 仅 L8`);

      layerCounts[kp.layer] = (layerCounts[kp.layer] ?? 0) + 1;
      pillarCounts[kp.pillar] = (pillarCounts[kp.pillar] ?? 0) + 1;
      statusCounts[kp.status] = (statusCounts[kp.status] ?? 0) + 1;
      priorityCounts[kp.priority] = (priorityCounts[kp.priority] ?? 0) + 1;
    }

    sameCounts(layerCounts, EXPECTED_LAYER_COUNTS, 'D1 层计数');
    sameCounts(pillarCounts, EXPECTED_PILLAR_COUNTS, 'D2 柱计数');
    sameCounts(
      statusCounts,
      EXPECTED_STATUS,
      'D3 状态计数（partial 6 / planned 34）',
    );
    sameCounts(
      priorityCounts,
      { P0: 20, P1: 15, P2: 10, P3: 4 },
      'D4 优先级分布',
    );

    // E. edges
    const edgeKeys = new Set();
    const edgeCountExpected = graph.kps.reduce(
      (n, kp) => n + (kp.prereq?.length ?? 0) + (kp.gatePrereq ? 1 : 0),
      0,
    );
    ok(
      graph.edges.length === edgeCountExpected,
      'E1 边数 = prereq 数 + gate 数',
      `${graph.edges.length} vs ${edgeCountExpected}`,
    );
    for (const e of graph.edges) {
      const key = `${e.kind}:${e.from}->${e.to}`;
      ok(!edgeKeys.has(key), 'E2 边唯一', key);
      edgeKeys.add(key);
      ok(['prereq', 'gate'].includes(e.kind), 'E3 边类型', e.kind);
      ok(ids.has(e.to), 'E4 边终点存在', e.to);
      if (e.kind === 'prereq')
        ok(ids.has(e.from), 'E5 prereq 边起点存在', e.from);
      if (e.kind === 'gate') ok(e.from === GATE_ID, 'E6 gate 边起点', e.from);
    }

    // F. 无环（Kahn，不含 gate 虚拟节点）
    const indeg = new Map([...ids].map((id) => [id, 0]));
    const adj = new Map([...ids].map((id) => [id, []]));
    for (const e of graph.edges) {
      if (e.kind !== 'prereq' || !ids.has(e.from) || !ids.has(e.to)) continue;
      adj.get(e.from).push(e.to);
      indeg.set(e.to, indeg.get(e.to) + 1);
    }
    const queue = [...indeg.keys()].filter((id) => indeg.get(id) === 0);
    let visited = 0;
    while (queue.length) {
      const cur = queue.shift();
      visited += 1;
      for (const next of adj.get(cur)) {
        indeg.set(next, indeg.get(next) - 1);
        if (indeg.get(next) === 0) queue.push(next);
      }
    }
    ok(visited === ids.size, 'F1 依赖图无环', `visited=${visited}/${ids.size}`);
    ok(indeg.size === ids.size, 'F2 前置图节点完整', `${indeg.size}`);

    // G. 层间方向：prereq 边不得逆向（同层允许）
    const layerOrder = new Map(graph.layers.map((l) => [l.id, l.order]));
    const backward = graph.edges
      .filter((e) => e.kind === 'prereq' && ids.has(e.from))
      .filter(
        (e) =>
          layerOrder.get(kpById.get(e.from).layer) >
          layerOrder.get(kpById.get(e.to).layer),
      );
    ok(
      backward.length === 0,
      'G1 prereq 不逆向跨层',
      backward.map((e) => `${e.from}->${e.to}`).join(','),
    );

    // H. stats 一致性
    ok(graph.stats.total === 49, 'H1 stats.total = 49', `${graph.stats.total}`);
    ok(
      graph.stats.edges === graph.edges.length,
      'H2 stats.edges',
      `${graph.stats.edges}`,
    );
    sameCounts(graph.stats.byLayer ?? {}, layerCounts, 'H3 stats.byLayer');
    sameCounts(graph.stats.byPillar ?? {}, pillarCounts, 'H4 stats.byPillar');
    sameCounts(graph.stats.byStatus ?? {}, statusCounts, 'H5 stats.byStatus');

    // I. CSV 一致性（数据真源）
    ok(rows.length === 49, 'I1 CSV 行数 = 49', `${rows.length}`);
    const csvGaps = [];
    for (const row of rows) {
      const kp = kpById.get(row.id);
      if (!ok(Boolean(kp), 'I2 CSV 行存在于图谱', row.id)) continue;
      ok(
        kp.name === row.name &&
          kp.layer === row.layer &&
          kp.pillar === row.pillar &&
          kp.oneLiner === row.oneLiner &&
          kp.practice === row.practice &&
          kp.storyScene === row.story &&
          kp.status === row.status &&
          kp.priority === row.priority,
        'I3 CSV 字段一致',
        row.id,
      );
      const mediaCsv = row.media
        .split('+')
        .map((m) => m.trim())
        .join('+');
      ok(
        kp.media.join('+') === mediaCsv,
        'I4 CSV media 一致',
        `${row.id}: ${kp.media.join('+')} vs ${mediaCsv}`,
      );
      const [ct, ...taskParts] = row.check.split(':');
      ok(
        kp.check.type === ct.trim() &&
          kp.check.task === taskParts.join(':').trim(),
        'I5 CSV check 一致',
        row.id,
      );
      if (kp.media.length < 2) csvGaps.push(`${row.id}:media<2`);
    }
    ok(
      csvGaps.length === gapList.filter((g) => g.endsWith('media<2')).length,
      'I6 媒体缺口统计一致',
      `${csvGaps.length}`,
    );

    // 汇总
    console.log(`PASS ${pass}   FAIL ${fails.length}`);
    warnings.push(
      `内容缺口（MVP 允许，发布前须补齐）：media<2 = ${csvGaps.length} 行；transfer=null = ${graph.kps.filter((k) => k.transfer === null).length} 行`,
    );
    for (const w of warnings) console.log(`WARN ${w}`);
    if (fails.length > 0) {
      for (const f of fails) console.log(`FAIL ${f}`);
      assert.fail(fails.join('\n'));
    } else {
      console.log('OK knowledge-graph.v1.json 通过结构与一致性校验');
    }
  }

  main();
  assert.deepEqual(fails, []);
});

import {createHash} from 'node:crypto';
const frozenHashes={"K0-01.lesson.json":"fe143a81651ba49255f30c6fc58aad9f97b2ee4781d70d454fc0d81e62f5078d","K0-02.lesson.json":"97040f8001b551e013a188fe140dc8db303dcb6ff1c03f2f7abdb83e7544b5de","K0-03.lesson.json":"554f5bd4886da06f05c5ef0c0a92e95b35c7edf95a7e2e2159e7ea4d46ee3df3","K0-04.lesson.json":"98025c2b1dfb948efb3aa93bca112cf11d1d5f5101ad5b5f1e00e71b9881f402","K0-05.lesson.json":"aa94727f466c7038ab3e11b2565e98636b6f051a0d03aa612f36230f7b5158d8","K0-06.lesson.json":"36b4653996edc1c101caac5edad8e212ef0a3b78794ac20fe5d44f76edd1dea4","K1-01.lesson.json":"963003c3d304cea7e56b4056e2afb2d882a69c54900d327353e69d06351c4020","K1-02.lesson.json":"5f9092be8d2691517865034bebb7f7ff5f55d28a1fdba79625d2913cb13cf339","K1-03.lesson.json":"522dff884eb0dd56069d00e638d443ff33a414227dd4cdc9bfc3a09667fb503b","K1-04.lesson.json":"80b79ad6aacd2be4704bc7abf03451ad059cef95973df9c7350d2e4507d3f046","K1-05.lesson.json":"43e255af24b444bb5f50eeeb0612b9017dda35dba318b945840570d2284a7723","K1-06.lesson.json":"d1f2c9d2edd383240ea84dad2c4937ebfb914ae0e995055ee719014d4d763212","K2-01.lesson.json":"3017ce2f45afa83b8eb50791e113d25b56604e12693876e71bfbbddebce1dc1e","K2-02.lesson.json":"84997f66b87e78e47c6ee2be15c69154c485f9e3de170e5b9845e3f81d90e748","K2-03.lesson.json":"a2f730ea51bbb7acd1baa360943b57a6c07d96764c629c8e46553b6b27c4366f","K2-04.lesson.json":"a0c9284a063d7420b3dde74bea27d58638a69264e41fe4af9ac963b552d58ca0","K2-05.lesson.json":"d27d48e6a49275bd1f9ea9faaad30660c17ac6e0f105915cbca6b16b96284202","K3-01.lesson.json":"a0396196a9761a4199c6793e609bd597107ba29eb39c27116980f12410ed948b","K3-02.lesson.json":"6e57ecd74bb08e94e7fdd574a99fba60c4607519dd488822d0097ea2237f3c07","K3-03.lesson.json":"7a80a7a4dcd44427042a242b9d9e323e67d961333a139a41915c07922d400f91","K3-04.lesson.json":"6c6b2322ffdd4b4cdb96bfef7afff9ca724d6aed09a504856edff1c8743c395a","K3-05.lesson.json":"cc060e55a6024253cde7cc2bd2569be7ff994d3e5ce167685acb6a659cde9de1","K3-06.lesson.json":"2ea5871a447938d7260e0b1eec56f4cdffd40886bfffb5960031cae1f53d0de1","K4-01.lesson.json":"cf480baef9526e8e4aef6ad2517d4792e10f623c04361211cdf7d1d0d14d7461","K4-02.lesson.json":"4814cb5792a4f349325dd156782d722b8eb60205df572be24ae34ad6641a54e8","K4-03.lesson.json":"aad63db7ec5510c7ffdf0c48fbc307ed79a0cfaefea861c8a115188e310073c2","K4-04.lesson.json":"ca37fbcbd470cc976d98f9d5955a5772f2e4ab052380efd182348b13d358c01d","K4-05.lesson.json":"194a8691a7c6581e158f85a0852e31acf8fffc85a99bda263d22e174876caefa","K4-06.lesson.json":"72d17d9b5d308b66b1d89bac350d2a71647456cf1bcba76d33282deb5ec9e832","K5-01.lesson.json":"aa63abe6762c0b69d9c3979ef03487bb06cb97e062904479f8e2de9d1d910c2e","K5-02.lesson.json":"162522fefa89d503961269c5d2c7ccf0fb7498057a37b33a79470f9820a46c62","K5-03.lesson.json":"778fddc49f5ea5c2c4213616b50151b7ae05b9156b3278ab25b011d8869335c6","K5-04.lesson.json":"cbd5e36372ff87e555a6acbec79ba3cbe6dc6d3cb5750fdf4bdbdf792b560fe8","K6-01.lesson.json":"911bf8273498d11773833b40cbaa065cbb19287cb6f5558b4c671397be9fc92d","K6-02.lesson.json":"f0cd59ec92a5c09a242a45301a1a3c82f940ade63060334bfc780936e5ce67bb","K6-03.lesson.json":"15e377cc00ea48665447eed505b92274f055ee6998d4d069b9e49dbc223bd138","K7-01.lesson.json":"53a88d15ccf5c31f433e39e438887630fbb3835cf9a42dbe81ba872d66e5b025","K7-02.lesson.json":"78f17dcf4679ca60b28c3132fa94f5d10dd95ffb00825752803cc82c93bd6ad7","K8-01.lesson.json":"61ae7bbca9285002fb0bf23e87730ef7eb6612b8bfbcf88cba48ee722899214d","K8-02.lesson.json":"48291713ca0797323a7d00d53b64d01f53d5ced737ada1ecb5aa73360cdbaab4"};
test('frozen graph and all lessons match upstream bytes',()=>{assert.equal(createHash('sha256').update(readFileSync(new URL('../src/features/learning/data/knowledge-graph.v1.json',import.meta.url))).digest('hex'),"16f970d67dd00ce847ea87379d667e502fbbdbd1e6a7818b10ff1e5aab31de53");for(const [name,hash] of Object.entries(frozenHashes))assert.equal(createHash('sha256').update(readFileSync(new URL(name,dir))).digest('hex'),hash,name);});
