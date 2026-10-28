import { stations, exercises, publishedEntries, exerciseName, byDate, dateLabel, localDate, cardioMinutes, validateJournal } from './data.mjs?v=leg-machine-1';
import { musclePanel } from './anatomy.mjs?v=leg-machine-1';

const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const storageKey = 'inwt-gym-journal-v1';
const publishedIds = new Set(publishedEntries.map(e => e.id));
let journal = { version: 1, entries: [], weights: [] };
let readError = false;
try {
  const saved = localStorage.getItem(storageKey);
  if (saved) journal = validateJournal(JSON.parse(saved));
} catch { readError = true; }

const entries = () => [...publishedEntries, ...journal.entries.filter(e => !publishedIds.has(e.id))].sort(byDate);
const weights = () => [...journal.weights].sort((a, b) => a.date.localeCompare(b.date));
let month = entries()[0]?.date.slice(0, 7) || localDate().slice(0, 7);
let selectedDate = entries()[0]?.date || null;
const detail = $('#detail-dialog');
const entryDialog = $('#entry-dialog');
const entryForm = $('#entry-form');
let activeStation = null;
let lastDetailTrigger = null;
let lastEntryTrigger = null;
let toastTimer;

function notify(message) {
  const toast = $('#toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  if (toast.showPopover && !toast.matches(':popover-open')) toast.showPopover();
  toastTimer = setTimeout(() => {
    toast.hidePopover?.();
    toast.hidden = true;
  }, 4500);
}

function save(next) {
  next = validateJournal(next);
  localStorage.setItem(storageKey, JSON.stringify(next));
  journal = next;
}

function loadHTML(entry) {
  if (entry.exercise === 'cardio') return entry.segments.map(s => `<span class="load-chip">${escape(s.name)} ${s.minutes}<small>min</small></span>`).join('');
  return entry.loads.map(l => `<span class="load-chip">${l.weight} ${l.unit} × ${l.reps} × ${l.sets ?? 1}<small>组</small></span>`).join('');
}

function recordHTML(entry) {
  return `<article class="history-item"><div class="history-item-main"><h4>${escape(exerciseName(entry.exercise))}</h4><div class="load-list">${loadHTML(entry)}</div>${entry.note ? `<p class="entry-note">${escape(entry.note)}</p>` : ''}</div>${publishedIds.has(entry.id) ? '<span class="published-mark">手记</span>' : `<button type="button" class="delete-entry" data-delete="${escape(entry.id)}" aria-label="删除 ${entry.date} 的${escape(exerciseName(entry.exercise))}记录">删除</button>`}</article>`;
}

function groupedHTML(list) {
  if (!list.length) return '<div class="empty-state">这个月还没有训练记录。<br>从下一次来这里开始。</div>';
  const groups = new Map();
  for (const entry of list) {
    if (!groups.has(entry.date)) groups.set(entry.date, []);
    groups.get(entry.date).push(entry);
  }
  return [...groups].map(([date, records]) => `<section class="history-group"><div class="history-date"><h3>${dateLabel(date)}</h3><span>${date.slice(0, 4)} / ${records.length} 项记录</span></div><div class="history-records">${records.map(recordHTML).join('')}</div></section>`).join('');
}

function comparison(station, list) {
  // 只对相同动作、相同单位且明确记有组数的两次训练比较已完成次数。
  if (station.exercises.length !== 1 || station.id === 'cardio') return '';
  const dates = [...new Set(list.map(e => e.date))];
  if (dates.length < 2) return '';
  const sessions = dates.slice(0, 2).map(date => list.filter(e => e.date === date).flatMap(e => e.loads));
  const loads = sessions.flat();
  if (!loads.every(l => l.unit === loads[0].unit && l.weight === loads[0].weight)) return '';
  const reps = sessions.map(s => s.reduce((n, l) => n + l.reps * l.sets, 0));
  const change = reps[0] - reps[1];
  return `<div class="comparison"><strong>${loads[0].weight} ${loads[0].unit}，${change > 0 ? `多完成了 ${change} 次。` : change === 0 ? '又一次，稳稳完成。' : '这次少一些，也如实留下。'}</strong><br>${dateLabel(dates[1])}：${reps[1]} 次 → ${dateLabel(dates[0])}：${reps[0]} 次。这里只比较记录完整、重量相同的训练。</div>`;
}

function stationDetail(station) {
  const list = entries().filter(e => station.exercises.includes(e.exercise));
  const days = new Set(list.map(e => e.date)).size;
  const cardio = station.id === 'cardio';
  const max = cardio ? cardioMinutes(list) : Math.max(0, ...list.flatMap(e => e.loads.map(l => l.weight * (l.unit === 'lb' ? 0.45359237 : 1))));
  const index = stations.filter(s => s.exercises.length).findIndex(s => s.id === station.id) + 1;
  return `<div class="station-workspace">
    <div class="station-journal">
      <header class="station-hero">
        <p class="station-eyebrow"><span>${cardio ? '有氧训练' : '力量训练'}</span><span>${String(index).padStart(2, '0')} / ${String(stations.filter(s => s.exercises.length).length).padStart(2, '0')}</span></p>
        <h2 id="detail-title">${station.name}</h2>
        <div class="hero-bottom"><p>${station.en}</p><button class="primary-button" type="button" data-new="${station.exercises[0]}">记一笔 <span aria-hidden="true">＋</span></button></div>
      </header>
      <div class="detail-stat-strip">
        <div><span>训练天数</span><strong>${days}<small>天</small></strong></div>
        <div><span>训练记录</span><strong>${list.length}<small>项</small></strong></div>
        <div><span>${cardio ? '累计有氧' : '最高记录重量'}</span><strong>${cardio ? max : max ? Number(max.toFixed(1)) : '—'}<small>${cardio ? 'min' : 'kg'}</small></strong></div>
      </div>
      <section class="journal-records" aria-labelledby="journal-heading">
        <div class="journal-section-heading"><h3 id="journal-heading">训练手记</h3><span>SESSION HISTORY</span></div>
        ${comparison(station, list)}
        ${list.length ? groupedHTML(list) : '<div class="empty-state">还没有这台器材的记录。<br>下一次，从第一笔开始。</div>'}
      </section>
      <p class="detail-footnote">保留原始 lb / kg 单位，未写明组数按一组记录。最高重量仅作单位换算，不用于比较不同器械。${station.id === 'pull' ? '高位下拉与高拉力背肌分别保存。' : ''}</p>
    </div>
    ${musclePanel(station)}
  </div>`;
}

function calendarDetail() {
  const [year, m] = month.split('-').map(Number);
  const firstWeekday = (new Date(year, m - 1, 1).getDay() + 6) % 7;
  const numberOfDays = new Date(year, m, 0).getDate();
  const all = entries();
  const days = new Set(all.map(e => e.date));
  const list = all.filter(e => selectedDate ? e.date === selectedDate : e.date.startsWith(month));
  let grid = ['一', '二', '三', '四', '五', '六', '日'].map(d => `<span class="calendar-weekday">${d}</span>`).join('');
  grid += '<span></span>'.repeat(firstWeekday);
  for (let d = 1; d <= numberOfDays; d++) {
    const date = `${month}-${String(d).padStart(2, '0')}`;
    const trained = days.has(date);
    grid += `<${trained ? 'button type="button"' : 'span'} class="calendar-day ${trained ? 'has-training' : ''} ${selectedDate === date ? 'is-selected' : ''} ${date === localDate() ? 'is-today' : ''}" ${trained ? `data-day="${date}" aria-label="${dateLabel(date)}，查看训练记录" aria-pressed="${selectedDate === date}"` : ''}>${d}</${trained ? 'button' : 'span'}>`;
  }
  return `<p class="eyebrow">SHOWING UP / THE CALENDAR</p><div class="detail-heading"><div><h2 id="detail-title">来过的日子，都算数。</h2><p>一格一格，收集认真生活的证据。</p></div><button class="primary-button" type="button" data-new="row">＋ 记一笔</button></div><div class="calendar-toolbar"><button type="button" data-month="-1" aria-label="上一个月">←</button><h3>${year} / ${String(m).padStart(2, '0')}</h3><button type="button" data-month="1" aria-label="下一个月">→</button></div><div class="calendar-grid">${grid}</div><p class="calendar-legend">绿色是训练过的日子。点击日期查看当天记录；再次点击查看整月。</p>${groupedHTML(list)}<p class="detail-footnote">最初两次手记按 2026 年 10 月 22 日、26 日归档。</p>`;
}

function weightChart(list) {
  if (list.length < 2) return '';
  const data = list.slice(-30);
  const values = data.map(w => w.kg);
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const xMin = Date.parse(data[0].date), xMax = Date.parse(data.at(-1).date);
  const points = data.map(w => [48 + (Date.parse(w.date) - xMin) / (xMax - xMin) * 494, 142 - (w.kg - min) / (max - min) * 113]);
  const line = points.map(p => p.join(',')).join(' ');
  return `<div class="weight-chart"><svg viewBox="0 0 580 184" role="img" aria-label="最近 ${data.length} 次体重记录折线图，从 ${data[0].kg} 到 ${data.at(-1).kg} 公斤"><line x1="48" y1="142" x2="542" y2="142" stroke="#dce2d2"/><line x1="48" y1="29" x2="542" y2="29" stroke="#e4e8dc" stroke-dasharray="3 5"/><text x="4" y="34">${max.toFixed(1)}</text><text x="4" y="146">${min.toFixed(1)}</text><polygon points="48,142 ${line} 542,142" fill="#dce6cf" opacity=".65"/><polyline points="${line}" fill="none" stroke="#567c50" stroke-width="2"/>${points.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#faf9f3" stroke="#567c50" stroke-width="1.5"><title>${data[i].date} · ${data[i].kg} kg</title></circle>`).join('')}<text x="48" y="171">${data[0].date.slice(5)}</text><text x="542" y="171" text-anchor="end">${data.at(-1).date.slice(5)}</text><text x="542" y="15" text-anchor="end">kg / 最近 ${data.length} 次</text></svg></div>`;
}

function weightDetail() {
  const list = weights();
  const last = list.at(-1);
  const delta = list.length >= 2 ? Number((last.kg - list[0].kg).toFixed(1)) : null;
  return `<p class="eyebrow">BODY JOURNAL / A LITTLE CHANGE</p><div class="detail-heading"><div><h2 id="detail-title">身体，也有自己的节奏。</h2><p>留下数字和感受，慢慢看变化。</p></div></div><div class="detail-stat-strip"><div><strong>${last ? last.kg : '—'}</strong><span>kg · 最近一次</span></div><div><strong>${delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta}`}</strong><span>kg · 相比最初记录</span></div><div><strong>${list.length}</strong><span>天体重记录</span></div></div>${list.length ? weightChart(list) : '<div class="empty-state"><strong>— kg</strong>先留白，等你来写。<br>记下第一次体重后，这里会慢慢长出一条曲线。</div>'}${list.length === 1 ? '<p class="field-note">已留下第一个坐标。记录第二天的体重后，将显示趋势曲线。</p>' : ''}<form class="weight-form" id="weight-form"><div class="form-row"><label>记录日期<input name="date" type="date" value="${localDate()}" required></label><label>体重 / kg<input name="kg" type="number" min="10" max="500" step="0.1" placeholder="填写真实体重" inputmode="decimal" required></label></div><label>随手记 <span class="optional">选填</span><input name="note" maxlength="500" placeholder="比如：晨起空腹，状态不错。"></label><p class="field-note">同一天再次保存，会更新当天体重。记录仅保存在当前浏览器。</p><p class="form-error" id="weight-error" role="alert"></p><button class="primary-button" type="submit">留下今天的坐标 <span>↗</span></button></form>${list.length ? `<table class="weight-table"><thead><tr><th scope="col">日期</th><th scope="col">体重</th><th scope="col">随手记</th><th scope="col"><span class="sr-only">操作</span></th></tr></thead><tbody>${[...list].reverse().map(w => `<tr><td>${w.date}</td><td>${w.kg} kg</td><td>${escape(w.note) || '—'}</td><td><button type="button" class="delete-entry" data-delete-weight="${w.date}" aria-label="删除 ${w.date} 的体重记录">删除</button></td></tr>`).join('')}</tbody></table>` : ''}`;
}

