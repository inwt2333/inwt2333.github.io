"""Local metadata lookup and revision-checked editing for the listening rooms."""
import hashlib
import json
import re
import uuid
from datetime import date
from pathlib import Path
from urllib.parse import urlparse, parse_qs, unquote, urlencode
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import URLError

from music_build import ROOMS, atomic_write, build_music


class EditConflict(ValueError):
    pass


def trusted_music_url(url):
    parsed = urlparse(url)
    return (parsed.scheme in ('https', 'http') and parsed.hostname in
            {'music.163.com', 'y.music.163.com', '163cn.tv', '163cn.com'}
            and not parsed.username and not parsed.password and parsed.port in (None, 80, 443))


class MusicRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not trusted_music_url(newurl):
            raise ValueError('分享链接跳转到了网易云之外，请粘贴歌曲的完整链接。')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def extract_song_id(text):
    if not isinstance(text, str) or len(text) > 4000:
        raise ValueError('请粘贴有效的网易云歌曲链接。')
    text = text.strip()
    if re.fullmatch(r'[1-9][0-9]{0,15}', text):
        return text
    links = re.findall(r'https?://[^\s<>"“”]+', text)
    for link in links:
        link = link.rstrip('，。；）)】]')
        if not trusted_music_url(link):
            continue
        parsed = urlparse(link)
        if parsed.hostname in {'163cn.tv', '163cn.com'}:
            request = Request(link, headers={'User-Agent': 'Mozilla/5.0'})
            with build_opener(MusicRedirect()).open(request, timeout=12) as response:
                link = response.url
                parsed = urlparse(link)
        # Hash routes, /song?id=, /m/song?id=, and /song/123/ are accepted.
        route = unquote(parsed.path + '?' + parsed.query + '#' + parsed.fragment)
        if not re.search(r'(?:^|[/#])(?:m/)?song(?:[/?#]|$)', route):
            continue
        match = re.search(r'(?:[?&]id=|/song/)([1-9][0-9]{0,15})(?=[&#/\s]|$)', route)
        if match:
            return match.group(1)
    raise ValueError('没有找到歌曲 ID。请分享单首歌曲，或粘贴 music.163.com/song?id=… 链接。')


def recognize(text):
    try:
        song_id = extract_song_id(text)
        url = 'https://music.163.com/api/song/detail/?' + urlencode({'id': song_id, 'ids': '[' + song_id + ']'})
        request = Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://music.163.com/'})
        with build_opener(MusicRedirect()).open(request, timeout=12) as response:
            raw = response.read(2 * 1024 * 1024 + 1)
        if len(raw) > 2 * 1024 * 1024:
            raise ValueError('歌曲信息过大，请稍后重试。')
        songs = json.loads(raw).get('songs', [])
        if not songs:
            raise ValueError('网易云没有返回这首歌，可先手工填写并保存。')
        song = songs[0]
        album = song.get('album', {})
        return {'sourceId': song_id, 'url': 'https://music.163.com/song?id=' + song_id,
                'title': song['name'], 'artist': ' / '.join(a['name'] for a in song.get('artists', [])),
                'album': album.get('name', ''), 'cover': album.get('picUrl', ''),
                'duration': round(song.get('duration', 0) / 1000)}
    except (URLError, TimeoutError, OSError, json.JSONDecodeError, KeyError) as error:
        raise ValueError('暂时无法获取网易云信息，请稍后重试，或先手工填写。') from error


def read_state(root):
    source = Path(root) / 'music/library.json'
    raw = source.read_bytes() if source.exists() else b''
    return {'revision': hashlib.sha256(raw).hexdigest(),
            'tracks': json.loads(raw).get('tracks', []) if raw else []}


TEXT_FIELDS = {'title': 300, 'artist': 500, 'album': 500, 'note': 12000, 'excerpt': 600, 'composer': 300,
               'performers': 500, 'work': 300, 'date': 10, 'sourceId': 16, 'url': 2000, 'cover': 2000}


