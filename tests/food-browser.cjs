// NODE_PATH=<bundled node_modules> node tests/food-browser.cjs
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
(async () => {
 const browser = await chromium.launch({headless:true});
 const out = path.join(os.tmpdir(), 'inwt-food-qa'); fs.mkdirSync(out,{recursive:true});
 try {
  const page = await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8199/food.html');
  await page.waitForFunction(()=>!document.querySelector('#board').textContent.includes('正在'));
  await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
  const sample = JSON.parse(fs.readFileSync('photos.json','utf8')).slice(0,3);
  const fixture = ['2026-11-03','2026-10-02','2026-09-01'].map((date,i)=>({id:date,date,title:i?'':'测试店名',note:'测试短记\n第二行',cover:sample[i].file,photos:sample.map(p=>({...p,date}))}));
  await page.route('**/food.json',route=>route.fulfill({json:fixture}));
  await page.reload();await page.waitForSelector('.memory');
  assert.equal(await page.locator('.memory').count(),3);
  for (const size of [{width:2560,height:1440},{width:3840,height:2160},{width:3440,height:1440}]) {
   await page.setViewportSize(size);
   const layout = await page.evaluate(() => {
    const scene = document.querySelector('.scene').getBoundingClientRect();
    const backdrop = getComputedStyle(document.body,'::before');
    return {width:scene.width,height:scene.height,background:backdrop.backgroundImage,position:backdrop.position,
     overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert(layout.width > 1920,'large displays must not retain the 1920px scene cap');
   assert(layout.height <= size.height+1,'wide screens keep all scene controls in view');
   assert.match(layout.background,/desktop\.webp/,'image fills remaining viewport around the proportional scene');
   assert.equal(layout.position,'fixed');
   assert.equal(layout.overflow,false);
   await page.screenshot({path:path.join(out,`wide-${size.width}.png`)});
  }
  for(const size of [{width:1440,height:900},{width:390,height:844},{width:320,height:568},{width:600,height:900},{width:768,height:1024}]) {
   await page.setViewportSize(size);
   await page.waitForFunction(expected=>document.querySelectorAll('.memory').length===expected,size.width<=600?2:3,{timeout:1500});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow');
   assert.equal(await page.evaluate(()=>{const b=document.querySelector('.board').getBoundingClientRect();return [...document.querySelectorAll('.memory')].every(p=>{const r=p.getBoundingClientRect();return r.left>=b.left-5&&r.right<=b.right+5&&r.top>=b.top-5&&r.bottom<=b.bottom+5})}),true,'photos remain inside board');
   if(size.width<=600){
    const mobile=await page.evaluate(()=>{const card=document.querySelector('.memory').getBoundingClientRect(),photo=document.querySelector('.memory img').getBoundingClientRect(),menu=document.querySelector('#menu-open').getBoundingClientRect(),menuAction=document.querySelector('.book-action').getBoundingClientRect(),ticket=document.querySelector('#ticket-open').getBoundingClientRect(),ticketAction=document.querySelector('#ticket-open em').getBoundingClientRect();return {photoShare:photo.width*photo.height/(card.width*card.height),menuInset:menu.bottom-menuAction.bottom,ticketInset:ticket.bottom-ticketAction.bottom,label:document.querySelector('#board-shuffle').getAttribute('aria-label')}});
    assert(mobile.photoShare>.6,'mobile wall should be led by food photography');
    assert(mobile.menuInset>=5 && mobile.ticketInset>=5,'bottom card actions need breathing room');
    assert.match(mobile.label,/两张/);
   }
   if(size.width===390) await page.screenshot({path:path.join(out,'mobile-fixture.png'),fullPage:true});
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('.memory').first().focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#receipt-dialog').evaluate(d=>d.open),true);
  await page.locator('.dish').first().click();
  await page.keyboard.press('ArrowRight');assert.match(await page.locator('#photo-caption').innerText(),/2 \/ 3/);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#receipt-dialog').evaluate(d=>d.open),true);
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('memory')),true,'focus returns to clicked photo');
  await page.locator('#menu-open').click();assert.equal(await page.locator('.archive-row').count(),3);
  const archivePhoto = await page.locator('.archive-row img').first().evaluate(img=>img.getBoundingClientRect().width);
  assert(archivePhoto>=80,'food book photos should be prominent on mobile');
  await page.screenshot({path:path.join(out,'menu-mobile.png'),fullPage:true});
  await page.locator('.archive-row').first().click();
  await page.screenshot({path:path.join(out,'receipt-fixture.png'),fullPage:true});
  await page.keyboard.press('Escape');await page.keyboard.press('Escape');
  await page.route('**/food.json',route=>route.fulfill({json:[]}));await page.reload();
  await page.waitForFunction(()=>document.querySelector('.board-message')?.textContent.includes('留一盏灯'));
  await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});
  await page.route('**/food.json',route=>route.fulfill({status:500}));await page.reload();
  await page.waitForFunction(()=>document.querySelector('.board-message')?.textContent.includes('暂未送达'));
  await page.goto('http://127.0.0.1:8199/upload?collection=food');
  assert.equal(await page.locator('#collection').inputValue(),'food');
  assert.deepEqual(errors,[]);
  console.log('PASS desktop/mobile layout, grouping UI, menus, viewer, keyboard focus, empty/error states, upload selection. Screenshots:',out);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
