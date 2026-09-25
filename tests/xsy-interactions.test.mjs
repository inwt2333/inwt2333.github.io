import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LYRIC_FRAGMENTS,
  MAX_BEETLES,
  CURLING_SCORE_RATIOS,
  CURLING_GAME_LANE_HEIGHT,
  CURLING_GAME_LANE_RATIO,
  CURLING_GAME_LANE_WIDTH,
  CURLING_HOUSE_RADIUS,
  CURLING_STONE_RADIUS,
  CURLING_DELIVERY_START_Y,
  CURLING_STOP_SPEED,
  advanceCurlingMatch,
  advanceCurlingThrow,
  advanceCurlingPhysics,
  availableBeetleSlots,
  keyboardCurlingVelocity,
  pointerCurlingVelocity,
  curlingLaneGeometry,
  clampCurlingSetupCounts,
  createCurlingSetup,
  cloneCurlingStones,
  forceSettleCurlingMatch,
  hasCurlingStoneOverlap,
  resolveCurlingStoneCollisions,
  settleCurlingMatch,
  scoreCurlingEnd,
  settleCurlingThrow,
  curlingResult,
  createSlapGame,
  finishSlapGame,
  nextIndex,
  nextNightState,
  registerSlapHit,
  registerSlapMiss,
  scoreCurling,
  slapTitle,
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

test('vertical curling input keeps left and right directions on the x axis', () => {
  // A regression that swaps keyboard axes or maps diagonal pulls to the wrong side would break this.
  const leftKeyboard = keyboardCurlingVelocity(-0.5, 0.8, 5);
  const rightKeyboard = keyboardCurlingVelocity(0.5, 0.8, 5);
  const stone = { x: 1.5, y: 3.9 };
  const pullRight = pointerCurlingVelocity(stone, { x: 1.9, y: 4.4 });
  const pullLeft = pointerCurlingVelocity(stone, { x: 1.1, y: 4.4 });

  assert.ok(leftKeyboard.x < 0 && rightKeyboard.x > 0);
  assert.ok(leftKeyboard.y < 0 && rightKeyboard.y < 0);
  assert.ok(pullRight.x < 0 && pullLeft.x > 0);
  assert.ok(pullRight.y < 0 && pullLeft.y < 0);
});

test('curling collision gives a front stone momentum and separates equal stones', () => {
  // A regression that leaves setup stones static or allows overlap would break this.
  const result = resolveCurlingStoneCollisions(
    { team: 'red', x: 1.5, y: 2.08, velocity: { x: 0, y: -0.4 } },
    [{ team: 'blue', x: 1.5, y: 1.88, velocity: { x: 0, y: 0 } }],
  );

  assert.ok(result.delivered.velocity.y > -0.4, 'delivered stone retained all front-collision momentum');
  assert.ok(result.stones[0].velocity.y < 0, 'front stone did not receive upward momentum');
  assert.ok(Math.hypot(
    result.delivered.x - result.stones[0].x,
    result.delivered.y - result.stones[0].y,
  ) >= CURLING_STONE_RADIUS * 2);
});

test('curling collision resolves an overlapping moving setup-stone pair', () => {
  // A regression that checks only delivered-to-setup pairs would leave this chain overlapped and idle.
  const result = resolveCurlingStoneCollisions(
    { team: 'red', x: 1.5, y: 3.5, velocity: { x: 0, y: 0 } },
    [
      { team: 'blue', x: 1.5, y: 1.5, velocity: { x: 0, y: 0 } },
      { team: 'red', x: 1.5, y: 1.68, velocity: { x: 0, y: -0.3 } },
    ],
    { width: 3, height: 5, radius: CURLING_STONE_RADIUS },
  );
  const next = advanceCurlingMatch({ delivered: result.delivered, stones: result.stones }, {
    width: 3, height: 5, radius: CURLING_STONE_RADIUS,
  });

  assert.equal(hasCurlingStoneOverlap(result.delivered, result.stones), false);
  assert.ok(result.stones.some((stone) => Math.hypot(stone.velocity.x, stone.velocity.y) > CURLING_STOP_SPEED));
  assert.equal(next.finished, false);
});

test('a curling round stays active while a struck setup stone is still moving', () => {
  // A regression that ends based only on the delivered stone or a wall-clock cutoff would break this.
  const next = advanceCurlingMatch({
    delivered: { team: 'red', x: 1.5, y: 2.08, velocity: { x: 0, y: -0.4 } },
    stones: [{ team: 'blue', x: 1.5, y: 1.88, velocity: { x: 0, y: 0 } }],
  }, { width: 3, height: 5, radius: CURLING_STONE_RADIUS });

  assert.equal(next.finished, false);
  assert.ok(next.stones[0].velocity.y < -CURLING_STOP_SPEED);
});

