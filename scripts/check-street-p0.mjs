import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out = process.env.SPARKMATE_STREET_OUTPUT || 'test-results/street-p0';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  reducedMotion: 'no-preference',
});
const errors = [],
  shaders = [],
  results = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && /shader|WebGLProgram|GL_INVALID/i.test(m.text()))
    shaders.push(m.text());
});
await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
async function state() {
  return page.evaluate(async () => {
    const streetEntry = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/street/streetStore.js'));
    const fiberEntry = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/@react-three_fiber.js'));
    if (!streetEntry || !fiberEntry) return {};
    const { _roots } = await import(
      performance
        .getEntriesByType('resource')
        .find((r) => r.name.includes('/@react-three_fiber.js')).name
    );
    const root = _roots.get(document.querySelector('.scene-stage canvas'));
    if (!root) return {};
    const r = root.store.getState();
    const street = (
      await import(
        performance
          .getEntriesByType('resource')
          .find((r) => r.name.includes('/street/streetStore.js')).name
      )
    ).useStreet.getState();
    return {
      ...r.camera.userData,
      street: JSON.parse(JSON.stringify(street)),
      canvasCount: document.querySelectorAll('.scene-stage canvas').length,
    };
  });
}
async function walk(key, predicate) {
  await page.locator('#exploration-input').focus();
  await page.keyboard.down(key);
  const deadline = Date.now() + 20000;
  try {
    while (Date.now() < deadline) {
      await page.waitForTimeout(100);
      if (predicate((await state()).player)) return;
    }
    throw new Error('Walk timeout: ' + JSON.stringify(await state()));
  } finally {
    await page.keyboard.up(key);
  }
}
try {
  await page.goto('http://127.0.0.1:15262/?quality=3&world=p9');
  await page.getByRole('button', { name: '开始自由探索', exact: true }).click({ timeout: 60000 });
  await expect
    .poll(async () => (await state()).cameraOwner, { timeout: 60000 })
    .toBe('p9-character');
  await page.waitForTimeout(1000);
  await walk('KeyS', (p) => p.z < 0.15);
  await page.mouse.move(1300, 650);
  await page.mouse.down();
  await page.mouse.move(776.4, 650, { steps: 18 });
  await page.mouse.up();
  await walk('KeyW', (p) => p.x > 6.2);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: out + '/01-street-normal.png' });
  console.log(JSON.stringify({ initialStreet: await state() }));
  if (process.env.SPARKMATE_STREET_SMOKE === '1') process.exitCode = 0;
  else {
    const saveBefore = await page.evaluate(() => localStorage.getItem('sparkmate.routes.v2'));
    await page.getByRole('button', { name: /开启鹰眼透视/ }).click();
    for (const id of ['lamp', 'return', 'motor']) {
      await page.locator(`[data-street-probe="${id}"]`).click();
      await expect.poll(async () => (await state()).street.evidence[`${id}:voltage`]).toBe(true);
    }
    await page.screenshot({ path: out + '/02-street-eagle-eye.png' });
    expect((await state()).street.focus).toBeLessThanOrEqual(64);
    results.push('World-space voltage probes consume focus and produce independent evidence');
    await page.getByRole('button', { name: '通断', exact: true }).click();
    await page.locator('[data-street-probe="return"]').click();
    await expect(page.getByTestId('street-reading')).toContainText('禁止带电');
    expect((await state()).street.evidence['return:continuity']).toBeUndefined();
    await page.getByRole('button', { name: '未排障，强行跨接供电', exact: true }).click();
    const seen = new Set();
    await expect
      .poll(
        async () => {
          const stage = (await state()).street.stage;
          seen.add(stage);
          return stage;
        },
        { timeout: 20000, intervals: [30] },
      )
      .toBe('fire');
    await page.screenshot({ path: out + '/03-street-short-circuit-fire.png' });
    await expect
      .poll(async () => (await state()).street.fuse, { timeout: 15000, intervals: [50] })
      .toBe('blown');
    await page.screenshot({ path: out + '/04-street-fuse-tripped.png' });
    await page.getByRole('button', { name: '恢复供电 · 7 秒校验', exact: true }).click();
    expect((await state()).street.verifying).toBe(false);
    await page.getByRole('button', { name: '断电隔离', exact: true }).click();
    await page.getByRole('button', { name: '更换保险丝', exact: true }).click();
    await page.locator('[data-street-probe="return"]').click();
    await expect.poll(async () => (await state()).street.evidence['return:continuity']).toBe(true);
    await page.getByRole('button', { name: '确认接地不良', exact: true }).click();
    await page.getByRole('button', { name: '确认启动过载', exact: true }).click();
    await page.getByRole('button', { name: '修复接点 · 独立回流', exact: true }).click();
    await page.getByRole('button', { name: '加入压缩机软启动', exact: true }).click();
    results.push(
      'Live continuity blocked; short circuit ignites, fuse opens and must be replaced before resupply',
    );
    await page.getByRole('button', { name: '恢复供电 · 7 秒校验', exact: true }).click();
    await expect
      .poll(async () => (await state()).street.verifiedSeconds, { timeout: 20000 })
      .toBeGreaterThan(5.8);
    await page.screenshot({ path: out + '/npc-frame-00-before.png' });
    await expect(page.getByTestId('street-dialogue')).toBeVisible({ timeout: 15000 });
    for (let i = 1; i <= 4; i++) {
      await page.screenshot({ path: out + `/npc-frame-0${i}-after.png` });
      await page.waitForTimeout(350);
    }
    const final = await state();
    expect(final.street.xp).toBe(120);
    expect(final.street.prisms).toBe(1);
    expect(final.street.completed).toBe(true);
    await expect(page.getByTestId('street-dialogue')).toContainText('今晚灯没眨，客人多了一倍。');
    expect(await page.evaluate(() => localStorage.getItem('sparkmate.routes.v2'))).toBe(saveBefore);
    await page.getByRole('button', { name: '收起对话', exact: true }).click();
    await page.getByRole('button', { name: '与夜宵摊老板交谈', exact: true }).click();
    expect((await state()).street.xp).toBe(120);
    expect((await state()).canvasCount).toBe(1);
    results.push(
      'Full-cycle validation triggers NPC line, awards 120 XP / 1 prism once, and preserves teaching save',
    );
    await page.reload();
    await page.getByRole('button', { name: '开始自由探索', exact: true }).click({ timeout: 60000 });
    await expect.poll(async () => (await state()).street?.completed, { timeout: 60000 }).toBe(true);
    expect((await state()).street.xp).toBe(120);
    results.push('Completion and rewards survive reload without awarding twice');
    expect(errors).toEqual([]);
    expect(shaders).toEqual([]);
    console.log(
      JSON.stringify(
        { passed: results.length, results, seen: [...seen], final, errors, shaders },
        null,
        2,
      ),
    );
  }
} finally {
  await writeFile(
    out + '/street-checks.json',
    JSON.stringify({ results, errors, shaders }, null, 2),
  );
  await browser.close();
}
