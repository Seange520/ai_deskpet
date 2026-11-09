import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
const out = resolve('../work/store/trailer/raw-v2');
const cards = resolve('../work/store/trailer/cards');
mkdirSync(out, { recursive: true });
mkdirSync(cards, { recursive: true });

const SCENE_FILTER = (process.env.SCENES || '')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean);
let prevReport = { clips: [], marks: [] };
try {
  prevReport = JSON.parse(readFileSync(resolve(out, 'marks.json'), 'utf8'));
} catch {
  // first run
}

const browser = await chromium.launch({ channel: 'chrome' });
const clips = [];
const marks = [];
const errors = [];

function log(...args) {
  console.error('[trailer-v2]', ...args);
}

async function runScene(name, fn) {
  if (SCENE_FILTER.length && !SCENE_FILTER.includes(name)) return;
  const t0 = Date.now();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: out, size: { width: 1920, height: 1080 } },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(name + ': ' + String(e)));
  let mark = null;
  const markNow = () => {
    if (mark == null) {
      mark = Number(((Date.now() - t0) / 1000).toFixed(2));
      log(name, 'mark', mark);
    }
  };
  try {
    await page.goto(base + '/?quality=3&world=p9', { waitUntil: 'load' });
    await fn(page, markNow);
  } catch (error) {
    errors.push(name + ': ' + String(error));
    log(name, 'scene failed', String(error).slice(0, 160));
  } finally {
    const video = page.video();
    const clip = { name, mark };
    clips.push(clip);
    await context.close();
    if (video) clip.path = await video.path();
    if (clip.mark != null) marks.push({ scene: name, mark: clip.mark });
  }
}

async function enterWorld(page) {
  const bootEnter = page.locator('[data-boot-enter]');
  await page.waitForTimeout(2200);
  if (await bootEnter.isVisible().catch(() => false)) {
    await bootEnter.click();
  }
  const start = page.getByRole('button', { name: '开始自由探索' });
  await start.waitFor({ state: 'visible', timeout: 60000 });
  await page.waitForTimeout(500);
  await start.click();
  await page.locator('#exploration-input').waitFor({ state: 'visible', timeout: 45000 });
  await page.waitForTimeout(1200);
}

async function seed(page, ids) {
  await page.evaluate(async (list) => {
    const learning = await import('/src/features/learning/learning.mjs');
    const graph = (await import('/src/features/learning/data/knowledge-graph.v1.json')).default;
    let p = learning.freshProfile(graph);
    for (const id of list) {
      p = learning.beginLesson(graph, p, id);
      p = learning.completeLesson(graph, p, id, {
        runId: 'seed-' + id,
        checkScore: 1,
        transferScore: 1,
        evidence: [
          { type: 'quiz', score: 1, context: { seed: 'quiz' } },
          { type: 'measurement', score: 1, context: { seed: 'measure' } },
          { type: 'sim-task', score: 1, context: { seed: 'sim' } },
        ],
      });
    }
    localStorage.setItem(learning.PROFILE_KEY, JSON.stringify(p));
  }, ids);
}

async function openPanel(page) {
  await page.getByTestId('teaching-entry').waitFor({ state: 'visible', timeout: 60000 });
  await page.getByTestId('teaching-entry').click();
  await page.locator('[data-teaching-panel]').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(700);
}

// s1 street pan + walk
await runScene('s1-street', async (page, markNow) => {
  await enterWorld(page);
  await page.mouse.move(960, 540);
  await page.mouse.down();
  await page.mouse.move(1180, 500, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  markNow();
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(2000);
  await page.keyboard.up('KeyW');
  await page.mouse.down();
  await page.mouse.move(1000, 470, { steps: 24 });
  await page.mouse.up();
  await page.waitForTimeout(3500);
});

// s2 eagle-eye readings
await runScene('s2-eagle', async (page, markNow) => {
  await enterWorld(page);
  await page.locator('button', { hasText: '开启鹰眼透视' }).first().click();
  await page.waitForTimeout(500);
  markNow();
  await page.mouse.move(760, 540, { steps: 12 });
  await page.waitForTimeout(2600);
  await page.locator('button', { hasText: '开启鹰眼透视' }).first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(1200);
});

// s3 teaching panel + star map
await runScene('s3-panel', async (page, markNow) => {
  await enterWorld(page);
  await openPanel(page);
  markNow();
  await page.getByRole('tab', { name: '课节' }).click();
  await page.waitForTimeout(2600);
  await page.mouse.wheel(0, 380);
  await page.waitForTimeout(1600);
  await page.getByRole('tab', { name: '星图' }).click();
  await page.waitForTimeout(3000);
});

// s4 AD-06 lesson (need AD-01..05 mastered)
await runScene('s4-ad06', async (page, markNow) => {
  await enterWorld(page);
  await seed(page, ['AD-01', 'AD-02', 'AD-03', 'AD-04', 'AD-05']);
  await page.reload({ waitUntil: 'load' });
  await enterWorld(page);
  await openPanel(page);
  await page.locator('[data-start-lesson-v2="AD-06"]').click();
  await page.locator('[data-lesson-v2="AD-06"]').waitFor({ timeout: 15000 });
  markNow();
  await page.waitForTimeout(1800);
  await page.getByRole('button', { name: '下一段' }).click();
  await page.waitForTimeout(4500);
});

// s5 IC-09 layout lesson
await runScene('s5-ic', async (page, markNow) => {
  await enterWorld(page);
  await seed(page, [
    'K0-01', 'K0-02', 'K1-01',
    'IC-01', 'IC-02', 'IC-03', 'IC-04', 'IC-05', 'IC-06', 'IC-07', 'IC-08',
  ]);
  await page.reload({ waitUntil: 'load' });
  await enterWorld(page);
  await openPanel(page);
  await page.locator('[data-start-lesson-v2="IC-09"]').click();
  await page.locator('[data-lesson-v2="IC-09"]').waitFor({ timeout: 15000 });
  markNow();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: '下一段' }).click();
  await page.waitForTimeout(4500);
});

