"""Build the public listening rooms from the published music library."""
import json
import hashlib
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ROOMS = {
    'classical': ('余音厅', '古典', 'CLASSICAL', '把时间，留给慢板。'),
    'chinese': ('旧时光', '华语', 'MANDARIN', '某一句，又唱回了从前。'),
    'western': ('午夜唱片店', '欧美', 'AFTER HOURS', 'One more side.'),
    'japanese': ('深夜电波', '日本', '深夜電波', '夜が明ける、その前に。'),
}

PAGE = '''<!doctype html>
<html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>__TITLE__ · 留声室 · Inwt</title>
<meta name="description" content="Inwt 的私人留声室：古典、华语、欧美与日本音乐，收藏唱片与没有散去的余音。">
<meta name="theme-color" content="#19130e"><link rel="canonical" href="https://inwt233.cn/music/__PATH__">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/fonts/fonts.css"><link rel="stylesheet" href="/assets/music/music.css?v=__ASSET_VERSION__">
<script src="/assets/music/music.js?v=__ASSET_VERSION__" defer></script></head>
<body data-room="__ROOM__">
<div class="room-background" aria-hidden="true"></div>
<header class="room-header"><a class="home-link" href="__BACK_URL__" aria-label="__BACK_ARIA__">← <span>__BACK_LABEL__</span></a>
<a class="wordmark" href="/music/">留声室 <span>LISTENING ROOMS</span></a>
<button class="room-menu" type="button" aria-expanded="false" aria-controls="room-nav">听音室 ＋</button>
<nav id="room-nav" aria-label="听音室"><a href="/music/classical/" data-nav="classical">古典</a><a href="/music/chinese/" data-nav="chinese">华语</a><a href="/music/western/" data-nav="western">欧美</a><a href="/music/japanese/" data-nav="japanese">日本</a></nav></header>
<main id="main">
<section class="entrance" aria-labelledby="entrance-title" __LANDING_HIDDEN__>
<div class="entrance-copy"><p class="eyebrow">A PRIVATE COLLECTION OF SOUNDS</p><h1 id="entrance-title">给余音，<br>留一个房间。</h1><p>一些唱片，一些没有散去的时刻。<br>从一间听音室开始，慢慢听。</p><a class="text-link" href="/music/classical/">走进余音厅 <span>↗</span></a></div>
<div class="room-doors"><a href="/music/classical/" class="door door-classical"><span>01 / CLASSICAL</span><h2>余音厅</h2><p>古典 · 在慢板里停留</p><b aria-hidden="true">↗</b></a><a href="/music/chinese/" class="door door-chinese"><span>02 / MANDARIN</span><h2>旧时光</h2><p>华语 · 唱回某个夏天</p><b aria-hidden="true">↗</b></a><a href="/music/western/" class="door door-western"><span>03 / AFTER HOURS</span><h2>午夜唱片店</h2><p>欧美 · 夜路还很长</p><b aria-hidden="true">↗</b></a><a href="/music/japanese/" class="door door-japanese"><span>04 / 深夜電波</span><h2>深夜电波</h2><p>日本 · 故事结束以后</p><b aria-hidden="true">↗</b></a></div></section>
<div class="listening-room" __ROOM_HIDDEN__>
<section class="listening-scene" aria-labelledby="room-title"><div class="room-intro"><p class="eyebrow">__ENGLISH__ / INWT'S LISTENING ROOM</p><h1 id="room-title">__TITLE__<span>__TAGLINE__</span></h1></div>
<div class="listening-desk"><div class="record-stage"><div class="sleeve" aria-hidden="true"><div class="sleeve-art"></div><span class="sleeve-name">INWT<br>SELECTED RECORDS</span></div><div class="vinyl" role="img" aria-label="黑胶唱片"><div class="record-label"><img class="record-cover" alt="" hidden><span class="record-brand">INWT<br>SIDE A</span><i></i></div></div><span class="record-caption">33⅓ RPM · TAKE YOUR TIME</span></div>
<article class="record-story"><p class="eyebrow" id="selection-label">THE ROOM IS QUIET</p><h2 id="track-title">第一张唱片，还在路上。</h2><p id="track-credits" class="track-credits">在这里，收藏那些没有散去的余音。</p><div class="side-controls" role="group" aria-label="唱片内页" hidden><button type="button" data-side="a" aria-pressed="true">A 面 · 唱片</button><button type="button" data-side="b" aria-pressed="false">B 面 · 听后记</button></div><div id="track-information"></div><div id="track-note" hidden></div><div id="embedded-player" class="embedded-player" hidden><iframe id="netease-player" title="网易云音乐内嵌播放器" loading="lazy" referrerpolicy="no-referrer" allow="autoplay; encrypted-media" scrolling="no"></iframe><a id="listen-link" class="player-fallback" target="_blank" rel="noopener noreferrer" hidden>无法播放或需要会员？在网易云打开 ↗</a></div><span class="quiet-note">让音乐，发生在你想听的时候。</span></article></div><a class="shelf-anchor" href="#collection">向下翻阅唱片柜 <span>↓</span></a></section>
<section class="excerpt-section" aria-labelledby="excerpt-title"><div class="excerpt-heading"><p class="eyebrow">A LINE TO KEEP</p><h2 id="excerpt-title">歌曲摘录</h2></div><blockquote id="track-excerpt">留一小段喜欢的词句，放在唱片与听后记之间。</blockquote></section>
<section id="collection" class="collection" aria-labelledby="collection-title"><div class="collection-heading"><div><p class="eyebrow">THE RECORD COLLECTION</p><h2 id="collection-title">唱片柜</h2></div><span id="track-count">等待第一张收藏</span></div><div id="tag-filters" aria-label="筛选标签" hidden></div><p id="collection-state" role="status">正在打开唱片柜…</p><div id="records" class="records"></div></section></div>
</main><footer class="room-footer"><a href="/music/">留声室</a><span>Collected with care, by Inwt.</span><a href="/index.html">返回小站 ↗</a></footer>
</body></html>'''


