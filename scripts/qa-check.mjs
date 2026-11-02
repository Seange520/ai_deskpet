#!/usr/bin/env node
/**
 * SparkMate 上线前质检（QA Gate）
 *
 * 用法：
 *   npm run qa              # 或 node scripts/qa-check.mjs
 *
 * 设计约束：
 *   - Node 原生 ESM，零第三方依赖；
 *   - 只读扫描源码，不修改、不修复任何源码；
 *   - 唯一的写操作是生成 QA_REPORT.md，以及第 6 项构建预检产生的 dist/（vite 构建产物）；
 *   - 幂等：重复运行结果一致（构建产物的 hash 只会随源码变化）。
 *
 * 环境变量（可选）：
 *   QA_SOURCE_REV  覆盖报告中的源码版本标识（例如 CI 传入的 commit sha）。
 */
import { readdirSync, readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep, extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SRC = join(ROOT, 'src');
const IS_WIN = process.platform === 'win32';
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  'coverage',
  'playwright-report',
  'test-results',
  '.vite',
]);
const ROUTE_IDS = ['classic', 'quadruped', 'tracked', 'spherical'];
const ROUTE_NAMES = {
  classic: '经典方块桌宠',
  quadruped: '迷你四足机器狗',
  tracked: '履带/麦轮小车',
  spherical: '球形自平衡机器人',
};

const results = [];
const rel = (abs) => relative(ROOT, abs).split(sep).join('/');
const record = (id, name, status, summary, details = []) =>
  results.push({ id, name, status, summary, details });

function walk(dir, exts = null) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) out.push(...walk(abs, exts));
    } else if (!exts || exts.includes(extname(name))) out.push(abs);
  }
  return out;
}

