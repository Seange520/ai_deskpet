import { listPackage } from '@electron/asar';
const list = listPackage('../work/deliverables/desktop/TheSeventhChecksum-win32-x64/resources/app.asar').map(
  (p) => p.replaceAll('\\', '/'),
);
const needed = ['/dist/index.html', '/dist/site/index.html', '/electron/main.cjs', '/electron/preload.cjs', '/package.json'];
const found = Object.fromEntries(needed.map((p) => [p, list.includes(p)]));
const big = list.filter((p) => /\.(js|wasm|glb|png)$/.test(p)).slice(0, 5);
console.log(JSON.stringify({ entries: list.length, found, sample: big }, null, 2));
