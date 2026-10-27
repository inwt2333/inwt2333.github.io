"""Build the three locally served gallery prints (Pillow; run from repo root)."""
from io import BytesIO
from pathlib import Path
from urllib.request import urlopen

from PIL import Image, ImageDraw, ImageFont

ART = [
    ('miku', 'HATSUNE MIKU', '01 / VIRTUAL SINGER', '#c9e0d7',
     'https://piapro.net/intl/images/ch_img_miku.png', 'Art by KEI / Crypton Future Media, INC.'),
    ('firefly', 'FIREFLY', '02 / STELLAR JOURNEY', '#d5dbc1',
     'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/image/character_portrait/1310.png', 'Honkai: Star Rail / HoYoverse'),
    ('robin', 'ROBIN', '03 / STELLAR JOURNEY', '#d8d3e5',
     'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/image/character_portrait/1309.png', 'Honkai: Star Rail / HoYoverse'),
]


def font(size):
    return ImageFont.truetype('C:/Windows/Fonts/arial.ttf', size)


def build():
    output = Path(__file__).resolve().parents[1] / 'gym' / 'art'
    output.mkdir(exist_ok=True)
    for slug, name, series, tint, url, credit in ART:
        source = output / f'{slug}.png'
        image = Image.open(source if source.exists() else BytesIO(urlopen(url, timeout=45).read())).convert('RGBA')
        poster = Image.new('RGB', (840, 1200), '#eae7df')
        draw = ImageDraw.Draw(poster)
        draw.rectangle((30, 30, 810, 1170), outline='#bebdb1', width=1)
        draw.ellipse((-220, 80, 1050, 1350), fill=tint)
        draw.ellipse((120, 210, 730, 820), outline='#f6f3e9', width=2)
        draw.text((66, 72), series, font=font(15), fill='#51605a')
        if slug == 'miku':
            image.thumbnail((620, 905), Image.Resampling.LANCZOS)
            xy = ((840 - image.width) // 2, 145)
        else:
            image.thumbnail((1080, 1000), Image.Resampling.LANCZOS)
            xy = ((840 - image.width) // 2, 120)
        poster.paste(image, xy, image)
        draw = ImageDraw.Draw(poster)
        draw.line((66, 1085, 774, 1085), fill='#9ba89e', width=1)
        draw.text((66, 1104), name, font=font(29), fill='#344940')
        draw.text((66, 1150), credit, font=font(12), fill='#64716a')
        poster.save(output / f'{slug}.webp', quality=91, method=6)
        print(slug, (output / f'{slug}.webp').stat().st_size)


if __name__ == '__main__':
    build()
