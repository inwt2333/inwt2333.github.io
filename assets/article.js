/* 文章页共享逻辑：article.html（查询串模式）与 post/<slug>/index.html（静态模式）共用。
 *
 * 用法：
 *   查询串模式（article.html）：<script src="assets/article.js" defer></script>
 *       从 ?file=&title=&date= 读取参数，拉取 Markdown 用 marked 渲染。
 *   静态模式（post/<slug>/）：<script src="../../assets/article.js" data-mode="static"
 *       data-file="xxx.md" data-title="..." data-date="..." data-root="../../" defer></script>
 *       正文已由 build.py 预渲染在 #content 中，这里只做增强（目录/进度条/上下篇/公式）。
 */
(function () {
    'use strict';

    var script = document.currentScript;
    var qs = new URLSearchParams(location.search);
    var ROOT = (script.dataset.root || '').replace(/\/?$/, '/');
    var MODE = script.dataset.mode || 'query';
    var FILE = script.dataset.file || qs.get('file');
    var TITLE = script.dataset.title || qs.get('title') || '';
    var DATE = script.dataset.date || qs.get('date') || '';

    var content = document.getElementById('content');

    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    }

    /* 静态页 ROOT 指向站点根；article.html 本身在根目录 */
    if (ROOT === '/' || ROOT === './') ROOT = '';

    /* ---------- 头部信息 ---------- */
    if (TITLE) {
        document.title = TITLE + ' · Inwt';
        var tEl = document.getElementById('title-placeholder');
        if (tEl) tEl.textContent = TITLE;
    }
    if (DATE) {
        var dEl = document.getElementById('date-placeholder');
        if (dEl) dEl.textContent = DATE;
    }

    /* ---------- 预计阅读时长 ---------- */
    function readingTime() {
        var meta = document.getElementById('date-placeholder');
        if (!meta || !content) return;
        var chars = (content.innerText || '').replace(/\s/g, '').length;
        if (!chars) return;
        var mins = Math.max(1, Math.round(chars / 400));
        meta.textContent = (meta.textContent ? meta.textContent + ' · ' : '') + '约 ' + mins + ' 分钟';
    }

    /* ---------- 目录 ---------- */
    function buildToc() {
        if (!content) return;
        var heads = content.querySelectorAll('h2, h3');
        if (heads.length < 3) return;
        var toc = document.getElementById('toc');
        var list = document.getElementById('toc-list');
        if (!toc || !list) return;

        var open = document.createElement('ol');
        var lastTop = null;
        heads.forEach(function (h, i) {
            if (!h.id) h.id = 'sec-' + i;
            var li = document.createElement('li');
            li.className = h.tagName === 'H3' ? 'toc-h3' : 'toc-h2';
            var a = document.createElement('a');
            a.href = '#' + h.id;
            a.textContent = h.textContent;
            li.appendChild(a);
            if (h.tagName === 'H3') {
                if (!lastTop) { open.appendChild(li); return; }
                var sub = lastTop.querySelector(':scope > ol');
                if (!sub) { sub = document.createElement('ol'); lastTop.appendChild(sub); }
                sub.appendChild(li);
            } else {
                open.appendChild(li);
                lastTop = li;
            }
        });
        list.appendChild(open);
        toc.hidden = false;
        /* 宽屏下默认展开侧栏目录 */
        if (matchMedia('(min-width: 1280px)').matches) toc.open = true;
    }

    /* ---------- 阅读进度条 ---------- */
    (function progress() {
        var bar = document.getElementById('progress');
        if (!bar) return;
        function update() {
            var h = document.documentElement;
            var max = h.scrollHeight - h.clientHeight;
            bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
        }
        addEventListener('scroll', update, { passive: true });
        update();
    })();

    /* ---------- 上一篇 / 下一篇（posts.json 按日期倒序：前一篇更新，后一篇更早） ---------- */
    function prevNext() {
        var nav = document.getElementById('post-nav');
        if (!nav || !FILE) return;
        fetch(ROOT + 'posts.json')
            .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
            .then(function (list) {
                var essays = list.filter(function (p) { return p.category === 'essay'; });
                var i = essays.findIndex(function (p) { return p.file === FILE; });
                if (i < 0) return;
                var prev = essays[i - 1], next = essays[i + 1];
                function href(p) {
                    return p.url ? ROOT + p.url
                        : ROOT + 'article.html?file=' + encodeURIComponent(p.file)
                          + '&title=' + encodeURIComponent(p.title)
                          + '&date=' + encodeURIComponent(p.date || '');
                }
                nav.innerHTML =
                    (prev
                        ? '<a class="prev" href="' + href(prev) + '"><span class="pn-label">« 上一篇（更新）</span><span class="pn-title">' + esc(prev.title) + '</span></a>'
                        : '<span class="pn-empty"></span>') +
                    (next
                        ? '<a class="next" href="' + href(next) + '"><span class="pn-label">下一篇（更早）»</span><span class="pn-title">' + esc(next.title) + '</span></a>'
                        : '<span class="pn-empty"></span>');
            })
            .catch(function () {});
    }

    /* ---------- MathJax：检测到公式标记才按需加载 ---------- */
    function loadMathJax() {
        if (document.getElementById('MathJax-script')) return;
        window.MathJax = {
            tex: {
                inlineMath: [['$', '$'], ['\\(', '\\)']],
                displayMath: [['$$', '$$'], ['\\[', '\\]']],
                processEscapes: true
            },
            options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'] }
        };
        var s = document.createElement('script');
        s.id = 'MathJax-script';
        s.async = true;
        s.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
        document.head.appendChild(s);
    }

    function needsMath(text) {
        return /\$\$|\\begin\{|\\\[|\\\(|\$[^\s$]/.test(text);
    }

    function afterRender(rawText) {
        readingTime();
        buildToc();
        prevNext();
        if (rawText && needsMath(rawText)) loadMathJax();
    }

    /* ---------- 正文渲染 ---------- */
    if (MODE === 'static') {
        afterRender(content ? content.innerHTML : '');
    } else if (FILE) {
        fetch(ROOT + 'posts/' + encodeURIComponent(FILE))
            .then(function (r) {
                if (!r.ok) throw new Error('文件未找到');
                return r.text();
            })
            .then(function (text) {
                var body = text.replace(/^---[\s\S]*?---\s*/, '');
                content.innerHTML = window.marked ? marked.parse(body) : '<p style="color:var(--seal)">渲染器加载失败，请刷新重试。</p>';
                afterRender(body);
            })
            .catch(function (err) {
                content.innerHTML = '<p style="color:var(--seal); text-align:center;">文章加载失败：' + esc(err.message) + '</p>';
            });
    } else {
        content.innerHTML = '<p style="text-align:center;">无效的文章链接。</p>';
    }
})();