test('settling a curling match stops and separates every moving stone', () => {
  // A regression that settles only the delivered stone or leaves a collision overlap would break this.
  const settled = settleCurlingMatch({
    delivered: { team: 'red', x: 1.5, y: 2.08, velocity: { x: 0, y: -0.4 } },
    stones: [{ team: 'blue', x: 1.5, y: 1.88, velocity: { x: 0, y: 0 } }],
  }, { width: 3, height: 5, radius: CURLING_STONE_RADIUS }, 1_200);
  const allStones = [settled.delivered, ...settled.stones];

  assert.ok(allStones.every((stone) => Math.hypot(stone.velocity.x, stone.velocity.y) < CURLING_STOP_SPEED));
  assert.ok(Math.hypot(
    settled.delivered.x - settled.stones[0].x,
    settled.delivered.y - settled.stones[0].y,
  ) >= CURLING_STONE_RADIUS * 2);
});

test('a capped match settle reports unfinished until safety settling stops every stone', () => {
  // A regression that reports finished after maxSteps without settling physics would break this.
  const startingMatch = {
    delivered: { team: 'red', x: 1.5, y: 2.08, velocity: { x: 0, y: -0.4 } },
    stones: [{ team: 'blue', x: 1.5, y: 1.88, velocity: { x: 0, y: 0 } }],
  };
  const bounds = { width: 3, height: 5, radius: CURLING_STONE_RADIUS };
  const capped = settleCurlingMatch(startingMatch, bounds, 0);
  const forced = forceSettleCurlingMatch(capped, bounds);

  assert.equal(capped.finished, false);
  assert.ok([forced.delivered, ...forced.stones].every(
    (stone) => Math.hypot(stone.velocity.x, stone.velocity.y) < CURLING_STOP_SPEED,
  ));
  assert.equal(hasCurlingStoneOverlap(forced.delivered, forced.stones), false);
  assert.equal(forced.finished, true);
});

test('curling ring ratios match score boundaries', () => {
  assert.deepEqual(CURLING_SCORE_RATIOS, { three: 0.32, two: 0.65, one: 1 });
  assert.equal(scoreCurling(CURLING_SCORE_RATIOS.three), 3);
  assert.equal(scoreCurling(CURLING_SCORE_RATIOS.two), 2);
  assert.equal(scoreCurling(CURLING_SCORE_RATIOS.one), 1);
});

test('curling lane geometry uses scoring coordinates for every ring edge', () => {
  assert.deepEqual(curlingLaneGeometry(300, 225), {
    targetX: 150,
    targetY: 49.5,
    houseRadius: 45,
    outerDiameter: 90,
    twoDiameter: 58.5,
    threeDiameter: 28.8,
  });
});

test('curling match scoring leaves a blank end tied', () => {
  // A regression that scored a team with no stones in the house would break this.
  assert.deepEqual(scoreCurlingEnd([]), {
    red: 0,
    blue: 0,
    scoringTeam: null,
    points: 0,
  });
});

test('curling match scoring awards every closer red stone before blue', () => {
  // A regression that awarded only one point or ignored a second closer stone would break this.
  assert.deepEqual(scoreCurlingEnd([
    { team: 'red', x: 1.5, y: 1.1 },
    { team: 'red', x: 1.65, y: 1.1 },
    { team: 'blue', x: 1.82, y: 1.1 },
  ]), {
    red: 2,
    blue: 0,
    scoringTeam: 'red',
    points: 2,
  });
});

test('curling match scoring awards equal closest stones from the same team', () => {
  // A regression that treats every nearest-distance tie as a blank end would break this.
  assert.deepEqual(scoreCurlingEnd([
    { team: 'red', x: 1.5, y: 1.1 },
    { team: 'red', x: 1.5, y: 1.1 },
    { team: 'blue', x: 1.85, y: 1.1 },
  ]), {
    red: 2,
    blue: 0,
    scoringTeam: 'red',
    points: 2,
  });
});

