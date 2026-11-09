import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
const out = resolve('../work/store/trailer/raw');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const clips = [];
const errors = [];

async function runScene(name, fn) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: out, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(name + ': ' + String(e)));
  try {
    await page.goto(base + '/?quality=3&world=p9', { waitUntil: 'load' });
    await fn(page);
  } finally {
    const video = page.video();
    await context.close();
    const path = await video.path();
    clips.push({ name, path });
  }
}

async function enterWorld(page) {
  const bootEnter = page.locator('[data-boot-enter]');
  await page.waitForTimeout(2500);
  if (await bootEnter.isVisible().catch(() => false)) await bootEnter.click();
  await page.getByRole('button', { name: '开始自由探索' }).waitFor({ state: 'visible', timeout: 45000 });
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: '开始自由探索' }).click();
  await page.locator('#exploration-input').waitFor({ state: 'visible', timeout: 30000 });
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
  await page.getByTestId('teaching-entry').waitFor({ state: 'visible', timeout: 45000 });
  await page.getByTestId('teaching-entry').click();
  await page.locator('[data-teaching-panel]').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(800);
}

// Scene 1: boot screen (0-8s)
await runScene('01-boot', async (page) => {
  await page.waitForTimeout(9000);
  const bootEnter = page.locator('[data-boot-enter]');
  if (await bootEnter.isVisible().catch(() => false)) {
    await bootEnter.hover();
    await page.waitForTimeout(1500);
    await bootEnter.click();
  }
  await page.waitForTimeout(2500);
});

// Scene 2: street walk (8-20s)
await runScene('02-street', async (page) => {
  await enterWorld(page);
  await page.mouse.move(960, 540);
  await page.mouse.down();
  await page.mouse.move(1160, 470, { steps: 24 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(450);
  await page.keyboard.up('KeyS');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(6500);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(1500);
});

// Scene 3: teaching panel + star map (32-46s)
await runScene('03-panel', async (page) => {
  await enterWorld(page);
  await openPanel(page);
  await page.getByRole('tab', { name: '课节' }).click();
  await page.waitForTimeout(2600);
  await page.mouse.wheel(0, 420);
  await page.waitForTimeout(1800);
  await page.getByRole('tab', { name: '星图' }).click();
  await page.waitForTimeout(3200);
});

// Scene 4: AD-06 framebuffer lesson (46-58s)
await runScene('04-lesson-ad06', async (page) => {
  await enterWorld(page);
  await seed(page, ['AD-01', 'AD-02', 'AD-03', 'AD-04', 'AD-05']);
  await page.reload({ waitUntil: 'load' });
  await enterWorld(page);
  await openPanel(page);
  await page.locator('[data-start-lesson-v2="AD-06"]').click();
  await page.waitForTimeout(1800);
  await page.getByRole('button', { name: '下一段' }).click();
  await page.waitForTimeout(4200);
});

// Scene 5: AD-18 graduation audit (72-84s)
await runScene('05-lesson-ad18', async (page) => {
  await enterWorld(page);
  await seed(page, [
    'AD-01', 'AD-02', 'AD-03', 'AD-04', 'AD-05', 'AD-06', 'AD-07', 'AD-08', 'AD-09',
    'AD-10', 'AD-11', 'AD-12', 'AD-13', 'AD-14', 'AD-15', 'AD-16', 'AD-17',
  ]);
  await page.reload({ waitUntil: 'load' });
  await enterWorld(page);
  await openPanel(page);
  await page.locator('[data-start-lesson-v2="AD-18"]').click();
  await page.waitForTimeout(1800);
  await page.getByRole('button', { name: '下一段' }).click();
  await page.waitForTimeout(3600);
});

await browser.close();
console.log(JSON.stringify({ clips, errors }, null, 2));
