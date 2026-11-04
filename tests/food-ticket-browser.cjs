const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const data = JSON.parse(fs.readFileSync('food.json', 'utf8'));
  const sample = data.flatMap(meal => meal.photos).slice(0, 4);
  assert.equal(sample.length, 4);
  const fixture = [
    {date:'2026-11-02', photos:[{...sample[0], location:'上海 · 夜市', lat:31.2, lng:121.5}]},
    {date:'2026-11-01', photos:[
      {...sample[1], location:'上海 · 夜市', lat:31.2, lng:121.5},
      {...sample[2], web:'food/web/missing-ticket-photo.webp', location:'成都 · 小馆', lat:null, lng:null}
    ]},
    {date:'2026-10-31', photos:[{...sample[3], location:'', lat:null, lng:null}]}
  ];
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/food.json', route => route.fulfill({json:fixture}));
    await page.goto('http://127.0.0.1:8199/food.html');
    await page.locator('#ticket-open:enabled').waitFor({timeout:3000});
    const title = await page.locator('.wall-sign h1').boundingBox();
    const board = await page.locator('#board').boundingBox();
    assert(title.x + title.width < board.x,'title stays to the left of the photo board');
    assert.match(await page.locator('#ticket-open').innerText(), /食味车票/);
    assert.equal(await page.locator('script[src*="leaflet"],link[href*="leaflet"]').count(),0);
    await page.locator('#ticket-open').click();
    await page.locator('#ticket-dialog[open]').waitFor();
    assert.equal(await page.locator('.ticket-stamp').count(),3);
    assert.equal(await page.locator('#ticket-station-name').innerText(),'上海 · 夜市');
    assert.equal(await page.locator('.ticket-photo-thumb').count(),2);
    const firstPhoto = await page.locator('#ticket-photo').getAttribute('src');
    await page.locator('.ticket-photo-thumb').last().click();
    assert.notEqual(await page.locator('#ticket-photo').getAttribute('src'),firstPhoto);
    await page.locator('#ticket-receipt').click();
    assert.equal(await page.locator('#receipt-date').innerText(),'2026.11.01');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id),'ticket-open');
    await page.locator('#ticket-open').click();
    await page.locator('#ticket-next').click();
    assert.equal(await page.locator('#ticket-station-name').innerText(),'成都 · 小馆');
    await page.locator('#ticket-photo-failed:visible').waitFor();
    await page.locator('#ticket-photo-open').click();
    assert.equal(await page.locator('#receipt-dialog').evaluate(dialog => dialog.open),true);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id),'ticket-open');
    await page.locator('#ticket-open').click();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('#ticket-station-name').innerText(),'上海 · 夜市');
    await page.locator('.ticket-stamp').last().click();
    assert.equal(await page.locator('#ticket-station-name').innerText(),'待补票');
    await page.locator('#ticket-receipt').click();
    assert.equal(await page.locator('#receipt-dialog').evaluate(dialog => dialog.open),true);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id),'ticket-open');
    await page.setViewportSize({width:390,height:844});
    await page.locator('#ticket-open').click();
    const beforeSwipe = await page.locator('#ticket-station-name').innerText();
    const panel = await page.locator('#ticket-panel').boundingBox();
    await page.mouse.move(panel.x + panel.width * .8,panel.y + panel.height * .5);
    await page.mouse.down();
    await page.mouse.move(panel.x + panel.width * .2,panel.y + panel.height * .5,{steps:6});
    await page.mouse.up();
    assert.notEqual(await page.locator('#ticket-station-name').innerText(),beforeSwipe);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
    await page.screenshot({path:'/tmp/food-ticket-mobile.png'});
    await page.setViewportSize({width:320,height:568});
    await page.locator('#ticket-receipt').scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
    await page.screenshot({path:'/tmp/food-ticket-narrow.png'});
    await page.keyboard.press('Escape');
    await page.route('**/food.json', route => route.fulfill({json:[]}));
    await page.reload();
    assert.equal(await page.locator('#ticket-open').isDisabled(),true);
    assert.deepEqual(errors,[]);
    console.log('PASS food tickets, stations, photos, receipt, keyboard, swipe, mobile, empty state');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
