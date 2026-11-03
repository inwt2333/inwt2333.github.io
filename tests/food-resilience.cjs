const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.SITE_TEST_URL || 'http://127.0.0.1:8765';
const data = JSON.parse(fs.readFileSync('food.json', 'utf8'));
(async () => {
    for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
        const browser = await engine.launch();
        try {
            const page = await browser.newPage({ reducedMotion: 'reduce' });
            const errors = [];
            page.on('pageerror', e => errors.push(e.message));
            await page.clock.install();
            await page.route('**/food.json', r => r.fulfill({ status: 500 }));
            await page.goto(origin + '/food.html');
            await page.locator('.board-retry').waitFor();
            await page.route('**/food.json', r => r.fulfill({ json: data }));
            await page.locator('.board-retry').click();
            await page.locator('.memory').first().waitFor();
            await page.locator('.memory').first().focus();
            await page.evaluate(() => { window.originalMemory = document.activeElement; });
            await page.clock.runFor(10001);
            assert.ok(await page.evaluate(() => originalMemory === document.activeElement && originalMemory.isConnected), 'unchanged polling preserves keyboard focus');
            await page.route('**/food.json', r => r.fulfill({ status: 500 }));
            await page.clock.runFor(10001);
            assert.ok(await page.evaluate(() => originalMemory.isConnected), 'failed polling preserves last board');
            await page.route('**/food/web/**', r => r.abort());
            await page.keyboard.press('Enter');
            await page.locator('.dish').first().click();
            await page.locator('#retry-photo').waitFor();
            await page.unroute('**/food/web/**');
            await page.locator('#retry-photo').click();
            await page.waitForFunction(() => !document.querySelector('#full-photo').hidden && document.querySelector('#full-photo').naturalWidth > 0);
            assert.equal(await page.locator('#photo-error').isVisible(), false);
            await page.keyboard.press('Escape');
            await page.keyboard.press('Escape');
            assert.ok(await page.evaluate(() => originalMemory === document.activeElement));
            const staticPage = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 320, height: 568 } });
            await staticPage.goto(origin + '/food.html');
            assert.equal(await staticPage.locator('.food-fallback img').count(), data.flatMap(meal => meal.photos).length);
            assert.ok(await staticPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
            assert.deepEqual(errors, []);
            console.log(`PASS ${name}: food index retry, unchanged/failed polling, original image retry, modal focus, static food records`);
        } finally { await browser.close(); }
    }
})().catch(e => { console.error(e); process.exitCode = 1; });
