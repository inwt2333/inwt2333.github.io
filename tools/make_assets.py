"""生成图标与分享卡图（favicon PNG、apple-touch-icon、og:image）。

由 tools/make_assets.py 用仓库 .venv 运行：

    .venv/Scripts/python tools/make_assets.py        # Windows
    .venv/bin/python tools/make_assets.py            # macOS / Linux

依赖 Pillow（.venv 内）。og:image 使用系统中文字体（微软雅黑），
Windows/macOS 均可运行，缺字体时会提示。
"""
import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets')

BG = (10, 10, 12)
INK = (245, 245, 247)
SOFT = (154, 154, 160)
GREEN = (48, 209, 88)
RED = (255, 90, 79)
YELLOW = (255, 214, 10)
CYAN = (66, 245, 233)


def _font(candidates, size):
    from PIL import ImageFont
    for name in candidates:
        for base in (r'C:\Windows\Fonts', '/System/Library/Fonts',
                     '/System/Library/Fonts/Supplemental'):
            path = os.path.join(base, name)
            if os.path.exists(path):
                return ImageFont.truetype(path, size)
    raise SystemExit(f'未找到可用字体 {candidates}，请调整 _font 的候选列表')


def draw_roundel(draw, cx, cy, scale, color=GREEN):
    """铁路车站标记：线路横杠 + 正圆环 + 圆心，与主页视觉一致"""
    s = scale
    draw.line([(cx - 22 * s, cy), (cx + 22 * s, cy)], fill=color, width=max(1, round(4 * s)))
    r = 11 * s
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BG, outline=color,
                 width=max(1, round(4 * s)))
    cr = 4.5 * s
    draw.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=INK)


def make_favicon(size, name, pad=0.18):
    img = Image.new('RGB', (size, size), BG)
    d = ImageDraw.Draw(img)
    draw_roundel(d, size / 2, size / 2, size / 64 * (1 - pad))
    # 圆角遮罩（浏览器/系统会自行裁圆角，PNG 保持方形即可）
    img.save(os.path.join(ASSETS, name))
    print(f'{name}  {size}x{size}')


def make_og():
    W, H = 1200, 630
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)

    # 点阵背景（与主页一致 26px 网格）
    dot = (255, 255, 255, 11)
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for y in range(13, H, 26):
        for x in range(13, W, 26):
            od.point((x, y), dot)
    img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
    d = ImageDraw.Draw(img)

    mono = _font(['consolab.ttf', 'Consolas Bold.ttf', 'Menlo.ttc'], 30)
    mono_sm = _font(['consola.ttf', 'Consolas.ttf', 'Menlo.ttc'], 26)
    cjk_bold = _font(['msyhbd.ttc', 'PingFang.ttc', 'STHeiti Medium.ttc'], 104)
    cjk_norm = _font(['msyh.ttc', 'PingFang.ttc', 'STHeiti Light.ttc'], 42)

    def spaced(text, font, xy, fill, step):
        x, y = xy
        for ch in text:
            d.text((x, y), ch, font=font, fill=fill)
            x += d.textlength(ch, font=font) + step

    spaced('INWT RAILWAY', mono, (96, 132), SOFT, 14)
    d.text((92, 186), 'Inwt · 小站', font=cjk_bold, fill=INK)
    d.text((96, 330), '随笔 · 摄影集 · 古典乐 · AI 学习', font=cjk_norm, fill=SOFT)
    d.text((96, 404), 'inwt233.cn', font=mono_sm, fill=SOFT)

    # 右侧：四条线路交汇成的小铁路图
    ox, oy = 940, 300
    d.line([(ox - 190, oy - 118), (ox + 130, oy - 118)], fill=GREEN, width=10)
    d.line([(ox - 190, oy + 130), (ox - 60, oy + 10), (ox - 20, oy - 30), (ox + 130, oy - 30)], fill=RED, width=10)
    d.line([(ox + 40, oy - 190), (ox + 40, oy + 190)], fill=YELLOW, width=10)
    d.line([(ox - 190, oy + 90), (ox - 10, oy + 90), (ox + 90, oy - 10), (ox + 130, oy - 10)], fill=CYAN, width=10)
    draw_roundel(d, ox + 40, oy - 118, 1.5, GREEN)
    draw_roundel(d, ox - 20, oy - 30, 1.5, RED)
    draw_roundel(d, ox + 40, oy + 40, 1.5, YELLOW)
    draw_roundel(d, ox - 70, oy + 90, 1.5, CYAN)

    img.save(os.path.join(ASSETS, 'og.png'))
    print(f'og.png  {W}x{H}')


if __name__ == '__main__':
    make_favicon(32, 'favicon-32.png', pad=0.06)
    make_favicon(180, 'apple-touch-icon.png', pad=0.02)
    make_og()