function renderDetail() {
  const scrollTop = detail.scrollTop;
  detail.dataset.zone = activeStation.zone;
  detail.dataset.view = activeStation.exercises.length ? 'training' : activeStation.id;
  $('#detail-content').innerHTML = activeStation.id === 'weight' ? weightDetail() : activeStation.id === 'calendar' ? calendarDetail() : stationDetail(activeStation);
  detail.scrollTop = scrollTop;
}

function route() {
  const id = location.hash.slice(1);
  const station = stations.find(s => s.id === id);
  if (!station) {
    if (detail.open) detail.close();
    activeStation = null;
    document.title = '训练馆 · Inwt';
    return;
  }
  activeStation = station;
  renderDetail();
  document.title = `${station.name} · 训练馆`;
  if (!detail.open) {
    lastDetailTrigger = document.activeElement;
    detail.showModal();
    detail.scrollTop = 0;
  }
}

function closeDetail() {
  detail.close();
  if (stations.some(s => location.hash === `#${s.id}`)) {
    history.replaceState(null, '', '#room');
    route();
  }
  lastDetailTrigger?.focus({ preventScroll: true });
}

function configureExercise() {
  const exercise = exercises.find(e => e.id === entryForm.elements.exercise.value);
  const cardio = exercise.id === 'cardio';
  $('#strength-fields').hidden = cardio;
  $('#cardio-fields').hidden = !cardio;
  $('#strength-fields').querySelectorAll('input,select').forEach(el => { el.disabled = cardio; });
  $('#cardio-fields').querySelectorAll('input,select').forEach(el => { el.disabled = !cardio; });
  if (!cardio) entryForm.elements.unit.value = exercise.unit;
}

