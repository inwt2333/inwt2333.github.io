// 手写记录按 2026 年归档。保留原单位，未写明组数按一组记录。
export const stations = [
  { id: 'pull', name: '拉力训练', en: 'PULL STATION', zone: 'back', color: '#568b7a', description: '高位下拉 · 高拉力背肌', exercises: ['lat', 'high-pull'] },
  { id: 'row', name: '坐姿划船', en: 'SEATED ROW', zone: 'back', color: '#568b7a', description: '一拉一放，慢慢积累。', exercises: ['row'] },
  { id: 'fly', name: '蝴蝶机', en: 'PEC DECK', zone: 'chest', color: '#bf8263', description: '把每一次夹胸都记下来。', exercises: ['fly'] },
  { id: 'chest', name: '坐式胸肌', en: 'CHEST PRESS', zone: 'chest', color: '#bf8263', description: '向前推一点，也向前走一点。', exercises: ['chest'] },
  { id: 'shoulder', name: '坐姿肩推', en: 'SHOULDER PRESS', zone: 'shoulders', color: '#b99b5c', description: '包括那些有点吃力的时刻。', exercises: ['shoulder'] },
  { id: 'abs', name: '坐式腹肌', en: 'AB CRUNCH', zone: 'core', color: '#9381aa', description: '小小的动作，稳稳的核心。', exercises: ['abs'] },
  { id: 'legs', name: '腿部训练', en: 'LEG STATION', zone: 'legs', color: '#718ba6', description: '大腿内侧 · 大腿伸展 · 腿屈伸 / 腿弯曲', exercises: ['adductor', 'extension', 'extension-curl'] },
  { id: 'cardio', name: '跑步机', en: 'SLOW & STEADY', zone: 'cardio', color: '#b99b5c', description: '爬坡、放松，还有多走的那几分钟。', exercises: ['cardio'] },
  { id: 'weight', name: '体重记录', en: 'BODY JOURNAL', zone: 'life', color: '#568b7a', description: '体重秤旁，留一点身体的变化。', exercises: [] },
  { id: 'calendar', name: '训练日历', en: 'SHOWING UP', zone: 'life', color: '#bf8263', description: '每一个来过的日子，都算数。', exercises: [] },
];

export const exercises = [
  { id: 'lat', name: '高位下拉', unit: 'lb' },
  { id: 'row', name: '坐姿划船', unit: 'lb' },
  { id: 'fly', name: '蝴蝶机', unit: 'lb' },
  { id: 'high-pull', name: '高拉力背肌', unit: 'kg' },
  { id: 'abs', name: '坐式腹肌', unit: 'kg' },
  { id: 'chest', name: '坐式胸肌', unit: 'kg' },
  { id: 'adductor', name: '大腿内侧', unit: 'kg' },
  { id: 'extension', name: '大腿伸展', unit: 'kg' },
  { id: 'extension-curl', name: '腿屈伸 / 腿弯曲', unit: 'lb' },
  { id: 'shoulder', name: '坐姿肩推', unit: 'lb' },
  { id: 'cardio', name: '跑步机 / 爬坡', unit: null },
];

const strength = (id, date, exercise, weight, reps, sets = 1, note = '') =>
  ({ id, date, exercise, loads: [{ weight, reps, sets, unit: exercises.find(e => e.id === exercise).unit }], note });

