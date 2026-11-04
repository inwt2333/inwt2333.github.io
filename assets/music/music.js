(() => {
  'use strict';
  const room = document.body.dataset.room;
  const $ = id => document.getElementById(id);
  const menu = document.querySelector('.room-menu');
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    $('room-nav').classList.toggle('is-open', open);
  });
  document.querySelector(`[data-nav="${room}"]`)?.setAttribute('aria-current', 'page');
  if (room === 'entrance') return;
  let tracks = [], selected = null, tag = '';
  const safeCover = value => {
    try { const u = new URL(value); return u.protocol === 'https:' && u.hostname.endsWith('.music.126.net') ? u.href : ''; } catch { return ''; }
  };
  const image = (url, alt) => {
    const img = document.createElement('img');
    img.src = safeCover(url); img.alt = alt; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => img.remove());
    return img;
  };
  function side(value) {
    document.querySelectorAll('[data-side]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.side === value)));
    $('track-information').hidden = value !== 'a';
    $('track-note').hidden = value !== 'b';
  }
  document.querySelectorAll('[data-side]').forEach(b => b.addEventListener('click', () => side(b.dataset.side)));
  function select(track, scroll = false) {
    selected = track;
    $('selection-label').textContent = track.featured ? 'SELECTED BY INWT' : 'FROM THE COLLECTION';
    $('track-title').textContent = track.title;
    $('track-credits').textContent = [track.artist, track.album].filter(Boolean).join('\n');
    const info = document.createElement('dl');
    const fields = [['专辑', track.album], ['作曲', track.composer], ['作品', track.work], ['演奏', track.performers], ['时长', track.duration ? `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}` : ''], ['聆听', track.date]];
    for (const [name, value] of fields) {
      if (!value) continue;
      const dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = name; dd.textContent = value; info.append(dt, dd);
    }
    $('track-information').replaceChildren(info);
    $('track-note').textContent = track.note || '这张唱片的听后记，留待下一次落笔。';
    $('track-excerpt').textContent = track.excerpt || '这首歌尚未留下摘录。';
    $('track-information').scrollTop = 0;
    $('track-note').scrollTop = 0;
    $('track-excerpt').scrollTop = 0;
    document.querySelector('.side-controls').hidden = false;
    const cover = safeCover(track.cover);
    const label = document.querySelector('.record-cover');
    label.hidden = !cover;
    document.querySelector('.record-brand').hidden = !!cover;
    label.referrerPolicy = 'no-referrer';
    label.onerror = () => { label.hidden = true; document.querySelector('.record-brand').hidden = false; };
    if (cover) label.src = cover; else label.removeAttribute('src');
    document.querySelector('.sleeve-art').style.backgroundImage = cover ? `url("${cover.replaceAll('"', '%22')}")` : '';
    document.querySelector('.sleeve-name').hidden = !!cover;
    const link = $('listen-link'), player = $('netease-player'), shell = $('embedded-player');
    link.hidden = true; link.removeAttribute('href'); shell.hidden = true;
    link.textContent = '无法播放或需要会员？在网易云打开 ↗';
    let originalId = /^[1-9][0-9]{0,15}$/.test(String(track.sourceId || '')) ? String(track.sourceId) : '';
    try {
      const url = new URL(track.url);
      if (url.protocol === 'https:' && ['music.163.com', 'y.music.163.com'].includes(url.hostname)) {
        if (!originalId && /^[1-9][0-9]{0,15}$/.test(url.searchParams.get('id') || '')) originalId = url.searchParams.get('id');
        link.href = url.href; link.hidden = false; shell.hidden = false;
      }
    } catch { /* Manually entered records may have no music link. */ }
    const alternateId = /^[1-9][0-9]{0,15}$/.test(String(track.playbackSourceId || '')) ? String(track.playbackSourceId) : '';
    const songId = alternateId || originalId;
    if (songId) {
      const source = 'https://music.163.com/outchain/player?type=2&id=' + songId + '&auto=0&height=66';
      player.hidden = false; shell.hidden = false;
      if (player.src !== source) player.src = source;
      link.href = 'https://music.163.com/song?id=' + (originalId || songId);
      if (alternateId && originalId && alternateId !== originalId) link.textContent = '内嵌播放为同曲另一发行版 · 查看原收藏 ↗';
      link.hidden = false;
    } else {
      player.hidden = true;
      player.removeAttribute('src'); // Stop the previous song when this record has no embeddable source.
    }
    document.querySelector('.quiet-note').hidden = !shell.hidden;
    side(track.note ? 'b' : 'a');
    document.querySelectorAll('.record-card').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === track.id)));
    if (scroll) {
      $('track-title').tabIndex = -1;
      $('track-title').focus({preventScroll: true});
      document.querySelector('.listening-scene').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    }
  }
  function renderRecords() {
    $('records').replaceChildren();
    const visible = tracks.filter(t => !tag || (t.tags || []).includes(tag));
    for (const track of visible) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'record-card'; button.dataset.id = track.id;
      button.setAttribute('aria-pressed', String(selected?.id === track.id));
      const art = document.createElement('div'); art.className = 'album-art';
      if (safeCover(track.cover)) art.append(image(track.cover, ''));
      else { const label = document.createElement('span'); label.textContent = 'INWT / RECORDS'; art.append(label); }
      const title = document.createElement('strong'); title.textContent = track.title;
      const credits = document.createElement('small'); credits.textContent = track.artist || track.album || '私人收藏';
      button.append(art, title, credits);
      button.addEventListener('click', () => select(track, true));
      $('records').append(button);
    }
    $('collection-state').hidden = visible.length > 0;
    $('collection-state').textContent = tracks.length ? '这个标签下暂时没有唱片。' : '唱片柜还空着。下一段余音，会从这里开始。';
  }
  function filters() {
    const tags = [...new Set(tracks.flatMap(t => t.tags || []))];
    const container = $('tag-filters'); container.replaceChildren(); container.hidden = tags.length === 0;
    for (const value of ['', ...tags]) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = value || '全部';
      b.setAttribute('aria-pressed', String(tag === value));
      b.addEventListener('click', () => { tag = value; filters(); renderRecords(); });
      container.append(b);
    }
  }
  async function load() {
    $('collection-state').hidden = false; $('collection-state').textContent = '正在打开唱片柜…';
    try {
      const response = await fetch('/music/collection.json', {cache: 'no-store'});
      if (!response.ok) throw new Error('load');
      const data = await response.json();
      if (!Array.isArray(data.tracks)) throw new Error('format');
      tracks = data.tracks.filter(t => t.room === room);
      $('track-count').textContent = tracks.length ? `${String(tracks.length).padStart(2, '0')} 张收藏` : '等待第一张收藏';
      if (tracks.length) select(tracks.find(t => t.featured) || tracks[0]);
      filters(); renderRecords();
    } catch {
      $('collection-state').textContent = '唱片柜暂时没有打开。';
      const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = '再试一次'; retry.addEventListener('click', load);
      $('collection-state').append(retry);
    }
  }
  load();
})();