function openEntry(exercise = 'row') {
  lastEntryTrigger = document.activeElement;
  entryForm.reset();
  entryForm.elements.date.value = localDate();
  entryForm.elements.exercise.value = exercise;
  $('#entry-error').textContent = '';
  configureExercise();
  entryDialog.showModal();
}

$('#exercise-select').innerHTML = exercises.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
$('#exercise-select').addEventListener('change', configureExercise);
$('#add-entry').addEventListener('click', () => { $('#menu-dialog').close(); openEntry(); });
$('#close-entry').addEventListener('click', () => entryDialog.close());
entryDialog.addEventListener('close', () => lastEntryTrigger?.focus({ preventScroll: true }));
$('#close-detail').addEventListener('click', closeDetail);
detail.addEventListener('cancel', event => { event.preventDefault(); closeDetail(); });
for (const dialog of [detail, entryDialog]) dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog === detail ? closeDetail() : dialog.close();
});

entryForm.addEventListener('submit', event => {
  event.preventDefault();
  const form = new FormData(entryForm);
  const exercise = form.get('exercise');
  const entry = { id: `local-${crypto.randomUUID()}`, date: form.get('date'), exercise, note: form.get('note').trim() };
  if (exercise === 'cardio') entry.segments = [{ name: form.get('activity'), minutes: Number(form.get('minutes')) }];
  else entry.loads = [{ weight: Number(form.get('weight')), unit: form.get('unit'), reps: Number(form.get('reps')), sets: form.get('sets') ? Number(form.get('sets')) : 1 }];
  try {
    save({ ...journal, entries: [...journal.entries, entry] });
    selectedDate = entry.date;
    month = entry.date.slice(0, 7);
    if (detail.open) renderDetail();
    entryDialog.close();
    notify('这次努力，已经记下了。');
  } catch (error) { $('#entry-error').textContent = error.name === 'QuotaExceededError' ? '浏览器存储空间不足，请先导出备份。' : '保存失败。请检查记录，并确认浏览器允许本地存储。'; }
});

