import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const base = process.env.SPARKMATE_SPACE_URL || 'http://127.0.0.1:15262';
const out = 'D:/deepseek_file/work/acceptance/ui-styles';
mkdirSync(out, { recursive: true });

const VARIANTS = {
  'A-deep-teal': '',
  'B-light-paper': `
    :root {
      --v2-text: #16232a; --v2-text-secondary: #465b63; --v2-text-muted: #6b8189;
      --v2-accent: #0f8f80; --v2-accent-dim: #0b6f64; --v2-gold: #b0701f;
      --v2-panel: linear-gradient(180deg, rgba(252, 253, 250, 0.97), rgba(240, 245, 241, 0.97));
      --v2-panel-soft: linear-gradient(180deg, rgba(250, 252, 249, 0.9), rgba(238, 243, 239, 0.9));
      --v2-line: rgba(15, 143, 128, 0.24); --v2-line-strong: rgba(15, 143, 128, 0.45);
    }
    .teaching-modal { background: rgba(224, 232, 228, 0.55) !important; }
    .teaching-panel {
      border-color: rgba(15, 143, 128, 0.22) !important;
      box-shadow: 0 30px 60px -40px rgba(20, 40, 45, 0.55) !important;
    }
    .teaching-panel h2, .teaching-panel h3, .teaching-panel p,
    .teaching-panel label, .teaching-panel small { color: var(--v2-text) !important; }
    .teaching-card, .teaching-panel fieldset {
      background: rgba(255, 255, 255, 0.72) !important;
      border-color: rgba(15, 143, 128, 0.18) !important;
    }
    .teaching-panel button {
      background: rgba(15, 143, 128, 0.08) !important;
      border-color: rgba(15, 143, 128, 0.28) !important;
      color: #0c5c53 !important;
    }
    .teaching-panel [role='tablist'] { background: rgba(15, 143, 128, 0.06) !important; }
    .teaching-panel [role='tablist'] [aria-selected='true'] {
      background: linear-gradient(160deg, rgba(15, 143, 128, 0.2), rgba(255, 255, 255, 0.6)) !important;
      color: #0c5c53 !important;
    }
    .teaching-narration { background: rgba(255, 255, 255, 0.7) !important; }
    .topbar { background: linear-gradient(180deg, rgba(250, 252, 250, 0.96), rgba(240, 245, 241, 0.9)) !important; }
    .app-footer { color: #5c727a !important; }
    .teaching-panel select, .teaching-panel input { background: #ffffff !important; color: #16232a !important; border-color: rgba(15,143,128,.3) !important; }
    .teaching-panel select option { color: #16232a; }
  `,
  'C-anime-pastel': `
    :root {
      --v2-text: #241f3a; --v2-text-secondary: #574e74; --v2-text-muted: #7d7398;
      --v2-accent: #ff86bd; --v2-accent-dim: #c95fa0; --v2-gold: #ffc36b;
      --v2-panel: linear-gradient(180deg, rgba(46, 38, 78, 0.94), rgba(28, 24, 52, 0.94));
      --v2-panel-soft: linear-gradient(180deg, rgba(56, 46, 92, 0.8), rgba(33, 28, 60, 0.8));
      --v2-line: rgba(255, 134, 189, 0.26); --v2-line-strong: rgba(255, 134, 189, 0.5);
      --v2-radius: 18px; --v2-radius-sm: 14px;
    }
    .teaching-panel {
      border-color: rgba(255, 134, 189, 0.35) !important;
      background:
        radial-gradient(circle at 85% 8%, rgba(140, 123, 255, 0.22), transparent 42%),
        linear-gradient(180deg, rgba(44, 36, 78, 0.95), rgba(24, 20, 44, 0.95)) !important;
    }
    .teaching-card, .teaching-panel fieldset {
      background: linear-gradient(180deg, rgba(60, 49, 98, 0.72), rgba(30, 25, 56, 0.72)) !important;
      border-color: rgba(255, 134, 189, 0.2) !important;
    }
    .teaching-panel button {
      background: linear-gradient(160deg, rgba(255, 134, 189, 0.24), rgba(140, 123, 255, 0.16)) !important;
      border-color: rgba(255, 134, 189, 0.35) !important;
      color: #ffe6f2 !important;
    }
    .teaching-panel [role='tablist'] [aria-selected='true'] {
      background: linear-gradient(160deg, rgba(255, 134, 189, 0.36), rgba(140, 123, 255, 0.24)) !important;
    }
    .teaching-narration { border-left-color: var(--v2-accent) !important; }
    .topbar { background: linear-gradient(180deg, rgba(40, 32, 70, 0.95), rgba(26, 22, 48, 0.9)) !important; }
    .teaching-panel h2, .teaching-panel h3, .teaching-panel h4 { color: #ffeaf4 !important; }
    .teaching-panel p, .teaching-panel small, .teaching-panel label, .teaching-panel legend { color: #e7dcff !important; }
    .teaching-panel select, .teaching-panel input { background: rgba(20, 16, 40, .7) !important; color: #ffeaf4 !important; }
    .teaching-card[data-kp-layer] { border-left-color: rgba(255, 134, 189, .45) !important; }
  `,
};

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

try {
  for (const [name, css] of Object.entries(VARIANTS)) {
    await page.goto(base + '/?quality=3', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('boot-screen').waitFor({ state: 'hidden', timeout: 120000 });
    await page.waitForTimeout(1200);
    await page.getByTestId('teaching-entry').click();
    await page.locator('[data-teaching-panel]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(700);
    if (css) await page.addStyleTag({ content: css });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/${name}.png` });
  }
  console.log(JSON.stringify({ ok: true, variants: Object.keys(VARIANTS), errors }));
} catch (error) {
  await page.screenshot({ path: out + '/failure.png' }).catch(() => {});
  console.error('FAILED', error.message, errors);
  process.exit(1);
} finally {
  await browser.close();
}
