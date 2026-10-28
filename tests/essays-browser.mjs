const output = document.querySelector('#results');
const results = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const until = async predicate => {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > 12000) throw new Error('timed out');
    await wait(30);
  }
};
const normalize = text => text.replace(/\s/g, '');
const inspectFlip = new URLSearchParams(location.search).has('inspect-flip');
const posts = (await (await fetch('../posts.json')).json()).filter(p => p.category === 'essay');
const sources = await Promise.all(posts.map(async post => {
  const html = await (await fetch('../' + post.url)).text();
  return normalize(new DOMParser().parseFromString(html, 'text/html').querySelector('#content').textContent);
}));
async function run(width, height, reduced) {
  const frame = document.createElement('iframe');
  frame.width = width;
  frame.height = height;
  const html = await (await fetch('../essays.html')).text();
  const reducedScript = '<script>window.qaReducedMotion=' + reduced + ';const nativeMedia=window.matchMedia.bind(window);window.matchMedia=q=>q.replace(/\\s/g,"")==="(prefers-reduced-motion:reduce)"?{matches:window.qaReducedMotion}:nativeMedia(q);<\/script>';
  frame.srcdoc = html.replace('<head>', '<head><base href="' + new URL('../', location.href) + '">' + reducedScript);
  document.body.appendChild(frame);
  await new Promise(resolve => frame.onload = resolve);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  const $ = selector => doc.querySelector(selector);
  await until(() => doc.querySelectorAll('.book').length === posts.length);
  await doc.fonts.ready;
  if (reduced) {
    const css = doc.createElement('style');
    css.textContent = '*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}';
    doc.head.append(css);
  } else {
    const css = doc.createElement('style');
    css.textContent = '.flipping-leaf{animation-duration:.6s!important}';
    doc.head.append(css);
  }
  assert(doc.documentElement.scrollWidth <= width, 'horizontal page overflow');
  assert(doc.querySelectorAll('.year-section').length === 3, 'year grouping');
  for (const shelf of doc.querySelectorAll('.shelf')) {
    assert(shelf.scrollWidth <= shelf.clientWidth, 'shelf needs horizontal scrolling');
    assert(win.getComputedStyle(shelf).overflowX === 'visible', 'shelf must not be a scroller');
    for (const book of shelf.querySelectorAll('.book')) {
      const rect = book.getBoundingClientRect();
      const row = shelf.getBoundingClientRect();
      assert(rect.left >= row.left && rect.right <= row.right, 'book clipped outside its row');
    }
  }
  const books = [...doc.querySelectorAll('.book')];
  books[0].click();
  await until(() => $('#reader-book .cover-page'));
  const coverStyle = win.getComputedStyle($('#reader-book>.page-left'));
  assert(coverStyle.visibility === 'visible' && coverStyle.opacity === '1', 'cover is transparent or hidden');
  const paper = $('#reader-book').getBoundingClientRect();
  if (width >= 1000) {
    assert(paper.width >= width * .84, 'desktop book is too narrow');
    assert(paper.height >= height * .80, 'desktop book is too short');
    doc.querySelector('[data-section="body"]').click();
    assert(parseFloat(win.getComputedStyle($('.reader-page p')).fontSize) >= 18, 'desktop text too small');
    doc.querySelector('[data-section="cover"]').click();
  } else {
    const ratio = paper.width / paper.height;
    assert(ratio > .70 && ratio < .73, 'compact book lost its portrait proportions: ' + ratio);
    assert(paper.left >= 18 && paper.right <= width - 18, 'compact binding is clipped');
    assert(paper.top >= 20 && paper.bottom <= height - 24, 'compact book exceeds viewport');
    assert(parseFloat(win.getComputedStyle($('#reader-book')).borderLeftWidth) >= 8, 'compact book has no visible spine');
  }
  if (!reduced) {
    // Visible base text and progress stay on the old spread until the sheet lands.
    const oldLeft = $('#reader-book>.page-left').textContent;
    const oldRight = $('#reader-book>.page-right').textContent;
    const progress = $('#reader-progress').textContent;
    if (inspectFlip) {
      const css = doc.createElement('style');
      css.textContent = '.flipping-leaf{animation-play-state:paused!important;animation-delay:-.18s!important}';
      doc.head.append(css);
      const schedule = win.setTimeout.bind(win);
      win.setTimeout = (fn, ms, ...args) => schedule(fn, ms === 850 ? 60000 : ms, ...args);
    }
    $('#reader-next').click();
    assert($('.flipping-leaf'), 'no animated paper');
    assert($('#reader-book>.page-left').textContent === oldLeft, 'left content changed before flip finished');
    assert($('#reader-book>.page-right').textContent === oldRight, 'right content changed before flip finished');
    assert($('#reader-progress').textContent === progress, 'progress committed before animation');
    const expected = $('.leaf-back').textContent;
    const underlay = $('.turn-underlay').textContent;
    const revealedStyle = win.getComputedStyle($('.turn-underlay'));
    assert(revealedStyle.visibility === 'visible' && revealedStyle.opacity === '1', 'next page hidden by turning-state styles');
    assert($('.turn-underlay .page-inner').clientHeight > 0 && underlay.trim(), 'next page has no rendered content');
    if (inspectFlip) {
      output.textContent = 'INSPECT: paper paused mid-flip; next-page text must be visible underneath.';
      return;
    }
    $('#reader-next').click(); // A repeated click cannot skip another spread mid animation.
    await wait(160);
    assert($('#reader-progress').textContent === progress, 'rapid click skipped or early commit');
    assert(win.getComputedStyle($('.flipping-leaf')).transform !== 'none', 'paper is not rotating');
    assert(win.getComputedStyle($('.turn-underlay')).visibility === 'visible', 'next page blank during rotation');
    await until(() => !$('.flipping-leaf'));
    assert($('#reader-progress').textContent !== progress, 'no new page after animation');
    const single = width <= 960;
    assert($('#reader-book>.page-left').textContent === (single ? underlay : expected), 'landing content differs from moving sheet');
    if (!single) assert($('#reader-book>.page-right').textContent === underlay, 'revealed right page differs after landing');
    $('#reader-prev').click();
    assert(win.getComputedStyle($('.turn-underlay')).visibility === 'visible', 'previous page hidden during reverse flip');
    await until(() => !$('.flipping-leaf'));
    assert($('#reader-book>.page-left').textContent === oldLeft && $('#reader-book>.page-right').textContent === oldRight, 'reverse flip failed');
  }
  $('#reader-close').click();
  // Exhaustively verify all books without spending minutes on duplicate animations.
  win.qaReducedMotion = true;
  for (let b = 0; b < books.length; b++) {
    books[b].click();
    await until(() => $('#reader-book .cover-page'));
    assert(win.getComputedStyle($('#reader-book>.page-left')).opacity === '1', 'paper is transparent');
    let text = '';
    let count = 0;
    let sawEnd = false;
    do {
      for (const page of doc.querySelectorAll('#reader-book>.reader-page')) {
        if (page.inert) continue;
        assert(win.getComputedStyle(page).visibility === 'visible' && win.getComputedStyle(page).opacity === '1', 'readable page is not visible');
        const content = page.querySelector('.page-inner');
        assert(content && content.clientHeight > 0, 'unbounded paper');
        if (content.querySelector('.end-page')) sawEnd = true;
        if (!content.querySelector('.cover-page,.note-page,.end-page') && content.textContent.trim()) {
          const clone = content.cloneNode(true);
          clone.querySelectorAll('.running-head').forEach(el => el.remove());
          text += normalize(clone.textContent);
          const prose = !content.querySelector('img,table,pre');
          if (prose) assert(content.scrollHeight <= content.clientHeight + 2, 'prose overflows paper');
        }
      }
      count++;
      if ($('#reader-next').disabled) break;
      $('#reader-next').click();
      assert(count < 150, 'pagination failed to terminate');
    } while (true);
    assert(sawEnd, 'cannot reach last page on ' + posts[b].title);
    assert(text === sources[b], 'content lost/duplicated: ' + posts[b].title + ' ' + text.length + '/' + sources[b].length);
    assert($('#reader-full-link').getAttribute('href') === posts[b].url, 'canonical article link');
    $('#reader-close').click();
    assert($('#book-reader').hidden && !$('.library-shell').inert, 'close did not restore shelf');
    assert(doc.activeElement === books[b], 'keyboard focus was not restored');
  }
  books[0].click();
  await until(() => $('#reader-book .cover-page'));
  doc.querySelector('[data-section="body"]').click();
  assert($('#reader-book .running-head'), 'body bookmark');
  doc.querySelector('[data-section="end"]').click();
  assert($('#reader-book .end-page'), 'end bookmark');
  doc.querySelector('[data-section="cover"]').click();
  doc.dispatchEvent(new win.KeyboardEvent('keydown', {key:'ArrowRight',bubbles:true,cancelable:true}));
  assert($('#reader-prev').disabled === false, 'keyboard next');
  doc.dispatchEvent(new win.KeyboardEvent('keydown', {key:'ArrowLeft',bubbles:true,cancelable:true}));
  assert($('#reader-prev').disabled, 'keyboard previous');
  const start = new win.Event('touchstart');
  Object.defineProperty(start,'changedTouches',{value:[{clientX:260,clientY:120}]});
  $('#reader-book').dispatchEvent(start);
  const end = new win.Event('touchend');
  Object.defineProperty(end,'changedTouches',{value:[{clientX:100,clientY:124}]});
  $('#reader-book').dispatchEvent(end);
  assert(!$('#reader-prev').disabled, 'swipe next');
  frame.width = width === 390 ? 1000 : 390;
  await wait(300);
  assert($('#reader-book .reader-page.is-visible .page-inner').clientHeight > 0, 'resize reflow');
  doc.dispatchEvent(new win.KeyboardEvent('keydown', {key:'Escape',bubbles:true}));
  assert($('#book-reader').hidden, 'Escape close');
  results.push('PASS ' + width + '×' + height + ' / reduced=' + reduced + ': shelves fit, book fills screen, flip commit timing, 14 exact bodies, no prose overflow, bookmarks, keyboard, swipe, resize, focus, links');
  output.textContent = results.join('\n');
  frame.remove();
}
try {
  for (const [w,h,reduced] of inspectFlip ? [[390,844,false]] : [[1920,1080,false],[1280,900,false],[820,700,false],[774,672,false],[390,844,false],[320,568,true],[844,390,false]]) await run(w,h,reduced);
  if (!inspectFlip) output.textContent += '\nALL PASS';
} catch (error) {
  output.textContent += '\nFAIL ' + error.message;
  console.error(error);
}
