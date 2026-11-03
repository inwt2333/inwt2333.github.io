"""Build the independent food journal using the gallery's image processing helpers."""
import hashlib
import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from build import _make_sizes, _read_exif


def _load(path, default):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else default


def _date(value):
    try:
        return datetime.strptime(str(value)[:10].replace(':', '-'), '%Y-%m-%d').strftime('%Y-%m-%d')
    except ValueError:
        return None


def normalize_dishes(value):
    """Accept legacy names while keeping each optional price attached to its dish."""
    result = []
    for dish in value or []:
        if isinstance(dish, str):
            dish = {'name': dish, 'price': ''}
        if isinstance(dish, dict) and str(dish.get('name') or '').strip():
            result.append({'name': str(dish['name']).strip(), 'price': str(dish.get('price') or '').strip(), 'note': str(dish.get('note') or '').strip()})
    return result


def build_food(root=None):
    from PIL import Image, ImageOps
    try:
        from pillow_heif import register_heif_opener
        register_heif_opener()
    except ImportError:
        pass
    root = Path(root or Path(__file__).resolve().parent)
    folder = root / 'food'
    for name in ('src', 'web', 'thumb'):
        (folder / name).mkdir(parents=True, exist_ok=True)
    old = _load(root/'food.json', [])
    photos = {p['file']: dict(p) for meal in old for p in meal['photos']}
    manual = _load(folder/'manual.json', {})
    today = datetime.now(ZoneInfo('Asia/Shanghai')).strftime('%Y-%m-%d')
    for src in sorted((folder/'src').iterdir()):
        if src.suffix.lower() not in {'.jpg', '.jpeg', '.png', '.heic', '.heif'}:
            continue
        # Stable across devices, extensions, and partial source collections.
        stem = hashlib.sha256(src.name.encode()).hexdigest()[:20]
        web, thumb = folder/'web'/f'{stem}.webp', folder/'thumb'/f'{stem}.webp'
        try:
            with Image.open(src) as image:
                shot, *_ = _read_exif(image)
                shot = shot or image.getexif().get(36867)
                w, h = ImageOps.exif_transpose(image).size
                if not all(p.exists() and p.stat().st_mtime >= src.stat().st_mtime for p in (web, thumb)):
                    _make_sizes(image, str(web), str(thumb))
                previous = photos.get(src.name, {})
                photos[src.name] = {
                    'file': src.name, 'sha256': hashlib.sha256(src.read_bytes()).hexdigest(), 'web': web.relative_to(root).as_posix(),
                    'thumb': thumb.relative_to(root).as_posix(), 'ratio': round(w/h, 4),
                    'source_date': _date(shot) or previous.get('source_date') or today,
                }
        except Exception as error:
            print(f'美食照片处理失败 {src.name}: {error}')
    groups = {}
    for name, photo in photos.items():
        override = manual.get('photos', {}).get(name, {})
        day = _date(override.get('date')) or photo.get('source_date') or photo.get('date') or today
        photo['date'] = day
        for field in ('location', 'dish', 'note'):
            photo[field] = str(override.get(field, photo.get(field, '')) or '')
        raw = override.get('dishes')
        if raw is None:
            raw = [override['dish']] if 'dish' in override else photo.get('dishes', [photo.get('dish', '')])
        photo['dishes'] = normalize_dishes(raw)
        photo['dish'] = '、'.join(d['name'] for d in photo['dishes'])
        groups.setdefault(day, []).append(photo)
    meals = []
    for day in sorted(groups, reverse=True):
        items = sorted(groups[day], key=lambda p: p['file'])
        meta = manual.get('meals', {}).get(day, {})
        cover = meta.get('cover')
        meals.append({'id': day, 'date': day, 'title': str(meta.get('title') or ''),
                      'note': str(meta.get('note') or ''),
                      'cover': cover if any(p['file']==cover for p in items) else items[0]['file'],
                      'photos': items})
    # Replace atomically so uploads and page refreshes never see partial JSON.
    target = root/'food.json'
    staging = root/'food.json.tmp'
    staging.write_text(json.dumps(meals, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    staging.replace(target)
    print(f'美食索引构建完成：{len(photos)} 张照片，{len(meals)} 张小票')
    return meals


if __name__ == '__main__':
    build_food()
