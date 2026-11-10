import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const phase = process.env.SPARKMATE_CAPTURE_PHASE || 'm1';
const out =
  process.env.SPARKMATE_M1_OUTPUT ||
  'C:/Users/Senage/.codex/visualizations/2026/11/07/01a1b568-23d3-7450-9b50-f707be65c0fd/sparkmate-p8-m1';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({
  viewport: { width: 1728, height: 1080 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('lighting-color lightingColor'))
    errors.push(m.text());
});
try {
  await page.goto((process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262') + '/?quality=3');
  await expect(page.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
  await page.evaluate(async () => {
    const { useEnvironmentStore } =
      await import('/src/features/environment/useEnvironmentStore.js');
    useEnvironmentStore.getState().setMode('day');
  });
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: '返回大世界', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-space-phase', 'idle');
  await page.waitForTimeout(1000);
  const camera = await page.evaluate(async () => {
    const e = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/@react-three_fiber.js'));
    const { _roots } = await import(e.name);
    const r = _roots.get(document.querySelector('.scene-stage canvas')).store.getState();
    return {
      position: r.camera.position.toArray(),
      quaternion: r.camera.quaternion.toArray(),
      fov: r.camera.fov,
    };
  });
  expect(camera.position).toEqual([23, 21, 29]);
  expect(camera.fov).toBe(56);
  await page.screenshot({ path: join(out, phase + '-world-ui.png') });
  let style = await page.addStyleTag({
    content: '.app-shell,.companion,.space-dock {visibility:hidden!important}',
  });
  await page.screenshot({ path: join(out, phase + '-world.png') });
  await style.evaluate((el) => el.remove());
  await page
    .getByRole('navigation', { name: '主导航' })
    .getByRole('button', { name: '校验册', exact: true })
    .click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-space-phase', 'detail');
  await page.waitForTimeout(700);
  style = await page.addStyleTag({
    content: '.app-shell,.companion,.space-dock {visibility:hidden!important}',
  });
  await page.screenshot({ path: join(out, phase + '-pet.png') });
  expect(errors).toEqual([]);
  await writeFile(
    join(out, phase + '-capture.json'),
    JSON.stringify(
      {
        phase,
        camera,
        viewport: [1728, 1080],
        dpr: 1,
        reducedMotion: 'reduce',
        environment: 'day',
        errors,
      },
      null,
      2,
    ),
  );
  console.log('Captured', phase, camera);
} finally {
  await browser.close();
}
