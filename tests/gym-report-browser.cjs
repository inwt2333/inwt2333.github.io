// Start a static server, then run with PLAYWRIGHT_MODULE if needed.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const base = process.env.GYM_TEST_URL || 'http://127.0.0.1:8198/gym/';
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Analysis must work even on a device without 3D support.
    await page.route('**/room.mjs*', route => route.abort());
    await page.goto(`${base}#calendar`);
    await page.waitForSelector('#report-title');
    assert.match(await page.locator('.report-kicker').innerText(), /2026-11-05/);
    assert.match(await page.locator('.daily-report').innerText(), /13组/);
    assert.match(await page.locator('.daily-report').innerText(), /先把推举做稳/);
    await page.locator('[data-day="2026-11-03"]').click();
    assert.match(await page.locator('.report-kicker').innerText(), /2026-11-03/);
    await page.locator('[data-month="-1"]').click();
    assert.equal(await page.locator('.daily-report').count(), 0);
    await page.locator('[data-day="2026-10-22"]').click();
    assert.match(await page.locator('.daily-report').innerText(), /暂无同动作/);
    await page.locator('[data-month="1"]').click();
    await page.locator('[data-day="2026-11-05"]').click();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(await page.locator('.daily-report').evaluate(el => el.scrollWidth <= el.clientWidth + 1), `report overflow at ${width}`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    await page.locator('#detail-content [data-new]').click();
    await page.locator('#entry-form input[name="date"]').fill('2026-11-06');
    await page.locator('#entry-form input[name="weight"]').fill('27');
    await page.locator('#entry-form input[name="reps"]').fill('12');
    await page.locator('#entry-form input[name="sets"]').fill('2');
    await page.locator('#entry-form textarea').fill('<img src=x onerror=alert(1)>');
    await page.locator('#entry-form button[type="submit"]').click();
    assert.match(await page.locator('.report-kicker').innerText(), /2026-11-06/);
    assert.match(await page.locator('.report-stats').innerText(), /2组/);
    assert.equal(await page.locator('.daily-report img').count(), 0);
    await page.reload();
    await page.waitForSelector('#report-title');
    assert.match(await page.locator('.report-kicker').innerText(), /2026-11-06/);
    await page.locator('[data-delete]').click();
    assert.match(await page.locator('.daily-report').innerText(), /这天还没有训练记录/);
    assert.deepEqual(errors, []);
    console.log('PASS daily report: historical dates, month navigation, responsive layout, local save / reload / deletion, escaped notes, 3D fallback');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
