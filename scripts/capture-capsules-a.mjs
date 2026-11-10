import { chromium } from 'playwright';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceName = '04-r1-mission-a-2x.png';
const sourceRelative = `work/store/shots-a/${sourceName}`;
const output = resolve(root, 'work/store/capsules-a');
const acceptance = resolve(root, 'work/acceptance/08-a-capsules');
const label = (path) => relative(root, path).replaceAll('\\', '/');

export const targets = [
  {
    name: 'header-460x215.png',
    width: 460,
    height: 215,
    title: 46,
    eyebrow: 11,
    english: 10,
    tag: 12,
    inset: 28,
    top: 37,
  },
  { name: 'small-231x87.png', width: 231, height: 87, title: 30, inset: 14, top: 21, small: true },
  {
    name: 'main-616x353.png',
    width: 616,
    height: 353,
    title: 64,
    eyebrow: 12,
    english: 12,
    tag: 16,
    inset: 38,
    top: 77,
  },
  {
    name: 'vertical-374x448.png',
    width: 374,
    height: 448,
    title: 66,
    eyebrow: 11,
    english: 10,
    tag: 14,
    inset: 26,
    top: 49,
    portrait: true,
  },
  {
    name: 'library-600x900.png',
    width: 600,
    height: 900,
    title: 92,
    eyebrow: 13,
    english: 14,
    tag: 20,
    inset: 44,
    top: 103,
    portrait: true,
  },
  { name: 'page-bg-1438x810.png', width: 1438, height: 810, background: true },
];

