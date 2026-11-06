(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fields = ['title','artist','album','room','tags','date','note','composer','work','performers','duration','cover','playbackSourceId'];
  let revision = '', tracks = [], currentId = null, sourceId = '', dirty = false, recognizing = false, saving = false;
  const touched = new Set();
  function status(id, text, error = false) { $(id).textContent = text; $(id).dataset.error = String(error); }
  async function api(path, body) {
    const response = await fetch(path, {method: body ? 'POST' : 'GET', headers: body ? {'Content-Type':'application/json'} : {}, ...(body ? {body:JSON.stringify(body)} : {})});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '操作失败，请重试。');
    return result;
  }
  function safeCover(value) { try {const u = new URL(value); return u.protocol === 'https:' && u.hostname.endsWith('.music.126.net') ? u.href : '';} catch {return '';} }
  function excerptEntries() {
    return [...$('excerpt-lines').children].map(row => ({
      text: row.querySelector('.excerpt-text').value.trim(),
      translation: row.querySelector('.excerpt-translation-input').value.trim()
    })).filter(line => line.text || line.translation);
  }
  function renumberExcerptLines() {
    [...$('excerpt-lines').children].forEach((row, index) => {
      row.querySelector('.excerpt-line-number').textContent = '第 ' + String(index + 1).padStart(2, '0') + ' 句';
    });
    $('add-excerpt-line').disabled = saving || $('excerpt-lines').children.length >= 30;
  }
  function addExcerptLine(entry = {}) {
    if ($('excerpt-lines').children.length >= 30) return null;
    const row = document.createElement('div'); row.className = 'excerpt-line';
    const top = document.createElement('div'); top.className = 'excerpt-line-top';
    const number = document.createElement('span'); number.className = 'excerpt-line-number';
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '移除这句';
    remove.addEventListener('click', () => {
      row.remove();
      if (!$('excerpt-lines').children.length) addExcerptLine();
      renumberExcerptLines(); dirty = true; preview();
    });
    top.append(number, remove);
    const pair = document.createElement('div'); pair.className = 'excerpt-pair';
    const sourceLabel = document.createElement('label'); sourceLabel.textContent = '原句';
    const source = document.createElement('input'); source.type = 'text'; source.className = 'excerpt-text';
    source.maxLength = 240; source.placeholder = '每条填写一句歌词或摘录'; source.value = entry.text || '';
    sourceLabel.append(source);
    const translationLabel = document.createElement('label'); translationLabel.textContent = '中文译文（可选）';
    const translation = document.createElement('input'); translation.type = 'text'; translation.className = 'excerpt-translation-input';
    translation.maxLength = 240; translation.placeholder = '显示在原句下方的小字'; translation.value = entry.translation || '';
    translationLabel.append(translation);
    pair.append(sourceLabel, translationLabel); row.append(top, pair); $('excerpt-lines').append(row);
    renumberExcerptLines();
    return source;
  }
  function renderExcerptLines(track) {
    const lines = Array.isArray(track.excerptLines) ? track.excerptLines :
      String(track.excerpt || '').split(/\r?\n/).map(text => ({text, translation: ''})).filter(line => line.text.trim());
    $('excerpt-lines').replaceChildren();
    (lines.length ? lines : [{}]).forEach(addExcerptLine);
  }
  function preview() {
    document.querySelector('.live-preview').dataset.room = $('room').value;
    $('preview-title').textContent = $('title').value || '一张新的唱片';
    $('preview-credits').textContent = [$('artist').value,$('album').value].filter(Boolean).join('\n');
    $('preview-note').textContent = $('note').value || '你的听后记，会与这张唱片一起留下。';
    const excerpt = $('preview-excerpt'); excerpt.replaceChildren();
    const lines = excerptEntries().filter(line => line.text);
    if (!lines.length) excerpt.textContent = '在这里留下一小段喜欢的词句。';
    for (const line of lines) {
      const item = document.createElement('p'); item.className = 'preview-lyric';
      const source = document.createElement('span'); source.className = 'preview-lyric-source'; source.textContent = line.text;
      item.append(source);
      if (line.translation) {
        const translation = document.createElement('span'); translation.className = 'preview-lyric-translation';
        translation.textContent = line.translation; item.append(translation);
      }
      excerpt.append(item);
    }
    $('room-preview').href = '/music/' + $('room').value + '/';
    const cover = safeCover($('cover').value), img = $('preview-cover');
    img.hidden = !cover; $('preview-placeholder').hidden = !!cover;
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => {img.hidden = true; $('preview-placeholder').hidden = false;};
    if (cover && img.src !== cover) img.src = cover;
    else if (!cover) img.removeAttribute('src');
  }
  function list() {
    const query = $('search').value.trim().toLowerCase();
    $('library-list').replaceChildren();
    const visible = tracks.filter(t => [t.title,t.artist,t.album].join(' ').toLowerCase().includes(query));
    for (const track of visible) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'library-item';
      button.setAttribute('aria-pressed',String(track.id === currentId));
      const name = document.createElement('span'); name.textContent = track.title;
      const artist = document.createElement('small'); artist.textContent = track.artist || track.album || '私人收藏';
      button.append(name,artist); button.addEventListener('click',() => {if (canLeave()) open(track);});
      $('library-list').append(button);
    }
    if (!visible.length) {const p = document.createElement('p'); p.textContent = query ? '没有找到这张唱片。' : '从第一张唱片开始。'; $('library-list').append(p);}
  }
  function canLeave() { return !saving && !recognizing && (!dirty || confirm('当前内容尚未保存，确定离开这张唱片吗？')); }
  function setSaving(value) {
    saving = value;
    $('track-form').querySelectorAll('input,textarea,select,button').forEach(control => {control.disabled = value;});
    renumberExcerptLines();
    $('new-track').disabled = value;
  }
  function open(track = {}) {
    currentId = track.id || null; sourceId = track.sourceId || ''; touched.clear();
    fields.forEach(field => {$(field).value = field === 'tags' ? (track.tags || []).join(', ') : track[field] ?? (field === 'room' ? 'classical' : field === 'duration' ? 0 : '');});
    renderExcerptLines(track);
    $('share').value = track.url || ''; $('featured').checked = track.featured === true;
    $('delete').hidden = !currentId; $('form-title').textContent = currentId ? '整理这张唱片' : '一张新的唱片';
    dirty = false; status('lookup-status','粘贴网易云歌曲链接，自动识别基本信息。');
    status('save-status','保存到本地文件，发布网站后访客可见。'); preview(); list();
  }
  async function openEditor() {
    $('retry-open').hidden = true;
    status('unlock-status','正在读取唱片…');
    try {const state = await api('/api/music-edit'); revision = state.revision; tracks = state.tracks; $('unlock').hidden = true; $('editor').hidden = false; open();}
    catch(error) {status('unlock-status',error.message,true);$('retry-open').hidden = false;}
  }
  $('retry-open').addEventListener('click',openEditor);
  openEditor();
  $('search').addEventListener('input',list);
  $('new-track').addEventListener('click',() => {if (canLeave()) open();});
  $('add-excerpt-line').addEventListener('click', () => {
    const input = addExcerptLine();
    if (input) { dirty = true; preview(); input.focus(); }
  });
  $('track-form').addEventListener('input',event => {dirty = true; touched.add(event.target.id); preview();});
  $('room').addEventListener('change',preview);
  async function recognize() {
    if (recognizing || !$('share').value.trim()) return;
    if (currentId) {status('lookup-status','要收藏另一首歌，请先点“＋ 新增”。已有信息可以直接修改。',true);return;}
    recognizing = true; $('recognize').disabled = true; $('save').disabled = true; $('new-track').disabled = true;
    const text = $('share').value;
    status('lookup-status','正在识别歌曲信息…');
    try {
      const result = await api('/api/music-recognize',{text});
      if ($('share').value !== text) {status('lookup-status','链接已变化，请再次识别。');return;}
      const existing = tracks.find(t => t.sourceId === result.sourceId);
      if (existing) {status('lookup-status','这首歌已经在唱片柜中，可从左侧打开编辑。',true);return;}
      sourceId = result.sourceId; $('share').value = result.url;
      for (const field of ['title','artist','album','cover','duration']) if (!touched.has(field)) $(field).value = result[field] ?? '';
      dirty = true; preview(); status('lookup-status','已识别。可校正信息，再写下你的听后记。');
    } catch(error) {status('lookup-status',error.message,true);}
    finally {recognizing = false; $('recognize').disabled = false; $('save').disabled = false; $('new-track').disabled = false;}
  }
  $('share').addEventListener('paste',() => setTimeout(recognize,0));
  $('recognize').addEventListener('click',recognize);
  function payload() {
    const track = Object.fromEntries(fields.map(field => [field,$(field).value]));
    track.excerptLines = excerptEntries();
    track.tags = track.tags.split(/[,，、]/).map(t=>t.trim()).filter(Boolean);
    track.duration = Number(track.duration || 0); track.featured = $('featured').checked;
    track.sourceId = sourceId; track.url = $('share').value.trim(); return track;
  }
  $('track-form').addEventListener('submit',async event => {
    event.preventDefault(); if (recognizing) return;
    const track = payload();
    setSaving(true); status('save-status','正在保存…');
    try {
      const state = await api('/api/music-edit',{action:'save',revision,id:currentId,track});
      revision = state.revision; tracks = state.tracks;
      const saved = currentId ? tracks.find(t=>t.id===currentId) : tracks[0];
      open(saved); status('save-status','已保存到本地文件，听音室预览已更新。通过 Git 发布后，访客即可看到。');
    } catch(error) {status('save-status',error.message+' 当前输入已保留。',true);}
    finally {setSaving(false);}
  });
  $('delete').addEventListener('click',async () => {
    if (!currentId || !confirm('确定删除这张唱片及其听后记吗？')) return;
    setSaving(true);
    try {const state = await api('/api/music-edit',{action:'delete',revision,id:currentId});revision=state.revision;tracks=state.tracks;open();status('save-status','唱片已移出收藏。');}
    catch(error) {status('save-status',error.message,true);}
    finally {setSaving(false);}
  });
  window.addEventListener('beforeunload',event => {if(dirty){event.preventDefault();event.returnValue='';}});
})();
