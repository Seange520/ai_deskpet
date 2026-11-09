import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { packager } from '@electron/packager';

const projectRoot = resolve('.');
const stage = resolve('../work/desktop-stage');
const outRoot = resolve('../work/deliverables/desktop');
const appVersion = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')).version;

console.log('[1/3] vite build');
execFileSync(process.execPath, [join('node_modules', 'vite', 'bin', 'vite.js'), 'build'], {
  stdio: 'inherit',
});

console.log('[2/3] stage');
rmSync(stage, { recursive: true, force: true });
mkdirSync(join(stage, 'electron'), { recursive: true });
cpSync(join(projectRoot, 'dist'), join(stage, 'dist'), { recursive: true });
cpSync(join(projectRoot, 'electron', 'main.cjs'), join(stage, 'electron', 'main.cjs'));
cpSync(join(projectRoot, 'electron', 'preload.cjs'), join(stage, 'electron', 'preload.cjs'));
writeFileSync(
  join(stage, 'package.json'),
  JSON.stringify(
    {
      name: 'the-seventh-checksum',
      productName: '第七校验',
      version: appVersion,
      description: '第七校验 · The Seventh Checksum（桌面学习版）',
      main: 'electron/main.cjs',
      author: 'The Seventh Checksum Project',
      private: true,
    },
    null,
    2,
  ) + '\n',
  'utf8',
);

console.log('[3/3] package');
rmSync(join(outRoot, 'TheSeventhChecksum-win32-x64'), { recursive: true, force: true });
const [result] = await packager({
  dir: stage,
  out: outRoot,
  name: 'TheSeventhChecksum',
  platform: 'win32',
  arch: 'x64',
  appVersion,
  electronVersion: '31.7.7',
  asar: true,
  overwrite: true,
  prune: false,
  win32metadata: {
    CompanyName: 'The Seventh Checksum Project',
    FileDescription: '第七校验 · The Seventh Checksum',
    ProductName: '第七校验',
  },
});

const exe = join(result, 'TheSeventhChecksum.exe');
const asar = join(result, 'resources', 'app.asar');
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex').toUpperCase();
const manifest = {
  builtAt: new Date().toISOString(),
  version: appVersion,
  electron: JSON.parse(
    readFileSync(join(projectRoot, 'node_modules', 'electron', 'package.json'), 'utf8'),
  ).version,
  output: result,
  exe: { path: exe, bytes: readFileSync(exe).length, sha256: sha256(exe) },
  asar: { path: asar, bytes: readFileSync(asar).length, sha256: sha256(asar) },
};
writeFileSync(join(outRoot, 'desktop-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log(JSON.stringify(manifest, null, 2));
