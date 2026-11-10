// 生成 dist/sw-manifest.json：Service Worker 安装时预缓存的静态资源清单。
// 只列确定需要离线的同源文件；不包含 source map、test-results 等。
import { readdir, stat, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const includeExt = new Set(['.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.woff', '.woff2', '.md', '.html', '.ico', '.webmanifest']);
const roots = ['index.html', 'favicon.svg', 'sw.js', 'site', 'novel', 'assets'];

const files = [];
async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
      continue;
    }
    const ext = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase();
    if (!includeExt.has(ext)) continue;
    if (entry.name.endsWith('.map')) continue;
    const size = (await stat(full)).size;
    // 单机壳只预缓存首屏与任务必需：小图、GLB、代码与文本；大贴图走运行时缓存。
    const keep = size <= 1_200_000 || ext === '.glb' || ['.js', '.css', '.html', '.svg', '.woff', '.woff2', '.md', '.ico'].includes(ext);
    if (!keep) continue;
    files.push({ path: relative(dist, full).split(sep).join('/'), size });
  }
}

for (const root of roots) {
  const full = join(dist, root);
  try {
    const s = await stat(full);
    if (s.isDirectory()) await walk(full);
    else files.push({ path: root, size: s.size });
  } catch {
    /* 不存在则跳过 */
  }
}

const unique = [...new Map(files.map((f) => [f.path, f])).values()].sort((a, b) =>
  a.path.localeCompare(b.path),
);
const total = unique.reduce((sum, f) => sum + f.size, 0);
const manifest = { version: 1, generatedAt: new Date().toISOString(), total, files: unique };
await writeFile(join(dist, 'sw-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`[sw-manifest] ${unique.length} files, ${(total / 1024 / 1024).toFixed(1)} MB`);
