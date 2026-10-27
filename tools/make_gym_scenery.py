"""Make a seamless 360-degree wallpaper background for the gym (Pillow)."""
from io import BytesIO
from pathlib import Path
from urllib.request import urlopen

from PIL import Image, ImageOps

SOURCE = 'https://cdn.wallpapersafari.com/54/58/tA5vpb.png'


def build(source=None):
    root = Path(__file__).resolve().parents[1]
    image = Image.open(source or BytesIO(urlopen(SOURCE, timeout=45).read())).convert('RGB')
    image.thumbnail((2048, 1200), Image.Resampling.LANCZOS)
    # Join each edge to its mirror, including the wrap from 360 degrees to zero.
    # Extend only the sky/ground beyond the picture; never leave an empty border.
    band = Image.new('RGB', (4096, image.height))
    band.paste(image, (0, 0))
    band.paste(ImageOps.mirror(image), (2048, 0))
    panorama = Image.new('RGB', (4096, 2048))
    top = (2048 - image.height) // 2
    panorama.paste(band.crop((0, 0, 4096, 1)).resize((4096, top)), (0, 0))
    panorama.paste(band, (0, top))
    bottom = 2048 - top - image.height
    panorama.paste(band.crop((0, image.height - 1, 4096, image.height)).resize((4096, bottom)), (0, top + image.height))
    output = root / 'gym' / 'scenery.webp'
    panorama.save(output, quality=86, method=6)
    print(output, output.stat().st_size)


if __name__ == '__main__':
    import sys
    build(sys.argv[1] if len(sys.argv) > 1 else None)
