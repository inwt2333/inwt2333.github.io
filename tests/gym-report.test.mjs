import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyReport, reportHTML } from '../gym/report.mjs';
import { publishedEntries } from '../gym/data.mjs';

const load = (date, weight, reps, sets = 1, unit = 'kg', note = '') =>
  ({ id: `${date}-${weight}-${unit}`, date, exercise: 'chest', loads: [{ weight, reps, sets, unit }], note });

test('real latest report counts sets, carries effort forward and sees consecutive dates', () => {
  const r = dailyReport(publishedEntries, '2026-11-05');
  assert.equal(r.exercises, 5);
  assert.equal(r.sets, 13);
  assert.equal(r.reps, 144);
  assert.equal(r.minutes, 30);
  assert.equal(r.streak, 4);
  assert.equal(r.recent.days, 6);
  assert.ok(r.suggestions.some(s => s.title === '先把推举做稳'));
  assert.ok(r.suggestions.some(s => s.title === '给恢复留出空间'));
  const chest = r.comparisons.find(c => c.exercise === '坐式胸肌');
  assert.equal(chest.before, 15);
  assert.equal(chest.after, 24);
  assert.equal(chest.beforeSets, 2);
  assert.equal(chest.afterSets, 3);
  assert.match(reportHTML(publishedEntries, '2026-11-05'), /组数不同，仅比较完成量/);
});

test('historical reports exclude all future entries and their fatigue notes', () => {
  assert.deepEqual(dailyReport(publishedEntries, '2026-10-28'), dailyReport(publishedEntries.filter(e => e.date <= '2026-10-28'), '2026-10-28'));
});

test('comparison requires same exercise, weight and unit in the immediately preceding session', () => {
  const records = [load('2026-11-01', 15, 12, 2), load('2026-11-02', 15, 9, 3, 'lb'), load('2026-11-03', 15, 10, 2)];
  assert.equal(dailyReport(records, '2026-11-03').comparisons.length, 0);
  records[1].loads[0].unit = 'kg';
  const r = dailyReport(records, '2026-11-03');
  assert.equal(r.comparisons[0].priorDate, '2026-11-02');
  assert.equal(r.comparisons[0].before, 27);
  assert.equal(r.comparisons[0].after, 20);
  records[1].loads[0].weight = 20;
  assert.equal(dailyReport(records, '2026-11-03').comparisons.length, 0);
});

test('empty, first-time and cardio-only records do not fabricate comparisons or estimates', () => {
  assert.equal(dailyReport([], '2026-11-05').hasTraining, false);
  assert.match(reportHTML([], '2026-11-05'), /这天还没有训练记录/);
  const r = dailyReport([load('2026-11-05', 15, 12, null)], '2026-11-05');
  assert.equal(r.sets, 1);
  assert.equal(r.trends.length, 0);
  assert.equal(r.comparisons.length, 0);
  const cardio = dailyReport([{ date:'2026-11-05', exercise:'cardio', segments:[{minutes:20},{minutes:5}], note:'' }], '2026-11-05');
  assert.equal(cardio.minutes, 25);
  assert.equal(cardio.sets, 0);
  assert.equal(cardio.exercises, 0);
});

test('windows cross month boundaries, reflect edits, and escape handwritten notes', () => {
  const records = [load('2026-10-30', 15, 12, 1), load('2026-11-05', 15, 12, 1, 'kg', '<img src=x onerror=alert(1)>')];
  assert.equal(dailyReport(records, '2026-11-05').recent.days, 2);
  assert.equal(dailyReport(records.slice(1), '2026-11-05').recent.days, 1);
  assert.ok(!reportHTML(records, '2026-11-05').includes('<img'));
  assert.match(reportHTML(records, '2026-11-05'), /&lt;img/);
  const original = structuredClone(records);
  dailyReport(records, '2026-11-05');
  assert.deepEqual(records, original);
});
