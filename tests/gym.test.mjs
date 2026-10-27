import test from 'node:test';
import assert from 'node:assert/strict';
import { publishedEntries, validateJournal, summary } from '../gym/data.mjs';

test('handwritten journal defaults omitted sets to one and retains mixed loads and units', () => {
  assert.deepEqual(summary(publishedEntries), { days: 2, strength: 12, minutes: 25 });
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
