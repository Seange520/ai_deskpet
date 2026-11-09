import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const out = resolve('../work/store/capsules');
await mkdir(out, { recursive: true });

async function dataUri(path) {
  const buf = await readFile(path);
  return 'data:image/png;base64,' + buf.toString('base64');
}

const shots = {
  street: await dataUri(resolve('../work/store/shots/02-exploration-third-person.png')),
  panel: await dataUri(resolve('../work/store/shots/03-path-lessons.png')),
  lesson: await dataUri(resolve('../work/store/shots/06-lesson-framebuffer.png')),
};

const BRAND = '第七校验';
const EN = 'THE SEVENTH CHECKSUM';
const TAGLINE = '修好一座会呼吸的城市';

function pageHtml({ w, h, bg, titleSize, sub, tagline = true, logo = true, corner = true, blur = 3, dark = 1.0, bgPos = '50% 32%' }) {
  return `<!doctype html><html><head><meta charset="utf-8"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { width:${w}px; height:${h}px; overflow:hidden; font-family:"Microsoft YaHei","PingFang SC",sans-serif; }
    .wrap { position:relative; width:100%; height:100%; background:#061318; overflow:hidden; }
    .bg { position:absolute; inset:0; background:url("${bg}") ${bgPos}/cover no-repeat;
          filter:blur(${blur}px) saturate(.95) brightness(${dark}); transform:scale(1.06); }
    .shade { position:absolute; inset:0; background:
      linear-gradient(90deg, rgba(3,14,20,.95) 0%, rgba(3,14,20,.64) 46%, rgba(3,14,20,0) 100%),
      linear-gradient(180deg, rgba(3,14,20,.10), rgba(3,14,20,.38)); }
    .grid { position:absolute; inset:0; opacity:.14;
      background-image:linear-gradient(rgba(120,200,210,.35) 1px, transparent 1px),
                       linear-gradient(90deg, rgba(120,200,210,.35) 1px, transparent 1px);
      background-size:48px 48px; }
    .content { position:absolute; left:6%; top:50%; transform:translateY(-50%); color:#eaf6f6;
               text-shadow:0 2px 24px rgba(3,14,20,.9); max-width:94%; }
    .logo { display:flex; align-items:center; gap:${Math.max(10, Math.round(w * 0.02))}px; margin-bottom:${Math.max(8, Math.round(h * 0.045))}px; }
    .logo svg { width:${Math.max(22, Math.round(h * 0.16))}px; height:${Math.max(22, Math.round(h * 0.16))}px; }
    h1 { font-size:${titleSize}px; letter-spacing:.04em; font-weight:800; line-height:1.02;
         color:#f2fbfa; text-shadow:0 4px 22px rgba(79,209,197,.28), 0 2px 4px rgba(0,0,0,.65);
         white-space:nowrap; }
    .en { margin-top:${Math.max(4, Math.round(h * 0.02))}px; font-size:${Math.max(8, Math.round(titleSize * 0.16))}px;
          letter-spacing:.18em; color:#7fd6c9; font-weight:600; white-space:nowrap; }
    .tag { margin-top:${Math.max(8, Math.round(h * 0.05))}px; font-size:${Math.max(9, Math.round(titleSize * 0.2))}px;
           color:#c4dedd; letter-spacing:.08em; }
    .tag::before { content:""; display:inline-block; width:${Math.max(14, Math.round(w * 0.03))}px; height:2px;
                   background:#4fd1c5; margin-right:8px; vertical-align:middle; }
    .corner { position:absolute; right:4%; bottom:6%; color:#7f9fa9; font-size:${Math.max(7, Math.round(h * 0.028))}px;
              letter-spacing:.14em; }
    ${logo ? '' : '.logo{display:none}'}
    ${tagline ? '' : '.tag{display:none}'}
    ${corner ? '' : '.corner{display:none}'}
  </style></head><body>
  <div class="wrap">
    <div class="bg"></div>
    <div class="shade"></div><div class="grid"></div>
    <div class="content">
      <div class="logo">
        <svg viewBox="0 0 64 64" fill="none"><path d="M32 4 58 18v28L32 60 6 46V18L32 4Z" stroke="#4fd1c5" stroke-width="2.5"/><path d="M22 22h20v6H28v6h12v6H22V22Z" fill="#4fd1c5"/></svg>
        <span style="font-size:${Math.max(9, Math.round(h * 0.038))}px;letter-spacing:.28em;color:#8fd9cd">${sub}</span>
      </div>
      <h1>${BRAND}</h1>
      <div class="en">${EN}</div>
      <div class="tag">${TAGLINE}</div>
    </div>
    <div class="corner">LUMEN REACH · 流明域</div>
  </div></body></html>`;
}

const targets = [
  { name: 'header-460x215', w: 460, h: 215, bg: shots.street, titleSize: 52, sub: 'CHECKSUM' },
  { name: 'small-231x87', w: 231, h: 87, bg: shots.street, titleSize: 22, sub: '', tagline: false, corner: false, blur: 4 },
  { name: 'main-616x353', w: 616, h: 353, bg: shots.street, titleSize: 82, sub: 'CHECKSUM PROTOCOL', blur: 4 },
  { name: 'vertical-374x448', w: 374, h: 448, bg: shots.street, titleSize: 58, sub: 'CHECKSUM', blur: 6 },
  { name: 'library-600x900', w: 600, h: 900, bg: shots.street, titleSize: 74, sub: 'CHECKSUM PROTOCOL', blur: 5 },
  { name: 'page-bg-1438x810', w: 1438, h: 810, bg: shots.street, titleSize: 90, sub: 'CHECKSUM PROTOCOL', blur: 4, dark: 0.62, bgPos: '62% 42%' },
];

const browser = await chromium.launch({ channel: 'chrome' });
const shotsOut = [];
const errors = [];
try {
  for (const t of targets) {
    const ctx = await browser.newContext({ viewport: { width: t.w, height: t.h }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(String(e)));
    await p.setContent(pageHtml(t), { waitUntil: 'load' });
    await p.waitForTimeout(400);
    const file = resolve(out, t.name + '.png');
    await p.screenshot({ path: file, clip: { x: 0, y: 0, width: t.w, height: t.h } });
    shotsOut.push({ name: t.name, width: t.w, height: t.h, file });
    await ctx.close();
  }
} finally {
  await browser.close();
}

await writeFile(resolve(out, 'manifest.json'), JSON.stringify({ shots: shotsOut, errors }, null, 2));
console.log(JSON.stringify({ shots: shotsOut.length, errors }));
