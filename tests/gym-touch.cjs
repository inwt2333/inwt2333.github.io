// Run against the same static server as gym-browser.cjs.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await page.goto(process.env.GYM_TEST_URL || 'http://127.0.0.1:8198/gym/');
    await page.waitForFunction(() => document.querySelector('#scene-loading').hidden, {}, { timeout: 90000 });
    assert.equal(await page.locator('#scene-fallback').isVisible(), false);
    await page.touchscreen.tap(220, 400);
    await page.waitForFunction(() => !document.querySelector('#interaction-caption').hidden);
    assert.match(await page.locator('#interaction-text').innerText(), /腹肌/);
    assert.equal(await page.locator('#detail-dialog').evaluate(d => d.open), false);
    await page.touchscreen.tap(220, 400);
    await page.waitForSelector('#detail-dialog[open]');
    assert.match(await page.locator('#detail-title').innerText(), /腹肌/);
    await page.locator('#close-detail').tap();
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 80 }] });
    await page.waitForTimeout(900);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForSelector('#menu-dialog[open]');
    await page.locator('#reset-view').tap();
    assert.equal(await page.locator('#interaction-caption').isVisible(), false);
    console.log('PASS: real touch selects equipment, second tap opens records, long press opens menu, reset clears selection');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
