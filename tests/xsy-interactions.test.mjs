import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LYRIC_FRAGMENTS,
  MAX_BEETLES,
  availableBeetleSlots,
  createSlapGame,
  finishSlapGame,
  nextIndex,
  nextNightState,
  registerSlapHit,
  registerSlapMiss,
  scoreCurling,
} from '../xsy/interactions.mjs';

test('night state returns the next label and aria state', () => {
  assert.deepEqual(nextNightState(false), {
    active: true,
    label: '退出夜鹿时间',
    ariaPressed: 'true',
  });
  assert.deepEqual(nextNightState(true), {
    active: false,
    label: '进入夜鹿时间',
    ariaPressed: 'false',
  });
});

test('lyric fragments are short bilingual records', () => {
  assert.ok(LYRIC_FRAGMENTS.length >= 5);
  for (const item of LYRIC_FRAGMENTS) {
    assert.ok(item.song && item.ja && item.zh);
    assert.match(item.url, /^https:\/\/(yorushika\.com|www\.youtube\.com)\//);
    assert.ok(item.ja.length <= 24);
  }
});

test('lyric selection wraps only after the last fragment', () => {
  assert.equal(nextIndex(0, LYRIC_FRAGMENTS.length), 1);
  assert.equal(nextIndex(LYRIC_FRAGMENTS.length - 1, LYRIC_FRAGMENTS.length), 0);
});

test('curling score decreases across ring boundaries', () => {
  assert.equal(scoreCurling(0), 3);
  assert.equal(scoreCurling(0.32), 3);
  assert.equal(scoreCurling(0.33), 2);
  assert.equal(scoreCurling(0.66), 1);
  assert.equal(scoreCurling(1.01), 0);
});

test('slap hits increase score and combo only before the deadline', () => {
  const state = createSlapGame(10_000, 1_000);
  assert.deepEqual(registerSlapHit(state, 1_500), {
    ...state,
    score: 1,
    combo: 1,
    bestCombo: 1,
  });
  assert.equal(registerSlapHit(state, 11_001).finished, true);
  assert.equal(registerSlapMiss({ ...state, combo: 3 }, 1_600).combo, 0);
});

test('finishing a slap game preserves the score state', () => {
  const state = {
    ...createSlapGame(10_000, 1_000),
    score: 4,
    combo: 2,
    bestCombo: 3,
  };

  assert.deepEqual(finishSlapGame(state, 11_000), {
    ...state,
    finished: true,
  });
});

test('beetle slots enforce the global cap', () => {
  assert.equal(availableBeetleSlots(0, 7), 7);
  assert.equal(availableBeetleSlots(MAX_BEETLES - 2, 7), 2);
  assert.equal(availableBeetleSlots(MAX_BEETLES, 4), 0);
});

test('beetle slot calculation clamps invalid requests', () => {
  assert.equal(availableBeetleSlots(-2, 4), 4);
  assert.equal(availableBeetleSlots(0, 99), MAX_BEETLES);
  assert.equal(availableBeetleSlots(MAX_BEETLES + 3, 2), 0);
});