$('#detail-content').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.new) return openEntry(button.dataset.new);
  if (button.dataset.anatomyView) {
    const panel = button.closest('.muscle-panel');
    panel.querySelectorAll('[data-body-view]').forEach(view => { view.hidden = view.dataset.bodyView !== button.dataset.anatomyView; });
    panel.querySelectorAll('[data-anatomy-view]').forEach(control => control.setAttribute('aria-pressed', String(control === button)));
    return;
  }
  if (button.dataset.month) {
    const [y, m] = month.split('-').map(Number);
    const date = new Date(y, m - 1 + Number(button.dataset.month), 1);
    month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    selectedDate = null;
    renderDetail();
    $(`[data-month="${button.dataset.month}"]`)?.focus({ preventScroll: true });
  } else if (button.dataset.day) {
    selectedDate = selectedDate === button.dataset.day ? null : button.dataset.day;
    renderDetail();
    $(`[data-day="${button.dataset.day}"]`)?.focus({ preventScroll: true });
  } else if (button.dataset.delete || button.dataset.deleteWeight) {
    try {
      const next = button.dataset.delete ? { ...journal, entries: journal.entries.filter(e => e.id !== button.dataset.delete) } : { ...journal, weights: journal.weights.filter(w => w.date !== button.dataset.deleteWeight) };
      save(next);
      renderDetail();
      $('#close-detail').focus({ preventScroll: true });
      notify('已删除这条记录。');
    } catch { notify('未能删除，浏览器存储暂时不可用。'); }
  }
});

