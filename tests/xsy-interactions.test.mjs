import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LYRIC_FRAGMENTS,
  MAX_BEETLES,
  CURLING_SCORE_RATIOS,
  advanceCurlingPhysics,
  availableBeetleSlots,
  keyboardCurlingVelocity,
  pointerCurlingVelocity,
  curlingResult,
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

test('curling result copy matches each score', () => {
  assert.equal(curlingResult(3), '正中圆心，石头壶封神！');
  assert.equal(curlingResult(2), '稳稳进营，塑料壶沉默了。');
  assert.equal(curlingResult(1), '擦边得分，冰面替你圆场。');
  assert.equal(curlingResult(0), '壶很自由，大本营很孤独。');
});

test('curling physics clamps the stone and applies friction with curl', () => {
  const next = advanceCurlingPhysics(
    { x: 20, y: 60 },
    { x: -4, y: -2 },
    { width: 240, height: 180, radius: 18 },
    -1,
  );

  assert.deepEqual(next.position, { x: 18, y: 58 });
  assert.equal(next.speed, Math.hypot(4 * 0.58, -2));
  assert.ok(next.velocity.x > 0);
  assert.equal(next.velocity.y, -2 * 0.965);
});

test('pointer curling velocity scales with pull distance without keyboard strength', () => {
  const stone = { x: 120, y: 200 };
  const shortPull = pointerCurlingVelocity(stone, { x: 120, y: 220 });
  const longPull = pointerCurlingVelocity(stone, { x: 120, y: 300 });
  const keyboard = keyboardCurlingVelocity(0, 0.72, 240);

  assert.ok(Math.abs(longPull.y) > Math.abs(shortPull.y));
  assert.ok(Math.abs(shortPull.x) < 1e-10);
  assert.equal(keyboard.y, -240 * 0.72 * 0.12);
});

test('curling ring ratios match score boundaries', () => {
  assert.deepEqual(CURLING_SCORE_RATIOS, { three: 0.32, two: 0.65, one: 1 });
  assert.equal(scoreCurling(CURLING_SCORE_RATIOS.three), 3);
  assert.equal(scoreCurling(CURLING_SCORE_RATIOS.two), 2);
  assert.equal(scoreCurling(CURLING_SCORE_RATIOS.one), 1);
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
