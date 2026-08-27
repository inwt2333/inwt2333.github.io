import os
import json
import re
import shutil
import hashlib
from datetime import datetime
from email.utils import format_datetime
from xml.sax.saxutils import escape

SITE_URL = 'https://inwt233.cn'

POSTS_DIR = 'posts'
OUTPUT_FILE = 'posts.json'
FEED_FILE = 'feed.xml'
SITEMAP_FILE = 'sitemap.xml'
POST_PAGES_DIR = 'post'

PHOTOS_DIR = 'photos'
PHOTOS_SRC = os.path.join(PHOTOS_DIR, 'src')
PHOTOS_WEB = os.path.join(PHOTOS_DIR, 'web')
PHOTOS_THUMB = os.path.join(PHOTOS_DIR, 'thumb')
PHOTOS_JSON = 'photos.json'
MANUAL_JSON = os.path.join(PHOTOS_DIR, 'manual.json')

WEB_MAX = 2560     # 网页版长边像素；屏幕阅读足够，可显著减小仓库与流量
WEB_QUALITY = 88   # WebP 高保真，视觉上与原图无差别
THUMB_MAX = 480    # 缩略图长边像素（仅用于网格/地图）
THUMB_QUALITY = 80


# ---------------- 文章索引 ----------------

def parse_front_matter(content):
    """简单的解析 YAML 头部"""
    metadata = {}
    # 匹配 --- 之间的内容
    match = re.search(r'^---\s+(.*?)\s+---', content, re.DOTALL)
    if match:
        yaml_text = match.group(1)
        for line in yaml_text.split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                metadata[key.strip()] = value.strip()
    return metadata


def _date_key(date_str):
    """'2026-07-10 ...' -> '2026-07-10'；无法解析的旧日期排到最后"""
    m = re.match(r'(\d{4}-\d{2}-\d{2})', str(date_str or ''))
    return m.group(1) if m else '0000-00-00'


def _md_available():
    """静态文章页依赖 markdown 库；缺失时 posts.json 不写入 url 字段"""
    try:
        import markdown  # noqa: F401
        return True
    except ImportError:
        return False


def build_index():
    posts = []
    files = [f for f in os.listdir(POSTS_DIR) if f.endswith('.md')]

    for filename in files:
        filepath = os.path.join(POSTS_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        meta = parse_front_matter(content)

        # 如果没有 meta，就跳过或者用默认值
        if not meta:
            continue

        post = {
            "title": meta.get('title', '无标题'),
            "date": meta.get('date', 'Unknown'),
            "summary": meta.get('summary', ''),
            "file": filename,  # 重要：告诉前端去加载哪个文件
        }
        if meta.get('category'):
            post["category"] = meta['category']
        posts.append(post)

    # 按日期倒序（front matter 里的日期优先）；无有效日期的旧笔记沉底
    posts.sort(key=lambda p: (_date_key(p['date']), p['file']), reverse=True)

    # 随笔会生成静态页 post/<slug>/，前端优先使用该地址
    if _md_available():
        for post in posts:
            if post.get('category') == 'essay':
                post["url"] = f"{POST_PAGES_DIR}/{os.path.splitext(post['file'])[0]}/"

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)

    print(f"文章索引构建完成！共 {len(posts)} 篇文章。已更新 {OUTPUT_FILE}")
    return posts


# ---------------- 文章静态页 ----------------

