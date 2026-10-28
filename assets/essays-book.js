(function () {
    'use strict';

    var entries = document.getElementById('entries');
    var essays = [];
    var pages = [];
    var pageIndex = 0;
    var bookIndex = 0;
    var lastFocus = null;
    var reader = document.getElementById('book-reader');
    var readerBook = document.getElementById('reader-book');
    var leftPage = readerBook.querySelector('.reader-page:first-child');
    var rightPage = readerBook.querySelector('.reader-page:last-child');
    var touchStart = 0;
    var touchY = 0;
    var loadVersion = 0;
    var currentRoot = null;
    var resizeTimer;
    var scrollPosition = 0;
    var mobile = window.matchMedia('(max-width:960px)');
    var activeTurn = null;
    leftPage.classList.add('page-left');
    rightPage.classList.add('page-right');
    var tabs = document.createElement('nav');
    tabs.className = 'reader-tabs';
    tabs.setAttribute('aria-label', '书内书签');
    tabs.innerHTML = '<button type="button" data-section="cover">扉页</button><button type="button" data-section="body">正文</button><button type="button" data-section="end">末页</button>';
    readerBook.parentNode.appendChild(tabs);
    var announcement = document.createElement('span');
    announcement.setAttribute('role', 'status');
    announcement.id = 'reader-status';
    announcement.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)';
    reader.appendChild(announcement);
    var hint = document.createElement('span');
    hint.className = 'reader-hint';
    hint.textContent = '← → 翻页 / Esc 放回书架';
    document.querySelector('.reader-bottom').appendChild(hint);

    function safeUrl(value) {
        try {
            var url = new URL(value, location.href);
            return /^(https?:)$/.test(url.protocol) ? url.href : '';
        } catch (_) { return ''; }
    }

    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
            return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
        });
    }

    function hash(text) {
        var n = 0;
        for (var i = 0; i < text.length; i++) n = ((n << 5) - n + text.charCodeAt(i)) | 0;
        return Math.abs(n);
    }

    var palettes = [
        ['#667b79', '#d5d0b6'], ['#786b61', '#d9c3a9'], ['#876b63', '#d8b99c'],
        ['#596f83', '#c6d1d0'], ['#756b83', '#d4c6d1'], ['#657c64', '#c9d0b4'],
        ['#8a6b4f', '#dec59e'], ['#7b5961', '#d6b4b3']
    ];

    function motifFor(post) {
        if (post.motif) return post.motif;
        var text = (post.title || '') + (post.summary || '');
        if (/山|云|海|彩云|金门|长江|石头|洱海/.test(text)) return 'mountain';
        if (/车|火车|铁路|列车|远方|离乡|票/.test(text)) return 'train';
        if (/十八|高考|年岁|生日|小孩|未来/.test(text)) return 'calendar';
        if (/家|日记|从前|记忆|初雪|自己/.test(text)) return 'window';
        return ['mountain', 'train', 'calendar', 'window'][hash(text) % 4];
    }

    function paletteFor(post, index) {
        if (/^#[0-9a-f]{6}$/i.test(post.accent || '')) return [post.accent, '#ded2b9'];
        return palettes[hash((post.title || '') + index) % palettes.length];
    }

    function motifSvg(motif, detail) {
        var stroke = detail ? 'rgba(51,39,31,.72)' : 'rgba(255,244,215,.72)';
        var fill = detail ? 'rgba(179,67,43,.18)' : 'rgba(247,232,190,.18)';
        if (motif === 'train') return '<svg viewBox="0 0 180 180" fill="none" aria-hidden="true"><path d="M18 137h144M28 155l38-49m86 49-38-49M35 115h110" stroke="' + stroke + '" stroke-width="3"/><rect x="53" y="35" width="74" height="76" rx="8" fill="' + fill + '" stroke="' + stroke + '" stroke-width="3"/><path d="M65 49h18v21H65zm32 0h18v21H97zM67 93h46M67 108l-10 18m56-18 10 18" stroke="' + stroke + '" stroke-width="3"/></svg>';
        if (motif === 'calendar') return '<svg viewBox="0 0 180 180" fill="none" aria-hidden="true"><rect x="32" y="36" width="116" height="112" rx="4" fill="' + fill + '" stroke="' + stroke + '" stroke-width="3"/><path d="M32 67h116M60 25v25m60-25v25M52 88h18m20 0h18m-56 25h18m20 0h18m-56 25h18" stroke="' + stroke + '" stroke-width="4" stroke-linecap="round"/><circle cx="125" cy="112" r="17" fill="' + stroke + '" opacity=".7"/><path d="m118 112 5 5 10-12" stroke="#f7ead1" stroke-width="3"/></svg>';
        if (motif === 'window') return '<svg viewBox="0 0 180 180" fill="none" aria-hidden="true"><path d="M28 28h124v124H28z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="3"/><path d="M90 28v124M28 90h124" stroke="' + stroke + '" stroke-width="3"/><path d="M48 111c17-26 28-31 42-20 15 12 25-21 42-26" stroke="' + stroke + '" stroke-width="4"/><circle cx="126" cy="52" r="10" fill="' + stroke + '" opacity=".65"/></svg>';
        return '<svg viewBox="0 0 180 180" fill="none" aria-hidden="true"><path d="M12 142c31-55 48-35 72-75 17-28 34-12 84-57" stroke="' + stroke + '" stroke-width="4"/><path d="M12 155c31-55 48-35 72-75 17-28 34-12 84-57M12 168c31-55 48-35 72-75 17-28 34-12 84-57" stroke="' + stroke + '" stroke-width="2" opacity=".55"/><path d="M20 118h38M123 56h38" stroke="' + stroke + '" stroke-width="3"/><circle cx="94" cy="85" r="7" fill="' + stroke + '"/></svg>';
    }

    function coverArt(post, detail) {
        if (post.cover_image && safeUrl(post.cover_image)) return '<img src="' + esc(safeUrl(post.cover_image)) + '" alt="" loading="lazy">';
        var base = motifSvg(motifFor(post), detail);
        var seed = hash(post.title || '');
        // Each title has its own constellation, route and printing mark.
        var ink = detail ? '#b3432b' : '#f5ddae';
        var decoration = '<g opacity=".55" fill="none" stroke="' + ink + '" stroke-width="1"><circle cx="' + (25 + seed % 125) + '" cy="' + (20 + seed % 47) + '" r="' + (12 + seed % 16) + '"/><path stroke-dasharray="2 5" d="M12 ' + (150 - seed % 40) + ' Q80 ' + (25 + seed % 75) + ' 166 150"/></g>';
        return base.replace('</svg>', decoration + '</svg>');
    }

    function hrefFor(post) {
        return post.url || ('article.html?file=' + encodeURIComponent(post.file) + '&title=' + encodeURIComponent(post.title) + '&date=' + encodeURIComponent(post.date || ''));
    }

    function makeBook(post, index) {
        var year = (post.date || '').slice(0, 4) || '—';
        var palette = paletteFor(post, index);
        var motif = motifFor(post);
        var height = 195 + (hash(post.title || '') % 42);
        var width = 106 + (hash((post.title || '') + 'w') % 19);
        var tilt = (hash((post.title || '') + 't') % 7) - 3;
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'book';
        button.setAttribute('aria-label', '打开《' + post.title + '》');
        button.style.cssText = '--accent:' + palette[0] + ';--h:' + height + 'px;--w:' + width + 'px;--tilt:' + tilt + 'deg;';
        button.innerHTML = '<span class="book-pages"></span><span class="book-cover"><span class="book-spine"></span><span class="spine-label">' + esc(year + ' · ' + post.title) + '</span><span class="book-art">' + coverArt(post, false) + '</span><span class="book-label"><strong>' + esc(post.title) + '</strong><small>VOL. ' + String(index + 1).padStart(2, '0') + ' / ' + esc(year) + '</small></span></span><span class="book-tag">' + esc(year) + '</span>';
        function preview() {
            var target = button.closest('.year-section').querySelector('.shelf-preview');
            target.innerHTML = '<strong>' + esc(post.title) + '</strong>' + esc(post.summary || '');
        }
        button.addEventListener('mouseenter', preview);
        button.addEventListener('focus', preview);
        button.addEventListener('click', function () { openBook(index, button); });
        return button;
    }

    function renderShelf() {
        var groups = {};
        essays.forEach(function (post, index) {
            var year = (post.date || '').slice(0, 4) || '未分类';
            (groups[year] || (groups[year] = [])).push({post: post, index: index});
        });
        entries.innerHTML = '';
        Object.keys(groups).sort(function (a, b) { return b.localeCompare(a); }).forEach(function (year) {
            var heading = document.createElement('div');
            heading.className = 'shelf-year';
            heading.innerHTML = '<strong>' + esc(year) + '</strong><span>' + groups[year].length + ' 册 · 从这一年开始保存</span>';
            var section = document.createElement('section');
            section.className = 'year-section';
            section.setAttribute('aria-label', year + ' 年随笔');
            var shelves = document.createElement('div');
            shelves.className = 'year-shelves';
            groups[year].forEach(function (item) { shelves.appendChild(makeBook(item.post, item.index)); });
            section.appendChild(heading);
            section.appendChild(shelves);
            var preview = document.createElement('p');
            preview.className = 'shelf-preview';
            preview.textContent = '抽出一本，读一段当时的自己。';
            section.appendChild(preview);
            entries.appendChild(section);
        });
        layoutShelves();
        document.getElementById('essay-count').textContent = essays.length + ' 册藏书 · ' + Object.keys(groups).length + ' 个年份';
    }

    function layoutShelves() {
        entries.querySelectorAll('.year-shelves').forEach(function (container) {
            var books = Array.from(container.querySelectorAll('.book'));
            var columns = Math.max(1, Math.floor((container.clientWidth - 24) / (window.innerWidth <= 600 ? 94 : 130)));
            var oldColumns = Number(container.dataset.columns);
            if (oldColumns === columns) return;
            var focused = document.activeElement;
            container.dataset.columns = columns;
            var fragment = document.createDocumentFragment();
            for (var i = 0; i < books.length; i += columns) {
                var shelf = document.createElement('div');
                shelf.className = 'shelf';
                shelf.style.setProperty('--columns', columns);
                books.slice(i, i + columns).forEach(function (book) { shelf.appendChild(book); });
                fragment.appendChild(shelf);
            }
            container.replaceChildren(fragment);
            if (books.includes(focused)) focused.focus({preventScroll:true});
        });
    }

    function pageMarkup(page) {
        if (!page) return '<div class="page-inner"></div>';
        return '<div class="page-inner">' + page.html + '</div>';
    }

    function setPage(el, page, number, visible) {
        el.innerHTML = pageMarkup(page);
        el.dataset.page = String(number + 1).padStart(2, '0');
        el.classList.toggle('is-visible', visible);
        el.classList.toggle('page-empty', !page);
        el.inert = !visible;
        el.setAttribute('aria-hidden', String(!visible));
        var scroller = el.querySelector('.page-inner');
        if (scroller) scroller.scrollTop = 0;
    }

    function cancelTurn() {
        if (!activeTurn) return;
        clearTimeout(activeTurn.timer);
        activeTurn.leaf.remove();
        activeTurn.underlay.remove();
        readerBook.classList.remove('is-turning-forward', 'is-turning-back', 'is-turning-single');
        activeTurn = null;
    }

    function renderSpread() {
        cancelTurn();
        setPage(leftPage, pages[pageIndex], pageIndex, true);
        setPage(rightPage, pages[pageIndex + 1], pageIndex + 1, !mobile.matches && pageIndex + 1 < pages.length);
        document.getElementById('reader-prev').disabled = pageIndex <= 0;
        document.getElementById('reader-next').disabled = pageIndex + (mobile.matches ? 1 : 2) >= pages.length;
        document.getElementById('reader-progress').textContent = String(Math.min(pageIndex + 1, pages.length)).padStart(2, '0') + ' / ' + String(pages.length).padStart(2, '0');
        announcement.textContent = essays[bookIndex].title + '，第 ' + (pageIndex + 1) + ' 页，共 ' + pages.length + ' 页';
        var kind = pages[pageIndex] && pages[pageIndex].kind;
        tabs.querySelectorAll('button').forEach(function (button) {
            button.setAttribute('aria-current', String(button.dataset.section === (kind === 'note' ? 'cover' : kind)));
        });
    }

    function splitContent(root) {
        var measure = document.createElement('article');
        measure.className = 'reader-page page-measure';
        measure.style.width = leftPage.getBoundingClientRect().width + 'px';
        measure.style.height = leftPage.getBoundingClientRect().height + 'px';
        measure.innerHTML = '<div class="page-inner"><div class="running-head">' + esc(essays[bookIndex].date) + ' / ' + esc(essays[bookIndex].title) + '</div><div class="measure-content"></div></div>';
        reader.appendChild(measure);
        var target = measure.querySelector('.measure-content');
        var inner = measure.querySelector('.page-inner');
        var chunks = [], current = '';
        function fits(html) { target.innerHTML = html; return inner.scrollHeight <= inner.clientHeight + 1; }
        function flush() { if (current) { chunks.push({kind:'body', html:'<div class="running-head">' + esc(essays[bookIndex].date) + ' / ' + esc(essays[bookIndex].title) + '</div>' + current}); current = ''; } }
        function fragment(node, start, end) {
            var walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
            var texts = [], text, total = 0;
            while ((text = walker.nextNode())) { texts.push({node:text, start:total}); total += text.length; }
            var range = document.createRange();
            range.selectNodeContents(node);
            for (var i = 0; i < texts.length; i++) {
                var item = texts[i];
                if (start >= item.start && start <= item.start + item.node.length) range.setStart(item.node, start - item.start);
                if (end >= item.start && end <= item.start + item.node.length) { range.setEnd(item.node, end - item.start); break; }
            }
            var clone = node.cloneNode(false);
            clone.appendChild(range.cloneContents());
            return clone.outerHTML;
        }
        Array.from(root.children).forEach(function (node) {
            var html = node.outerHTML;
            if (fits(current + html)) { current += html; return; }
            flush();
            if (fits(html)) { current = html; return; }
            // Split oversized prose with DOM ranges, preserving inline emphasis and links.
            var length = node.textContent.length;
            if (length && !node.querySelector('img,table,pre') && !/^(TABLE|PRE|FIGURE)$/.test(node.tagName)) {
                var offset = 0;
                while (offset < length) {
                    var lo = 1, hi = length - offset, best = 0;
                    while (lo <= hi) {
                        var mid = Math.floor((lo + hi) / 2);
                        if (fits(fragment(node, offset, offset + mid))) { best = mid; lo = mid + 1; } else hi = mid - 1;
                    }
                    best = Math.max(1, best);
                    current = fragment(node, offset, offset + best);
                    offset += best;
                    if (offset < length) flush();
                }
            } else {
                // A tall image/table/code block stays intact and can scroll within its page.
                current = html; flush();
            }
        });
        flush();
        measure.remove();
        return chunks;
    }

    function buildPages(post, contentRoot) {
        var motif = motifFor(post);
        var palette = paletteFor(post, bookIndex);
        var art = coverArt(post, true);
        var number = String(bookIndex + 1).padStart(2, '0');
        var note = post.note || post.summary || (contentRoot.querySelector('p') || contentRoot).textContent.trim().slice(0, 180);
        var result = [
            {kind:'cover', html:'<section class="cover-page" style="--cover-accent:' + esc(palette[0]) + '"><span class="cover-kicker">INWT PRIVATE LIBRARY / VOL. ' + number + '</span><div class="cover-art-large">' + art + '</div><h1>' + esc(post.title) + '</h1><span class="cover-date">' + esc(post.date || '') + ' · INWT</span></section>'},
            {kind:'note', html:'<section class="note-page"><span class="note-mark">“</span><p class="note-text">' + esc(note) + '</p><p class="note-meta">这是第 ' + number + ' 册。<br>翻开它，回到写下这段话的那一天。</p></section>'}
        ];
        result = result.concat(splitContent(contentRoot));
        var links = '';
        if (bookIndex > 0) links += '<button type="button" data-book="' + (bookIndex - 1) + '">← 上一册 · ' + esc(essays[bookIndex - 1].title) + '</button>';
        if (bookIndex + 1 < essays.length) links += '<button type="button" data-book="' + (bookIndex + 1) + '">下一册 · ' + esc(essays[bookIndex + 1].title) + ' →</button>';
        result.push({kind:'end', html:'<section class="end-page"><span class="cover-kicker">FIN / INWT</span><h2>这本书读到这里。</h2><p>写于 ' + esc(post.date || '某一天') + '。<br>这是书架上的第 ' + number + ' / ' + essays.length + ' 册。</p><div class="end-links">' + links + '</div></section>'});
        return result;
    }

    function openBook(index, source) {
        var version = ++loadVersion;
        bookIndex = index;
        if (!reader.classList.contains('is-open')) {
            lastFocus = source || document.activeElement;
            scrollPosition = window.scrollY;
        }
        currentRoot = null;
        var post = essays[index];
        var label = document.getElementById('reader-label');
        label.textContent = 'INWT / ' + String(index + 1).padStart(2, '0') + ' / ' + essays.length + ' · ' + post.title;
        document.getElementById('reader-full-link').href = hrefFor(post);
        pages = [{kind:'loading', html:'<section class="note-page"><p class="note-text">正在翻开这本书……</p></section>'}];
        pageIndex = 0;
        reader.hidden = false;
        reader.classList.add('is-open');
        document.body.classList.add('reader-open');
        document.querySelector('.library-shell').inert = true;
        document.querySelector('.page-nav').inert = true;
        renderSpread();
        document.getElementById('reader-close').focus();
        var url = post.url || ('posts/' + encodeURIComponent(post.file));
        fetch(url).then(function (response) { if (!response.ok) throw new Error('load'); return response.text(); }).then(async function (html) {
            if (!post.url) html = '<div class="markdown-body">' + marked.parse(html.replace(/^---[\s\S]*?---\s*/, '')) + '</div>';
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var content = doc.querySelector('.markdown-body') || doc.querySelector('#content');
            if (!content) throw new Error('content');
            content.querySelectorAll('script,style,iframe,object,embed,form,link,meta').forEach(function (el) { el.remove(); });
            content.querySelectorAll('*').forEach(function (el) {
                Array.from(el.attributes).forEach(function (attr) {
                    if (/^on/i.test(attr.name) || /^(srcdoc|srcset)$/i.test(attr.name)) el.removeAttribute(attr.name);
                });
                ['src','href'].forEach(function (attr) {
                    if (!el.hasAttribute(attr)) return;
                    var raw = el.getAttribute(attr);
                    if (attr === 'href' && raw.charAt(0) === '#') {
                        el.setAttribute(attr, hrefFor(post) + raw); return;
                    }
                    try {
                        var resolved = new URL(raw, new URL(url, location.href));
                        if (!/^https?:$/.test(resolved.protocol)) el.removeAttribute(attr);
                        else el.setAttribute(attr, resolved.href.replace(/^http:\/\/inwt233.cn\//, 'https://inwt233.cn/'));
                    } catch (_) { el.removeAttribute(attr); }
                });
            });
            if (version !== loadVersion || reader.hidden) return;
            currentRoot = content;
            // Decode available images before measuring; broken legacy images retain alt text.
            var images = Array.from(content.querySelectorAll('img'));
            images.forEach(function (img) { if (!img.alt) img.alt = '文章配图'; });
            var ready = images.map(function (img) { return img.decode().catch(function () {}); });
            await Promise.race([Promise.all(ready), new Promise(function (resolve) { setTimeout(resolve, 1200); })]);
            if (version !== loadVersion || reader.hidden) return;
            pages = buildPages(post, content);
            pageIndex = 0;
            renderSpread();
        }).catch(function () {
            if (version !== loadVersion || reader.hidden) return;
            pages = [{kind:'note', html:'<section class="note-page"><span class="note-mark">!</span><p class="note-text">这本书暂时打不开。</p><p class="note-meta">请使用下方“在独立文章页打开”继续阅读。</p></section>'}];
            renderSpread();
        });
    }

    function closeReader() {
        cancelTurn();
        ++loadVersion;
        currentRoot = null;
        reader.classList.remove('is-open');
        reader.hidden = true;
        document.body.classList.remove('reader-open');
        document.querySelector('.library-shell').inert = false;
        document.querySelector('.page-nav').inert = false;
        if (lastFocus && lastFocus.focus) lastFocus.focus({preventScroll:true});
        window.scrollTo({top:scrollPosition, behavior:'instant'});
    }

    function turn(direction) {
        if (activeTurn || reader.hidden) return;
        var step = mobile.matches ? 1 : 2;
        var target = pageIndex + direction * step;
        if (target < 0 || target >= pages.length) return;
        if (matchMedia('(prefers-reduced-motion:reduce)').matches) {
            pageIndex = target; renderSpread(); return;
        }
        var single = mobile.matches;
        var movingPage = single || direction < 0 ? leftPage : rightPage;
        var front = movingPage.cloneNode(true);
        var back = movingPage.cloneNode(false);
        var underlay = movingPage.cloneNode(false);
        setPage(back, pages[target + (direction > 0 || single ? 0 : 1)], target + (direction > 0 || single ? 0 : 1), true);
        setPage(underlay, pages[target + (single || direction < 0 ? 0 : 1)], target + (single || direction < 0 ? 0 : 1), true);
        front.className = 'reader-page leaf-front';
        back.className = 'reader-page leaf-back';
        underlay.className = 'reader-page turn-underlay ' + (single ? 'underlay-single' : direction > 0 ? 'underlay-right' : 'underlay-left');
        var leaf = document.createElement('div');
        leaf.className = 'flipping-leaf ' + (single ? 'flip-single ' : '') + (direction > 0 ? 'flip-forward' : 'flip-back');
        leaf.inert = true;
        underlay.inert = true;
        leaf.setAttribute('aria-hidden', 'true');
        underlay.setAttribute('aria-hidden', 'true');
        leaf.append(front, back);
        readerBook.append(underlay, leaf);
        readerBook.classList.add(single ? 'is-turning-single' : direction > 0 ? 'is-turning-forward' : 'is-turning-back');
        var turnState = {leaf:leaf, underlay:underlay};
        activeTurn = turnState;
        function complete() {
            if (activeTurn !== turnState) return;
            var shouldReflow = turnState.repaginate;
            pageIndex = target;
            renderSpread();
            if (shouldReflow) repaginate();
        }
        leaf.addEventListener('animationend', function (event) { if (event.target === leaf) complete(); });
        // Keep the reader usable if a tab is hidden or the browser cancels an animation.
        turnState.timer = setTimeout(complete, 850);
    }

    document.getElementById('reader-close').addEventListener('click', closeReader);
    document.querySelector('[data-close-reader]').addEventListener('click', closeReader);
    document.getElementById('reader-prev').addEventListener('click', function () { turn(-1); });
    document.getElementById('reader-next').addEventListener('click', function () { turn(1); });
    tabs.addEventListener('click', function (event) {
        var button = event.target.closest('[data-section]');
        if (!button) return;
        var index = pages.findIndex(function (page) { return page.kind === button.dataset.section; });
        if (index < 0) return;
        pageIndex = mobile.matches ? index : index - index % 2;
        renderSpread();
    });
    readerBook.addEventListener('click', function (event) {
        var nextBook = event.target.closest('[data-book]');
        if (nextBook) { openBook(Number(nextBook.dataset.book)); return; }
        if (event.target.closest('a,button,pre,code') || window.getSelection().toString()) return;
        var rect = readerBook.getBoundingClientRect();
        if (event.clientX < rect.left + rect.width * .16) turn(-1);
        else if (event.clientX > rect.right - rect.width * .16) turn(1);
    });
    function repaginate() {
        if (!currentRoot || reader.hidden) return;
        var kind = pages[pageIndex].kind;
        var bodyBefore = pages.slice(0, pageIndex).filter(function (p) { return p.kind === 'body'; }).reduce(function (n, p) {
            var el = document.createElement('div'); el.innerHTML = p.html;
            var head = el.querySelector('.running-head'); if (head) head.remove();
            return n + el.textContent.length;
        }, 0);
        pages = buildPages(essays[bookIndex], currentRoot);
        var target = kind === 'note' ? 1 : pages.findIndex(function (p) { return p.kind === kind; });
        if (kind === 'body') {
            var count = 0;
            pages.some(function (p, i) {
                if (p.kind !== 'body') return false;
                var el = document.createElement('div'); el.innerHTML = p.html;
                var head = el.querySelector('.running-head'); if (head) head.remove();
                count += el.textContent.length;
                target = i;
                return count > bodyBefore;
            });
        }
        pageIndex = Math.max(0, target);
        if (!mobile.matches) pageIndex -= pageIndex % 2;
        renderSpread();
    }
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () { layoutShelves(); repaginate(); }, 160);
    });
    if (document.fonts) document.fonts.addEventListener('loadingdone', function () {
        if (activeTurn) activeTurn.repaginate = true;
        else repaginate();
    });
    document.addEventListener('keydown', function (event) {
        if (!reader.classList.contains('is-open')) return;
        if (event.key === 'Escape') closeReader();
        if (event.key === 'ArrowLeft') { event.preventDefault(); turn(-1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); turn(1); }
        if (event.key === 'Tab') {
            var focusables = Array.from(reader.querySelectorAll('button:not(:disabled),a[href]')).filter(function (el) { return !el.closest('[inert]') && el.getClientRects().length; });
            if (focusables.length && (event.shiftKey ? document.activeElement === focusables[0] : document.activeElement === focusables[focusables.length - 1])) { event.preventDefault(); focusables[event.shiftKey ? focusables.length - 1 : 0].focus(); }
        }
    });
    readerBook.addEventListener('touchstart', function (event) { touchStart = event.changedTouches[0].clientX; touchY = event.changedTouches[0].clientY; }, {passive:true});
    readerBook.addEventListener('touchend', function (event) {
        var delta = event.changedTouches[0].clientX - touchStart;
        var dy = event.changedTouches[0].clientY - touchY;
        if (Math.abs(delta) > 55 && Math.abs(delta) > Math.abs(dy) * 1.5 && !window.getSelection().toString()) turn(delta < 0 ? 1 : -1);
    }, {passive:true});

    fetch('posts.json').then(function (r) { if (!r.ok) throw new Error('index'); return r.json(); }).then(function (list) {
        essays = list.filter(function (p) { return p.category === 'essay'; });
        if (!essays.length) { entries.innerHTML = '<div class="state">还没有随笔。请在 <code>posts/</code> 中添加 <code>category: essay</code> 的文章。</div>'; return; }
        renderShelf();
    }).catch(function () { entries.innerHTML = '<div class="state">书架暂时无法打开，请刷新重试。</div>'; });
})();
