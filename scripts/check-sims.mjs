import { chromium, expect } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const out = process.env.SPARKMATE_SIMS_OUTPUT || 'D:/deepseek_file/work/codex-runs/t4-evidence';
const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const checks = [],
  screenshots = [],
  errors = [],
  shaders = [],
  isolation = [];
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  reducedMotion: 'reduce',
});
function watch(p) {
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => {
    if (m.type() === 'error' && /shader|WebGLProgram|GL_INVALID/i.test(m.text()))
      shaders.push(m.text());
  });
}
watch(page);
const button = (name) => page.getByRole('button', { name, exact: true });
async function enter(name) {
  await button(name).focus();
  await page.keyboard.press('Enter');
}
// Native select operated with real keyboard, no DOM or store mutations.
async function select(label, index) {
  await page.getByLabel(label, { exact: true }).click();
  await page.keyboard.press('Home');
  for (let i = 0; i < index; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
}
async function mode(name) {
  await page.getByRole('radio', { name, exact: true }).click();
}
async function shot(name) {
  await page.screenshot({ path: `${out}/${name}.png` });
  screenshots.push(name + '.png');
}
async function layout() {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    const observed = await page.locator('[data-sim]').evaluate((el) => ({
      nodes: el.querySelectorAll('*').length,
      width: el.scrollWidth,
      client: el.clientWidth,
    }));
    expect(observed.nodes).toBeLessThanOrEqual(120);
    expect(observed.width).toBeLessThanOrEqual(observed.client);
    expect(
      await page.locator('.sims-dialog').evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    checks.push({ name: `layout ${width}`, ...observed, passed: true });
  }
}
async function open(id) {
  await page.goto(base + '/?quality=3&sims=1');
  await page.getByTestId('sims-entry').click({ timeout: 60000 });
  await button(id).click();
  await page.locator(`[data-sim="${id}"]`).waitFor();
}
const saves = () =>
  page.evaluate(() =>
    Object.fromEntries(
      Object.entries(localStorage).filter(([k]) =>
        /routes|seventh-checksum|checksum\.(profile|identity)/.test(k),
      ),
    ),
  );
try {
  for (const id of ['meter', 'series-voltage', 'pwm', 'ide-run']) {
    for (const correct of [true, false]) {
      await open(id);
      const before = await saves(),
        started = Date.now();
      const status = page.locator('[data-sim] [role=status]');
      if (id === 'meter') {
        if (correct) {
          await mode('60V');
          await enter('测量');
          await expect(status).toContainText('24.0 V');
          for (const [index, m, text] of [
            [1, '通断', '线路通'],
            [2, '通断', '线路断'],
            [3, 'Ω', '220 Ω'],
          ]) {
            await select('被测物', index);
            await mode(m);
            await enter('测量');
            await expect(status).toContainText(text);
          }
        } else {
          await enter('测量');
          await expect(status).toContainText('溢出');
          await mode('Ω');
          await enter('测量');
          await expect(status).toContainText('保险丝');
        }
      } else if (id === 'series-voltage') {
        if (correct) {
          for (const name of ['电源', '220Ω', 'LED', '回流']) await enter(name);
          await enter('校验接线');
          for (let i = 0; i < 4; i++) {
            await select('测点', i);
            await enter('测量');
            await expect(status).toContainText('通过');
          }
        } else {
          await enter('测量');
          await expect(status).toContainText('先连接');
          await enter('LED');
          await enter('电源');
          await enter('校验接线');
          await expect(status).toContainText('顺序不对');
        }
      } else if (id === 'pwm') {
        if (!correct) {
          await enter('校验 PWM');
          await expect(status).toContainText('低电平');
        }
        for (const [i, v] of (correct ? [25, 50, 75, 10] : [10, 0, 0, 0]).entries()) {
          await page.getByLabel(`${'ABCD'[i]} 占空比`, { exact: true }).focus();
          await page.keyboard.press('Home');
          for (let n = 0; n < v / 5; n++) await page.keyboard.press('ArrowRight');
        }
        await enter('校验 PWM');
        await expect(status).toContainText(correct ? '全部通过' : '未匹配');
      } else {
        if (!correct) {
          await enter('编译');
          await expect(status).toContainText('缺少');
          await enter('运行');
          await expect(status).toContainText('先编译');
        }
        for (const name of ['setup', 'pinMode', 'loop', 'digitalWrite', 'delay']) await enter(name);
        if (!correct) await select('每次延时', 1);
        await enter('编译');
        await expect(status).toContainText('编译通过');
        await enter('运行');
        await expect(status).toContainText(correct ? '运行通过' : '1Hz');
        await expect(page.getByLabel('串口输出', { exact: true })).toContainText('LED ON');
      }
      await expect(page.locator('[data-sim]')).toHaveAttribute('data-complete', String(correct));
      await expect(page.locator('[data-sim] details')).toContainText('次尝试');
      expect(await saves()).toEqual(before);
      await layout();
      await page.setViewportSize(
        correct ? { width: 1280, height: 900 } : { width: 390, height: 844 },
      );
      await status.scrollIntoViewIfNeeded();
      await shot(`${id}-${correct ? 'pass' : 'retry'}`);
      expect(Date.now() - started).toBeLessThan(90000);
      checks.push({
        name: `${id} ${correct ? 'completion' : 'two failure hints'}`,
        passed: true,
        elapsedMs: Date.now() - started,
        status: await status.textContent(),
        evidence: await page.locator('[data-sim] details').textContent(),
      });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('sims-entry')).toBeFocused();
    }
  }
  for (const query of ['quality=dom&sims=1', 'quality=1&sims=1', 'quality=2&sims=1', 'quality=3']) {
    const p = await browser.newPage(),
      requests = [];
    watch(p);
    p.on('request', (r) => requests.push(r.url()));
    await p.goto(`${base}/?${query}`);
    await p.getByTestId('teaching-entry').waitFor();
    await p.waitForTimeout(1000);
    expect(requests.filter((r) => r.includes('/learning/sims/'))).toEqual([]);
    await expect(p.getByTestId('sims-entry')).toHaveCount(0);
    isolation.push({ query, passed: true });
    await p.close();
  }
  expect(errors).toEqual([]);
  expect(shaders).toEqual([]);
  expect(screenshots.length).toBe(8);
} catch (e) {
  checks.push({ name: e.stack, passed: false });
  process.exitCode = 1;
} finally {
  writeFileSync(
    `${out}/sims-check.json`,
    JSON.stringify(
      {
        checks,
        screenshots,
        errors,
        shaders,
        isolation,
        base,
        interaction: 'keyboard/mouse only; evaluate observes layout/storage',
      },
      null,
      2,
    ),
  );
  const manifest =
    [...screenshots, 'sims-check.json']
      .map(
        (n) =>
          `${createHash('sha256')
            .update(readFileSync(`${out}/${n}`))
            .digest('hex')}  ${n}`,
      )
      .join('\n') + '\n';
  writeFileSync(`${out}/SHA256SUMS`, manifest);
  writeFileSync(`${out}/ROOT_SHA256`, createHash('sha256').update(manifest).digest('hex') + '\n');
  await browser.close();
  console.log(JSON.stringify({ checks, screenshots, errors, shaders, isolation, out }, null, 2));
}
