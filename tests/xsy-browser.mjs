// Run at /tests/xsy-browser.html using the same static server as /xsy/.
const output = document.querySelector('#results');
const results = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const instrument = (reduced) => {
  const frames = new Set();
  const intervals = new Set();
  const timeouts = new Set();
  const raf = requestAnimationFrame;
  const caf = cancelAnimationFrame;
  window.requestAnimationFrame = (fn) => {
    const id = raf((time) => { frames.delete(id); fn(time); });
    frames.add(id);
    return id;
  };
  window.cancelAnimationFrame = (id) => { frames.delete(id); caf(id); };
  for (const [name, active, repeats] of [['Timeout', timeouts, false], ['Interval', intervals, true]]) {
    const set = window[`set${name}`];
    const clear = window[`clear${name}`];
    window[`set${name}`] = (fn, delay, ...args) => {
      const id = set(() => { if (!repeats) active.delete(id); fn(...args); }, delay);
      active.add(id);
      return id;
    };
    window[`clear${name}`] = (id) => { active.delete(id); clear(id); };
  }
  const media = matchMedia;
  window.matchMedia = (query) => query === '(prefers-reduced-motion: reduce)'
    ? { matches: reduced } : media(query);
  const keyListeners = new Set();
  const add = document.addEventListener.bind(document);
  const remove = document.removeEventListener.bind(document);
  document.addEventListener = (type, listener, ...args) => {
    if (type === 'keydown') keyListeners.add(listener);
    add(type, listener, ...args);
  };
  document.removeEventListener = (type, listener, ...args) => {
    if (type === 'keydown') keyListeners.delete(listener);
    remove(type, listener, ...args);
  };
  window.qaResources = { frames, intervals, timeouts, keyListeners };
};
function luminance(color) {
  const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => {
    v /= 255;
    return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  });
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}
async function run(width, reduced) {
  const frame = document.createElement('iframe');
  frame.width = width;
  frame.height = width === 390 ? 844 : 900;
  frame.title = `${width}px, reduced motion ${reduced}`;
  document.body.append(frame);
  const html = await (await fetch('../xsy/index.html')).text();
  const loaded = new Promise((resolve) => frame.addEventListener('load', resolve, { once: true }));
  frame.srcdoc = html.replace('href="style.css"', `href="style.css?qa=${Date.now()}"`).replace('<head>', `<head><base href="${new URL('../xsy/', location.href)}"><script>(${instrument})(${reduced})<\/script>`);
  await loaded;
  const win = frame.contentWindow;
  if (reduced) {
    // Apply the actual reduced-motion rules without changing host OS preferences.
    const style = frame.contentDocument.createElement('style');
    style.textContent = [...frame.contentDocument.styleSheets].flatMap((sheet) =>
      [...sheet.cssRules].filter((rule) => rule.conditionText === '(prefers-reduced-motion: reduce)')
        .flatMap((rule) => [...rule.cssRules].map((child) => child.cssText))
    ).join('\n');
    frame.contentDocument.head.append(style);
  }
  const doc = frame.contentDocument;
  const $ = (selector) => doc.querySelector(selector);
  const click = (selector) => $(selector).click();
  const key = (element, value, shiftKey = false) => element.dispatchEvent(new win.KeyboardEvent('keydown', { key: value, shiftKey, bubbles: true, cancelable: true }));
  const check = async (name, fn) => {
    try { await fn(); results.push(`PASS ${width}/${reduced}: ${name}`); }
    catch (error) { results.push(`FAIL ${width}/${reduced}: ${name}: ${error.message}`); }
    output.textContent = results.join('\n');
  };
  const clean = () => {
    const counts = Object.fromEntries(Object.entries(win.qaResources).map(([name, active]) => [name, active.size]));
    assert(Object.values(counts).every((size) => size === 0), `leaked resources ${JSON.stringify(counts)}`);
  };
  await check('mount, count and horizontal fit', () => {
    assert($('[data-favorite-count]').textContent === '9', 'count');
    assert(doc.title === 'xsy最喜欢的9样东西', 'title');
    assert(doc.documentElement.scrollWidth === width, 'page overflow');
  });
  click('.favorite--yorushika .favorite__action');
  await check('night lyrics wrap, focus trap, close and restoration', () => {
    const trigger = $('[data-extra-action="lyrics"]');
    assert(!trigger.disabled, 'lyrics disabled at night');
    trigger.click();
    const song = $('.lyrics__song').textContent;
    for (let i = 0; i < 5; i++) click('.lyrics__next');
    assert($('.lyrics__song').textContent === song, 'lyrics did not wrap');
    key($('.lyrics__next'), 'Tab');
    assert(doc.activeElement === $('[data-dialog-close]'), 'Tab did not wrap');
    key(doc.activeElement, 'Tab', true);
    assert(doc.activeElement === $('.lyrics__next'), 'Shift+Tab did not wrap');
    key(doc.activeElement, 'Escape');
    assert($('#exhibit-dialog').hidden && doc.activeElement === trigger, 'close focus');
    clean();
  });
  await check('night peach focus contrast against its arena', () => {
    click('[data-extra-action="slap"]');
    const target = $('[data-slap-target]');
    target.focus();
    // Focus outline uses --ink; compare against the fixed white arena surface.
    const ink = win.getComputedStyle(target).getPropertyValue('--ink').trim();
    const probe = doc.createElement('span');
    probe.style.color = ink;
    doc.body.append(probe);
    assert(contrast(win.getComputedStyle(probe).color, 'rgb(255, 255, 255)') >= 3, 'focus outline below 3:1');
    probe.remove();
  });
  await check('slap hit/combo/miss and mid-close cleanup', () => {
    const target = $('[data-slap-target]');
    const arena = $('[data-slap-arena]');
    target.click(); key(target, 'Enter'); target.click();
    assert($('[data-slap-score]').textContent === '2' && $('[data-slap-combo]').textContent === '2', 'keyboard bubbles reset combo');
    key(arena, ' ');
    assert($('[data-slap-score]').textContent === '2' && $('[data-slap-combo]').textContent === '0', 'miss altered score or kept combo');
    if (reduced) assert(!arena.classList.contains('is-hit'), 'reduced motion shake');
    click('[data-dialog-close]');
    clean();
  });
  await check('curling throw/reset and closing cancels animation', async () => {
    click('[data-extra-action="curling"]');
    await wait(40);
    click('[data-curling-launch]');
    if (reduced) {
      assert(!$('[data-curling-reset]').disabled, 'reduced throw did not settle immediately');
      click('[data-curling-reset]');
      assert($('[data-curling-score]').textContent === '—', 'reset score');
    }
    click('[data-dialog-backdrop]');
    clean();
  });
  await check('beetle cap, dismissal and expiry cleanup', async () => {
    for (let i = 0; i < 8; i++) click('.favorite--chafer .favorite__action');
    if (reduced) {
      assert(doc.querySelectorAll('.beetle-static').length === 1 && !$('.flying-beetle'), 'not a single static beetle');
      await wait(40);
      const style = win.getComputedStyle($('.beetle-static'));
      assert(Number(style.opacity) === 1, 'static feedback faded immediately under reduced motion');
      assert(contrast(style.color, style.backgroundColor) >= 4.5, 'static status contrast below 4.5:1');
      await wait(850);
      assert(!$('.beetle-static'), 'static beetle remained');
    } else {
      assert(doc.querySelectorAll('.flying-beetle').length === 18, 'cap');
      click('.flying-beetle');
      assert($('.is-dismissed').disabled && $('.is-dismissed').textContent === '啪', 'dismiss feedback');
      await wait(2900);
      assert(!$('.flying-beetle'), 'flying beetles remained');
    }
    clean();
  });
  await check('night restart label contrast', async () => {
    click('[data-extra-action="slap"]');
    click('[data-slap-target]');
    await wait(10150);
    assert(!$('[data-slap-finish]').hidden && $('[data-slap-target]').disabled, 'deadline');
    $('[data-dialog-close]').focus();
    const style = win.getComputedStyle($('[data-slap-restart]'));
    assert(contrast(style.color, style.backgroundColor) >= 4.5, 'restart label contrast below 4.5:1');
    click('[data-slap-restart]');
    assert($('[data-slap-score]').textContent === '0', 'restart score');
    click('[data-dialog-close]');
    clean();
  });
  frame.remove();
}
const options = new URLSearchParams(location.search);
for (const width of options.has('width') ? [Number(options.get('width'))] : [1440, 390]) {
  for (const reduced of options.has('reduced') ? [options.get('reduced') === 'true'] : [false, true]) await run(width, reduced);
}
output.dataset.complete = 'true';
output.dataset.failures = String(results.filter((line) => line.startsWith('FAIL')).length);
output.textContent += `\nDONE: ${output.dataset.failures} failures`;
