import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Windows 的受限系统 TEMP 可能阻止 esbuild 大块转译输入的清理。
// 仅为构建子进程指定项目内临时目录，不修改系统环境或业务代码。
const root = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env };
if (process.platform === 'win32') {
  const buildTemp = fileURLToPath(
    new URL('../node_modules/.cache/sparkmate-build-tmp/', import.meta.url),
  );
  mkdirSync(buildTemp, { recursive: true });
  env.TEMP = buildTemp;
  env.TMP = buildTemp;
}
const child = spawn(
  process.execPath,
  [
    fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)),
    'build',
    ...process.argv.slice(2),
  ],
  { cwd: root, env, stdio: 'inherit', windowsHide: true },
);
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
