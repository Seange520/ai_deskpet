// 离线壳验收：生产构建 + `npx vite preview --port 15265` 后运行本脚本。
// 验证：在线首访 → SW ready → 预缓存完成 → 断网 reload 后主页、委托三单、档案阅读页仍可渲染。
import { chromium } from 'playwright';

const base = process.env.OFFLINE_BASE_URL || 'http://localhost:15265';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

const urls = [
  ['hub', `${base}/`],
  ['mission', `${base}/?mission=r1&quality=3`],
  ['novel', `${base}/novel/index.html`],
];

const online = {};
for (const [name, url] of urls) {
  const p = await context.newPage();
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await p.waitForTimeout(6000);
  online[name] = true;
  await p.close();
}

await page.goto(`${base}/`, { waitUntil: 'networkidle' });
await page.evaluate(async () => {
  await navigator.serviceWorker.ready;
});
await page.waitForTimeout(3000);

const cacheSizes = await page.evaluate(async () => {
  const names = await caches.keys();
  const out = {};
  for (const n of names) {
    const c = await caches.open(n);
    out[n] = (await c.keys()).length;
  }
  return out;
});

await context.setOffline(true);
const results = {};
for (const [name, url] of urls) {
  const p = await context.newPage();
  try {
    await p.goto(url, { waitUntil: 'load' });
    await p.waitForTimeout(3500);
    const text = (await p.locator('body').innerText()).slice(0, 80);
    results[name] = { title: await p.title(), text, ok: text.length > 0 };
  } catch (error) {
    results[name] = { ok: false, error: String(error).slice(0, 120) };
  }
  await p.close();
}

const passed = Object.values(results).every((r) => r.ok) && errors.length === 0;
console.log(JSON.stringify({ passed, cacheSizes, online, results, errors }, null, 2));
await browser.close();
process.exit(passed ? 0 : 1);
