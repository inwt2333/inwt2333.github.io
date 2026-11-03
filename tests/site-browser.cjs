// Run a local static server, then: NODE_PATH=<playwright packages> node tests/site-browser.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.SITE_TEST_URL || 'http://127.0.0.1:8765';

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext({ reducedMotion: 'reduce' });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('https://fonts.googleapis.com/**', route => route.abort());
        for (const width of [320, 390, 700, 1024, 1440]) {
            await page.setViewportSize({ width, height: 844 });
            await page.goto(origin, { waitUntil: 'domcontentloaded' });
            await page.waitForFunction(() => document.querySelector('.map').getAttribute('viewBox') !== null);
            const boxes = await page.locator('.station .ring').evaluateAll(nodes => nodes.map(node => {
                const r = node.getBoundingClientRect(); return { x: r.x, right: r.right };
            }));
            assert.ok(boxes.every(box => box.x >= 0 && box.right <= width), `station cropped at ${width}px`);
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
            await page.waitForFunction(() => document.querySelector('#sub-gallery').textContent.includes('张照片'));
            await page.evaluate(() => document.fonts.ready);
            assert.equal(await page.evaluate(() => {
                const gallery = document.querySelector('#sub-gallery').getBoundingClientRect();
                const food = document.querySelector('a.station[href="food.html"] .st-sub').getBoundingClientRect();
                return gallery.left < food.right && gallery.right > food.left && gallery.top < food.bottom && gallery.bottom > food.top;
            }), false, `gallery and food subtitles overlap at ${width}px`);
        }
        for (const [width, height] of [[1920, 600], [2560, 1080], [844, 390], [820, 1180]]) {
            await page.setViewportSize({ width, height });
            await page.goto(origin, { waitUntil: 'domcontentloaded' });
            const clipped = await page.locator('.station .ring').evaluateAll(nodes => nodes.some(node => {
                const r = node.getBoundingClientRect();
                return r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > document.documentElement.scrollHeight;
            }));
            assert.equal(clipped, false, `station clipped at ${width}×${height}`);
        }
        await page.goto(origin + '/gallery.html', { waitUntil: 'domcontentloaded' });
        const first = page.locator('.cell').first();
        await first.waitFor();
        await first.focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'lb-close');
        await page.keyboard.press('Shift+Tab');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'lb-dl');
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'lb-close');
        const before = await page.locator('#lb-count').textContent();
        await page.keyboard.press('ArrowRight');
        assert.notEqual(await page.locator('#lb-count').textContent(), before);
        await page.keyboard.press('Escape');
        assert.ok(await first.evaluate(node => node === document.activeElement));
        await page.locator('#btn-time').focus();
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator('#btn-place').getAttribute('aria-selected'), 'true');
        await page.route('**/photos.json', route => route.abort());
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.locator('#retry-photos').waitFor();
        assert.ok(!(await page.locator('#grid-empty').textContent()).includes('build.py'));
        await page.unroute('**/photos.json');
        await page.locator('#retry-photos').click();
        await page.locator('.cell').first().waitFor();
        const deniedStorage = await context.newPage();
        await deniedStorage.addInitScript(() => {
            Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('Unavailable', 'SecurityError'); } });
        });
        deniedStorage.on('pageerror', error => errors.push(error.message));
        await deniedStorage.goto(origin, { waitUntil: 'domcontentloaded' });
        await deniedStorage.locator('#theme-toggle').click();
        assert.ok(await deniedStorage.locator('html').getAttribute('data-theme'));
        // Simulate GitHub Pages serving 404.html at a nested missing address.
        await page.route('**/missing/deep/page', route => route.fulfill({ status: 404, contentType: 'text/html', body: fs.readFileSync('404.html', 'utf8') }));
        await page.goto(origin + '/missing/deep/page');
        assert.equal(await page.locator('.links .primary').evaluate(node => node.href), origin + '/');
        assert.ok((await page.locator('link[rel="stylesheet"]').evaluate(node => node.href)).startsWith(origin + '/assets/'));
        assert.deepEqual(errors, []);
        console.log('PASS: five home widths, gallery keyboard loop/restore/tabs, network recovery, storage denial, nested 404');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
