import {foodCandidates, drawWithoutRepeat, randomBoardPhotos} from './discovery.mjs';
'use strict';
const $ = id => document.getElementById(id);
let meals = [], activeMeal, photoIndex = 0, boardPhotos = [];
let drawState = {}, selectedFood = null, drawing = false, drawToken = 0;
const fortune = $('fortune-dialog');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const menu = $('menu-dialog'), receipt = $('receipt-dialog'), viewer = $('viewer'), mapDialog = $('food-map-dialog');
let foodMap = null, returnFromMap = false;
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
for (const dialog of [menu, receipt, viewer, fortune, mapDialog]) {
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const r = dialog.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    });
}
$('menu-open').addEventListener('click', () => menu.showModal());
function renderBoard() {
    $('board').replaceChildren();
    for (const {meal, photo} of boardPhotos) {
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
    $('board-shuffle').disabled = count <= 3;
}
function reshuffleBoard() {
    boardPhotos = randomBoardPhotos(meals, boardPhotos.map(item => item.id));
    renderBoard();
}
$('board-shuffle').addEventListener('click', reshuffleBoard);
function mapPlaces() {
    const byPlace = new Map(), unlocated = [];
    for (const meal of meals) for (const photo of meal.photos) {
        if (!photo.location) continue;
        if (typeof photo.lat !== 'number' || typeof photo.lng !== 'number' || !Number.isFinite(photo.lat) || !Number.isFinite(photo.lng)) {
            unlocated.push({meal, photo});
            continue;
        }
        const key = `${photo.location}|${Math.round(photo.lat * 1000)}|${Math.round(photo.lng * 1000)}`;
        if (!byPlace.has(key)) byPlace.set(key, {name: photo.location, lat: photo.lat, lng: photo.lng, items: []});
        byPlace.get(key).items.push({meal, photo});
    }
    return {places: [...byPlace.values()], unlocated};
}
function openMapReceipt(meal, photo) {
    mapDialog.close();
    returnFromMap = true;
    showMeal(meal);
    $('receipt-photos').children[meal.photos.indexOf(photo)]?.scrollIntoView({block:'start',behavior:'instant'});
}
receipt.addEventListener('close', () => {
    if (returnFromMap) { returnFromMap = false; $('map-open').focus(); }
});
mapDialog.addEventListener('close', () => { foodMap?.remove(); foodMap = null; });
function renderFoodMap() {
    const {places, unlocated} = mapPlaces();
    const surface = $('food-map'), list = $('map-place-list'), missing = $('map-unlocated'), notice = $('map-notice');
    foodMap?.remove(); foodMap = null;
    surface.replaceChildren(); list.replaceChildren(); missing.replaceChildren(); notice.hidden = true;
    if (!places.length) {
        surface.append(element('p', 'map-empty', '还没有带地点和定位的照片，先从食味簿翻一翻吧。'));
    } else if (window.L) {
        const L = window.L;
        foodMap = L.map(surface, {scrollWheelZoom:false});
        const tiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
            maxNativeZoom:16, maxZoom:19, attribution:'Tiles &copy; Esri, TomTom, Garmin, FAO, NOAA, USGS, OpenStreetMap contributors'
        }).addTo(foodMap);
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {maxNativeZoom:13,maxZoom:19}).addTo(foodMap);
        tiles.on('tileerror', () => { notice.hidden = false; });
    } else {
        surface.append(element('p', 'map-empty', '地图暂时不可用，请从下方地点列表查看小票。'));
    }
    const bounds = [];
    for (const place of places) {
        let marker;
        if (foodMap) {
            const L = window.L, pin = image(place.items[0].photo);
            pin.alt = ''; pin.loading = 'eager';
            marker = L.marker([place.lat, place.lng], {title: place.name, alt: place.name, icon:L.divIcon({className:'food-map-pin',html:pin,iconSize:[48,48],iconAnchor:[24,24]})}).addTo(foodMap);
            const popup = element('div', 'food-map-popup');
            popup.append(element('strong', '', place.name), image(place.items[0].photo));
            for (const item of place.items.filter((entry, index, all) => all.findIndex(candidate => candidate.meal.date === entry.meal.date) === index)) {
                const button = element('button', '', `${item.meal.date.replaceAll('-', '.')} · 查看小票 ↗`);
                button.type = 'button';
                button.addEventListener('click', () => openMapReceipt(item.meal, item.photo));
                popup.append(button);
            }
            marker.bindPopup(popup, {maxWidth:230});
            bounds.push([place.lat, place.lng]);
        }
        const row = element('button', 'map-place-row');
        row.type = 'button';
        const copy = element('span');
        copy.append(element('strong', '', place.name), element('small', '', `${new Set(place.items.map(item => item.meal.date)).size} 餐 · ${place.items.length} 张照片`));
        row.append(image(place.items[0].photo), copy);
        row.addEventListener('click', () => {
            if (!foodMap) { openMapReceipt(place.items[0].meal, place.items[0].photo); return; }
            foodMap.setView([place.lat, place.lng], Math.max(foodMap.getZoom(), 15));
            marker.openPopup();
        });
        list.append(row);
    }
    if (foodMap) {
        if (bounds.length === 1) foodMap.setView(bounds[0], 15);
        else foodMap.fitBounds(window.L.latLngBounds(bounds), {padding:[35,35],maxZoom:14});
        requestAnimationFrame(() => foodMap?.invalidateSize());
    }
    if (unlocated.length) {
        missing.append(element('h3', '', '有地名，尚无照片定位'));
        for (const {meal, photo} of unlocated) {
            const row = element('button', '', `${photo.location} · ${meal.date.replaceAll('-', '.')} · 查看小票 ↗`);
            row.type = 'button';
            row.addEventListener('click', () => openMapReceipt(meal, photo));
            missing.append(row);
        }
    }
}
$('map-open').addEventListener('click', () => { mapDialog.showModal(); renderFoodMap(); });
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
    const {places, unlocated} = mapPlaces();
    $('map-open').disabled = !places.length && !unlocated.length;
    $('map-count').textContent = places.length ? `${places.length} 处落脚 · ${unlocated.length} 处待定位` : '等第一站落下图钉';
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