export const publishedEntries = [
  strength('published-01', '2026-10-22', 'lat', 27, 12, 3),
  strength('published-02', '2026-10-22', 'row', 27, 12, 2),
  strength('published-03', '2026-10-22', 'fly', 27, 10),
  { id: 'published-04', date: '2026-10-22', exercise: 'abs', loads: [{ weight: 35, unit: 'kg', reps: 12, sets: 1 }, { weight: 40, unit: 'kg', reps: 12, sets: 1 }], note: '' },
  strength('published-05', '2026-10-22', 'chest', 15, 12),
  strength('published-06', '2026-10-22', 'adductor', 40, 12),
  strength('published-07', '2026-10-22', 'shoulder', 27, 7, 1, '吃力'),
  { id: 'published-08', date: '2026-10-22', exercise: 'cardio', segments: [{ name: '爬坡', minutes: 20 }, { name: '放松', minutes: 5 }], note: '' },
  strength('published-09', '2026-10-26', 'row', 27, 12, 3),
  strength('published-10', '2026-10-26', 'fly', 27, 12, 3),
  strength('published-11', '2026-10-26', 'high-pull', 35, 12, 3),
  strength('published-12', '2026-10-26', 'abs', 40, 12, 3),
  strength('published-13', '2026-10-26', 'extension', 40, 12),
  strength('published-14', '2026-10-28', 'row', 27, 12, 3),
  strength('published-15', '2026-10-28', 'shoulder', 17, 12, 3),
  strength('published-16', '2026-10-28', 'lat', 27, 12, 3),
  strength('published-17', '2026-10-28', 'abs', 40, 12, 3),
  strength('published-18', '2026-10-28', 'extension-curl', 27, 12, 2),
  strength('published-19', '2026-10-28', 'fly', 27, 12),
  { id: 'published-20', date: '2026-10-28', exercise: 'cardio', segments: [{ name: '爬坡', minutes: 30 }], note: '距离 2.4 km' },
];

export const exerciseName = id => exercises.find(e => e.id === id)?.name || id;
export const byDate = (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id);
export const dateLabel = date => `${Number(date.slice(5, 7))} 月 ${Number(date.slice(8, 10))} 日`;
export const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
export const cardioMinutes = entries => entries.reduce((total, e) => total + (e.segments || []).reduce((sum, s) => sum + s.minutes, 0), 0);
export const summary = entries => ({
  days: new Set(entries.map(e => e.date)).size,
  strength: entries.filter(e => e.exercise !== 'cardio').length,
  minutes: cardioMinutes(entries),
});

export function validateJournal(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.entries) || !Array.isArray(value.weights)) throw new Error('请选择本训练馆导出的 JSON 备份。');
  if (value.entries.length > 10000 || value.weights.length > 10000) throw new Error('备份中的记录过多。');
  const dateOK = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
  const numberOK = (n, max) => typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= max;
  const intOK = (n, max) => numberOK(n, max) && Number.isInteger(n);
  const ids = new Set();
  for (const e of value.entries) {
    if (!e || typeof e.id !== 'string' || !e.id || e.id.length > 100 || ids.has(e.id) || !dateOK(e.date) || !exercises.some(x => x.id === e.exercise) || typeof e.note !== 'string' || e.note.length > 500) throw new Error('训练记录格式不正确。');
    ids.add(e.id);
    if (e.exercise === 'cardio') {
      if (!Array.isArray(e.segments) || !e.segments.length || e.segments.length > 20 || !e.segments.every(s => s && typeof s.name === 'string' && s.name.length <= 40 && numberOK(s.minutes, 1440))) throw new Error('有氧记录格式不正确。');
    } else if (!Array.isArray(e.loads) || !e.loads.length || e.loads.length > 50 || !e.loads.every(l => l && numberOK(l.weight, 1000) && ['kg', 'lb'].includes(l.unit) && intOK(l.reps, 1000) && (l.sets === null || intOK(l.sets, 100)))) throw new Error('重量、次数或组数格式不正确。');
  }
  const days = new Set();
  for (const w of value.weights) {
    if (!w || !dateOK(w.date) || days.has(w.date) || !numberOK(w.kg, 500) || w.kg < 10 || typeof w.note !== 'string' || w.note.length > 500) throw new Error('体重记录格式不正确，或有重复日期。');
    days.add(w.date);
  }
  // Older browser saves and version-1 backups used null for omitted sets.
  // Normalize after validation, preserving the caller's original backup object.
  return { ...value, entries: value.entries.map(e => e.loads ? { ...e, loads: e.loads.map(l => ({ ...l, sets: l.sets ?? 1 })) } : e) };
}
