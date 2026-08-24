import os
import json
import re
import hashlib

POSTS_DIR = 'posts'
OUTPUT_FILE = 'posts.json'

PHOTOS_DIR = 'photos'
PHOTOS_SRC = os.path.join(PHOTOS_DIR, 'src')
PHOTOS_WEB = os.path.join(PHOTOS_DIR, 'web')
PHOTOS_THUMB = os.path.join(PHOTOS_DIR, 'thumb')
PHOTOS_JSON = 'photos.json'
MANUAL_JSON = os.path.join(PHOTOS_DIR, 'manual.json')

WEB_MAX = None      # 网页版长边像素；None = 保留原始分辨率
WEB_QUALITY = 90    # WebP 高保真，视觉上与原图无差别
THUMB_MAX = 480     # 缩略图长边像素（仅用于网格/地图）
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


def build_index():
    posts = []
    files = [f for f in os.listdir(POSTS_DIR) if f.endswith('.md')]

    # 按文件名排序 (通常文件名带日期，所以等于按日期倒序)
    files.sort(reverse=True)

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

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)

    print(f"文章索引构建完成！共 {len(posts)} 篇文章。已更新 {OUTPUT_FILE}")


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


def _read_exif(img):
    """从图片读取拍摄时间与 GPS 坐标，返回 (date_str, lat, lng)"""
    date, lat, lng = None, None, None
    try:
        exif = img.getexif()
        raw = None
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
    except Exception:
        pass
    try:
        gps = exif.get_ifd(0x8825)  # GPS IFD
        if gps is not None:
            lat = _dms_to_deg(gps.get(2), gps.get(1, 'N'))
            lng = _dms_to_deg(gps.get(4), gps.get(3, 'E'))
    except Exception:
        pass
    return date, lat, lng


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
        from PIL import Image
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
                date, lat, lng = _read_exif(im)
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
        entries.append(entry)

    # 保留 src 中已不存在、但上次索引里有的照片（例如换电脑克隆仓库后重新构建）
    seen = {e['file'] for e in entries}
    for fname, e in old_entries.items():
        if fname not in seen:
            entries.append(dict(e))

    entries.sort(key=lambda e: (e.get('date') or '', e['file']), reverse=True)

    with open(PHOTOS_JSON, 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)

    located = sum(1 for e in entries if e['lat'] is not None)
    print(f"照片索引构建完成！共 {len(entries)} 张（{located} 张有定位）。已更新 {PHOTOS_JSON}")
    missing = [e['file'] for e in entries if e['lat'] is None]
    if missing:
        print("以下照片缺少拍摄位置（可在 locate.html 中地图点选标注后重新构建）：")
        for fname in missing:
            print(f"  - {fname}")


if __name__ == '__main__':
    build_index()
    build_photos()