POST_PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>__TITLE__ · Inwt</title>
    <meta name="description" content="__DESCRIPTION__">
    <link rel="canonical" href="__SITE__/__SLUG__/">
    <meta name="theme-color" content="#f7f3ea">
    <meta property="og:site_name" content="Inwt · 小站">
    <meta property="og:type" content="article">
    <meta property="og:url" content="__SITE__/__SLUG__/">
    <meta property="og:title" content="__TITLE__ · Inwt">
    <meta property="og:description" content="__DESCRIPTION__">
    <meta property="og:image" content="__SITE__/assets/og.png">
    <meta property="og:locale" content="zh_CN">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" href="../../assets/favicon.svg" type="image/svg+xml">
    <link rel="icon" href="../../assets/favicon-32.png" sizes="32x32" type="image/png">
    <link rel="apple-touch-icon" href="../../assets/apple-touch-icon.png">
    <!-- 字体（非阻塞：加载失败时优雅回退到系统宋体） -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;900&family=Space+Mono:wght@400;700&display=swap" media="print" onload="this.media='all'">
    <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;900&family=Space+Mono:wght@400;700&display=swap"></noscript>
    <link rel="stylesheet" href="../../assets/article.css">
</head>
<body>

    <div id="progress" aria-hidden="true"></div>

    <header class="page-nav">
        <div class="page-nav-inner">
            <a class="nav-back" href="../../essays.html">
                <svg width="14" height="10" viewBox="0 0 16 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 5H2M6 1L2 5l4 4" stroke="currentColor" stroke-width="1.4"/></svg>
                返回随笔
            </a>
            <nav class="nav-links" aria-label="页面导航">
                <a href="../../index.html">主页</a>
                <a href="../../essays.html">随笔</a>
                <a href="../../gallery.html">摄影集</a>
                <a href="../../about.html">关于</a>
            </nav>
        </div>
    </header>

    <div class="article-container">
        <header class="article-head">
            <div class="article-meta" id="date-placeholder">__DATE__</div>
            <h1 class="article-title" id="title-placeholder">__TITLE__</h1>
        </header>

        <details class="toc" id="toc" hidden>
            <summary>目录 · CONTENTS</summary>
            <div id="toc-list"></div>
        </details>

        <div id="content" class="markdown-body">
__CONTENT__
        </div>

        <nav class="post-nav" id="post-nav" aria-label="上下篇"></nav>

        <footer class="article-footer">
            <a href="../../essays.html">
                <svg width="14" height="10" viewBox="0 0 16 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 5H2M6 1L2 5l4 4" stroke="currentColor" stroke-width="1.4"/></svg>
                返回随笔列表
            </a>
            <a href="../../index.html">返回主页 →</a>
        </footer>
    </div>

    <script src="../../assets/article.js" data-mode="static" data-file="__FILE__" data-title="__TITLE__" data-date="__DATE__" data-root="../../" defer></script>
