"""生成主页/404/关于页使用的自托管字体子集（woff2）。

背景：Google Fonts 在大陆基本不可达，且阻塞式样式表会卡住首屏。
主页等深色页面的文字量固定且有限，直接把 Noto Sans SC（4 个字重）
与 Space Mono 子集化放进仓库，首次访问零外部请求。

字符集取自：index.html / 404.html / about.html 全部文本 + posts.json
随笔标题与日期。新增随笔后建议重跑本脚本：

    .venv/Scripts/python tools/make_fonts.py        # Windows
    .venv/bin/python tools/make_fonts.py            # macOS / Linux

依赖：fonttools + brotli（.venv 内），字体源文件位于 tools/fonts-src/
（来自 google/fonts 仓库，已 gitignore）。
"""
import json
import os
import re
import string

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_VF = os.path.join(ROOT, 'tools', 'fonts-src', 'NotoSansSC-VF.ttf')
SRC_MONO = os.path.join(ROOT, 'tools', 'fonts-src', 'SpaceMono-Regular.ttf')
OUT_DIR = os.path.join(ROOT, 'assets', 'fonts')

# 子集覆盖的页面：这些页面引用 assets/fonts/fonts.css
PAGES = ['index.html', '404.html', 'about.html']

WEIGHTS = [400, 500, 700, 900]


def collect_charset():
    chars = set(string.printable)
    for page in PAGES:
        path = os.path.join(ROOT, page)
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                chars.update(f.read())
    # 随笔标题/日期会注入主页发车信息牌与副标签
    posts_path = os.path.join(ROOT, 'posts.json')
    if os.path.exists(posts_path):
        with open(posts_path, 'r', encoding='utf-8') as f:
            for p in json.load(f):
                chars.update(p.get('title', ''))
                chars.update(str(p.get('date', '')))
    # 常用补充：日期、量词与标点，给未来新文章标题留余量
    chars.update('〇一二三四五六七八九十年月日点张处篇最新发车信息站照片足迹·—…％（）')
    # 过滤控制字符
    chars = {c for c in chars if ord(c) >= 32 and c not in '\x0b\x0c'}
    return ''.join(sorted(chars))


def subset_noto(text):
    from fontTools import ttLib
    from fontTools.subset import Subsetter, Options
    from fontTools.varLib import instancer

    for w in WEIGHTS:
        font = ttLib.TTFont(SRC_VF)
        instancer.instantiateVariableFont(font, {'wght': w}, inplace=True)
        opts = Options()
        opts.flavor = 'woff2'
        opts.layout_features = ['*']
        subsetter = Subsetter(opts)
        subsetter.populate(text=text)
        subsetter.subset(font)
        out = os.path.join(OUT_DIR, f'noto-sans-sc-{w}.woff2')
        font.save(out)
        print(f'noto-sans-sc-{w}.woff2  {os.path.getsize(out) / 1024:.1f} KB')


def subset_mono(text):
    from fontTools import ttLib
    from fontTools.subset import Subsetter, Options

    font = ttLib.TTFont(SRC_MONO)
    opts = Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    subsetter = Subsetter(opts)
    subsetter.populate(text=text)
    subsetter.subset(font)
    out = os.path.join(OUT_DIR, 'space-mono-400.woff2')
    font.save(out)
    print(f'space-mono-400.woff2    {os.path.getsize(out) / 1024:.1f} KB')


def write_css():
    rules = []
    for w in WEIGHTS:
        rules.append(
            "@font-face {\n"
            "  font-family: 'Noto Sans SC';\n"
            "  font-style: normal;\n"
            f"  font-weight: {w};\n"
            "  font-display: swap;\n"
            f"  src: url('noto-sans-sc-{w}.woff2') format('woff2');\n"
            "}"
        )
    rules.append(
        "@font-face {\n"
        "  font-family: 'Space Mono';\n"
        "  font-style: normal;\n"
        "  font-weight: 400;\n"
        "  font-display: swap;\n"
        "  src: url('space-mono-400.woff2') format('woff2');\n"
        "}"
    )
    css = ("/* 由 tools/make_fonts.py 生成：按站内实际用字子集化的自托管字体 */\n"
           + "\n".join(rules) + "\n")
    with open(os.path.join(OUT_DIR, 'fonts.css'), 'w', encoding='utf-8') as f:
        f.write(css)
    print('fonts.css 已更新')


if __name__ == '__main__':
    if not os.path.exists(SRC_VF):
        raise SystemExit('缺少字体源文件 tools/fonts-src/NotoSansSC-VF.ttf，请先下载')
    os.makedirs(OUT_DIR, exist_ok=True)
    text = collect_charset()
    print(f'字符集共 {len(text)} 个字符')
    subset_noto(text)
    subset_mono(text)
    write_css()