test('curling match scoring excludes outside stones and stops at the opponent', () => {
  // A regression that counts out-of-house stones or stones beyond the closest opponent would break this.
  assert.deepEqual(scoreCurlingEnd([
    { team: 'red', x: 1.5, y: 1.1 },
    { team: 'red', x: 1.9, y: 1.1 },
    { team: 'blue', x: 1.68, y: 1.1 },
    { team: 'blue', x: 2.3, y: 1.1 },
  ]), {
    red: 1,
    blue: 0,
    scoringTeam: 'red',
    points: 1,
  });
});

test('curling match layout clamps setup counts and creates a deterministic legal layout', () => {
  // A regression that allowed too many stones or overlapping stones would break this.
  assert.deepEqual(clampCurlingSetupCounts(-2, 12), { red: 0, blue: 8 });
  const randomValues = [0.03, 0.71, 0.19, 0.84, 0.42, 0.58];
  let index = 0;
  const random = () => randomValues[index++ % randomValues.length];
  const first = createCurlingSetup({ redCount: 7, blueCount: 8, random });
  index = 0;
  const second = createCurlingSetup({ redCount: 7, blueCount: 8, random });
  assert.deepEqual(first, second);
  assert.equal(first.length, 15);
  assert.ok(first.every((stone) => stone.y >= 0.5 && stone.y <= 2.2), 'setup escaped the house and guard area');
  for (let left = 0; left < first.length; left += 1) {
    for (let right = left + 1; right < first.length; right += 1) {
      assert.ok(Math.hypot(first[left].x - first[right].x, first[left].y - first[right].y) >= CURLING_STONE_RADIUS * 2);
    }
  }
});

test('curling setup snapshots clone positions and clear every velocity', () => {
  const source = [
    { team: 'red', x: 1.2, y: 1.1, velocity: { x: 0.4, y: -0.2 } },
    { team: 'blue', x: 1.8, y: 1.1, velocity: { x: -0.3, y: 0.1 } },
  ];
  const snapshot = cloneCurlingStones(source);
  snapshot[0].x = 2.4;
  snapshot[0].velocity.x = 99;
  assert.deepEqual(source[0], {
    team: 'red', x: 1.2, y: 1.1, velocity: { x: 0.4, y: -0.2 },
  });
  assert.deepEqual(snapshot, [
    { team: 'red', x: 2.4, y: 1.1, velocity: { x: 99, y: 0 } },
    { team: 'blue', x: 1.8, y: 1.1, velocity: { x: 0, y: 0 } },
  ]);
});

test('curling delivery starts high enough to preserve the full downward pull', () => {
  assert.ok(CURLING_DELIVERY_START_Y <= CURLING_GAME_LANE_HEIGHT - 0.7);
  assert.ok(CURLING_GAME_LANE_HEIGHT - CURLING_DELIVERY_START_Y >= 1.7);
});

test('curling game lane preserves the screen-fit three-by-five vertical proportion', () => {
  // A regression that restores a horizontal lane or stretches the game lane would break this.
  assert.equal(CURLING_GAME_LANE_RATIO, 3 / 5);
  assert.equal(CURLING_GAME_LANE_WIDTH, 3);
  assert.equal(CURLING_GAME_LANE_HEIGHT, 5);
  assert.ok(CURLING_HOUSE_RADIUS >= CURLING_STONE_RADIUS * 4);
});

test('reduced-motion settling matches incremental curling termination', () => {
  const bounds = { width: 300, height: 225, radius: 18 };
  const start = { position: { x: 150, y: 189 }, velocity: { x: 0, y: -18.801 * 0.18 }, curlDirection: 1 };
  let incremental = start;
  for (let step = 0; step < 240 && !incremental.finished; step += 1) {
    incremental = advanceCurlingThrow(incremental, bounds);
  }
  const reduced = settleCurlingThrow(start, bounds, 240);
  const geometry = curlingLaneGeometry(bounds.width, bounds.height);
  const score = (state) => scoreCurling(Math.hypot(
    state.position.x - geometry.targetX,
    state.position.y - geometry.targetY,
  ) / geometry.houseRadius);

  assert.equal(score(incremental), 1);
  assert.deepEqual(reduced, incremental);
  assert.equal(score(reduced), score(incremental));
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

test('slap combo and title reflect successful hits', () => {
  let state = createSlapGame(10_000, 0);
  state = registerSlapHit(state, 100);
  state = registerSlapHit(state, 200);

  assert.equal(state.score, 2);
  assert.equal(state.combo, 2);
  assert.equal(slapTitle(0), '文明观众');
  assert.equal(slapTitle(8), '掌声雷动');
  assert.equal(slapTitle(20), '镇馆之手');
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
