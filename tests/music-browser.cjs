// Run with NODE_PATH pointing to the bundled Playwright installation.
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const repo = path.resolve(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'inwt-music-test-'));
const reports = path.join(repo, 'tools/reports/music');
fs.mkdirSync(reports, {recursive:true});
for (const name of ['assets/music', 'assets/fonts', 'tools/music-editor.html']) {
  const destination = path.join(temporary, name);
  fs.mkdirSync(path.dirname(destination), {recursive:true});
  fs.cpSync(path.join(repo, name), destination, {recursive:true});
}
const script = `import sys,serve;from music_build import build_music;serve.ROOT=sys.argv[1];serve.SRC_DIR=serve.ROOT+'/photos/src';build_music(serve.ROOT);server=serve.ThreadingHTTPServer(('127.0.0.1',0),serve.Handler);print('MUSIC_PORT='+str(server.server_port),flush=True);server.serve_forever()`;
const python = process.env.MUSIC_TEST_PYTHON || path.join(repo,'.venv/Scripts/python.exe');
const server = spawn(python, ['-u','-c',script,temporary], {cwd:repo,env:{...process.env,PYTHONUTF8:'1'},windowsHide:true});
let stderr = '';server.stderr.on('data', chunk => {stderr+=chunk;});
const ready = new Promise((resolve,reject) => {
  const timeout=setTimeout(()=>reject(Error('server timeout '+stderr)),15000);
  server.on('exit',code=>{clearTimeout(timeout);reject(Error('server exited '+code+' '+stderr));});
  server.stdout.on('data',chunk=>{const m=String(chunk).match(/MUSIC_PORT=(\d+)/);if(m){clearTimeout(timeout);resolve('http://127.0.0.1:'+m[1]);}});
});
(async()=>{
  let browser;
  try {
    const base = await ready;
    browser = await chromium.launch({headless:true});
    const page = await browser.newPage({reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    for(const asset of ['classical-room-mobile.webp','chinese-room.webp','chinese-room-mobile.webp']) {
      assert.equal((await page.request.get(base+'/assets/music/'+asset)).status(),200,asset+' should be served');
    }
    for(const width of [1440,1024,390,320]) {
      await page.setViewportSize({width,height:900});
      for(const route of ['', 'classical/', 'chinese/', 'western/', 'japanese/', 'roaming/']) {
        const response=await page.goto(base+'/music/'+route);assert.equal(response.status(),200);
        await page.evaluate(()=>document.fonts.ready);
        if(!route) assert.equal(await page.locator('.room-doors .door').count(),5,'门厅应展示五间听音室');
        if(route==='classical/' && width<=760) assert.match(await page.locator('.room-background').evaluate(el=>getComputedStyle(el).backgroundImage),/classical-room-mobile\.webp/);
        if(route==='chinese/') assert.match(await page.locator('.room-background').evaluate(el=>getComputedStyle(el).backgroundImage),width<=760?/chinese-room-mobile\.webp/:/chinese-room\.webp/);
        assert.equal(await page.locator('.home-link').getAttribute('href'),route?'/music/':'/index.html','左上角应返回直接上级页面');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route+' overflow '+width);
      }
    }
    await page.goto(base+'/music/western/');
    await page.locator('.home-link').click();
    assert.equal(new URL(page.url()).pathname,'/music/','欧美页面左上角应返回留声室');
    await page.setViewportSize({width:1440,height:960});
    await page.goto(base+'/music/classical/');
    await page.screenshot({path:path.join(reports,'classical-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:path.join(reports,'classical-mobile.png'),fullPage:true});
    await page.locator('.room-menu').click();await page.locator('#room-nav a[data-nav=japanese]').click();assert.ok(page.url().endsWith('/music/japanese/'));
    await page.locator('.room-menu').click();await page.locator('#room-nav a[data-nav=roaming]').click();assert.ok(page.url().endsWith('/music/roaming/'));
    assert.equal((await page.request.get(base+'/api/music-edit')).status(),200);
    assert.equal((await page.request.post(base+'/api/music-edit',{data:{}})).status(),409);
    await page.goto(base+'/music-edit');await page.locator('#editor').waitFor({state:'visible'});
    await page.route('**/api/music-recognize',route=>route.fulfill({json:{sourceId:'186016',title:'晴天',artist:'周杰伦',album:'叶惠美',url:'https://music.163.com/song?id=186016',cover:'',duration:269}}));
    await page.locator('#share').fill('https://music.163.com/song?id=186016');await page.locator('#share').dispatchEvent('paste');
    await page.waitForFunction(()=>document.getElementById('title').value==='晴天');
    await page.locator('#room').selectOption('roaming');
    assert.equal(await page.locator('#room-preview').getAttribute('href'),'/music/roaming/');
    await page.locator('#room').selectOption('chinese');
    await page.locator('#note').fill('第一段听后记。\n<script>window.musicInjected=true</script>');
    await page.locator('#excerpt').fill('想收藏的一小段旋律。\n再听一遍，仍然喜欢。');
    await page.locator('details summary').click();
    await page.locator('#playbackSourceId').fill('https://music.163.com/song?id=573579809');
    await page.locator('#tags').fill('华语, 夜晚');await page.locator('#featured').check();
    await page.locator('#save').click();await page.waitForFunction(()=>document.getElementById('save-status').textContent.startsWith('已保存'));
    let state=await (await page.request.get(base+'/api/music-edit')).json();assert.equal(state.tracks.length,1);assert.equal(state.tracks[0].album,'叶惠美');assert.equal(state.tracks[0].excerpt,'想收藏的一小段旋律。\n再听一遍，仍然喜欢。');assert.equal(state.tracks[0].playbackSourceId,'573579809');
    const publicPage=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'});
    await publicPage.goto(base+'/music/chinese/');await publicPage.waitForFunction(()=>document.getElementById('track-title').textContent==='晴天');
    const desktopExcerpt=await publicPage.evaluate(()=>{const box=s=>document.querySelector(s).getBoundingClientRect();return {excerpt:box('.excerpt-section').toJSON(),story:box('.record-story').toJSON(),anchor:box('.shelf-anchor').toJSON(),scene:box('.listening-scene').toJSON(),collection:box('.collection').toJSON()};});
    assert.ok(Math.abs(desktopExcerpt.excerpt.left-desktopExcerpt.scene.left)<2 && Math.abs(desktopExcerpt.excerpt.right-desktopExcerpt.scene.right)<2 && Math.abs(desktopExcerpt.excerpt.bottom-desktopExcerpt.scene.bottom)<2,'宽屏歌词带应占据唱片画面底部整行');
    assert.ok(desktopExcerpt.excerpt.top>desktopExcerpt.story.bottom && desktopExcerpt.anchor.top>=desktopExcerpt.excerpt.top && desktopExcerpt.anchor.bottom<=desktopExcerpt.excerpt.bottom,'歌词带不应遮挡正文，下翻按钮应在歌词带内');
    assert.ok(Math.abs(desktopExcerpt.collection.top-desktopExcerpt.scene.bottom)<2,'宽屏不应为摘录留下额外的空白段落');
    assert.equal(await publicPage.locator('#embedded-player').isVisible(),true);
    assert.match(await publicPage.locator('#netease-player').getAttribute('src'),/music\.163\.com\/outchain\/player\?type=2&id=573579809&auto=0/);
    assert.equal(await publicPage.locator('#listen-link').isVisible(),true);
    assert.equal(await publicPage.locator('#listen-link').getAttribute('href'),'https://music.163.com/song?id=186016');
    assert.match(await publicPage.locator('#listen-link').textContent(),/另一发行版/);
    assert.match(await publicPage.locator('#track-note').textContent(),/<script>/);assert.equal(await publicPage.evaluate(()=>window.musicInjected),undefined);
    assert.equal(await publicPage.locator('#track-excerpt').textContent(),'想收藏的一小段旋律。');
    assert.equal(await publicPage.locator('#excerpt-progress').textContent(),'01 / 02');
    await publicPage.locator('#excerpt-next').click();assert.equal(await publicPage.locator('#track-excerpt').textContent(),'再听一遍，仍然喜欢。');
    await publicPage.locator('#excerpt-prev').click();assert.equal(await publicPage.locator('#track-excerpt').textContent(),'想收藏的一小段旋律。');
    const autoplayPage=await browser.newPage({viewport:{width:1440,height:960}});
    await autoplayPage.addInitScript(()=>{const native=window.setInterval.bind(window);window.setInterval=(fn,delay,...args)=>native(fn,delay===8000?160:delay,...args);});
    await autoplayPage.goto(base+'/music/chinese/');
    await autoplayPage.waitForFunction(()=>document.getElementById('excerpt-progress').textContent==='02 / 02');
    await autoplayPage.locator('.excerpt-section').hover();
    const pausedLine=await autoplayPage.locator('#track-excerpt').textContent();
    await autoplayPage.waitForTimeout(400);
    assert.equal(await autoplayPage.locator('#track-excerpt').textContent(),pausedLine,'悬停时歌词轮播应暂停');
    await autoplayPage.close();
    const geometry=()=>publicPage.evaluate(()=>{const stage=document.querySelector('.record-stage').getBoundingClientRect(),scene=document.querySelector('.listening-scene').getBoundingClientRect();return {x:stage.x,y:stage.y+scrollY,height:scene.height};});
    const original=await geometry();
    await publicPage.locator('[data-side=a]').click();assert.equal(await publicPage.locator('#track-information').isVisible(),true);
    assert.deepEqual(await geometry(),original,'A 面不应移动唱片或改变主画面高度');
    await publicPage.locator('[data-side=b]').click();
    assert.deepEqual(await geometry(),original,'B 面不应移动唱片或改变主画面高度');
    await publicPage.locator('#tag-filters button').last().click();assert.equal(await publicPage.locator('.record-card').count(),1);
    await publicPage.locator('.record-card').click();assert.match(await publicPage.locator('#track-note').textContent(),/第一段/);
    await publicPage.screenshot({path:path.join(reports,'collection-desktop.png'),fullPage:true});
    await page.locator('#note').fill('修改后的听后记。'.repeat(350));
    await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/music-edit') && r.request().method()==='POST'),page.locator('#save').click()]);
    await page.waitForFunction(()=>document.getElementById('save-status').textContent.startsWith('已保存'));
    await publicPage.reload();await publicPage.waitForFunction(()=>document.getElementById('track-title').textContent==='晴天');
    assert.deepEqual(await geometry(),original,'长听后记不应改变唱片位置或主画面高度');
    assert.ok(await publicPage.locator('#track-note').evaluate(el=>el.scrollHeight>el.clientHeight),'长听后记应在阅读区内部滚动');
    for(const width of [390,320]) {
      await publicPage.setViewportSize({width,height:844});
      assert.equal(await publicPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'手机宽度不应横向溢出');
      const mobile=await publicPage.evaluate(()=>({story:document.querySelector('.record-story').getBoundingClientRect().bottom,anchor:document.querySelector('.shelf-anchor').getBoundingClientRect().toJSON(),excerpt:document.querySelector('.excerpt-section').getBoundingClientRect().toJSON()}));
      assert.ok(mobile.story+10<mobile.excerpt.top && mobile.anchor.top>=mobile.excerpt.top && mobile.anchor.bottom<=mobile.excerpt.bottom,'手机阅读区、下翻按钮和摘录区不应重叠');
      assert.ok(mobile.excerpt.top>=await publicPage.locator('.listening-scene').evaluate(el=>el.getBoundingClientRect().bottom),'窄屏歌曲摘录应留在唱片画面下方');
      const before=await geometry();await publicPage.locator('[data-side=a]').click();assert.deepEqual(await geometry(),before,'手机切换 A 面时唱片不应移动');
      await publicPage.locator('[data-side=b]').click();assert.deepEqual(await geometry(),before,'手机切换 B 面时唱片不应移动');
    }
    await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:path.join(reports,'editor-desktop.png'),fullPage:true});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    page.on('dialog',dialog=>dialog.accept());await page.locator('#delete').click();await page.waitForFunction(()=>document.getElementById('save-status').textContent.includes('移出'));
    state=await (await page.request.get(base+'/api/music-edit')).json();assert.equal(state.tracks.length,0);
    const short={title:'短曲',artist:'示例歌手',room:'chinese',note:'短短一段。',excerpt:'摘录\n又一句',featured:true};
    state=await (await page.request.post(base+'/api/music-edit',{data:{action:'save',revision:state.revision,track:short}})).json();
    const long={title:'另一首有更长文字的歌曲',artist:'示例歌手',room:'chinese',note:'较长的听后记。'.repeat(400),excerpt:'第二段摘录',featured:false};
    state=await (await page.request.post(base+'/api/music-edit',{data:{action:'save',revision:state.revision,track:long}})).json();
    assert.equal(state.tracks.length,2);
    await publicPage.setViewportSize({width:1440,height:960});await publicPage.goto(base+'/music/chinese/');
    await publicPage.waitForFunction(()=>document.getElementById('track-title').textContent==='短曲');
    const first=await geometry();await publicPage.locator('.record-card').first().click();
    assert.equal(await publicPage.locator('#track-title').textContent(),long.title);
    assert.equal(await publicPage.locator('#track-excerpt').textContent(),'第二段摘录');
    assert.equal(await publicPage.locator('#excerpt-progress').textContent(),'01 / 01');
    assert.equal(await publicPage.locator('#netease-player').getAttribute('src'),null,'没有网易云 ID 的歌曲应停止之前的播放');
    assert.equal(await publicPage.locator('#embedded-player').isVisible(),false);
    assert.deepEqual(await geometry(),first,'不同歌曲的唱片位置与主画面高度应一致');
    const roaming={title:'无界的旋律',artist:'示例歌手',room:'roaming',note:'留给漫游室的唱片。'};
    state=await (await page.request.post(base+'/api/music-edit',{data:{action:'save',revision:state.revision,track:roaming}})).json();
    assert.equal(state.tracks.length,3);
    await publicPage.goto(base+'/music/roaming/');
    await publicPage.waitForFunction(()=>document.getElementById('track-title').textContent==='无界的旋律');
    assert.equal(await publicPage.locator('.record-card').count(),1);
    assert.equal(fs.existsSync(path.join(repo,'music/library.json')),true);
    assert.deepEqual(errors,[]);console.log('Music browser checks passed: 6 pages at 4 widths, roaming room, mobile navigation, automatic editor access, paste lookup, save/edit/delete, public notes, filters and safe text rendering.');
  } finally {
    if(browser) await browser.close();
    server.kill();
    // Temporary source remains in the OS temp directory for failure inspection.
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
