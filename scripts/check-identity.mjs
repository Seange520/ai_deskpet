import { chromium, expect } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PROGRESS_KEYS } from '../src/features/identity/resonanceIndex.mjs';
const out = process.env.SPARKMATE_IDENTITY_OUTPUT || 'D:/deepseek_file/work/codex-runs/t2-evidence';
const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  reducedMotion: 'reduce',
  acceptDownloads: true,
});
const checks = [],
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const key = 'sparkmate.checksum.identity.v1',
  install = 'sparkmate.checksum.install.v1';
const pass = (name) => {
  checks.push({ name, passed: true });
  console.log('PASS ' + name);
};
const shot = async (name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: out + '/' + name + '.png' });
};
const tab = (name) => page.getByRole('tab', { name, exact: true }).click();
const open = () => page.getByTestId('identity-entry').click();
const snapshot = () =>
  page.evaluate(
    (keys) => Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)])),
    PROGRESS_KEYS,
  );
const identity = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
const close = async () => {
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-identity-panel]')).toHaveCount(0);
  await expect(page.getByTestId('identity-entry')).toBeFocused();
};
try {
  for (const quality of ['dom', '1', '2']) {
    const p = await browser.newPage();
    const requests = [];
    p.on('request', (r) => requests.push(r.url()));
    await p.goto(base + '/?quality=' + quality);
    await p.getByTestId('identity-entry').waitFor();
    await p.waitForTimeout(900);
    expect(
      requests.filter((u) =>
        /ProfilePanel|identityStore|identity\.css|\/identity\/(uid|profile|resonanceIndex)/.test(u),
      ),
    ).toEqual([]);
    const old = await p.evaluate(
      (keys) => Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)])),
      PROGRESS_KEYS,
    );
    const canvas = await p.locator('canvas').count();
    await p.getByTestId('identity-entry').click();
    await p.getByLabel('出生年份').fill('2000');
    await p.getByRole('button', { name: '生成档案', exact: true }).click();
    await p.getByRole('tab', { name: '外观', exact: true }).click();
    await expect(p.getByRole('img', { name: '小零外观预览' })).toBeVisible();
    expect(await p.locator('canvas').count()).toBe(canvas);
    expect(
      await p.evaluate(
        (keys) => Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)])),
        PROGRESS_KEYS,
      ),
    ).toEqual(old);
    await p.close();
    pass('Tier ' + quality + ' lazy load and CSS preview without canvas or legacy writes');
  }
  await page.goto(base + '/?quality=dom');
  await page.getByTestId('identity-entry').waitFor();
  await page.waitForTimeout(500);
  const before = await snapshot();
  await open();
  await expect(page.getByRole('button', { name: '生成档案', exact: true })).toBeVisible();
  await shot('01-first-open');
  await page.getByLabel('出生年份').fill('2000');
  await page.getByRole('button', { name: '生成档案', exact: true }).click();
  await expect(page.locator('[data-identity-uid]')).toHaveText(/^M-[A-HJ-NP-Z2-9]{6}$/);
  const uid = (await identity()).uid;
  await shot('02-uid');
  await close();
  await page.reload();
  await open();
  await expect(page.locator('[data-identity-uid]')).toHaveText(uid);
  pass('UID generation and refresh persistence');
  for (const value of ['甲', '甲'.repeat(17), '   ', 'http://x']) {
    await page.getByLabel('铭牌', { exact: true }).fill(value);
    await page.getByRole('button', { name: '保存铭牌' }).click();
    expect((await identity()).nicknameChangedAt).toBeNull();
  }
  await page.getByLabel('铭牌', { exact: true }).fill('赫菲·新学徒');
  await page.getByRole('button', { name: '保存铭牌' }).click();
  expect((await identity()).nickname).toBe('赫菲·新学徒');
  await page.getByLabel('铭牌', { exact: true }).fill('另一铭牌');
  await page.getByRole('button', { name: '保存铭牌' }).click();
  await expect(page.getByRole('status')).toContainText('30 天');
  pass('nickname validation free first setting and cooldown');
  const values = await page
    .locator('[data-identity-ri-item]')
    .evaluateAll((els) => els.map((e) => Number(e.dataset.score)));
  expect(values.length).toBe(6);
  expect(Number(await page.locator('[data-identity-ri]').textContent())).toBe(
    Math.round(values.reduce((a, b) => a + b, 0)),
  );
  expect(values.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(1000);
  await shot('03-profile-ri');
  pass('six RI items and rounded sum');
  await tab('外观');
  for (const v of ['echo', 'teal', 'lamp'])
    await page.getByRole('button', { name: v, exact: true }).click();
  await page.getByRole('button', { name: '保存外观' }).click();
  await shot('04-appearance');
  await close();
  await page.reload();
  await open();
  await tab('外观');
  expect((await identity()).appearance).toEqual({
    palette: 'echo',
    antenna: 'teal',
    decal: 'lamp',
  });
  await expect(page.getByRole('img', { name: '小零外观预览' })).toBeVisible();
  pass('appearance persisted and DOM preview visible');
  await tab('数据');
  const switches = page.getByRole('switch');
  await expect(switches.nth(0)).not.toBeChecked();
  await expect(switches.nth(1)).not.toBeChecked();
  await switches.nth(0).click();
  await switches.nth(1).click();
  await shot('05-data-consents');
  await close();
  await page.reload();
  await open();
  await tab('数据');
  await expect(switches.nth(0)).toBeChecked();
  await expect(switches.nth(1)).toBeChecked();
  await switches.nth(0).click();
  await switches.nth(1).click();
  expect(await snapshot()).toEqual(before);
  pass('consents default off toggles persist and old keys unchanged');
  await tab('档案');
  const creationBefore = Number(
    await page.locator('[data-identity-ri-item="creation"]').getAttribute('data-score'),
  );
  await tab('数据');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出档案 JSON' }).click();
  const download = await downloadPromise;
  await download.saveAs(out + '/' + download.suggestedFilename());
  const data = JSON.parse(readFileSync(out + '/' + download.suggestedFilename(), 'utf8'));
  expect(data.schemaVersion).toBe(1);
  expect(data.identity.uid).toBe(uid);
  expect(Object.keys(data.progress)).toEqual(PROGRESS_KEYS);
  expect((await identity()).lastExportAt).toBeTruthy();
  await shot('06-export');
  await tab('档案');
  expect(
    Number(await page.locator('[data-identity-ri-item="creation"]').getAttribute('data-score')),
  ).toBe(creationBefore + 20);
  pass('download payload lastExportAt creation plus twenty');
  // Pure-score fixture: removing progress alone leaves creation/connection points by contract.
  // Zero the identity contributions explicitly before testing zero progress.
  await close();
  const saved = await identity();
  const savedProgress = await snapshot();
  await page.evaluate(
    ({ key, keys }) => {
      const p = JSON.parse(localStorage.getItem(key));
      p.appearance = { palette: 'forge', antenna: 'orange', decal: 'checksum' };
      p.nicknameChangedAt = null;
      delete p.lastExportAt;
      p.activityDays = [];
      localStorage.setItem(key, JSON.stringify(p));
      for (const k of keys) localStorage.removeItem(k);
    },
    { key, keys: PROGRESS_KEYS },
  );
  await page.reload();
  await open();
  // Opening records today, so maintenance is 50/30 and total rounds to 2.
  await expect(page.locator('[data-identity-ri]')).toHaveText('2');
  const without = await page
    .locator('[data-identity-ri-item]')
    .evaluateAll((es) =>
      Object.fromEntries(es.map((e) => [e.dataset.identityRiItem, Number(e.dataset.score)])),
    );
  expect(
    without.knowledge + without.practice + without.story + without.resonance + without.creation,
  ).toBe(0);
  await close();
  await page.evaluate(
    ({ key, saved, savedProgress }) => {
      localStorage.setItem(key, JSON.stringify(saved));
      for (const [k, v] of Object.entries(savedProgress))
        v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v);
    },
    { key, saved, savedProgress },
  );
  await page.reload();
  await open();
  await tab('档案');
  expect(Number(await page.locator('[data-identity-ri]').textContent())).toBe(
    Math.round(creationBefore + 20 + 50 / 30),
  );
  pass(
    'empty progress zero components; open-day connection retained per formula; fixtures restored',
  );
  await tab('数据');
  await page.getByRole('button', { name: '删除本地档案', exact: true }).click();
  await shot('07-delete-confirm');
  expect(await identity()).not.toBeNull();
  const deleteBefore = await snapshot();
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(page.getByRole('button', { name: '生成档案', exact: true })).toBeVisible();
  expect(
    await page.evaluate((keys) => keys.map((k) => localStorage.getItem(k)), [key, install]),
  ).toEqual([null, null]);
  expect(await snapshot()).toEqual(deleteBefore);
  pass('two-step deletion removes only identity and install');
  await close();
  await page.setViewportSize({ width: 390, height: 844 });
  await open();
  await page.getByLabel('出生年份').fill('2015');
  await page.getByRole('button', { name: '生成档案', exact: true }).click();
  await expect(page.getByText('年龄保护已开启，百分位展示已隐藏。')).toBeVisible();
  await tab('外观');
  for (const v of ['weave', 'amber', 'none'])
    await page.getByRole('button', { name: v, exact: true }).click();
  await page.getByRole('button', { name: '保存外观' }).click();
  await shot('08-mobile-390');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: '保存外观', exact: true })).toBeInViewport();
  await close();
  pass('390px no horizontal overflow click Escape focus return');
  await page.setViewportSize({ width: 1280, height: 900 });
  await open();
  expect(
    await page.getByRole('dialog').evaluate((e) => e.getBoundingClientRect().width),
  ).toBeLessThanOrEqual(920);
  await close();
  pass('1280px panel width at most 920');
  await page.evaluate((k) => localStorage.setItem(k, '{broken'), key);
  await page.reload();
  await open();
  await expect(page.getByText('档案损坏，可重新生成')).toBeVisible();
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe('{broken');
  await close();
  pass('corrupt archive visible and original bytes preserved');
  const unsupported = await browser.newPage();
  await unsupported.goto(base + '/?quality=dom');
  await unsupported.evaluate(() =>
    Object.defineProperty(window.crypto, 'subtle', { value: undefined }),
  );
  await unsupported.getByTestId('identity-entry').click();
  await unsupported.getByLabel('出生年份').fill('2000');
  await unsupported.getByRole('button', { name: '生成档案', exact: true }).click();
  await expect(unsupported.locator('[data-identity-panel] [role=status]')).toContainText(
    '本机不支持安全随机数，档案不可用',
  );
  expect(await unsupported.evaluate((k) => localStorage.getItem(k), key)).toBeNull();
  await unsupported.close();
  pass('missing Web Crypto fails closed in UI');
  const world = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  world.on('pageerror', (e) => errors.push(e.message));
  await world.goto(base + '/?quality=3&world=p9');
  await world.getByRole('button', { name: '开始自由探索', exact: true }).click({ timeout: 60000 });
  await world.locator('#exploration-input').waitFor();
  await world.waitForTimeout(1500);
  await world.getByTestId('identity-entry').click();
  await expect(world.locator('[data-identity-panel]')).toBeVisible();
  await world.keyboard.press('Escape');
  await expect(world.getByTestId('identity-entry')).toBeFocused();
  await world.getByRole('button', { name: '返回教学 Esc', exact: true }).click();
  await world.close();
  pass('P9 mobile entry accessible and return teaching unobstructed');
  expect(errors).toEqual([]);
  pass('no page errors');
} catch (e) {
  checks.push({ name: 'failure', passed: false, error: e.stack });
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
  writeFileSync(out + '/identity-checks.json', JSON.stringify({ checks, errors }, null, 2), 'utf8');
  const manifest = Object.fromEntries(
    readdirSync(out, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name !== 'sha256-manifest.json' && !e.name.endsWith('.log'))
      .map((e) => e.name)
      .map((n) => [
        n,
        createHash('sha256')
          .update(readFileSync(out + '/' + n))
          .digest('hex'),
      ]),
  );
  writeFileSync(out + '/sha256-manifest.json', JSON.stringify(manifest, null, 2), 'utf8');
}
