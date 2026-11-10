import { chromium, expect } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
const out = process.env.SPARKMATE_M2_OUTPUT || 'test-results/toon-m2';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({
  viewport: { width: 1728, height: 1080 },
  reducedMotion: 'reduce',
});
const results = [];
try {
  await page.goto((process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262') + '/?quality=1');
  await expect(page.locator('.render-shell')).toHaveAttribute('data-stage-ready', 'true');
  for (const name of ['校验册', '街坊工坊', '誊写房', '委托板', '返回大世界']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.locator('.app-shell')).toHaveAttribute(
      'data-space-phase',
      name === '返回大世界' ? 'idle' : 'detail',
    );
    await page.waitForTimeout(500);
    const sample = await page.evaluate(async () => {
      const entry = performance
        .getEntriesByType('resource')
        .find((r) => r.name.includes('/@react-three_fiber.js'));
      const { _roots } = await import(entry.name);
      const r = _roots.get(document.querySelector('.scene-stage canvas')).store.getState();
      const debug = r.gl.getContext().getExtension('WEBGL_debug_renderer_info');
      const gpu = debug
        ? r.gl.getContext().getParameter(debug.UNMASKED_RENDERER_WEBGL)
        : 'unavailable';
      const frames = [],
        start = r.gl.info.render.frame;
      let last = performance.now();
      await new Promise((resolve) => {
        const frame = (now) => {
          frames.push(now - last);
          last = now;
          r.invalidate();
          if (frames.length < 100) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
      const data = frames.slice(10).sort((a, b) => a - b);
      const companion = _roots.get(document.querySelector('.companion canvas'))?.store.getState();
      return {
        gpu,
        rendered: r.gl.info.render.frame - start,
        fps: 1000 / (data.reduce((a, b) => a + b, 0) / data.length),
        p95ms: data[Math.floor(data.length * 0.95)],
        calls: r.gl.info.render.calls,
        companionCalls: companion?.gl.info.render.calls || 0,
        triangles: r.gl.info.render.triangles,
      };
    });
    expect(sample.rendered).toBeGreaterThan(70);
    expect(sample.calls).toBeGreaterThan(0);
    expect(sample.calls + sample.companionCalls).toBeLessThanOrEqual(120);
    expect(sample.fps).toBeGreaterThanOrEqual(30);
    results.push({ name, ...sample });
  }
  console.log(JSON.stringify(results, null, 2));
} finally {
  await writeFile(out + '/tier1-budget.json', JSON.stringify(results, null, 2));
  await browser.close();
}
