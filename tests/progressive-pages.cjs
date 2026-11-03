const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.SITE_TEST_URL || 'http://127.0.0.1:8765';
const posts = JSON.parse(fs.readFileSync('posts.json', 'utf8')).filter(p => p.category === 'essay');
const photos = JSON.parse(fs.readFileSync('photos.json', 'utf8'));

(async () => {
    for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
        const browser = await engine.launch();
        try {
            const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce' });
            await context.route('https://fonts.googleapis.com/**', r => r.abort());
            const page = await context.newPage();
            for (const [width, height] of [[320, 568], [390, 844], [844, 390], [1440, 900]]) {
                await page.setViewportSize({ width, height });
                await page.goto(origin);
                assert.equal(await page.locator('.plain-navigation a').count(), 8);
                for (const link of await page.locator('.plain-navigation a').all()) assert.ok(await link.isVisible());
                await page.goto(origin + '/essays.html');
                assert.equal(await page.locator('.library-fallback li').count(), posts.length);
                await page.locator('.library-fallback a').first().click();
                assert.ok((await page.locator('#content').textContent()).length > 200);
                await page.goto(origin + '/gallery.html');
                assert.equal(await page.locator('.photo-fallback-grid a').count(), photos.length);
                assert.ok(await page.locator('.photo-fallback').isVisible());
                assert.equal(await page.locator('#segmented').isVisible(), false);
                assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
                await page.goto(origin + '/404.html');
                const panel = await page.locator('.panel').boundingBox();
                const footer = await page.locator('footer').boundingBox();
                assert.ok(panel.y >= 0 && footer.y >= panel.y + panel.height, 'short-screen 404 must remain scrollable');
            }
            await page.goto(origin + '/gym/');
            assert.ok((await page.locator('body').innerText()).includes('需要启用 JavaScript'));
            const live = await browser.newPage({ reducedMotion: 'reduce' });
            await live.route('**/posts.json', r => r.abort());
            await live.goto(origin + '/essays.html');
            await live.locator('.state button').waitFor();
            assert.equal(await live.locator('.library-fallback li').count(), posts.length);
            await live.unroute('**/posts.json');
            await live.locator('.state button').click();
            await live.locator('.book').first().waitFor();
            await live.route('**/photos.json', r => r.abort());
            await live.goto(origin + '/gallery.html');
            await live.locator('#retry-photos').waitFor();
            assert.ok(await live.locator('.photo-fallback').isVisible());
            console.log(`PASS ${name}: no-script navigation, ${posts.length} static essays, ${photos.length} photo links, short-screen 404, index failure and retry`);
        } finally { await browser.close(); }
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