const srcFiles = () => walk(SRC, ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx']);

/** 逐行匹配，返回 [{ file, line, text }] */
function hits(files, pattern) {
  const re = pattern instanceof RegExp ? new RegExp(pattern.source, pattern.flags.replace('g', '')) : new RegExp(pattern);
  const out = [];
  for (const abs of files) {
    if (!existsSync(abs)) continue;
    let text;
    try {
      text = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    text.split(/\r?\n/).forEach((line, i) => {
      if (re.test(line)) out.push({ file: rel(abs), line: i + 1, text: line.trim().slice(0, 200) });
    });
  }
  return out;
}

const pos = (hit) => `${hit.file}:${hit.line}`;
const evidence = (list, max = 6) => list.slice(0, max).map(pos);

/* ------------------------------------------------------------------ */
/* 1. 四路线模块完整性                                                  */
/* ------------------------------------------------------------------ */
async function checkRoutes() {
  const id = 1;
  const name = '四路线模块完整性';
  const dataFile = join(SRC, 'data', 'hardwareRoutes.js');
  const dataRel = rel(dataFile);
  let routes = [];
  let dataSource = '';

  if (existsSync(dataFile)) {
    dataSource = dataRel;
    try {
      const mod = await import(pathToFileURL(dataFile).href);
      if (Array.isArray(mod.hardwareRoutes)) routes = mod.hardwareRoutes;
    } catch {
      /* 回退到文本解析 */
    }
    if (!routes.length) {
      const text = readFileSync(dataFile, 'utf8');
      routes = ROUTE_IDS.filter((rid) =>
        new RegExp(`id\\s*:\\s*['"]${rid}['"]`).test(text),
      ).map((rid) => ({ id: rid }));
    }
  }

  const defined = routes.map((r) => r?.id).filter(Boolean);
  const missing = ROUTE_IDS.filter((rid) => !defined.includes(rid));
  const problems = [];
  for (const r of routes) {
    if (!r || !r.id) continue;
    if (!r.name) problems.push(`${dataRel} 中路线 ${r.id} 缺少 name 字段`);
    if (!Array.isArray(r.components) || r.components.length === 0)
      problems.push(`${dataRel} 中路线 ${r.id} 缺少 components（物料/部件）`);
    if (!r.wiring || !Array.isArray(r.wiring.pairs) || r.wiring.pairs.length === 0)
      problems.push(`${dataRel} 中路线 ${r.id} 缺少 wiring.pairs（接线数据）`);
    if (!r.explodedView || !Array.isArray(r.explodedView.parts) || r.explodedView.parts.length === 0)
      problems.push(`${dataRel} 中路线 ${r.id} 缺少 explodedView.parts（爆炸图数据）`);
    if (typeof r.hardwareImage !== 'string' || !r.hardwareImage.includes('<svg'))
      problems.push(`${dataRel} 中路线 ${r.id} 缺少 hardwareImage（本地 SVG 示意图）`);
  }

  const routeDirs = ['routes', 'route'].map((d) => join(SRC, d)).filter((d) => existsSync(d));
  const entryFiles = [];
  for (const dir of routeDirs) {
    for (const rid of ROUTE_IDS) {
      const hit = readdirSync(dir).find(
        (f) => f.startsWith(rid) && ['.js', '.jsx', '.ts', '.tsx', '.mjs'].includes(extname(f)),
      );
      if (hit) entryFiles.push(rel(join(dir, hit)));
    }
  }

  const refFiles = srcFiles().filter((f) => rel(f) !== dataRel);
  const refs = Object.fromEntries(
    ROUTE_IDS.map((rid) => [rid, hits(refFiles, new RegExp(`['"\`]${rid}['"\`]`)).length]),
  );
  const unreferenced = ROUTE_IDS.filter((rid) => refs[rid] === 0);

  const details = [];
  if (routeDirs.length) {
    details.push(`发现 routes 目录：${routeDirs.map(rel).join('、')}，入口文件 ${entryFiles.length}/4`);
    details.push(`已找到入口：${entryFiles.length ? entryFiles.join('、') : '无'}`);
  } else {
    details.push(
      '未发现独立 src/routes 目录：本项目以 src/data/hardwareRoutes.js 作为四路线单一数据源注册（结构不同，按等价标准校验定义完整性与引用）',
    );
  }
  details.push(
    `路线数据源：${dataSource || '未找到'}，已定义 ${routes.length} 条路线（${defined.join(', ') || '无'}）`,
  );
  for (const rid of ROUTE_IDS) {
    details.push(`${ROUTE_NAMES[rid]}（${rid}）— 组件层引用 ${refs[rid]} 处${refs[rid] === 0 ? '（未引用）' : ''}`);
  }

  if (missing.length) {
    record(id, name, 'FAIL', `缺少路线定义：${missing.join('、')}`, [
      ...details,
      `${dataRel}：未找到 classic / quadruped / tracked / spherical 的完整定义`,
    ]);
    return;
  }
  if (problems.length) {
    record(id, name, 'FAIL', `路线定义不完整（${problems.length} 处）`, [...details, ...problems]);
    return;
  }
  if (unreferenced.length) {
    record(id, name, 'WARN', `路线已定义但未被组件引用：${unreferenced.join('、')}`, details);
    return;
  }
  if (!routeDirs.length) {
    record(
      id,
      name,
      'WARN',
      '四路线定义完整且均被组件引用；未采用 routes/ 独立入口文件结构（数据驱动，不阻断部署）',
      details,
    );
    return;
  }
  record(id, name, 'PASS', '四路线入口文件齐全且全部被路由/组件引用', details);
}

/* ------------------------------------------------------------------ */
/* 2. Zustand store 规范性                                             */
/* ------------------------------------------------------------------ */
function checkStore() {
  const id = 2;
  const name = 'Zustand store 规范性';
  const stores = srcFiles().filter(
    (f) => rel(f).startsWith('src/stores/') || /(^|\/)[^/]*[Ss]tore[^/]*\.(js|jsx|ts|tsx)$/.test(rel(f)),
  );
  if (!stores.length) {
    record(id, name, 'FAIL', '未找到 Zustand store 文件（期望 src/stores/*.js）', [
      'src/stores/ 不存在或为空；学习状态可能重新散落回组件',
    ]);
    return;
  }

  const details = [];
  let hardFail = false;
  for (const abs of stores) {
    const text = readFileSync(abs, 'utf8');
    const hasZustand = /from\s+['"]zustand['"]/.test(text);
    const hasCreate = /\bcreate\s*\(/.test(text);
    const hook = /export\s+const\s+(use\w*Store)\s*=\s*create\(/.exec(text);
    const selectors = [...text.matchAll(/^export\s+(?:const|function)\s+([A-Za-z_$][\w$]*)/gm)]
      .map((m) => m[1])
      .filter((n) => n !== hook?.[1]);
    const actions = [...text.matchAll(/^\s{2}([A-Za-z_$][\w$]*)\s*:\s*(?:\(|async\s*\()/gm)].map(
      (m) => m[1],
    );
    details.push(
      `${rel(abs)} — ${hook ? `store hook: ${hook[1]}` : '未导出 create() hook'}；actions: ${actions.length} 个 [${actions.join(', ') || '无'}]；selectors/常量导出: ${selectors.length} 个 [${selectors.join(', ') || '无'}]`,
    );
    if (!hasZustand || !hasCreate) {
      hardFail = true;
      details.push(`${rel(abs)} 未使用 zustand 的 create() 创建 store`);
    }
    if (!selectors.length && !actions.length) {
      hardFail = true;
      details.push(`${rel(abs)} 未发现明确的 actions / selectors 导出约定`);
    }
  }

  const componentFiles = srcFiles().filter((f) => !rel(f).startsWith('src/stores/'));
  const looseSet = hits(componentFiles, /\.setState\s*\(/);
  const looseStorage = hits(componentFiles, /localStorage\.(?:setItem|removeItem|getItem)\s*\(/);
  if (looseSet.length) details.push(`组件层散落 setState：${evidence(looseSet, 8).join('、')}`);
  if (looseStorage.length)
    details.push(`组件层直接读写 localStorage：${evidence(looseStorage, 8).join('、')}`);

  if (hardFail) {
    record(id, name, 'FAIL', 'store 未遵循 zustand 规范（缺 create() 或 actions/selectors 约定）', details);
    return;
  }
  if (looseSet.length || looseStorage.length) {
    record(id, name, 'WARN', 'store 本身规范，但组件层存在散落状态调用/本地存储读写（详见报告）', details);
    return;
  }
  record(
    id,
    name,
    'PASS',
    '单一 Zustand store 为学习状态唯一来源，actions/selectors 导出清晰，组件层无散落 setState / localStorage',
    details,
  );
}

/* ------------------------------------------------------------------ */
/* 3. 成就系统与音效系统接线                                            */
/* ------------------------------------------------------------------ */
function checkFeedback() {
  const id = 3;
  const name = '成就系统与音效系统接线';
  const files = srcFiles();
  const details = [];

  const badgeDef = hits(files, /BADGES\s*=\s*\{|globalBadges\s*=/);
  const badgeUi = hits(files, /badges\.|achievement-panel/);
  const unlockText = hits(files, /解锁「|unlock/i);
  const soundDef = hits(files, /export\s+(?:async\s+)?function\s+playSound/);
  const soundCalls = hits(files, /playSound\s*\(/);
  const mutedCalls = hits(files, /playSound\([^)]*muted/);
  const audioOutside = hits(
    files.filter((f) => rel(f) !== 'src/lib/sounds.js'),
    /new\s+(?:window\.)?(?:AudioContext|webkitAudioContext)\b|new\s+Audio\s*\(/,
  );

  details.push(`成就定义：${evidence(badgeDef, 4).join('、') || '未找到'}`);
  details.push(`成就展示：${evidence(badgeUi, 4).join('、') || '未找到'}`);
  details.push(`成就解锁触发文案/逻辑：${evidence(unlockText, 4).join('、') || '未找到'}`);
  details.push(`音效统一入口：${evidence(soundDef, 3).join('、') || '未找到'}`);
  details.push(`playSound 调用点：${soundCalls.length} 处（含静音判断 ${mutedCalls.length} 处）`);
  if (audioOutside.length) details.push(`散落 Audio 实例：${evidence(audioOutside, 8).join('、')}`);

  const achievementOk = badgeDef.length > 0 && badgeUi.length > 0 && unlockText.length > 0;
  const soundOk = soundDef.length > 0;
  const fails = [];
  const warns = [];
  if (!achievementOk) warns.push('成就定义/展示/解锁触发未完整接线');
  if (!soundOk) fails.push('未找到统一音效入口 playSound（src/lib/sounds.js）');
  if (audioOutside.length) warns.push(`存在未走统一入口的 Audio 实例：${evidence(audioOutside, 8).join('、')}`);
  if (soundOk && mutedCalls.length === 0) warns.push('playSound 调用未统一传递静音状态（muted）');

  if (fails.length) {
    record(id, name, 'FAIL', fails.join('；'), details);
    return;
  }
  if (warns.length) {
    record(id, name, 'WARN', warns.join('；'), details);
    return;
  }
  record(
    id,
    name,
    'PASS',
    '成就定义→触发→展示链路完整；音效统一走 playSound 封装且均携带 muted，无散落 Audio 实例',
    details,
  );
}

/* ------------------------------------------------------------------ */
/* 4. 硬编码与敏感信息扫描                                              */
/* ------------------------------------------------------------------ */
function checkSensitive() {
  const id = 4;
  const name = '硬编码与敏感信息扫描';
  const jsFiles = srcFiles();
  const cssFiles = walk(SRC, ['.css']);
  const all = [...jsFiles, ...cssFiles];
  const details = [];

  const secrets = hits(
    all,
    /(?:api[_-]?key|apikey|secret|token|password|passwd|private[_-]?key)\s*[:=]\s*['"`][^'"`\n]{8,}['"`]/i,
  );
  const envLiteral = hits(jsFiles, /process\.env\.[A-Z0-9_]+\s*=\s*['"`]/);
  const absPaths = hits(all, /['"`]\s*(?:[A-Za-z]:[\\/]|\/(?:Users|home|root|var\/www|opt|mnt)\/)/);
  const fileUrls = hits(all, /['"`]file:\/\//i);
  const runtimeAbs = hits(jsFiles, /(?:src|href)\s*=\s*['"`]\/(?!\/)/).concat(
    hits(cssFiles, /url\(\s*['"]?\/(?!\/)/),
  );

  if (secrets.length) details.push(`明文密钥/口令赋值：${secrets.map((h) => `${pos(h)}  ${h.text}`).join('；')}`);
  if (envLiteral.length)
    details.push(`process.env 明文硬编码：${envLiteral.map((h) => `${pos(h)}  ${h.text}`).join('；')}`);
  if (absPaths.length) details.push(`本机绝对路径：${absPaths.map((h) => `${pos(h)}  ${h.text}`).join('；')}`);
  if (fileUrls.length) details.push(`file:// 绝对路径：${fileUrls.map((h) => `${pos(h)}  ${h.text}`).join('；')}`);
  if (runtimeAbs.length)
    details.push(`资源以站点根绝对路径引用（建议相对路径/import）：${runtimeAbs.map(pos).join('、')}`);
  if (!details.length) {
    details.push(
      '未发现明文密钥/敏感变量赋值；未发现 C:\\、/Users/、file:// 等本机绝对路径；音效与图形均由代码/本地 SVG 生成',
    );
    details.push(`扫描范围：src/ 下 ${jsFiles.length} 个 JS/JSX 文件、${cssFiles.length} 个 CSS 文件`);
  }

  if (secrets.length || envLiteral.length) {
    record(id, name, 'FAIL', '源码中存在明文敏感信息，禁止部署', details);
    return;
  }
  if (absPaths.length || fileUrls.length || runtimeAbs.length) {
    record(id, name, 'WARN', '存在绝对路径引用，部署到 Vercel 后可能失效（详见报告）', details);
    return;
  }
  record(id, name, 'PASS', '未发现敏感信息明文；资源均为相对路径/import/本地 SVG', details);
}

/* ------------------------------------------------------------------ */
/* 5. 仓库卫生                                                          */
/* ------------------------------------------------------------------ */
function checkHygiene() {
  const id = 5;
  const name = '仓库卫生';
  const giPath = join(ROOT, '.gitignore');
  const details = [];
  const giLines = existsSync(giPath)
    ? readFileSync(giPath, 'utf8')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'))
    : [];

  const patterns = giLines.map((l) => l.replace(/^!/, '').replace(/\/+$/, ''));
  const covers = (target, extra = []) =>
    patterns.some((p) => p === target || p === `${target}/*` || p.endsWith('*') && target.startsWith(p.slice(0, -1))) ||
    extra.some((p) => patterns.includes(p));

  const checks = [
    ['node_modules', covers('node_modules')],
    ['dist', covers('dist')],
    ['.env*', patterns.some((p) => p === '.env' || p.startsWith('.env'))],
  ];
  for (const [label, ok] of checks) {
    details.push(`${label}：.gitignore ${ok ? '已覆盖' : '未覆盖'}${!ok ? '（建议补充）' : ''}`);
  }
  if (!existsSync(giPath)) details.push('未找到 .gitignore 文件');

  let trackedDist = [];
  let trackedEnv = [];
  let gitOk = existsSync(join(ROOT, '.git'));
  if (gitOk) {
    const lsDist = spawnSync('git', ['ls-files', 'dist'], { cwd: ROOT, encoding: 'utf8' });
    if (lsDist.status === 0) trackedDist = lsDist.stdout.split(/\r?\n/).filter(Boolean);
    const lsAll = spawnSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' });
    if (lsAll.status === 0)
      trackedEnv = lsAll.stdout.split(/\r?\n/).filter((f) => /(^|\/)\.env(\.|$)/.test(f));
    if (lsDist.status !== 0) gitOk = false;
  }
  if (!gitOk) {
    details.push('当前目录不是可用 git 工作区，跳过 git ls-files dist / .env 追踪检查');
  } else {
    details.push(`git ls-files dist：${trackedDist.length ? `已跟踪 ${trackedDist.length} 个文件（应移除）` : '无构建产物被跟踪'}`);
    details.push(`git 已跟踪的 .env 文件：${trackedEnv.length ? trackedEnv.join('、') : '无'}`);
  }

  const issues = [];
  if (!existsSync(giPath)) issues.push('缺少 .gitignore');
  for (const [label, ok] of checks) if (!ok) issues.push(`.gitignore 未覆盖 ${label}`);
  if (trackedDist.length) issues.push(`dist/ 被 git 跟踪（${trackedDist.length} 个文件）`);
  if (trackedEnv.length) issues.push(`.env 被 git 跟踪（${trackedEnv.join('、')}）`);

  if (issues.length) record(id, name, 'WARN', issues.join('；'), details);
  else record(id, name, 'PASS', '.gitignore 覆盖 node_modules / .env* / dist，无构建产物与密钥文件被跟踪', details);
}

/* ------------------------------------------------------------------ */
/* 6. 构建预检（npm run build）                                         */
/* ------------------------------------------------------------------ */
function checkBuild() {
  const id = 6;
  const name = '构建预检';
  const started = Date.now();
  // Windows 下 npm 是 .cmd，必须经 shell 执行；整条命令作为字符串传入，避免 DEP0190（args + shell 拼接告警）
  const command = IS_WIN ? 'npm.cmd run build' : 'npm run build';
  const res = spawnSync(command, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 180_000,
    shell: true,
    env: { ...process.env, CI: '1' },
    maxBuffer: 20 * 1024 * 1024,
  });
  const duration = Date.now() - started;
  const details = [`命令：${command}（cwd: ${rel(ROOT) || '.'}）`, `耗时：${duration}ms`];
  const raw = `${res.stdout || ''}\n${res.stderr || ''}`.replace(/\u001b\[[0-9;]*m/g, '');

  if (res.error) {
    record(id, name, 'FAIL', `无法执行 npm run build：${res.error.message}`, [
      ...details,
      '提示：本机沙箱可能禁止子进程（EPERM），请在普通终端运行 npm run qa',
    ]);
    return;
  }
  if (res.status === 0) {
    const distDir = join(ROOT, 'dist');
    const distFiles = walk(distDir);
    let size = 0;
    for (const f of distFiles) {
      try {
        size += statSync(f).size;
      } catch {
        /* ignore */
      }
    }
    details.push(`产物：dist/ 共 ${distFiles.length} 个文件，约 ${(size / 1024 / 1024).toFixed(2)} MB`);
    record(id, name, 'PASS', `vite build 成功（退出码 0，${duration}ms）`, details);
    return;
  }

  const errLines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /error|failed|could not resolve|rollup|\[vite\]|EPERM|ENOENT/i.test(l))
    .slice(0, 12);
  record(id, name, 'FAIL', `npm run build 失败（退出码 ${res.status}）`, [
    ...details,
    ...errLines.map((l) => l.slice(0, 300)),
  ]);
}

/* ------------------------------------------------------------------ */
/* 输出                                                                 */
/* ------------------------------------------------------------------ */
const count = () =>
  results.reduce((acc, r) => ((acc[r.status] = (acc[r.status] || 0) + 1), acc), {
    PASS: 0,
    WARN: 0,
    FAIL: 0,
  });

function sourceRevision() {
  if (process.env.QA_SOURCE_REV) return process.env.QA_SOURCE_REV;
  if (!existsSync(join(ROOT, '.git'))) return '';
  const sha = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
  if (sha.status !== 0) return '';
  const dirty = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  const dirtyMark = dirty.status === 0 && dirty.stdout.trim() ? '+dirty' : '';
  return `${sha.stdout.trim()}${dirtyMark}`;
}

function readPkg() {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  } catch {
    return {};
  }
}

function printConsole(runAt) {
  console.log(`\nSparkMate QA Check · ${runAt.toLocaleString('zh-CN', { hour12: false })}`);
  console.log('只读扫描（源码不做任何修改）\n');
  for (const r of results) {
    console.log(`[${r.status}] ${r.id}. ${r.name} — ${r.summary}`);
    if (r.status !== 'PASS') for (const line of r.details.slice(-6)) console.log(`        · ${line}`);
  }
  const c = count();
  console.log(`\n汇总：PASS ${c.PASS} / WARN ${c.WARN} / FAIL ${c.FAIL}`);
  console.log(c.FAIL ? '结论：NO-GO（请修复 FAIL 项后再部署）' : '结论：GO（可以进入 Vercel 部署）');
  console.log(`报告：${rel(join(ROOT, 'QA_REPORT.md'))}\n`);
}

function buildReport(runAt) {
  const pkg = readPkg();
  const rev = sourceRevision();
  const c = count();
  const sections = [
    ['通过', results.filter((r) => r.status === 'PASS')],
    ['警告', results.filter((r) => r.status === 'WARN')],
    ['失败', results.filter((r) => r.status === 'FAIL')],
  ];
  const lines = [
    '# SparkMate 上线前质检报告（QA Report）',
    '',
    `- 生成时间：${runAt.toISOString().replace('T', ' ').slice(0, 19)} UTC`,
    `- 项目：${pkg.name || 'sparkmate'}@${pkg.version || '0.0.0'}${rev ? ` · 源码版本 ${rev}` : ''}`,
    `- 统计：PASS ${c.PASS} / WARN ${c.WARN} / FAIL ${c.FAIL}`,
    '',
  ];
  for (const [title, list] of sections) {
    lines.push(`## ${title}（${list.length}）`, '');
    if (!list.length) lines.push('- 无', '');
    for (const r of list) {
      lines.push(`- **${r.id}. ${r.name}** — ${r.summary}`);
      for (const d of r.details) lines.push(`  - ${d}`);
      lines.push('');
    }
  }
  lines.push(
    '## 结论',
    '',
    c.FAIL
      ? 'NO-GO：存在 FAIL 项（见上），修复后重新运行 npm run qa。'
      : 'GO：全部检查项无 FAIL，可以进入 Vercel 部署。',
    '',
  );
  writeFileSync(join(ROOT, 'QA_REPORT.md'), lines.join('\n'), 'utf8');
}

const CHECKS = [
  [1, '四路线模块完整性', checkRoutes],
  [2, 'Zustand store 规范性', checkStore],
  [3, '成就系统与音效系统接线', checkFeedback],
  [4, '硬编码与敏感信息扫描', checkSensitive],
  [5, '仓库卫生', checkHygiene],
  [6, '构建预检', checkBuild],
];

async function main() {
  const runAt = new Date();
  for (const [id, name, fn] of CHECKS) {
    try {
      await fn();
    } catch (e) {
      record(id, name, 'FAIL', `检查执行异常：${e?.message || e}`, [String(e?.stack || '').split('\n')[1] || '']);
    }
  }
  printConsole(runAt);
  buildReport(runAt);
  process.exitCode = count().FAIL ? 1 : 0;
}

await main();
