// Regression coverage for progressive entry and Safari/WebKit input recovery.
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const base = process.env.GYM_TEST_URL || 'http://127.0.0.1:8198/gym/';

(async () => {
  for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 1000, height: 700 }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        window.testHidden = true;
        Object.defineProperty(document, 'hidden', { get: () => window.testHidden, configurable: true });
        Element.prototype.setPointerCapture = () => { throw new DOMException('Capture unavailable', 'NotFoundError'); };
      });
      let releaseAssets;
      const holdAssets = new Promise(resolve => { releaseAssets = resolve; });
      await page.route(/\/(studio-small\.hdr|scenery\.webp|textures\/[^/]+|art\/[^/]+)$/, async route => {
        await holdAssets;
        await route.continue();
      });
      const start = Date.now();
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('#scene-loading').hidden, {}, { timeout: 30000 });
      assert.equal(await page.locator('#scene-fallback').isVisible(), false);
      console.log(`${name}: entered in ${Date.now() - start} ms while all scene images and HDR were held`);
      await page.evaluate(() => {
        window.testHidden = false;
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('focus'));
      });
      const before = await page.locator('canvas').first().screenshot();
      await page.mouse.move(450, 320);
      await page.mouse.down();
      await page.mouse.move(670, 365, { steps: 6 });
      await page.mouse.up();
      const rotated = await page.locator('canvas').first().screenshot();
      assert.equal(before.equals(rotated), false, 'drag must recover after hidden startup, even if pointer capture throws');
      // Key-only events cover Safari keyboard environments without event.code.
      await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true, cancelable: true })));
      await page.waitForTimeout(400);
      await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w', bubbles: true })));
      const walked = await page.locator('canvas').first().screenshot();
      assert.equal(rotated.equals(walked), false, 'key fallback must move the viewer');
      await page.mouse.wheel(0, -80);
      const wheeled = await page.locator('canvas').first().screenshot();
      assert.equal(walked.equals(wheeled), false, 'trackpad / wheel must move the viewer');
      releaseAssets();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(200);
      assert.deepEqual(errors, []);
      assert.equal(await page.title(), '训练馆 · Inwt');
      console.log(`PASS ${name}: progressive assets, hidden-tab recovery, drag, capture failure, keyboard fallback and wheel`);
    } finally { await browser.close(); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