</body>
</html>
"""


def _strip_front_matter(text):
    return re.sub(r'^---[\s\S]*?---\s*', '', text)


def build_post_pages(posts):
    """为随笔生成静态文章页（SEO 友好的独立 URL：post/<slug>/）"""
    try:
        import markdown as _md
    except ImportError:
        print("提示：未安装 markdown 库，跳过静态文章页。运行: pip install markdown")
        return

    md = _md.Markdown(extensions=['tables', 'fenced_code', 'sane_lists'])
    essays = [p for p in posts if p.get('category') == 'essay']
    wanted = set()

    for post in essays:
        slug = os.path.splitext(post['file'])[0]
        wanted.add(slug)
        src = os.path.join(POSTS_DIR, post['file'])
        if not os.path.exists(src):
            continue
        with open(src, 'r', encoding='utf-8') as f:
            raw = f.read()
        md.reset()
        content_html = md.convert(_strip_front_matter(raw))

        title = escape(post['title'])
        desc = escape(post.get('summary') or 'Inwt 的随笔。')[:150]
        page = (POST_PAGE_TEMPLATE
                .replace('__SITE__', SITE_URL)
                .replace('__SLUG__', f'{POST_PAGES_DIR}/{slug}')
                .replace('__TITLE__', title)
                .replace('__DESCRIPTION__', desc)
                .replace('__DATE__', escape(post.get('date') or ''))
                .replace('__FILE__', escape(post['file']))
                .replace('__CONTENT__', content_html))

        out_dir = os.path.join(POST_PAGES_DIR, slug)
        os.makedirs(out_dir, exist_ok=True)
        with open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(page)

    # 清理已删除文章的静态页
    if os.path.isdir(POST_PAGES_DIR):
        for slug in os.listdir(POST_PAGES_DIR):
            if slug not in wanted:
                print(f"移除已删除文章的静态页：{slug}")
                shutil.rmtree(os.path.join(POST_PAGES_DIR, slug), ignore_errors=True)

    print(f"静态文章页构建完成！共 {len(essays)} 篇。位于 {POST_PAGES_DIR}/<slug>/")


# ---------------- RSS 订阅 ----------------

def _rfc822(date_str):
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M', '%Y-%m-%d'):
        try:
            return format_datetime(datetime.strptime(str(date_str).strip(), fmt))
        except ValueError:
            continue
    return None


def build_feed(posts):
    essays = [p for p in posts if p.get('category') == 'essay'][:20]
    items = []
    for p in essays:
        link = f"{SITE_URL}/{p['url']}" if p.get('url') else (
            f"{SITE_URL}/article.html?file={p['file']}")
        pub = _rfc822(p.get('date'))
        items.append(
            '        <item>\n'
            f'            <title>{escape(p["title"])}</title>\n'
            f'            <link>{escape(link)}</link>\n'
            f'            <guid isPermaLink="true">{escape(link)}</guid>\n'
            + (f'            <pubDate>{pub}</pubDate>\n' if pub else '')
            + f'            <description>{escape(p.get("summary") or "")}</description>\n'
            '        </item>'
        )

    feed = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
        '    <channel>\n'
        f'        <title>Inwt · 随笔</title>\n'
        f'        <link>{SITE_URL}/essays.html</link>\n'
        '        <description>一些曾写下的小文章——关于城市与行走，关于人与事。</description>\n'
        '        <language>zh-CN</language>\n'
        f'        <lastBuildDate>{format_datetime(datetime.now())}</lastBuildDate>\n'
        f'        <atom:link href="{SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>\n'
        + '\n'.join(items) + '\n'
        '    </channel>\n'
        '</rss>\n'
    )
    with open(FEED_FILE, 'w', encoding='utf-8') as f:
        f.write(feed)
    print(f"RSS 订阅已生成！{len(essays)} 条，位于 {FEED_FILE}")


# ---------------- Sitemap ----------------

def build_sitemap(posts):
    today = datetime.now().strftime('%Y-%m-%d')
    urls = [
        ('/', today),
        ('/essays.html', today),
        ('/gallery.html', today),
        ('/about.html', today),
    ] + [
        ('/' + p['url'], _date_key(p.get('date')))
        for p in posts if p.get('category') == 'essay' and p.get('url')
    ]

    parts = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, lastmod in urls:
        if lastmod == '0000-00-00':
            lastmod = today
        parts.append(
            '    <url>\n'
            f'        <loc>{SITE_URL}{loc}</loc>\n'
            f'        <lastmod>{lastmod}</lastmod>\n'
            '    </url>'
        )
    parts.append('</urlset>')
    with open(SITEMAP_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(parts) + '\n')
    print(f"Sitemap 已生成！{len(urls)} 个地址，位于 {SITEMAP_FILE}")


# ---------------- 照片索引 ----------------

def _dms_to_deg(value, ref):
    """EXIF GPS 坐标 (度,分,秒) 转十进制"""
    if not isinstance(value, (list, tuple)) or len(value) < 3:
        return None
    try:
        deg = float(value[0]) + float(value[1]) / 60.0 + float(value[2]) / 3600.0
    except (TypeError, ValueError, ZeroDivisionError):
        return None
    return -deg if ref in ('S', 'W') else deg


def _fmt_aper(v):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    s = f'{f:.2f}'.rstrip('0').rstrip('.')
    return f'\u0192/{s}'


def _fmt_exposure(v):
    try:
        e = float(v)
    except (TypeError, ValueError):
        return None
    if e <= 0:
        return None
    if e < 1:
        return f'1/{round(1 / e)}s'
    return f'{e:g}s'


def _read_exif(img):
    """读取拍摄时间、GPS 与拍摄参数，返回 (date_str, lat, lng, extra_dict)"""
    date, lat, lng = None, None, None
    extra = {}
    try:
        exif = img.getexif()
        raw = None
        ifd = {}
        try:
            ifd = exif.get_ifd(0x8769)  # Exif IFD
            raw = ifd.get(36867) or ifd.get(306)
        except Exception:
            pass
        if not raw:
            raw = exif.get(306)  # DateTime
        if raw:
            # "2025:03:01 10:20:30" -> "2025-03-01 10:20:30"
            date = raw.replace(':', '-', 2).strip()

        # 器材与曝光参数（缺项静默跳过）
        make = str(exif.get(271) or '').strip()
        model = str(exif.get(272) or '').strip()
        if model.startswith(make):
            model = model[len(make):].strip()
        camera = ' '.join(x for x in (make, model) if x).strip()
        if camera:
            extra['camera'] = camera
        try:
            lens = str(ifd.get(42036) or '').strip()  # LensModel
            if lens:
                extra['lens'] = lens
        except Exception:
            pass
        fnum = _fmt_aper(ifd.get(33437))
        if fnum:
            extra['f'] = fnum
        expo = _fmt_exposure(ifd.get(33434))
        if expo:
            extra['s'] = expo
        try:
            iso = ifd.get(34855)
            if iso:
                extra['iso'] = int(iso)
        except (TypeError, ValueError):
            pass
    except Exception:
        pass
    try:
        gps = exif.get_ifd(0x8825)  # GPS IFD
        if gps is not None:
            lat = _dms_to_deg(gps.get(2), gps.get(1, 'N'))
            lng = _dms_to_deg(gps.get(4), gps.get(3, 'E'))
    except Exception:
        pass
    return date, lat, lng, extra


def _load_json(path, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"警告：解析 {path} 失败（{e}），已忽略。")
        return default


def _make_sizes(img, web_path, thumb_path):
    """生成网页版与缩略图两张 WebP"""
    from PIL import ImageOps
    img = ImageOps.exif_transpose(img)
    if img.mode != 'RGB':
        img = img.convert('RGB')
    web = img.copy()
    if WEB_MAX:
        web.thumbnail((WEB_MAX, WEB_MAX))
    web.save(web_path, 'WEBP', quality=WEB_QUALITY, method=4)
    thumb = img.copy()
    thumb.thumbnail((THUMB_MAX, THUMB_MAX))
    thumb.save(thumb_path, 'WEBP', quality=THUMB_QUALITY, method=4)


def build_photos():
    """扫描 photos/src，提取 EXIF，生成 web/thumb 与 photos.json"""
    try:
        from PIL import Image, ImageOps
    except ImportError:
        print("提示：未安装 Pillow，跳过照片构建。运行: pip install pillow pillow-heif")
        return

    heic_ok = False
    try:
        from pillow_heif import register_heif_opener
        register_heif_opener()
        heic_ok = True
    except ImportError:
        pass

    old_entries = {e.get('file'): e for e in _load_json(PHOTOS_JSON, []) if e.get('file')}
    manual = _load_json(MANUAL_JSON, {})

    os.makedirs(PHOTOS_WEB, exist_ok=True)
    os.makedirs(PHOTOS_THUMB, exist_ok=True)

    files = []
    if os.path.isdir(PHOTOS_SRC):
        for f in sorted(os.listdir(PHOTOS_SRC)):
            if f.startswith('.'):
                continue
            ext = os.path.splitext(f)[1].lower()
            if ext in ('.jpg', '.jpeg', '.png'):
                files.append(f)
            elif ext in ('.heic', '.heif'):
                if heic_ok:
                    files.append(f)
                else:
                    print(f"跳过 {f}：未安装 pillow-heif（运行 pip install pillow-heif）")

    entries = []
    used_stems = set()

    for fname in files:
        src_path = os.path.join(PHOTOS_SRC, fname)
        stem = os.path.splitext(fname)[0]
        if stem in used_stems:  # 不同扩展名同名文件，附加短哈希避免覆盖
            stem = f"{stem}_{hashlib.md5(fname.encode('utf-8')).hexdigest()[:6]}"
        used_stems.add(stem)
        web_path = os.path.join(PHOTOS_WEB, f"{stem}.webp")
        thumb_path = os.path.join(PHOTOS_THUMB, f"{stem}.webp")
        web_rel = web_path.replace(os.sep, '/')
        thumb_rel = thumb_path.replace(os.sep, '/')

        entry = {"file": fname, "web": web_rel, "thumb": thumb_rel}
        try:
            with Image.open(src_path) as im:
                date, lat, lng, exif_extra = _read_exif(im)
                # 宽高比按转正后的方向计算，供前端等高行布局使用
                w, h = ImageOps.exif_transpose(im).size
                entry["ratio"] = round(w / h, 4) if h else 1.5
                fresh = (os.path.exists(web_path) and os.path.exists(thumb_path)
                         and os.path.getmtime(web_path) >= os.path.getmtime(src_path)
                         and os.path.getmtime(thumb_path) >= os.path.getmtime(src_path))
                if not fresh:
                    _make_sizes(im, web_path, thumb_path)
        except Exception as e:
            print(f"处理 {fname} 失败：{e}")
            continue

        m = manual.get(fname, {})
        # 坐标优先级：EXIF > manual.json > 上次索引
        if lat is None and isinstance(m.get('lat'), (int, float)):
            lat = m['lat']
        if lng is None and isinstance(m.get('lng'), (int, float)):
            lng = m['lng']
        if lat is None and old_entries.get(fname, {}).get('lat') is not None:
            lat = old_entries[fname]['lat']
            lng = old_entries[fname].get('lng')

        entry.update({
            "title": m.get('title', ''),
            "location": m.get('location', ''),
            "date": m.get('date') or date or '',
            "desc": m.get('desc', ''),
            "lat": round(lat, 6) if lat is not None else None,
            "lng": round(lng, 6) if lng is not None else None,
        })
        entry.update(exif_extra)
        entries.append(entry)

    # src 中已不存在、但上次索引里有的照片：
    # - src 有照片时视为已删除，清除条目并顺手删除其 web/thumb 产物
    # - src 为空（例如换电脑克隆仓库后）时保留，避免误清索引
    if files:
        seen = {e['file'] for e in entries}
        for fname in [f for f in old_entries if f not in seen]:
            print(f"移除已删除的照片：{fname}")
            for key in ('web', 'thumb'):
                p = old_entries[fname].get(key)
                if p and os.path.exists(p):
                    os.remove(p)
    else:
        seen = {e['file'] for e in entries}
        for fname, e in old_entries.items():
            if fname not in seen:
                entries.append(dict(e))

    entries.sort(key=lambda e: (e.get('date') or '', e['file']), reverse=True)

    with open(PHOTOS_JSON, 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)

    located = sum(1 for e in entries if e['lat'] is not None)
    print(f"照片索引构建完成！共 {len(entries)} 张（{located} 张有定位）。已更新 {PHOTOS_JSON}")
    with_camera = sum(1 for e in entries if e.get('camera'))
    if with_camera:
        print(f"其中 {with_camera} 张带有器材信息（灯箱中展示）。")
    missing = [e['file'] for e in entries if e['lat'] is None]
    if missing:
        print("以下照片缺少拍摄位置（可在 locate.html 中地图点选标注后重新构建）：")
        for fname in missing:
            print(f"  - {fname}")


if __name__ == '__main__':
    posts = build_index()
    build_post_pages(posts)
    build_feed(posts)
    build_sitemap(posts)
    build_photos()
