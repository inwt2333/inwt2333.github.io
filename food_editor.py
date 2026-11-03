"""Local-only editor storage. The public site consumes only food.json."""
import hashlib
import json
import re
from datetime import date
from pathlib import Path

from food_build import build_food, normalize_dishes


class EditConflict(ValueError):
    pass


def read_state(root):
    root = Path(root)
    manual = root/'food/manual.json'
    revision = hashlib.sha256(manual.read_bytes() if manual.exists() else b'').hexdigest()
    index = root/'food.json'
    meals = json.loads(index.read_text(encoding='utf-8')) if index.exists() else []
    photos = [dict(p) for m in meals for p in m['photos']]
    for photo in photos:
        photo['dishes'] = normalize_dishes(photo.get('dishes', [photo.get('dish', '')]))
    return {'revision': revision, 'photos': photos, 'meals': [{'date': m.get('date', m['photos'][0]['date'] if m['photos'] else ''), 'note': m.get('note', '')} for m in meals]}


def save_edits(root, payload):
    root = Path(root)
    state = read_state(root)
    if not isinstance(payload, dict) or not isinstance(payload.get('photos'), list):
        raise ValueError('保存内容格式不正确')
    if payload.get('revision') != state['revision']:
        raise EditConflict('记录已被另一个页面修改，请保留当前文字，重新加载后再编辑。')
    known = {p['file'] for p in state['photos']}
    changes = {}
    for edit in payload['photos']:
        if not isinstance(edit, dict) or edit.get('file') not in known:
            raise ValueError('照片不存在，请重新加载列表')
        fields = {}
        for key, maximum in [('date', 10), ('location', 200), ('dish', 200), ('note', 4000)]:
            if key not in edit:
                continue
            value = edit[key]
            if not isinstance(value, str) or len(value) > maximum:
                raise ValueError(f'{key} 格式不正确或文字过长')
            value = value.strip()
            if key == 'date' and value:
                try:
                    if date.fromisoformat(value).isoformat() != value:
                        raise ValueError()
                except ValueError:
                    raise ValueError('日期必须是有效的 YYYY-MM-DD 日期') from None
            fields[key] = value
        if 'dishes' in edit:
            dishes = edit['dishes']
            if not isinstance(dishes, list) or len(dishes) > 50:
                raise ValueError('菜品需要是列表，每张照片最多 50 个菜品')
            checked = []
            for item in dishes:
                if isinstance(item, str):
                    item = {'name': item, 'price': ''}
                if not isinstance(item, dict):
                    raise ValueError('菜品格式不正确')
                name, price = item.get('name', ''), item.get('price', '')
                if not isinstance(name, str) or len(name) > 200 or not isinstance(price, str):
                    raise ValueError('菜名格式不正确或过长')
                note = item.get('note', '')
                if not isinstance(note, str) or len(note) > 4000:
                    raise ValueError('菜品备注格式不正确或过长')
                if note.strip() and not name.strip():
                    raise ValueError('添加菜品备注前请填写菜名')
                name, price = name.strip(), price.strip()
                if price and (not re.fullmatch(r'[0-9]{1,8}(?:\.[0-9]{1,2})?', price) or not name):
                    raise ValueError('请填写菜名，价格应为非负金额，最多两位小数')
                if name:
                    checked.append({'name': name, 'price': price, 'note': note.strip()})
            fields['dishes'] = checked
            fields['dish'] = '、'.join(d['name'] for d in checked)
        elif 'dish' in fields:
            fields['dishes'] = normalize_dishes([fields['dish']])
        changes[edit['file']] = fields
    meal_changes = {}
    edits = payload.get('meals', [])
    if not isinstance(edits, list):
        raise ValueError('整餐备注格式不正确')
    known_dates = {m['date'] for m in state['meals']}
    for edit in edits:
        if not isinstance(edit, dict) or edit.get('date') not in known_dates:
            raise ValueError('用餐日期不存在，请重新加载')
        note = edit.get('note')
        if not isinstance(note, str) or len(note) > 4000:
            raise ValueError('整餐备注格式不正确或过长')
        meal_changes[edit['date']] = note.strip()
    manual_path = root/'food/manual.json'
    original = manual_path.read_bytes() if manual_path.exists() else None
    manual = json.loads(original) if original else {}
    for name, fields in changes.items():
        manual.setdefault('photos', {}).setdefault(name, {}).update(fields)
    for day, note in meal_changes.items():
        manual.setdefault('meals', {}).setdefault(day, {})['note'] = note
    manual_path.parent.mkdir(parents=True, exist_ok=True)
    staging = manual_path.with_suffix('.json.tmp')
    staging.write_text(json.dumps(manual, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    staging.replace(manual_path)
    try:
        build_food(root)
    except Exception:
        if original is None:
            manual_path.unlink(missing_ok=True)
        else:
            manual_path.write_bytes(original)
        raise
    return read_state(root)