export function pngSize(buffer) {
  if (
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
    buffer.toString('ascii', 12, 16) !== 'IHDR'
  ) {
    throw new Error('Invalid PNG header');
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function assertSize(buffer, width, height) {
  const actual = pngSize(buffer);
  if (actual.width !== width || actual.height !== height) {
    throw new Error(`PNG dimensions ${actual.width}x${actual.height}; expected ${width}x${height}`);
  }
}

async function firstExisting(paths) {
  for (const path of paths) {
    try {
      await access(path);
      return path;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  throw new Error(`Required asset not found. Checked: ${paths.map(label).join(', ')}`);
}

export async function loadAssets() {
  // Older capture scripts keep their assets in the sibling work directory.
  // Read that source if needed; all outputs stay inside this repository.
  const source = await firstExisting([
    ...(process.env.A_CAPSULE_SOURCE ? [resolve(process.env.A_CAPSULE_SOURCE)] : []),
    resolve(root, sourceRelative),
    resolve(root, '..', sourceRelative),
  ]);
  const sourceBytes = await readFile(source);
  assertSize(sourceBytes, 3840, 2160);
  const font = await firstExisting([
    ...(process.env.A_CAPSULE_FONT ? [resolve(process.env.A_CAPSULE_FONT)] : []),
    resolve(root, 'public/fonts/NotoSerifSC-VF.ttf'),
    'C:/Windows/Fonts/NotoSerifSC-VF.ttf',
    '/usr/share/fonts/truetype/noto/NotoSerifSC-VF.ttf',
    '/System/Library/Fonts/Supplemental/Songti.ttc',
  ]);
  return {
    source: label(source),
    font: isAbsolute(font) ? font.replaceAll('\\', '/') : font,
    imageUri: `data:image/png;base64,${sourceBytes.toString('base64')}`,
    fontUri: `data:font/ttf;base64,${(await readFile(font)).toString('base64')}`,
  };
}

export function capsuleHtml(t, imageUri, fontUri) {
  const { width: w, height: h } = t;
  const wide = w >= 600 && !t.portrait;
  const veilStops = wide
    ? 'rgba(247,239,221,0.99) 0%, rgba(247,239,221,0.90) 52%, rgba(247,239,221,0.50) 74%, rgba(247,239,221,0.12) 88%, transparent 100%'
    : 'rgba(247,239,221,0.99) 0%, rgba(247,239,221,0.97) 56%, rgba(247,239,221,0.82) 72%, rgba(247,239,221,0.30) 86%, transparent 100%';
  const title = t.background
    ? ''
    : `<section class="content">
    ${t.small ? '' : '<div class="eyebrow">THE SEVENTH CHECKSUM</div>'}
    <div class="brass"></div><h1>第七校验</h1>
    ${t.small ? '' : '<div class="english">THE SEVENTH CHECKSUM</div><div class="tagline">—— 修好一座会呼吸的城市</div>'}
    </section><div class="corner">${t.small ? '流明域' : 'LUMEN REACH · 流明域'}</div>`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
    @font-face { font-family: CapsuleSerif; src: url("${fontUri}"); font-weight: 100 900; font-display: block; }
    * { box-sizing: border-box; margin: 0; }
    html, body { width: ${w}px; height: ${h}px; overflow: hidden; }
    body { font-family: Arial, "Microsoft YaHei", sans-serif; }
    .capsule { position: relative; width: 100%; height: 100%; overflow: hidden; background: linear-gradient(115deg, #efe4cd, #f7efdd); }
    .scene { position: absolute; right: -2%; top: 0; width: ${t.portrait ? 94 : 68}%; height: 100%; }
    .scene img { width: 100%; height: 100%; object-fit: cover; object-position: 65% 55%; }
    .veil { position: absolute; inset: 0; background: linear-gradient(90deg, ${veilStops}); }
    .paper { position: absolute; inset: 0; opacity: .035; pointer-events: none; background: repeating-linear-gradient(0deg, #8a6b3a 0, #8a6b3a .5px, transparent .5px, transparent 3px); }
    .content { position: absolute; left: ${t.inset ?? 0}px; top: ${t.top ?? 0}px; }
    .eyebrow { color: #8a6b3a; font-size: ${t.eyebrow ?? 11}px; letter-spacing: .32em; line-height: 1.9; max-width: ${w - 2 * (t.inset ?? 0)}px; }
    .brass { width: ${w * 0.4}px; height: 2px; margin: ${t.small ? 0 : 14}px 0 ${t.small ? 5 : 12}px; background: #a8792a; }
    h1 { font-family: CapsuleSerif, "Noto Serif SC", "Songti SC", serif; font-weight: 700; font-size: ${t.title ?? 0}px; line-height: 1.2; letter-spacing: .015em; white-space: nowrap; color: #1f2a26; }
    .english { margin-top: 10px; font-size: ${t.english ?? 10}px; letter-spacing: .24em; color: #2f3c35; white-space: nowrap; }
    .tagline { margin-top: ${t.portrait ? 24 : 18}px; font-family: CapsuleSerif, serif; font-size: ${t.tag ?? 12}px; color: #4b3a22; white-space: nowrap; }
    .corner { position: absolute; right: ${t.small ? 10 : Math.round(w * 0.045)}px; bottom: ${t.small ? 7 : Math.round(h * 0.045)}px; font-size: ${t.small ? 8 : w >= 600 ? 12 : 9}px; letter-spacing: .12em; color: #7a6746; }
    ${t.portrait ? '.veil { background: linear-gradient(180deg, rgba(247,239,221,.98) 0%, rgba(247,239,221,.82) 30%, rgba(247,239,221,.22) 52%, rgba(247,239,221,.04) 72%), linear-gradient(90deg, rgba(247,239,221,.96) 0%, rgba(247,239,221,.78) 48%, rgba(247,239,221,.30) 68%, transparent 88%); } .scene { top: 30%; height: 70%; } .corner { background: rgba(247,239,221,.85); padding: 5px 8px; }' : ''}
    ${t.background ? '.scene { width: 76%; right: -6%; }' : ''}
  </style></head><body><main class="capsule"><div class="scene"><img alt="" src="${imageUri}"></div><div class="veil"></div><div class="paper"></div>${title}</main></body></html>`;
}

function listen(page, errors) {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('requestfailed', (request) =>
    errors.push(`${request.url().slice(0, 80)}: ${request.failure()?.errorText}`),
  );
}

async function cropStreet(page, imageUri) {
  // Exclude the source HUD and central mission dialog, keeping the right shop,
  // tree and bench. The original screenshot remains untouched.
  return page.evaluate(async (uri) => {
    const image = new Image();
    image.src = uri;
    await image.decode();
    const crop = { x: 2458, y: 518, width: 1324, height: 1382 };
    const canvas = document.createElement('canvas');
    canvas.width = crop.width;
    canvas.height = crop.height;
    canvas
      .getContext('2d')
      .drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
    return canvas.toDataURL('image/png');
  }, imageUri);
}

export async function captureCapsules() {
  const report = { shots: [], bytes: 0, errors: [], renderScale: 2, exportScale: 1 };
  let browser;
  try {
    const assets = await loadAssets();
    report.source = assets.source;
    report.font = assets.font;
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    report.browser = browser.version();
    const hi = await browser.newContext({ deviceScaleFactor: 2 });
    const lo = await browser.newContext({ deviceScaleFactor: 1 });
    const page = await hi.newPage();
    const downsample = await lo.newPage();
    listen(page, report.errors);
    listen(downsample, report.errors);
    const street = await cropStreet(downsample, assets.imageUri);
    await mkdir(output, { recursive: true });
    for (const t of targets) {
      await page.setViewportSize({ width: t.width, height: t.height });
      await page.setContent(capsuleHtml(t, street, assets.fontUri), {
        waitUntil: 'load',
        timeout: 60000,
      });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((image) => image.decode()));
      });
      const layout = await page.evaluate(() => {
        const root = document.querySelector('.capsule').getBoundingClientRect();
        const text = [...document.querySelectorAll('.content > *, .corner')].map((el) => {
          const r = el.getBoundingClientRect();
          return { text: el.textContent, x: r.x, y: r.y, width: r.width, height: r.height };
        });
        return {
          text,
          overflow: text.some(
            (r) =>
              r.x < 0 ||
              r.y < 0 ||
              r.x + r.width > root.width + 0.5 ||
              r.y + r.height > root.height + 0.5,
          ),
        };
      });
      if (layout.overflow) throw new Error(`${t.name}: text extends beyond canvas`);
      const large = await page.screenshot({ type: 'png', scale: 'device' });
      assertSize(large, t.width * 2, t.height * 2);
      await downsample.setViewportSize({ width: t.width, height: t.height });
      await downsample.setContent(
        '<style>*{margin:0}body{overflow:hidden}canvas{display:block}</style><canvas></canvas>',
      );
      // Browser canvas performs real 2x -> 1x resampling without sharp or a
      // separate image dependency. CSS zoom alone would not supersample.
      await downsample.evaluate(
        async ({ uri, width, height }) => {
          const image = new Image();
          image.src = uri;
          await image.decode();
          const canvas = document.querySelector('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(image, 0, 0, width, height);
        },
        {
          uri: `data:image/png;base64,${large.toString('base64')}`,
          width: t.width,
          height: t.height,
        },
      );
      const file = resolve(output, t.name);
      await downsample.locator('canvas').screenshot({ path: file, type: 'png', scale: 'css' });
      const saved = await readFile(file);
      assertSize(saved, t.width, t.height);
      report.shots.push({
        file: label(file),
        width: t.width,
        height: t.height,
        renderWidth: t.width * 2,
        renderHeight: t.height * 2,
        bytes: saved.length,
        layout,
      });
      report.bytes += saved.length;
    }
  } catch (error) {
    report.errors.push(error.message.split('\n')[0]);
  } finally {
    if (browser)
      await browser.close().catch((error) => report.errors.push(error.message.split('\n')[0]));
  }
  await mkdir(acceptance, { recursive: true });
  await writeFile(
    resolve(acceptance, 'capture-report.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = await captureCapsules();
  console.log(JSON.stringify(report));
  if (report.errors.length || report.shots.length !== targets.length) process.exitCode = 1;
}