$('#detail-content').addEventListener('submit', event => {
  if (event.target.id !== 'weight-form') return;
  event.preventDefault();
  const form = new FormData(event.target);
  const record = { date: form.get('date'), kg: Number(form.get('kg')), note: form.get('note').trim() };
  try {
    save({ ...journal, weights: [...journal.weights.filter(w => w.date !== record.date), record] });
    renderDetail();
    $('#weight-form input[name="kg"]').focus({ preventScroll: true });
    notify('新的坐标，记下了。');
  } catch { $('#weight-error').textContent = '保存失败，请检查体重和日期，并确认浏览器允许本地存储。'; }
});

$('#export-data').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ version: 1, entries: entries(), weights: weights() }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `inwt-gym-${localDate()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('已导出训练与体重记录。');
});
$('#import-data').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('请选择小于 5 MB 的备份。');
    const incoming = validateJournal(JSON.parse(await file.text()));
    const mergedEntries = new Map(journal.entries.map(e => [e.id, e]));
    for (const entry of incoming.entries) if (!publishedIds.has(entry.id) && !mergedEntries.has(entry.id)) mergedEntries.set(entry.id, entry);
    const mergedWeights = new Map(journal.weights.map(w => [w.date, w]));
    for (const weight of incoming.weights) if (!mergedWeights.has(weight.date)) mergedWeights.set(weight.date, weight);
    save({ version: 1, entries: [...mergedEntries.values()], weights: [...mergedWeights.values()] });
    if (detail.open) renderDetail();
    notify('备份已合并。重复记录保留当前浏览器中的版本。');
  } catch (error) { notify(error instanceof SyntaxError ? '这不是有效的 JSON 备份。' : error.message || '导入失败，请检查备份文件。'); }
  event.target.value = '';
});

$('#toast').setAttribute('popover', 'manual');
route();
addEventListener('hashchange', route);
addEventListener('storage', event => {
  if (event.key !== storageKey && event.key !== null) return;
  try {
    journal = event.newValue ? validateJournal(JSON.parse(event.newValue)) : { version: 1, entries: [], weights: [] };
    if (detail.open) renderDetail();
  } catch { notify('另一页面的记录未能读取，请导出备份后检查。'); }
});
if (readError) notify('原有本地记录暂时无法读取，请先检查或导入备份。');

const descriptions = {
  pull: '拉力训练 · 查看背部训练记录', row: '坐姿划船 · 查看训练与进步',
  fly: '蝴蝶机 · 查看夹胸训练记录', chest: '胸部推举 · 查看训练记录',
  shoulder: '肩部推举 · 查看训练记录', abs: '腹肌训练 · 查看核心训练记录',
  'leg-curl': '腿屈伸 / 腿弯曲 · 查看训练记录',
  legs: '腿部训练 · 查看腿部训练记录', cardio: '跑步机 · 记录有氧训练',
  weight: '体重秤 · 记录身体的变化', calendar: '训练手账 · 查看训练日历',
};
let room = null;
const menu = $('#menu-dialog');
const caption = $('#interaction-caption');
function unavailable() {
  $('#scene-loading').hidden = true;
  $('#scene-fallback').hidden = false;
  $('#fallback-stations').innerHTML = stations.map(s => `<a href="#${s.id}">${s.name}</a>`).join('');
}
function hint(id) {
  caption.hidden = !id || detail.open || menu.open || entryDialog.open;
  $('#interaction-text').textContent = id ? descriptions[id] : '';
}
$('#keyboard-stations').innerHTML = stations.map(s => `<button type="button" data-station="${s.id}">${s.name}</button>`).join('');
$('#keyboard-stations').addEventListener('focusin', e => { if (e.target.dataset.station) room?.focus(e.target.dataset.station); });
$('#keyboard-stations').addEventListener('click', e => { if (e.target.dataset.station) location.hash = e.target.dataset.station; });
const paused = () => detail.open || entryDialog.open || menu.open || document.hidden;
$('#reset-view').addEventListener('click', () => { menu.close(); document.activeElement?.blur(); room?.reset(); });
$('#resume-room').addEventListener('click', () => menu.close());
$('#close-menu').addEventListener('click', () => menu.close());
const modalObserver = new MutationObserver(() => { room?.setPaused(paused()); if (paused()) hint(null); });
for (const modal of [detail, entryDialog, menu]) modalObserver.observe(modal, { attributes: true, attributeFilter: ['open'] });
// A room that finishes loading in an inactive Safari tab starts paused. Resume
// its internal input state as well as its animation loop when the tab returns.
document.addEventListener('visibilitychange', () => room?.setPaused(paused()));
addEventListener('pageshow', () => room?.setPaused(paused()));
addEventListener('focus', () => room?.setPaused(paused()));
addEventListener('keydown', event => {
  if (event.key === 'Escape' && !detail.open && !entryDialog.open && !menu.open) {
    event.preventDefault();
    menu.showModal();
  }
});
// Full-viewport scene. The journal remains independent of the GPU renderer.
import('./room.mjs?v=layout-2').then(({ createRoom }) => createRoom({
  container: $('#scene'),
  onHover: hint,
  onMenu: () => menu.showModal(),
  onUnavailable: unavailable,
  onSelect: id => { hint(null); location.hash = id; },
  isPaused: paused,
})).then(result => {
  room = result;
  room.setPaused(paused());
  $('#scene-loading').hidden = true;
}).catch(error => {
  console.warn('3D room unavailable:', error);
  unavailable();
  $('#scene canvas')?.remove();
});
