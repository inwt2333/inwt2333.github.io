import { exerciseName } from './data.mjs?v=journal-nov05';

const dayMs = 86400000;
const shift = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * dayMs).toISOString().slice(0, 10);
const setsOf = list => list.reduce((sum, e) => sum + (e.loads || []).reduce((n, l) => n + (l.sets ?? 1), 0), 0);
const minutesOf = list => list.reduce((sum, e) => sum + (e.segments || []).reduce((n, s) => n + s.minutes, 0), 0);
const effort = e => /吃力|推不动|推不起来|力竭|疲劳/.test(e.note);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// All windows end on the report date. No future training leaks into old reports.
export function dailyReport(entries, date) {
  const history = entries.filter(e => e.date <= date);
  const today = history.filter(e => e.date === date);
  const strength = today.filter(e => e.loads?.length);
  const recent = history.filter(e => e.date >= shift(date, -6));
  const previous = history.filter(e => e.date >= shift(date, -13) && e.date < shift(date, -6));
  const days = new Set(history.map(e => e.date));
  let streak = 0;
  for (let d = date; days.has(d); d = shift(d, -1)) streak++;
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = shift(date, i - 6), list = recent.filter(e => e.date === d);
    return { date: d, trained: list.length > 0, sets: setsOf(list), minutes: minutesOf(list) };
  });
  const notes = today.filter(e => e.note && e.exercise !== 'cardio').map(e => ({ exercise: exerciseName(e.exercise), text: e.note }));
  const comparisons = [];
  for (const exercise of new Set(strength.map(e => e.exercise))) {
    const current = strength.filter(e => e.exercise === exercise).flatMap(e => e.loads);
    const prior = history.filter(e => e.exercise === exercise && e.date < date).sort((a, b) => b.date.localeCompare(a.date));
    // Compare only against the previous session, with exact load and unit matches.
    const priorDate = prior[0]?.date;
    if (!priorDate) continue;
    const old = prior.filter(e => e.date === priorDate).flatMap(e => e.loads);
    const seen = new Set();
    for (const load of current) {
      const key = `${load.unit}:${load.weight}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const match = l => l.unit === load.unit && l.weight === load.weight;
      const before = old.filter(match), after = current.filter(match);
      if (!before.length) continue;
      const total = ls => ls.reduce((n, l) => n + l.reps * (l.sets ?? 1), 0);
      const count = ls => ls.reduce((n, l) => n + (l.sets ?? 1), 0);
      comparisons.push({ exercise: exerciseName(exercise), weight: load.weight, unit: load.unit, priorDate,
        before: total(before), after: total(after), beforeSets: count(before), afterSets: count(after) });
    }
  }
  const trends = [];
  const window = history.filter(e => e.date >= shift(date, -27));
  for (const exercise of new Set(window.filter(e => e.loads?.length).map(e => e.exercise))) {
    const records = window.filter(e => e.exercise === exercise);
    const dates = [...new Set(records.map(e => e.date))].sort();
    if (dates.length < 2) continue;
    for (const unit of ['kg', 'lb']) {
      const first = records.filter(e => e.date === dates[0]).flatMap(e => e.loads).filter(l => l.unit === unit);
      const last = records.filter(e => e.date === dates.at(-1)).flatMap(e => e.loads).filter(l => l.unit === unit);
      if (!first.length || !last.length) continue;
      trends.push({ exercise: exerciseName(exercise), unit, start: dates[0], end: dates.at(-1),
        first: Math.max(...first.map(l => l.weight)), last: Math.max(...last.map(l => l.weight)), sessions: dates.length });
    }
  }
  const suggestions = [];
  const push = recent.filter(e => ['chest', 'shoulder'].includes(e.exercise));
  const struggling = push.filter(e => effort(e) || e.loads.some(l => l.reps < 8));
  if (struggling.length) {
    const names = [...new Set(struggling.map(e => exerciseName(e.exercise)))].join('、');
    suggestions.push({ title: '先把推举做稳', text: `近 7 天的${names}有吃力备注或低于 8 次的分组。下次先不追求加重，用可控重量热身；若仍推不动，降低一档或减少一组，并核对座椅、握距和动作。当前记录不足以判断具体原因。` });
  }
  if (streak >= 3) suggestions.push({ title: '给恢复留出空间', text: `截至这天连续 ${streak} 天有训练记录。下次先检查肩胸的疲劳感；若还没恢复，可安排休息或轻松步行，不必连续重复吃力的推举。` });
  const fatigued = strength.filter(effort);
  if (fatigued.length && !struggling.length) suggestions.push({ title: '吃力动作先维持', text: `${[...new Set(fatigued.map(e => exerciseName(e.exercise)))].join('、')}本次有吃力记录。下次先保持或降低重量，优先完成可控的动作，再考虑递增。` });
  if (!suggestions.length) suggestions.push({ title: '先重复，再小幅递进', text: '下次先重复最近一次的重量与组数，记录每组完成次数和主观难度。连续几次动作稳定后，再考虑最小档位的调整；不因单次多做几次就自动加重。' });
  suggestions.push({ title: '给下一份日报补上依据', text: '下次补记每组大致还能再做几次、组间休息，以及器材是否相同；爬坡补记坡度和速度。这些信息能帮助区分训练量变化和实际表现变化。' });
  return { date, hasTraining: today.length > 0, exercises: new Set(strength.map(e => e.exercise)).size,
    sets: setsOf(today), reps: strength.reduce((sum, e) => sum + e.loads.reduce((n, l) => n + l.reps * (l.sets ?? 1), 0), 0),
    minutes: minutesOf(today), days: days.size, streak, week, notes, comparisons, trends, suggestions,
    recent: { days: new Set(recent.map(e => e.date)).size, sets: setsOf(recent), minutes: minutesOf(recent) },
    previous: { days: new Set(previous.map(e => e.date)).size, sets: setsOf(previous), minutes: minutesOf(previous) } };
}

export function reportHTML(entries, date) {
  const r = dailyReport(entries, date);
  if (!r.hasTraining) return '<section class="daily-report"><h3>训练日报</h3><p>这天还没有训练记录，记录后自动生成日报。</p></section>';
  const e = escape;
  const delta = r.recent.sets - r.previous.sets;
  return `<section class="daily-report" aria-labelledby="report-title">
    <header class="report-header"><div><p class="report-kicker">DAILY REVIEW / ${e(date)}</p><h3 id="report-title">训练日报</h3></div><span class="report-badge">随记录更新</span></header>
    <p class="report-lead">完成 ${r.exercises} 个力量动作、${r.sets} 组，共 ${r.reps} 次${r.minutes ? `，另有 ${r.minutes} 分钟有氧` : ''}。${r.notes.length ? `有 ${r.notes.length} 项动作附有训练感受，值得在下次训练前回看。` : '本次未记录动作难度，下次可补充主观感受。'}</p>
    <div class="report-stats"><div><span>力量组数</span><strong>${r.sets}<small>组</small></strong></div><div><span>有氧时长</span><strong>${r.minutes}<small>min</small></strong></div><div><span>近 7 天训练</span><strong>${r.recent.days}<small>天</small></strong></div></div>
    ${r.notes.length ? `<div class="report-notes">${r.notes.map(n => `<p><strong>${e(n.exercise)}</strong><span>${e(n.text)}</span></p>`).join('')}</div>` : ''}
    <div class="report-columns"><div><h4>01 / 近期节奏</h4><p>截至 ${e(date)} 的 7 天共记录 ${r.recent.sets} 组力量、${r.recent.minutes} 分钟有氧。${r.previous.days ? `此前 7 天记录 ${r.previous.sets} 组、${r.previous.minutes} 分钟；力量组数${delta >= 0 ? '增加' : '减少'} ${Math.abs(delta)} 组。` : '此前 7 天没有记录，暂不判断增减。'}${r.streak > 1 ? `已连续 ${r.streak} 天有训练记录。` : ''}</p>
    <div class="report-week" aria-label="近七天有氧时长">${r.week.map(d => `<div class="report-week-day"><span class="report-bar-slot"><i style="height:${d.minutes ? Math.max(5, d.minutes / Math.max(1, ...r.week.map(w => w.minutes)) * 70) : 0}px"></i></span><b>${d.minutes}<small>m</small></b><span>${d.date.slice(5).replace('-', '/')}</span><em aria-label="${d.trained ? '有训练记录' : '无记录'}" class="${d.trained ? 'trained' : ''}"></em></div>`).join('')}</div><p class="report-caption">柱高为有氧分钟数 · 绿点为训练日 · 无记录不等于休息</p></div>
    <div><h4>02 / 和上次相比</h4>${r.comparisons.length ? `<ul class="report-comparisons">${r.comparisons.map(c => `<li><strong>${e(c.exercise)} · ${c.weight} ${c.unit}</strong><span>${e(c.priorDate.slice(5))}：${c.beforeSets} 组 / ${c.before} 次 → 本次：${c.afterSets} 组 / ${c.after} 次</span><small>${c.beforeSets !== c.afterSets ? '组数不同，仅比较完成量，不判定力量升降。' : c.after === c.before ? '相同组数，完成量持平。' : `相同组数，完成次数${c.after > c.before ? '增加' : '减少'} ${Math.abs(c.after - c.before)} 次；动作质量未知。`}</small></li>`).join('')}</ul>` : '<p>暂无同动作、同重量、同单位的上次训练可比较。</p>'}</div></div>
    <h4>03 / 近 28 天的变化</h4>${r.trends.length ? `<div class="report-trends">${r.trends.map(t => `<div><strong>${e(t.exercise)}</strong><span>${t.first} → ${t.last} ${t.unit}</span><small>${e(t.start.slice(5))}—${e(t.end.slice(5))} · ${t.sessions} 次训练</small></div>`).join('')}</div><p class="report-caption">各动作首次与最近一次的最高记录重量。重量变化不能单独代表力量变化；不同动作与单位分开统计。</p>` : '<p>同一动作至少记录两天后，才会显示重量变化。</p>'}
    <h4>04 / 下次训练的重点</h4><div class="report-suggestions">${r.suggestions.map((s, i) => `<article><span>${String(i + 1).padStart(2, '0')}</span><div><h5>${e(s.title)}</h5><p>${e(s.text)}</p></div></article>`).join('')}</div>
    <details class="report-method"><summary>分析依据与范围</summary><p>按所选日期回看记录，不使用之后的数据；新增、删除和导入记录后重新计算。未写组数按 1 组，不推算热量、肌肉增长或 1RM；数据不足时不判断进步或退步。建议是基于日志的训练安排参考。</p><p>一般原则参考 <a href="https://acsm.org/resistance-training-guidelines-update-2026/" target="_blank" rel="noopener noreferrer">ACSM 2026 抗阻训练指南</a>：持续性、个体化与循序调整，不要求每次练至力竭。</p></details>
  </section>`;
}