// s6 world map
await runScene('s6-map', async (page, markNow) => {
  await enterWorld(page);
  await page.getByRole('button', { name: '大地图 M' }).first().click();
  await page.waitForTimeout(700);
  markNow();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: '枢纽全景' }).click().catch(() => {});
  await page.waitForTimeout(3600);
});

// cards
async function renderCard(name, html) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const file = resolve(cards, name + '.png');
  await page.screenshot({ path: file });
  await page.close();
  return file;
}

const shell = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1920px; height: 1080px; background:
    radial-gradient(1200px 700px at 30% 20%, rgba(28,80,90,.45), transparent 60%),
    linear-gradient(160deg, #061318 0%, #071b22 60%, #04100f 100%);
    font-family: 'Microsoft YaHei', 'Noto Sans SC', sans-serif; color: #e8f4f2;
    display: flex; flex-direction: column; justify-content: center; padding: 0 160px; }
  .grid { position: fixed; inset: 0; opacity: .16; background-image:
    linear-gradient(rgba(79,209,197,.35) 1px, transparent 1px),
    linear-gradient(90deg, rgba(79,209,197,.35) 1px, transparent 1px);
    background-size: 96px 96px; }
  .eyebrow { font-family: Consolas, monospace; letter-spacing: 6px; color: #4fd1c5; font-size: 24px; }
  h1 { font-size: 132px; letter-spacing: 10px; margin: 20px 0 6px; font-weight: 700;
       text-shadow: 0 0 40px rgba(79,209,197,.35); }
  .en { font-family: Consolas, monospace; letter-spacing: 8px; color: #7fb8bd; font-size: 30px; }
  .sub { margin-top: 44px; font-size: 34px; color: #cfe9e5; }
  .line { width: 180px; height: 3px; background: linear-gradient(90deg,#4fd1c5,transparent); margin: 34px 0; }
  .foot { position: absolute; right: 140px; bottom: 90px; color: #5f8a91; font-family: Consolas, monospace; letter-spacing: 4px; font-size: 22px; }
  .hex { width: 96px; height: 96px; margin-bottom: 30px; }
  .cta { display: flex; gap: 26px; margin-top: 52px; }
  .btn { padding: 22px 40px; border: 2px solid #4fd1c5; color: #061318; background: #4fd1c5;
    font-size: 30px; font-weight: 700; letter-spacing: 2px; }
  .btn.ghost { background: transparent; color: #cfe9e5; }
</style></head><body><div class="grid"></div>${body}</body></html>`;

const hex = `<svg class="hex" viewBox="0 0 100 100"><path d="M50 6 92 30v40L50 94 8 70V30Z" fill="none" stroke="#4fd1c5" stroke-width="4"/><path d="M35 50h30M50 35v30" stroke="#4fd1c5" stroke-width="5"/></svg>`;

const titleCard = await renderCard(
  'title',
  shell(`${hex}
  <div class="eyebrow">SEVENTH CHECKSUM PROTOCOL</div>
  <h1>第七校验</h1>
  <div class="en">THE SEVENTH CHECKSUM</div>
  <div class="line"></div>
  <div class="sub">修好一座会呼吸的城市</div>
  <div class="foot">LUMEN REACH · 流明域</div>`),
);

const ctaCard = await renderCard(
  'cta',
  shell(`${hex}
  <div class="eyebrow">2026 · STEAM</div>
  <h1 style="font-size:96px">加入愿望单</h1>
  <div class="en">WISHLIST NOW</div>
  <div class="line"></div>
  <div class="sub">免费 Demo · 中文 / English</div>
  <div class="foot">THE SEVENTH CHECKSUM · LUMEN REACH</div>`),
);

await browser.close();
const clipMap = new Map();
for (const clip of [...(prevReport.clips || []), ...clips]) clipMap.set(clip.name, clip);
const markMap = new Map();
for (const mark of [...(prevReport.marks || []), ...marks]) markMap.set(mark.scene, mark);
const report = {
  clips: [...clipMap.values()],
  marks: [...markMap.values()],
  titleCard: titleCard ?? prevReport.titleCard,
  ctaCard: ctaCard ?? prevReport.ctaCard,
  errors,
};
writeFileSync(resolve('../work/store/trailer/raw-v2/marks.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify({ clips: clips.length, marks: marks.length, errors: errors.length }));
