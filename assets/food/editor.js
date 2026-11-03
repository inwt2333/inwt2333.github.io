'use strict';
const $ = id => document.getElementById(id);
let pin = '', revision = '', photos = [], meals = [], pending = false;
const dirty = new Map(), dirtyMeals = new Map();
function node(tag, cls, text) { const n = document.createElement(tag); if(cls) n.className=cls; if(text!==undefined)n.textContent=text; return n; }
function status(message, error=false) { $('status').textContent=message; $('status').classList.toggle('error',error); }
async function request(method, body) {
    const response = await fetch('/api/food-edit', {method, headers:{'X-Edit-Pin':pin, ...(body?{'Content-Type':'application/json'}:{})}, ...(body?{body:JSON.stringify(body)}:{})});
    const data = await response.json();
    if(!response.ok) throw new Error(data.error || '请求失败，请稍后重试');
    return data;
}
function busy(value) {
    pending=value;
    document.querySelectorAll('#workspace fieldset, #reload, #search').forEach(n=>n.disabled=value);
    updateDirty();
}
function updateDirty() {
    $('dirty-count').textContent = (dirty.size || dirtyMeals.size) ? `${dirty.size} 张照片、${dirtyMeals.size} 顿饭有未保存的修改` : '所有修改已保存';
    $('save').disabled = pending || !(dirty.size || dirtyMeals.size);
    $('save').textContent = pending ? '正在保存与构建…' : '保存修改并更新预览';
}
function filter() {
    const query = $('search').value.trim().toLowerCase(); let count=0;
    document.querySelectorAll('.edit-card').forEach(card=>{
        const photo=photos.find(p=>p.file===card.dataset.file), edit=dirty.get(photo.file)||photo;
        card.hidden = ![photo.file,edit.date,edit.location,(edit.dishes||[]).map(d=>d.name).join(' '),edit.note].join(' ').toLowerCase().includes(query);
        if(!card.hidden)count++;
    });
    $('count').textContent=`${count} / ${photos.length} 张照片`;
}
function render(data) {
    revision=data.revision; photos=data.photos; meals=data.meals||[]; dirty.clear(); dirtyMeals.clear(); $('cards').replaceChildren();
    const shown = new Set();
    for(const photo of photos) {
        if(!shown.has(photo.date)) {
            shown.add(photo.date);
            const meal=meals.find(m=>m.date===photo.date)||{date:photo.date,note:''};
            const block=node('fieldset','meal-editor');block.dataset.date=photo.date;
            block.append(node('legend','',`${photo.date} · 整顿饭`));
            const label=node('label','','总体备注（可选）'), input=node('textarea');input.className='meal-note';input.value=meal.note;input.maxLength=4000;input.rows=3;input.placeholder='记录这一顿的整体感受、聚餐故事…';
            label.append(input);block.append(label,node('small','','同一天的照片共用这一条总体备注，保存在对应日期的小票里。'));
            input.addEventListener('input',()=>{if(input.value!==meal.note)dirtyMeals.set(photo.date,{date:photo.date,note:input.value});else dirtyMeals.delete(photo.date);updateDirty();});
            $('cards').append(block);
        }
        const card=node('article','edit-card'); card.dataset.file=photo.file;
        const figure=node('figure','photo-side'), img=node('img'); img.src=photo.web; img.alt=photo.dish || '待编辑的美食照片'; img.loading='lazy';
        figure.append(img,node('figcaption','',photo.file));
        const fields=node('fieldset','fields');
        for(const [key,title,max] of [['date','拍摄日期',10],['location','地点 / 店名',200]]) {
            const label=node('label',key==='note' || key==='location' ? 'wide':'',title);
            const input=node(key==='note'?'textarea':'input'); input.name=key; input.value=photo[key] || ''; input.maxLength=max;
            if(key==='date') { input.type='date'; input.min='0001-01-01'; input.max='9999-12-31'; }
            if(key==='note')input.rows=3;
            label.append(input);
            if(key==='date')label.append(node('small','',`清空后恢复原始日期 ${photo.source_date || photo.date}`));
            fields.append(label);
        }
        const dishGroup=node('div','wide dish-editor');
        dishGroup.append(node('div','dish-editor-title','菜品与价格'));
        const list=node('div','dish-rows'); dishGroup.append(list);
        const add=node('button','secondary add-dish','＋ 添加菜品'); add.type='button'; dishGroup.append(add);
        fields.insertBefore(dishGroup, fields.children[1]);
        function collect() {
            const edit={file:photo.file};
            fields.querySelectorAll('input[name],textarea[name]').forEach(input=>{edit[input.name]=input.value;});
            edit.dishes=[...list.children].map(row=>({name:row.querySelector('.dish-input').value,price:row.querySelector('.price-input').value,note:row.querySelector('.dish-note-input').value}));
            const cleaned=edit.dishes.filter(d=>d.name || d.price || d.note);
            let changed=JSON.stringify(cleaned)!==JSON.stringify(photo.dishes || []);
            for(const key of ['date','location']) if(edit[key]!==(photo[key]||''))changed=true;
            if(changed)dirty.set(photo.file,edit);else dirty.delete(photo.file);
            card.classList.toggle('dirty',changed); updateDirty();
        }
        function addDish(dish={name:'',price:''}, focus=false) {
            const row=node('div','dish-row');
            const nameLabel=node('label','','菜品名称'), name=node('input','dish-input');
            name.value=dish.name;name.maxLength=200;name.placeholder='例如：小笼包';nameLabel.append(name);
            const priceLabel=node('label','','价格（元，可选）'), price=node('input','price-input');
            price.type='number';price.min='0';price.max='99999999.99';price.step='0.01';price.inputMode='decimal';price.placeholder='不填则不显示';price.value=dish.price;priceLabel.append(price);
            const remove=node('button','secondary remove-dish','×');remove.type='button';remove.setAttribute('aria-label','删除此菜品');
            remove.addEventListener('click',()=>{row.remove();collect();add.focus();});
            const noteLabel=node('label','dish-note-field','菜品备注（可选）'), note=node('textarea','dish-note-input');note.value=dish.note||'';note.maxLength=4000;note.rows=2;note.placeholder='口味、配料、推荐程度…';noteLabel.append(note);
            row.append(nameLabel,priceLabel,remove,noteLabel);list.append(row);
            if(focus)name.focus();
        }
        for(const dish of (photo.dishes?.length?photo.dishes:[{name:photo.dish||'',price:''}])) addDish(dish);
        add.addEventListener('click',()=>{if(list.children.length>=50){status('每张照片最多添加 50 个菜品。',true);return;}addDish(undefined,true);});
        fields.addEventListener('input',collect);
        card.append(figure,fields); $('cards').append(card);
    }
    $('empty').hidden=!!photos.length; filter(); updateDirty();
}
$('unlock').addEventListener('submit',async event=>{
    event.preventDefault(); pin=$('pin').value;
    const button=event.submitter; button.disabled=true; status('正在读取照片…');
    try { const data=await request('GET'); render(data); $('unlock').hidden=true; $('workspace').hidden=false; status('已打开。修改后点击底部按钮保存到本地。'); }
    catch(error){status(error.message,true);}finally{button.disabled=false;}
});
$('search').addEventListener('input',filter);
$('reload').addEventListener('click',async()=>{
    if((dirty.size || dirtyMeals.size) && !confirm('重新加载会丢弃尚未保存的修改，确定继续吗？'))return;
    busy(true); try{render(await request('GET'));status('已加载最新记录。');}catch(error){status(error.message,true);}finally{busy(false);}
});
$('save').addEventListener('click',async()=>{
    if(pending||!(dirty.size || dirtyMeals.size))return;
    if(![...document.querySelectorAll('#workspace input')].every(input=>input.reportValidity()))return;
    busy(true);status('正在保存说明并更新预览…');
    try { const data=await request('POST',{revision,photos:[...dirty.values()],meals:[...dirtyMeals.values()]}); render(data);status('已保存到本地，食堂预览已更新。确认后按原有 Git 流程发布即可。'); }
    catch(error){status(error.message,true);$('status').scrollIntoView({block:'center'});}finally{busy(false);}
});
window.addEventListener('beforeunload',event=>{if(dirty.size || dirtyMeals.size){event.preventDefault();event.returnValue='';}});
