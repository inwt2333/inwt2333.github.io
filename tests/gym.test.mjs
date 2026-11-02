import test from 'node:test';
import assert from 'node:assert/strict';
import { publishedEntries, stations, validateJournal, summary } from '../gym/data.mjs';

test('November 2 retains changing loads, final chest set and neutral grip pulldown', () => {
  const day = publishedEntries.filter(e => e.date === '2026-11-02');
  assert.equal(day.length, 7);
  const entry = exercise => day.find(e => e.exercise === exercise);
  assert.deepEqual(entry('abs').loads, [
    { weight: 45, unit: 'kg', reps: 12, sets: 2 },
    { weight: 50, unit: 'kg', reps: 12, sets: 1 },
  ]);
  assert.deepEqual(entry('chest').loads, [
    { weight: 15, unit: 'kg', reps: 12, sets: 2 },
    { weight: 15, unit: 'kg', reps: 9, sets: 1 },
  ]);
  assert.equal(entry('chest').note, '吃力');
  assert.deepEqual(entry('neutral-lat').loads, [{ weight: 30, unit: 'kg', reps: 12, sets: 2 }]);
  assert.ok(stations.find(s => s.id === 'pull').exercises.includes('neutral-lat'));
  assert.equal(entry('extension').loads[0].weight, 50);
  assert.deepEqual(entry('cardio').segments, [{ name: '爬坡', minutes: 30 }]);
  assert.equal(entry('cardio').note, '距离 2.5 km');
});

test('handwritten journal defaults omitted sets to one and retains mixed loads and units', () => {
  assert.deepEqual(summary(publishedEntries), { days: 6, strength: 33, minutes: 136 });
  const abs = publishedEntries.find(e => e.date === '2026-10-22' && e.exercise === 'abs');
  assert.deepEqual(abs.loads, [
    { weight: 35, unit: 'kg', reps: 12, sets: 1 },
    { weight: 40, unit: 'kg', reps: 12, sets: 1 },
  ]);
  assert.equal(publishedEntries.find(e => e.exercise === 'shoulder').note, '吃力');
  assert.equal(publishedEntries.find(e => e.exercise === 'shoulder').loads[0].sets, 1);
  assert.equal(publishedEntries.find(e => e.exercise === 'lat').loads[0].unit, 'lb');
  assert.equal(publishedEntries.find(e => e.exercise === 'high-pull').loads[0].unit, 'kg');
});

test('October 28 preserves the dual leg machine as one record and retains cardio distance', () => {
  const day = publishedEntries.filter(e => e.date === '2026-10-28');
  assert.equal(day.length, 7);
  const load = exercise => day.find(e => e.exercise === exercise).loads[0];
  assert.deepEqual(load('row'), { weight: 27, reps: 12, sets: 3, unit: 'lb' });
  assert.deepEqual(load('shoulder'), { weight: 17, reps: 12, sets: 3, unit: 'lb' });
  assert.deepEqual(load('lat'), { weight: 27, reps: 12, sets: 3, unit: 'lb' });
  assert.deepEqual(load('abs'), { weight: 40, reps: 12, sets: 3, unit: 'kg' });
  assert.deepEqual(load('extension-curl'), { weight: 27, reps: 12, sets: 2, unit: 'lb' });
  assert.deepEqual(load('fly'), { weight: 27, reps: 12, sets: 1, unit: 'lb' });
  const cardio = day.find(e => e.exercise === 'cardio');
  assert.deepEqual(cardio.segments, [{ name: '爬坡', minutes: 30 }]);
  assert.equal(cardio.note, '距离 2.4 km');
});

test('October 30 and 31 preserve load changes, effort note, and cardio distance', () => {
  const day30 = publishedEntries.filter(e => e.date === '2026-10-30');
  assert.equal(day30.length, 6);
  const chest = day30.find(e => e.exercise === 'chest');
  assert.deepEqual(chest.loads, [
    { weight: 15, unit: 'kg', reps: 12, sets: 2 },
    { weight: 5, unit: 'kg', reps: 1, sets: 1 },
  ]);
  assert.equal(chest.note, '吃力');
  assert.deepEqual(day30.find(e => e.exercise === 'high-pull').loads, [
    { weight: 25, unit: 'kg', reps: 12, sets: 1 },
    { weight: 30, unit: 'kg', reps: 12, sets: 2 },
  ]);
  assert.deepEqual(day30.find(e => e.exercise === 'cardio'), {
    id: 'published-26', date: '2026-10-30', exercise: 'cardio',
    segments: [{ name: '爬坡', minutes: 26 }], note: '距离 2.4 km',
  });

  const day31 = publishedEntries.filter(e => e.date === '2026-10-31');
  assert.equal(day31.length, 5);
  assert.deepEqual(day31.find(e => e.exercise === 'extension-curl').loads[0],
    { weight: 27, unit: 'lb', reps: 12, sets: 3 });
  assert.equal(day31.find(e => e.exercise === 'abs').loads[0].weight, 45);
  assert.equal(day31.find(e => e.exercise === 'cardio').note, '距离 2.1 km');
  assert.deepEqual(summary(publishedEntries), { days: 6, strength: 33, minutes: 136 });
});

test('old local saves and backups migrate omitted sets to one without changing explicit sets', () => {
  const backup = structuredClone({ version: 1, entries: publishedEntries, weights: [] });
  backup.entries[0].loads[0].sets = null;
  const normalized = validateJournal(backup);
  assert.equal(normalized.entries[0].loads[0].sets, 1);
  assert.equal(normalized.entries[1].loads[0].sets, 2);
  assert.equal(backup.entries[0].loads[0].sets, null);
});

test('backups round trip without losing original training information', () => {
  const backup = { version: 1, entries: publishedEntries, weights: [{ date: '2026-10-27', kg: 68.2, note: '晨起' }] };
  assert.deepEqual(validateJournal(JSON.parse(JSON.stringify(backup))), backup);
});

test('imports reject impossible dates, invalid units, duplicate identifiers and malformed cardio', () => {
  const backup = () => structuredClone({ version: 1, entries: publishedEntries, weights: [] });
  for (const alter of [
    b => { b.entries[0].date = '2026-02-30'; },
    b => { b.entries[0].loads[0].unit = '斤'; },
    b => { b.entries[0].loads[0].reps = 1.5; },
    b => { b.entries[0].loads[0].weight = -1; },
    b => { b.entries[0].loads[0].sets = 0; },
    b => { b.entries.push(b.entries[0]); },
    b => { b.entries.find(e => e.exercise === 'cardio').segments[0].minutes = NaN; },
    b => { b.weights = [{ date: '2026-10-27', kg: 70, note: '' }, { date: '2026-10-27', kg: 71, note: '' }]; },
    b => { b.weights = [{ date: '2026-10-27', kg: 0, note: '' }]; },
  ]) {
    const value = backup();
    alter(value);
    assert.throws(() => validateJournal(value));
  }
});