def atomic_write(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    with temporary.open('w', encoding='utf-8', newline='\n') as output:
        output.write(data)
    os.replace(temporary, path)


def build_music(root=ROOT):
    root = Path(root)
    asset_bytes = b''.join(
        (root / 'assets/music' / name).read_bytes()
        for name in ('music.css', 'music.js')
        if (root / 'assets/music' / name).is_file()
    )
    asset_version = hashlib.sha256(asset_bytes).hexdigest()[:12]
    source = root / 'music/library.json'
    data = json.loads(source.read_text(encoding='utf-8')) if source.exists() else {'tracks': []}
    for room in ['entrance', *ROOMS]:
        title, genre, english, tagline = ROOMS.get(room, ('留声室', '', '', ''))
        html = PAGE
        for key, value in {'TITLE': title, 'ROOM': room, 'ENGLISH': english, 'TAGLINE': tagline,
                           'PATH': '' if room == 'entrance' else room + '/',
                           'LANDING_HIDDEN': '' if room == 'entrance' else 'hidden',
                           'ROOM_HIDDEN': 'hidden' if room == 'entrance' else '',
                           'BACK_URL': '/index.html' if room == 'entrance' else '/music/',
                           'BACK_ARIA': '返回小站首页' if room == 'entrance' else '返回留声室',
                           'BACK_LABEL': 'INWT' if room == 'entrance' else '留声室',
                           'ASSET_VERSION': asset_version}.items():
            html = html.replace('__' + key + '__', value)
        atomic_write(root / 'music' / ('' if room == 'entrance' else room) / 'index.html', html)
    atomic_write(root / 'music/collection.json', json.dumps({'version': 1, 'tracks': data['tracks']}, ensure_ascii=False, indent=2) + '\n')
    return data


if __name__ == '__main__':
    build_music()
