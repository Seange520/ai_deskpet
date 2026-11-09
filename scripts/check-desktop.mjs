import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';

const root = resolve('.');
const out = resolve('../work/acceptance/desktop');
mkdirSync(out, { recursive: true });

const exe = process.env.SPARKMATE_DESKTOP_EXE
  ? resolve(process.env.SPARKMATE_DESKTOP_EXE)
  : join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
const appPath = resolve(process.env.SPARKMATE_DESKTOP_APP || '.');
const smokeJson = join(out, 'desktop-smoke.json');
const args = process.env.SPARKMATE_DESKTOP_EXE
  ? ['--no-sandbox', '--smoke-test']
  : ['--no-sandbox', appPath, '--smoke-test'];

// 本机环境有 ELECTRON_RUN_AS_NODE=1（Node 版 electron），必须清掉才能启动桌面进程。
const env = { ...process.env, SPARKMATE_SMOKE_OUT: smokeJson };
delete env.ELECTRON_RUN_AS_NODE;

const started = Date.now();
const run = spawnSync(exe, args, { cwd: root, env, timeout: 120000, encoding: 'utf8' });
const elapsed = Date.now() - started;

let smoke = null;
try {
  smoke = JSON.parse(readFileSync(smokeJson, 'utf8'));
} catch {
  smoke = null;
}

const failures = [];
if (!smoke) failures.push('冒烟结果文件未生成（进程可能崩溃）');
else {
  if (!smoke.ok) failures.push('冒烟失败: ' + smoke.error);
  const ui = smoke.ui || {};
  if (!/第七校验/.test(ui.title || '')) failures.push('窗口标题异常: ' + ui.title);
  if (!ui.root) failures.push('根节点缺失');
  if (!ui.desktopFlag) failures.push('preload 桌面标志缺失');
  if (ui.canvases < 1) failures.push('WebGL canvas 未创建');
}

const summary = {
  exe,
  appPath,
  args,
  elapsedMs: elapsed,
  exitCode: run.status,
  stderrTail: (run.stderr || '').split(/\r?\n/).filter(Boolean).slice(-8),
  stdoutTail: (run.stdout || '').split(/\r?\n/).filter(Boolean).slice(-8),
  smoke,
  failures,
};
writeFileSync(join(out, 'desktop-checks.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log(JSON.stringify({ ok: failures.length === 0, elapsedMs: elapsed, failures, ui: smoke?.ui && { title: smoke.ui.title, root: smoke.ui.root, canvases: smoke.ui.canvases, desktopFlag: smoke.ui.desktopFlag } }));
if (failures.length) process.exitCode = 1;