def validate_track(track):
    if not isinstance(track, dict):
        raise ValueError('唱片内容格式不正确。')
    item = {}
    for field, maximum in TEXT_FIELDS.items():
        value = track.get(field, '')
        if not isinstance(value, str) or len(value) > maximum:
            raise ValueError(field + ' 格式不正确或文字过长。')
        item[field] = value.strip()
    if not item['title']:
        raise ValueError('请填写曲名。')
    item['room'] = track.get('room')
    if item['room'] not in ROOMS:
        raise ValueError('请选择听音室。')
    if item['date']:
        try:
            if date.fromisoformat(item['date']).isoformat() != item['date']:
                raise ValueError()
        except ValueError:
            raise ValueError('聆听日期应为有效的 YYYY-MM-DD 日期。') from None
    if item['url'] and not trusted_music_url(item['url']):
        raise ValueError('歌曲链接应为网易云音乐地址。')
    if item['sourceId'] and not re.fullmatch(r'[1-9][0-9]{0,15}', item['sourceId']):
        raise ValueError('歌曲 ID 格式不正确。')
    if item['url']:
        if urlparse(item['url']).hostname not in {'music.163.com', 'y.music.163.com'}:
            raise ValueError('请先识别短链接，或填写歌曲的完整链接。')
        linked_id = extract_song_id(item['url'])
        if item['sourceId'] and linked_id != item['sourceId']:
            raise ValueError('链接已更换，请重新识别歌曲后保存。')
        item['sourceId'] = linked_id
        item['url'] = 'https://music.163.com/song?id=' + linked_id
    if item['cover']:
        parsed = urlparse(item['cover'])
        if parsed.scheme != 'https' or not (parsed.hostname or '').endswith('.music.126.net') or parsed.username or parsed.password or parsed.port not in (None, 443):
            raise ValueError('封面应使用网易云返回的 HTTPS 图片地址。')
    tags = track.get('tags', [])
    if not isinstance(tags, list) or len(tags) > 20 or any(not isinstance(t, str) or len(t) > 40 for t in tags):
        raise ValueError('最多添加 20 个标签，每个标签不超过 40 字。')
    item['tags'] = list(dict.fromkeys(t.strip() for t in tags if t.strip()))
    item['featured'] = track.get('featured') is True
    duration = track.get('duration', 0)
    if not isinstance(duration, int) or isinstance(duration, bool) or not 0 <= duration <= 86400:
        raise ValueError('时长格式不正确。')
    item['duration'] = duration
    return item


def save_edit(root, payload):
    root = Path(root)
    if not isinstance(payload, dict):
        raise ValueError('保存内容格式不正确。')
    state = read_state(root)
    if payload.get('revision') != state['revision']:
        raise EditConflict('唱片柜已在另一个页面修改。请保留当前输入，重新加载后再保存。')
    tracks = state['tracks']
    action = payload.get('action', 'save')
    identifier = payload.get('id')
    existing = next((t for t in tracks if t['id'] == identifier), None)
    if action == 'delete':
        if existing is None:
            raise ValueError('这张唱片已经不存在。')
        tracks = [t for t in tracks if t['id'] != identifier]
    elif action == 'save':
        if identifier and existing is None:
            raise ValueError('这张唱片已经不存在，请重新加载。')
        item = validate_track(payload.get('track'))
        duplicate = next((t for t in tracks if item['sourceId'] and t.get('sourceId') == item['sourceId'] and t['id'] != identifier), None)
        if duplicate:
            raise ValueError('这首歌已收藏，请在左侧打开已有记录编辑。')
        item['id'] = existing['id'] if existing else uuid.uuid4().hex[:16]
        if item['featured']:
            tracks = [dict(t, featured=False) if t['room'] == item['room'] else t for t in tracks]
        tracks = [item if t['id'] == identifier else t for t in tracks] if existing else [item, *tracks]
    else:
        raise ValueError('不支持的操作。')
    source = root / 'music/library.json'
    original = source.read_bytes() if source.exists() else None
    try:
        atomic_write(source, json.dumps({'version': 1, 'tracks': tracks}, ensure_ascii=False, indent=2) + '\n')
        build_music(root)
    except Exception:
        if original is None:
            source.unlink(missing_ok=True)
        else:
            source.write_bytes(original)
        raise
    return read_state(root)
