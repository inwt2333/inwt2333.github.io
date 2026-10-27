"""Downsample the locally vendored RGBE environment without a runtime dependency."""
from pathlib import Path
import math
from urllib.request import urlopen


def compact(source, target, width=256, height=128):
    data = Path(source).read_bytes() if Path(source).exists() else urlopen('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr', timeout=45).read()
    header_end = data.index(b'\n\n') + 2
    size_end = data.index(b'\n', header_end)
    _, source_height, _, source_width = data[header_end:size_end].decode().split()
    source_width, source_height = int(source_width), int(source_height)
    position = size_end + 1
    rows = []
    for _ in range(source_height):
        assert data[position:position + 2] == b'\x02\x02'
        assert int.from_bytes(data[position + 2:position + 4], 'big') == source_width
        position += 4
        row = []
        for _ in range(4):
            channel = bytearray()
            while len(channel) < source_width:
                count = data[position]
                position += 1
                if count > 128:
                    channel.extend([data[position]] * (count - 128))
                    position += 1
                else:
                    channel.extend(data[position:position + count])
                    position += count
            row.append(channel)
        rows.append(row)
    output = bytearray(f'#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y {height} +X {width}\n'.encode())
    step_x, step_y = source_width // width, source_height // height
    for y in range(height):
        channels = [bytearray() for _ in range(4)]
        for x in range(width):
            rgb = [0., 0., 0.]
            for yy in range(y * step_y, (y + 1) * step_y):
                for xx in range(x * step_x, (x + 1) * step_x):
                    exponent = rows[yy][3][xx]
                    if exponent:
                        scale = math.ldexp(1., exponent - 136) / (step_x * step_y)
                        for c in range(3):
                            rgb[c] += rows[yy][c][xx] * scale
            maximum = max(rgb)
            if maximum <= 1e-30:
                encoded = [0, 0, 0, 0]
            else:
                mantissa, exponent = math.frexp(maximum)
                scale = mantissa * 256 / maximum
                encoded = [min(255, int(c * scale)) for c in rgb] + [exponent + 128]
            for channel, value in zip(channels, encoded):
                channel.append(value)
        output.extend(bytes([2, 2, width >> 8, width & 255]))
        for channel in channels:
            for start in range(0, width, 128):
                chunk = channel[start:start + 128]
                output.append(len(chunk))
                output.extend(chunk)
    Path(target).write_bytes(output)
    print(f'{source}: {len(data):,} -> {target}: {len(output):,} bytes')


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    compact(root / 'gym/studio.hdr', root / 'gym/studio-small.hdr')
