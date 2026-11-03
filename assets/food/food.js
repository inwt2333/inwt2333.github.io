'use strict';
const $ = id => document.getElementById(id);
let meals = [], activeMeal, photoIndex = 0;
const menu = $('menu-dialog'), receipt = $('receipt-dialog'), viewer = $('viewer');
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
        button.append(image(photo, true), element('span', '', `${String(index + 1).padStart(2, '0')} / ${String(meal.photos.length).padStart(2, '0')} · 点击放大`));
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
function renderPhoto() {
    const photo = activeMeal.photos[photoIndex];
    $('full-photo').src = photo.web;
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
$('full-photo').addEventListener('error', () => { $('full-photo').alt = '照片暂时无法加载，可以切换到下一张'; });
for (const dialog of [menu, receipt, viewer]) {
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const r = dialog.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    });
}
$('menu-open').addEventListener('click', () => menu.showModal());
function render() {
    $('board').replaceChildren(); $('archive').replaceChildren();
    $('menu-count').textContent = meals.length ? `${meals.length} 日 · ${meals.reduce((n,m) => n + m.photos.length, 0)} 张留念` : '一餐一记 · 慢慢收藏';
    for (const meal of meals.slice(0, 3)) {
        const button = element('button', 'memory');
        button.setAttribute('aria-label', `查看 ${meal.date} 的用餐小票`);
        button.append(image(cover(meal)), time(meal.date));
        button.addEventListener('click', () => showMeal(meal));
        $('board').append(button);
    }
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
async function refresh() {
    try {
        const response = await fetch('food.json', {cache: 'no-store'});
        if (!response.ok) throw new Error(response.status);
        const data = await response.json();
        meals = data.filter(m => m.photos?.length).sort((a,b) => b.date.localeCompare(a.date));
        render();
    } catch {
        $('board').replaceChildren(element('p', 'board-message', '记忆暂未送达，\n稍后再来看看。'));
        const retry = element('button', 'archive-row', '暂时无法读取食味簿，点击重试');
        retry.addEventListener('click', refresh);
        $('archive').replaceChildren(retry);
    }
}
refresh();
// Local imports become visible without polling visitors' pages.
if (['localhost', '127.0.0.1'].includes(location.hostname) || /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(location.hostname)) {
    setInterval(() => { if (!document.hidden && !document.querySelector('dialog[open]')) refresh(); }, 10000);
}
