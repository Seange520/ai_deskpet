// =============================================================================
// SparkMate / ai_deskpet · Playwright E2E
// 文件：tests/e2e.spec.js
// 运行：npx playwright test tests/e2e.spec.js --reporter=html
// =============================================================================
// 定位策略：全部使用 getByRole / getByLabel 等可访问性语义定位，
//           不使用动态 class 的 CSS 选择器（效果断言读取 computed style 与
//           布局几何，同样不依赖任何 class 名）。
//
// 与仓库自带 playwright.config.js 配套：
//   baseURL = http://127.0.0.1:5173，channel = chrome（用本机 Chrome），
//   reducedMotion = 'reduce'（CSS 过渡被禁用，拆解效果瞬时生效，断言更稳定）。
//
// 重要事实：本项目没有 URL 路由（App.jsx 用 useState('dashboard'|'hardware'|'code')
// 切换页面，navigate() 只调用 window.scrollTo）。因此“路由跳转”断言的是视图切换
// 与主导航 aria-current 状态，而不是 URL 变化。
// =============================================================================

import { test, expect } from './quality-fixture';

// 首页“你的创造路线”三张核心卡片（学习路径顺序）
const CORE_CARDS = ['准备物料', '动手实操', 'AI 觉醒'];

// 只放行与业务无关的浏览器噪音（如缺失 favicon 的 404），其余一律判定失败
const IGNORED_CONSOLE_ERRORS = [/favicon\.ico/i];

// ---------------------------------------------------------------------------
// 控制台报错监听：贯穿每一条用例（beforeEach 挂监听，afterEach 统一断言）
// 规则：运行期间浏览器 console 出现 error 或未捕获异常 → 该用例直接失败
// ---------------------------------------------------------------------------
let consoleErrors = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    const url = msg.location()?.url || '';
    if (IGNORED_CONSOLE_ERRORS.some((re) => re.test(text) || re.test(url))) return;
    consoleErrors.push(`[console.error] ${text}${url ? `  ← ${url}` : ''}`);
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`[pageerror] ${err.message}`);
  });
});

test.afterEach(async ({ page }, testInfo) => {
  // 即便某条用例已因断言失败提前退出，这里也能把控制台报错记录下来
  expect(
    consoleErrors,
    `用例「${testInfo.title}」运行期间浏览器控制台出现 error：\n${consoleErrors.join('\n')}`,
  ).toEqual([]);
});

// -------------------------------- 工具函数 ---------------------------------

/** 首页三张核心卡片（TiltCard 渲染为 <article>） */
function coreCards(page) {
  return page.getByRole('article');
}

/** 按标题定位某一张核心卡片 */
function cardByTitle(page, title) {
  return page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
}

/** 通过主导航进入硬件实验室（语义定位：按钮的可访问名即页面名） */
async function openHardwareLab(page) {
  await page.getByRole('button', { name: '硬件实验室', exact: true }).click();
  await expect(page.getByRole('heading', { name: /认识它/ })).toBeVisible();
}

/**
 * 爆炸图三个部件的语义定位。
 * 组件里 Board / Pet / Microphone 三个 SVG 都带有 role="img" + aria-label，
 * 因此无需依赖 .assembly-board / .assembly-screen 这类 class。
 */
function explodeParts(page) {
  return {
    '开发板「ESP32-S3」': page.getByRole('img', { name: 'ESP32-S3 开发板示意图' }),
    '表情屏「桌宠表情」': page.getByRole('img', { name: /桌宠表情/ }),
    '麦克风「数字麦克风模块」': page.getByRole('img', { name: '数字麦克风模块示意图' }),
  };
}

/**
 * 采集某个元素及其最近 4 层祖先的“样式指纹”：
 *   - getBoundingClientRect()：3D 投影后元素在视口中的实际位置与尺寸
 *     （拆解用 translateZ + perspective 实现，投影后尺寸/位置必然改变）
 *   - computed style：transform / translate / scale / rotate / opacity / filter / perspective
 * 只读渲染结果，不碰 class 选择器，因此可同时担保“样式生效”与“没靠 class 假动”。
 */
async function styleSignature(locator) {
  return locator.evaluate((el) => {
    const props = ['transform', 'translate', 'scale', 'rotate', 'opacity', 'filter', 'perspective'];
    const chain = [];
    let node = el;
    for (let depth = 0; node && depth < 4; depth += 1, node = node.parentElement) {
      const cs = getComputedStyle(node);
      const r = node.getBoundingClientRect();
      chain.push({
        depth,
        rect: [r.x, r.y, r.width, r.height].map((v) => Number(v.toFixed(2))),
        style: props.map((p) => `${p}=${cs[p]}`).join(';'),
      });
    }
    return chain;
  });
}

/** 三个部件一起取指纹：{ 部件名: 指纹 } */
async function snapshotParts(parts) {
  const entries = await Promise.all(
    Object.entries(parts).map(async ([name, locator]) => [name, await styleSignature(locator)]),
  );
  return Object.fromEntries(entries);
}

// ============================ 场景 1：首页渲染 ==============================
test('首页渲染：三个核心卡片都存在且可见', async ({ page }) => {
  await page.goto('/');

  // 页面级断言：首页主标题可见
  await expect(page.getByRole('heading', { name: /每个伟大的创造/ })).toBeVisible();

  // 三张核心卡片：数量、可见性、标题、操作按钮
  await expect(coreCards(page)).toHaveCount(3);

  for (const title of CORE_CARDS) {
    const card = cardByTitle(page, title);
    await expect(card, `首页应存在标题为「${title}」的核心卡片`).toHaveCount(1);
    await expect(card, `核心卡片「${title}」应可见`).toBeVisible();
    await expect(
      card.getByRole('heading', { name: title, exact: true }),
      `核心卡片「${title}」的标题应可见`,
    ).toBeVisible();
    await expect(
      card.getByRole('button'),
      `核心卡片「${title}」应带有一个可交互操作按钮`,
    ).toHaveCount(1);
  }

  // 卡片顺序 = 学习路径顺序
  const cardHeadings = await coreCards(page).getByRole('heading', { level: 3 }).allInnerTexts();
  expect(cardHeadings.map((t) => t.trim())).toEqual(CORE_CARDS);
});

