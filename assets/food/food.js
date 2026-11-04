import {foodCandidates, drawWithoutRepeat, randomBoardPhotos} from './discovery.mjs';
'use strict';
const $ = id => document.getElementById(id);
let meals = [], activeMeal, photoIndex = 0, boardPhotos = [];
let drawState = {}, selectedFood = null, drawing = false, drawToken = 0;
const fortune = $('fortune-dialog');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const compactBoard = matchMedia('(max-width: 600px)');
const menu = $('menu-dialog'), receipt = $('receipt-dialog'), viewer = $('viewer'), ticketDialog = $('ticket-dialog');
let stations = [], stationIndex = 0, stationPhotoIndex = 0, returnFromTicket = false;
function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}
function image(photo, full = false) {
    const img = element('img');
    img.src = photo[full ? 'web' : 'thumb'];
    img.alt = photo.dish || `${photo.date} 的美食照片`;
    img.loading = 'lazy';
    img.addEventListener('error', () => {
        img.classList.add('image-failed');
        img.alt = '这张照片暂时无法加载';
    }, {once: true});
    return img;
}
function cover(meal) { return meal.photos.find(p => p.file === meal.cover) || meal.photos[0]; }
function time(day) { const node = element('time', '', day.replaceAll('-', '.')); node.dateTime = day; return node; }
function showMeal(meal) {
    activeMeal = meal;
    $('receipt-date').textContent = meal.date.replaceAll('-', '.');
    $('receipt-date').dateTime = meal.date;
    $('receipt-total').textContent = `${meal.photos.length} 张留念`;
    $('meal-title').textContent = meal.title;
    $('meal-title').hidden = !meal.title;
    $('meal-note').textContent = meal.note;
    $('meal-note').hidden = !meal.note;
    $('receipt-photos').replaceChildren(...meal.photos.map((photo, index) => {
        const button = element('button', 'dish');
        button.setAttribute('aria-label', `放大第 ${index + 1} 张美食照片`);
        button.append(image(photo, true), element('span', '', `${String(index + 1).padStart(2, '0')} / ${String(meal.photos.length).padStart(2, '0')}`));
        button.addEventListener('click', () => { photoIndex = index; renderPhoto(); viewer.showModal(); });
        const entry = element('article', 'dish-entry');
        entry.append(button);
        const dishes = photo.dishes || (photo.dish ? [{name: photo.dish, price: ''}] : []);
        if (dishes.length) {
            const list = element('ul', 'dish-list');
            for (const dish of dishes) {
                const row = element('li');
                row.append(element('span', 'dish-name', dish.name));
                if (dish.price !== '' && dish.price != null) row.append(element('span', 'dish-price', `¥${Number(dish.price).toFixed(2)}`));
                list.append(row);
                if(dish.note) list.append(element('li', 'dish-item-note', dish.note));
            }
            entry.append(list);
        }
        if (photo.location) entry.append(element('p', 'dish-location', photo.location));

        return entry;
    }));
    receipt.showModal();
    receipt.scrollTop = 0;
}
function renderPhoto(retry = false) {
    const photo = activeMeal.photos[photoIndex];
    $('photo-error').hidden = true;
    $('full-photo').hidden = false;
    $('full-photo').src = photo.web + (retry ? (photo.web.includes('?') ? '&' : '?') + 'retry=' + Date.now() : '');
    $('full-photo').alt = photo.dish || `${activeMeal.date} 的第 ${photoIndex + 1} 张美食照片`;
    $('photo-caption').textContent = [activeMeal.date, photo.dish, photo.location, `${photoIndex + 1} / ${activeMeal.photos.length}`].filter(Boolean).join(' · ');
    $('previous').hidden = $('next').hidden = activeMeal.photos.length < 2;
}
function step(direction) { photoIndex = (photoIndex + direction + activeMeal.photos.length) % activeMeal.photos.length; renderPhoto(); }
$('previous').addEventListener('click', () => step(-1));
$('next').addEventListener('click', () => step(1));
viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); step(event.key === 'ArrowLeft' ? -1 : 1); }
});
$('full-photo').addEventListener('error', () => {
    $('full-photo').hidden = true;
    $('photo-error').hidden = false;
});
$('retry-photo').addEventListener('click', () => {
    viewer.querySelector('[data-close]').focus();
    renderPhoto(true);
});
for (const dialog of [menu, receipt, viewer, fortune, ticketDialog]) {
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const r = dialog.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    });
}
$('menu-open').addEventListener('click', () => menu.showModal());
function renderBoard() {
    const visibleCount = compactBoard.matches ? 2 : 3;
    const previousFocus = document.activeElement?.classList.contains('memory');
    $('board').replaceChildren();
    for (const {meal, photo} of boardPhotos.slice(0, visibleCount)) {
        const button = element('button', 'memory');
        button.setAttribute('aria-label', `查看 ${meal.date} 的美食照片和用餐小票`);
        button.append(image(photo), time(meal.date));
        button.addEventListener('click', () => {
            showMeal(meal);
            $('receipt-photos').children[meal.photos.indexOf(photo)]?.scrollIntoView({block:'start',behavior:'instant'});
        });
        $('board').append(button);
    }
    const count = meals.reduce((total, meal) => total + meal.photos.length, 0);
    $('board-shuffle').hidden = !count;
    $('board-shuffle').disabled = count <= visibleCount;
    const amount = visibleCount === 2 ? '两' : '三';
    $('board-shuffle').querySelector('.shuffle-label').textContent = `换${amount}张`;
    $('board-shuffle').setAttribute('aria-label', `重新随机挑选${amount}张美食照片`);
    if (previousFocus) $('board').querySelector('.memory')?.focus();
}
function reshuffleBoard() {
    boardPhotos = randomBoardPhotos(meals, boardPhotos.slice(0, compactBoard.matches ? 2 : 3).map(item => item.id));
    renderBoard();
}
$('board-shuffle').addEventListener('click', reshuffleBoard);
compactBoard.addEventListener('change', () => { if (meals.length) renderBoard(); });
function ticketStations() {
    const byPlace = new Map();
    for (const meal of meals) for (const photo of meal.photos) {
        const name = typeof photo.location === 'string' ? photo.location.trim() : '';
        const key = name || '__waiting__';
        if (!byPlace.has(key)) byPlace.set(key, {name: name || '待补票', items: []});
        byPlace.get(key).items.push({meal, photo});
    }
    const waiting = byPlace.get('__waiting__');
    byPlace.delete('__waiting__');
    const result = [...byPlace.values()];
    if (waiting) result.push(waiting);
    return result;
}
function selectedTicketItem() { return stations[stationIndex]?.items[stationPhotoIndex]; }
function renderTicketPhoto() {
    const item = selectedTicketItem();
    if (!item) return;
    const photo = $('ticket-photo');
    const dish = item.photo.dishes?.map(entry => entry.name).filter(Boolean).join('、') || item.photo.dish || '';
    photo.hidden = false;
    $('ticket-photo-failed').hidden = true;
    photo.src = item.photo.web || item.photo.thumb;
    photo.alt = dish || item.meal.date + ' 的美食照片';
    $('ticket-photo-caption').textContent = item.meal.date.replaceAll('-', '.') + (dish ? ' · ' + dish : '');
    for (const [index, button] of [...$('ticket-photo-strip').children].entries()) {
        button.setAttribute('aria-pressed', String(index === stationPhotoIndex));
    }
}
function renderTicketStation() {
    const station = stations[stationIndex];
    if (!station) return;
    $('ticket-index').textContent = String(stationIndex + 1).padStart(2, '0') + ' / ' + String(stations.length).padStart(2, '0');
    $('ticket-station-name').textContent = station.name;
    const mealCount = new Set(station.items.map(item => item.meal.date)).size;
    $('ticket-station-meta').textContent = station.name === '待补票'
        ? station.items.length + ' 张照片 · 地点尚未标注'
        : mealCount + ' 顿 · ' + station.items.length + ' 张照片';
    for (const [index, button] of [...$('ticket-stamps').children].entries()) {
        button.setAttribute('aria-pressed', String(index === stationIndex));
    }
    const strip = $('ticket-photo-strip');
    strip.replaceChildren();
    station.items.forEach((item, index) => {
        const button = element('button', 'ticket-photo-thumb');
        button.type = 'button';
        button.setAttribute('aria-label', '查看第 ' + (index + 1) + ' 张照片，' + item.meal.date);
        button.append(image(item.photo));
        button.addEventListener('click', () => { stationPhotoIndex = index; renderTicketPhoto(); });
        strip.append(button);
    });
    $('ticket-prev').disabled = $('ticket-next').disabled = stations.length < 2;
    renderTicketPhoto();
}
function selectTicketStation(index) {
    if (!stations.length) return;
    stationIndex = (index + stations.length) % stations.length;
    stationPhotoIndex = 0;
    renderTicketStation();
}
function openTicketReceipt() {
    const item = selectedTicketItem();
    if (!item) return;
    returnFromTicket = true;
    ticketDialog.close();
    showMeal(item.meal);
    $('receipt-photos').children[item.meal.photos.indexOf(item.photo)]?.scrollIntoView({block:'start', behavior:'instant'});
}
receipt.addEventListener('close', () => {
    if (returnFromTicket) { returnFromTicket = false; $('ticket-open').focus(); }
});
ticketDialog.addEventListener('close', () => { if (!returnFromTicket) $('ticket-open').focus(); });
$('ticket-photo').addEventListener('error', () => {
    $('ticket-photo').hidden = true;
    $('ticket-photo-failed').hidden = false;
});
$('ticket-open').addEventListener('click', () => {
    stations = ticketStations();
    if (!stations.length) return;
    stationIndex = stationPhotoIndex = 0;
    const stamps = $('ticket-stamps');
    stamps.replaceChildren();
    stations.forEach((station, index) => {
        const stamp = element('button', 'ticket-stamp');
        stamp.type = 'button';
        stamp.setAttribute('aria-label', station.name + '，' + station.items.length + ' 张照片');
        stamp.append(element('span', '', station.name), element('small', '', station.items.length + ' 张留念'));
        stamp.addEventListener('click', () => selectTicketStation(index));
        stamps.append(stamp);
    });
    renderTicketStation();
    ticketDialog.showModal();
});
$('ticket-prev').addEventListener('click', () => selectTicketStation(stationIndex - 1));
$('ticket-next').addEventListener('click', () => selectTicketStation(stationIndex + 1));
$('ticket-photo-open').addEventListener('click', openTicketReceipt);
$('ticket-receipt').addEventListener('click', openTicketReceipt);
ticketDialog.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    selectTicketStation(stationIndex + (event.key === 'ArrowRight' ? 1 : -1));
});
const ticketPanel = $('ticket-panel');
let swipeStart = null, suppressSwipeClick = false;
ticketPanel.addEventListener('dragstart', event => event.preventDefault());
ticketPanel.addEventListener('pointerdown', event => { swipeStart = {x: event.clientX, y: event.clientY}; });
ticketPanel.addEventListener('pointercancel', () => { swipeStart = null; });
ticketPanel.addEventListener('pointerup', event => {
    if (!swipeStart) return;
    const dx = event.clientX - swipeStart.x, dy = event.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    suppressSwipeClick = true;
    selectTicketStation(stationIndex + (dx < 0 ? 1 : -1));
    setTimeout(() => { suppressSwipeClick = false; }, 0);
});
ticketPanel.addEventListener('click', event => {
    if (!suppressSwipeClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressSwipeClick = false;
}, true);
async function drawFood() {
    if (drawing || !meals.length) return;
    drawing = true;
    const token = ++drawToken;
    $('draw-again').disabled = $('draw-receipt').disabled = true;
    $('fortune-result').hidden = true;
    $('draw-status').textContent = '抽签中…';
    fortune.classList.add('drawing');
    if (!reducedMotion.matches) await new Promise(resolve => setTimeout(resolve, 650));
    if (token !== drawToken || !fortune.open) return;
    const pool = foodCandidates(meals), draw = drawWithoutRepeat(pool.map(item => item.id), drawState);
    drawState = draw.state;
    selectedFood = pool.find(item => item.id === draw.value);
    const {meal, photo, dish} = selectedFood;
    const result = $('fortune-result');
    result.replaceChildren();
    const shot = image(photo, true); shot.loading = 'eager'; result.append(shot);
    result.append(element('h3', 'fortune-dish', dish?.name || '一份未命名的美味'));
    const details = [meal.date, photo.location];
    if (dish?.price !== '' && dish?.price != null) details.push(`¥${Number(dish.price).toFixed(2)}`);
    result.append(element('p', 'muted', details.filter(Boolean).join(' · ')));
    if (dish?.note) result.append(element('p', 'fortune-note', dish.note));
    $('draw-status').textContent = '';
    result.hidden = false;
    fortune.classList.remove('drawing');
    drawing = false;
    $('draw-again').disabled = $('draw-receipt').disabled = false;
}
$('draw-open').addEventListener('click', () => { fortune.showModal(); drawFood(); });
$('draw-again').addEventListener('click', drawFood);
$('draw-receipt').addEventListener('click', () => {
    if (!selectedFood || drawing) return;
    showMeal(selectedFood.meal);
    const index = selectedFood.meal.photos.indexOf(selectedFood.photo);
    $('receipt-photos').children[index]?.scrollIntoView({block: 'start', behavior: 'instant'});
});
fortune.addEventListener('close', () => { ++drawToken; drawing = false; fortune.classList.remove('drawing'); });
function render() {
    $('board').replaceChildren(); $('archive').replaceChildren();
    $('draw-open').disabled = !meals.length;
    $('draw-open').title = meals.length ? '随机抽取一道吃过的美味' : '等第一份美味入席后再来抽签';
    $('menu-count').textContent = meals.length ? `${meals.length} 日 · ${meals.reduce((n,m) => n + m.photos.length, 0)} 张留念` : '一餐一记 · 慢慢收藏';
    const availableStations = ticketStations();
    const located = availableStations.filter(station => station.name !== '待补票');
    const pending = availableStations.find(station => station.name === '待补票');
    $('ticket-open').disabled = !availableStations.length;
    $('ticket-count').textContent = located.length
        ? `${located.length} 站 · ${pending ? pending.items.length + ' 张待补票' : '继续出发'}`
        : pending ? `${pending.items.length} 张待补票` : '等第一站开张';
    renderBoard();
    let month;
    for (const meal of meals) {
        const key = meal.date.slice(0,7);
        if (key !== month) { month = key; $('archive').append(element('h3', 'month-heading', key.replace('-', ' / '))); }
        const button = element('button', 'archive-row'), copy = element('span', 'row-copy');
        copy.append(time(meal.date), element('small', '', meal.title || `${meal.photos.length} 张美味留念`));
        button.append(image(cover(meal)), copy, element('span', '', '↗'));
        button.addEventListener('click', () => showMeal(meal));
        $('archive').append(button);
    }
    if (!meals.length) {
        $('board').append(element('p', 'board-message', '留一盏灯，\n等美味入席。'));
        $('archive').append(element('p', 'muted', '食味簿还是空白，下一顿就是第一页。'));
    }
}
let refreshing = false;
let lastIndex = null;
async function refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
        const response = await fetch('food.json', {cache: 'no-store'});
        if (!response.ok) throw new Error(response.status);
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid meal index');
        const signature = JSON.stringify(data);
        if (signature === lastIndex) return;
        meals = data.filter(m => m && typeof m.date === 'string' && Array.isArray(m.photos) && m.photos.length).sort((a,b) => b.date.localeCompare(a.date));
        boardPhotos = randomBoardPhotos(meals);
        render();
        lastIndex = signature;
    } catch {
        if (lastIndex !== null) return; // Keep the last usable board on a failed local refresh.
        const message = element('div', 'board-message');
        message.append(element('p', '', '记忆暂未送达，\n稍后再来看看。'));
        const reload = element('button', 'board-retry', '重新加载');
        reload.addEventListener('click', refresh);
        message.append(reload);
        $('board').replaceChildren(message);
        const retry = element('button', 'archive-row', '重新加载食味簿');
        retry.addEventListener('click', refresh);
        $('archive').replaceChildren(retry);
    } finally {
        refreshing = false;
    }
}
refresh();
// Local imports become visible without polling visitors' pages.
if (['localhost', '127.0.0.1'].includes(location.hostname) || /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(location.hostname)) {
    setInterval(() => { if (!document.hidden && !document.querySelector('dialog[open]')) refresh(); }, 10000);
}
