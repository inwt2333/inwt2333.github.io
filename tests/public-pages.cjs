// Static server required. SITE_TEST_URL defaults to http://127.0.0.1:8765.
const playwright = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.SITE_TEST_URL || 'http://127.0.0.1:8765';

(async () => {
    const engine = process.env.SITE_TEST_ENGINE || 'chromium';
    const browser = await playwright[engine].launch({ headless: true });
    try {
        const context = await browser.newContext({ reducedMotion: 'reduce' });
        await context.route('https://fonts.googleapis.com/**', route => route.abort());
        await context.route('https://server.arcgisonline.com/**', route => route.abort());
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const posts = JSON.parse(fs.readFileSync('posts.json', 'utf8')).filter(post => post.category === 'essay');
        for (const [width, height] of [[320, 844], [390, 844], [768, 844], [1440, 900], [844, 390]]) {
            await page.setViewportSize({ width, height });
            for (const path of ['/about.html', '/gallery.html', '/friends.html', '/essays.html', ...posts.map(post => '/' + post.url)]) {
                await page.goto(origin + path, { waitUntil: 'domcontentloaded' });
                if (path === '/gallery.html') await page.locator('.cell').first().waitFor();
                if (path === '/essays.html') await page.locator('.book').first().waitFor();
                assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `horizontal overflow at ${width}: ${path}`);
            }
        }
        await page.goto(origin + '/about.html');
        assert.equal(await page.locator('.line-card[href="gym/"]').count(), 1);
        assert.equal(await page.locator('.line-card[href*="ai-learning"]').count(), 0);
        await page.evaluate(() => localStorage.setItem('theme', 'light'));
        await page.reload();
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
        assert.equal(await page.locator('body').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(242, 242, 245)');
        await page.locator('#theme-toggle').click();
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
        await page.reload();
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
        const noStorage = await context.newPage();
        noStorage.on('pageerror', error => errors.push(error.message));
        await noStorage.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Unavailable', 'SecurityError'); } }); });
        await noStorage.goto(origin + '/about.html');
        await noStorage.locator('#theme-toggle').click();
        assert.ok(await noStorage.locator('html').getAttribute('data-theme'));
        await noStorage.close();

        // Use actual photo assets with incomplete/invalid and valid GPS pairs.
        const photos = JSON.parse(fs.readFileSync('photos.json', 'utf8')).slice(0, 4).map((photo, i) => ({ ...photo, lat: [31, null, 38, 39][i], lng: [null, 121, 110, 111][i] }));
        await page.route('**/photos.json', route => route.fulfill({ json: photos }));
        await page.route('**/photos/web/**', route => route.abort());
        await page.goto(origin + '/gallery.html');
        await page.locator('.cell').first().waitFor();
        // An image network error must be recoverable without navigating away.
        await page.locator('.cell').first().focus();
        await page.keyboard.press('Enter');
        await page.locator('#lb-retry').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#lb-map').isVisible(), false);
        await page.unroute('**/photos/web/**');
        await page.locator('#lb-retry').click();
        await page.waitForFunction(() => !document.querySelector('#lb-img').hidden && document.querySelector('#lb-img').complete);
        assert.equal(await page.locator('#lb-image-status').isVisible(), false);
        await page.keyboard.press('Escape');

        await page.locator('#btn-map').click();
        await page.waitForFunction(() => typeof markers !== 'undefined' && markers.filter(Boolean).length === 2);
        await page.locator('#map-notice').waitFor({ state: 'visible' });
        let tileRetries = 0;
        await page.route('https://server.arcgisonline.com/**', route => {
            tileRetries++;
            return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPioAAAAASUVORK5CYII=', 'base64') });
        });
        await page.locator('#retry-map').click();
        await page.waitForFunction(() => document.querySelectorAll('.leaflet-tile-loaded').length > 0);
        assert.ok(tileRetries > 0, 'retry must request the tiles again');
        assert.equal(await page.locator('#map-notice').isVisible(), false);
        await page.evaluate(() => { map.setView([38, 110], 15, { animate: false }); markers[2].openPopup(); });
        const popupPhoto = page.locator('.ph-pop-thumb');
        await popupPhoto.waitFor();
        await popupPhoto.focus();
        await page.keyboard.press('Enter');
        await page.locator('#lightbox').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#lb-count').textContent(), '03 / 04');
        await page.keyboard.press('Escape');
        assert.equal(await popupPhoto.evaluate(node => node === document.activeElement), true);

        // Leaving the map stops the replay rather than running a hidden tour.
        await page.locator('#replay-btn').click();
        await page.locator('#btn-grid').click();
        assert.equal(await page.evaluate(() => replaying), false);

        const noMap = await context.newPage();
        noMap.on('pageerror', error => errors.push(error.message));
        await noMap.route('**/assets/vendor/leaflet*.js', route => route.abort());
        await noMap.goto(origin + '/gallery.html');
        await noMap.locator('#btn-map').click();
        await noMap.locator('.map-message').waitFor();
        await noMap.locator('#btn-grid').click();
        await noMap.locator('.cell').first().waitFor();
        await noMap.close();

        // Query-mode articles must keep wide data/code and long URLs readable.
        const table = '| ' + ['A', 'B', 'C', 'D', 'E', 'F'].join(' | ') + ' |\n| ' + Array(6).fill('---').join(' | ') + ' |\n| ' + Array(6).fill('A_long_unbroken_cell_value').join(' | ') + ' |';
        const markdown = ['## First', 'x'.repeat(250), table, '```\n' + 'code '.repeat(100) + '\n```', '## Second', ...Array(30).fill('A paragraph of readable text. '.repeat(15)), '## Third'].join('\n\n');
        await page.route('**/posts/layout-fixture.md', route => route.fulfill({ body: markdown, contentType: 'text/plain' }));
        await page.setViewportSize({ width: 320, height: 844 });
        await page.goto(origin + '/article.html?file=layout-fixture.md&title=Layout');
        await page.locator('.table-scroll').waitFor();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'article data overflow');
        assert.ok(await page.locator('.markdown-body pre').evaluate(node => node.scrollWidth > node.clientWidth), 'code keeps its own scrolling');
        await page.evaluate(() => scrollTo(0, 1000));
        await page.waitForFunction(() => parseFloat(document.querySelector('#progress').style.width) > 0);
        const progress = await page.locator('#progress').evaluate(node => parseFloat(node.style.width));
        await page.evaluate(() => {
            const lateMedia = document.createElement('div');
            lateMedia.style.height = '3000px';
            document.querySelector('#content').append(lateMedia);
        });
        await page.waitForFunction(before => parseFloat(document.querySelector('#progress').style.width) < before, progress);
        await page.route('**/posts/layout-fixture.md', route => route.abort());
        await page.reload();
        await page.locator('#retry-article').waitFor();
        assert.notEqual(await page.locator('#title-placeholder').textContent(), '加载中...');
        await page.unroute('**/posts/layout-fixture.md');
        await page.route('**/posts/layout-fixture.md', route => route.fulfill({ body: markdown, contentType: 'text/plain' }));
        await page.locator('#retry-article').click();
        await page.locator('.table-scroll').waitFor();
        await page.goto(origin + '/article.html');
        assert.equal(await page.title(), '未找到这篇文章 · Inwt');
        assert.equal(await page.locator('.article-error a').evaluate(node => node.pathname), '/essays.html');
        assert.deepEqual(errors, []);
        console.log(`PASS ${engine}: five public viewport layouts including all ${posts.length} articles, photo recovery, incomplete GPS, keyboard map popup, replay cancellation, missing map fallback, article overflow and late layout progress`);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