// ============================ 场景 2：路由跳转 ==============================
test('路由跳转：点击「动手实操」卡片后切换到硬件实验室', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /每个伟大的创造/ })).toBeVisible();

  // 「动手实操」卡片内的操作按钮（首页顺序为 LEVEL 02）
  const handsOnCard = cardByTitle(page, '动手实操');
  await expect(handsOnCard).toBeVisible();

  const startButton = handsOnCard.getByRole('button', { name: /开始探索|再次探索/ });
  await expect(startButton, '「动手实操」卡片上应有「开始探索」按钮').toBeVisible();

  const urlBefore = page.url();
  await startButton.click();

  // 断言 1：视图已切换 —— 硬件实验室标题出现，首页标题消失
  await expect(
    page.getByRole('heading', { name: /认识它/ }),
    '点击「动手实操」后应进入硬件实验室（标题：认识它，然后连接它。）',
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: /每个伟大的创造/ })).toBeHidden();

  // 断言 2：主导航状态同步（选中的导航项带 aria-current="page"），
  //         这是本项目“路由”的真实状态表达（无 URL 路由）
  await expect(
    page.getByRole('button', { name: '硬件实验室', exact: true }),
    '切换后主导航「硬件实验室」应处于选中态',
  ).toHaveAttribute('aria-current', 'page');

  // 回归保护：本项目不用 URL 路由，页面地址不应被改成另一个 URL
  expect(page.url(), '本项目为单页状态路由，跳转不应改写 URL').toBe(urlBefore);
});

// ============================ 场景 3：爆炸图交互 ============================
test('爆炸图交互：点击「拆解」后元素样式发生变化', async ({ page }) => {
  await page.goto('/');
  await openHardwareLab(page);

  const explodeButton = page.getByRole('button', { name: '拆解', exact: true });
  await expect(explodeButton, '硬件实验室应存在「拆解」按钮').toBeVisible();

  const parts = explodeParts(page);
  for (const [name, locator] of Object.entries(parts)) {
    await expect(locator, `爆炸图部件 ${name} 应可见`).toBeVisible();
  }

  // 拆解前：记录三个部件的几何与计算样式
  const before = await snapshotParts(parts);

  await explodeButton.click();

  // 断言 1：按钮进入展开态（语义状态：文案 拆解 → 合拢）
  await expect(
    page.getByRole('button', { name: '合拢', exact: true }),
    '点击后「拆解」按钮应切换为「合拢」',
  ).toBeVisible();

  // 断言 2：样式真正生效（等待过渡/3D 投影落点）
  await expect
    .poll(async () => JSON.stringify(await snapshotParts(parts)), {
      message: '点击「拆解」后爆炸图元素样式未发生任何变化',
      timeout: 5000,
    })
    .not.toBe(JSON.stringify(before));

  // 断言 3：逐个部件校验 —— 每个部件的几何或计算样式都必须变化
  const after = await snapshotParts(parts);
  for (const name of Object.keys(parts)) {
    expect(after[name], `「${name}」在拆解后位置/尺寸或 transform 应发生变化`).not.toEqual(
      before[name],
    );
  }

  // 断言 4：再次点击「合拢」应恢复原始样式（确认是可逆交互，不是一次性脏状态）
  await page.getByRole('button', { name: '合拢', exact: true }).click();
  await expect(page.getByRole('button', { name: '拆解', exact: true })).toBeVisible();
  await expect
    .poll(async () => JSON.stringify(await snapshotParts(parts)), {
      message: '点击「合拢」后爆炸图未恢复到拆解前的样式',
      timeout: 5000,
    })
    .toBe(JSON.stringify(before));
});

// ========================= 场景 4：控制台报错监听 ==========================
test('控制台监听：完整走查首页 → 物料弹窗 → 拆解 → 代码工坊，全程零 console error', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /每个伟大的创造/ })).toBeVisible();

  // 打开并关闭物料清单弹窗
  await page.getByRole('button', { name: '查看物料清单' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog, '物料清单弹窗应打开').toBeVisible();
  await page.getByRole('button', { name: '关闭弹窗' }).press('Escape');
  await expect(dialog, '按 Esc 后物料清单弹窗应关闭').toBeHidden();

  // 硬件实验室：拆解 / 合拢
  await openHardwareLab(page);
  await page.getByRole('button', { name: '拆解', exact: true }).click();
  await expect(page.getByRole('button', { name: '合拢', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '合拢', exact: true }).click();

  // 代码魔改工坊
  await page.getByRole('button', { name: '代码魔改工坊', exact: true }).click();
  await expect(page.getByRole('button', { name: '代码魔改工坊', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );

  // 回到首页
  await page.getByRole('button', { name: '学习仪表盘', exact: true }).click();
  await expect(page.getByRole('heading', { name: /每个伟大的创造/ })).toBeVisible();

  // afterEach 会统一断言；这里再显式断言一次，失败信息更直观
  expect(consoleErrors, `控制台出现 error：\n${consoleErrors.join('\n')}`).toEqual([]);
});
