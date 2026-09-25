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
  clampCurlingLaunchX,
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

test('curling physics marks an edge crossing out of play without reflecting velocity', () => {
  const next = advanceCurlingPhysics(
    { x: 20, y: 60 },
    { x: -4, y: -2 },
    { width: 240, height: 180, radius: 18 },
    -1,
  );

  assert.equal(next.outOfPlay, true);
  assert.ok(next.position.x < 18, 'edge crossing should preserve the position beyond the playable center limit');
  assert.ok(next.velocity.x < 0, 'out-of-play velocity must not reflect from the wall');
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

for (const movingStone of ['delivered', 'setup']) {
  test(`visible slow motion of the ${movingStone} stone must not end the round`, () => {
    const state = {
      delivered: { team: 'red', x: 1.5, y: 4.2, velocity: { x: 0, y: movingStone === 'delivered' ? -0.04 : 0 } },
      stones: [{ team: 'blue', x: 1, y: 2, velocity: { x: 0, y: movingStone === 'setup' ? -0.04 : 0 } }],
    };
    const next = advanceCurlingMatch(state, { width: 3, height: 6, radius: CURLING_STONE_RADIUS });
    assert.equal(next.finished, false, 'a stone moving several pixels per frame was declared stopped');
  });
}

test('finished matches have zero velocities and remain unchanged on further physics steps', () => {
  const bounds = { width: 3, height: 6, radius: CURLING_STONE_RADIUS };
  const settled = settleCurlingMatch({
    delivered: { team: 'red', x: 1.5, y: 4.2, velocity: { x: 0, y: -0.08 } },
    stones: [{ team: 'blue', x: 1.5, y: 2.8, velocity: { x: 0, y: 0 } }],
  }, bounds, 1200);
  assert.equal(settled.finished, true);
  assert.ok(settled.stones[0].y < 2.8, 'the delivered stone stopped before reaching the collision');
  for (const stone of [settled.delivered, ...settled.stones]) {
    assert.deepEqual(stone.velocity, { x: 0, y: 0 });
  }
  let continued = settled;
  for (let frame = 0; frame < 60; frame++) continued = advanceCurlingMatch(continued, bounds);
  assert.deepEqual(continued, settled);
});

test('an out-of-play player stone cannot end the round while a setup stone coasts', () => {
  const next = advanceCurlingMatch({
    delivered: { team: 'red', x: -1, y: 4, outOfPlay: true, velocity: { x: -0.2, y: 0 } },
    stones: [{ team: 'blue', x: 1.5, y: 2, velocity: { x: 0, y: -0.01 } }],
  }, { width: 3, height: 6, radius: CURLING_STONE_RADIUS });
  assert.equal(next.finished, false);
});

test('a partly visible out-of-play player stone keeps the round active until fully offscreen', () => {
  const next = advanceCurlingMatch({
    delivered: { team: 'red', x: 0.3, y: 2.08, velocity: { x: -0.4, y: 0 } },
    stones: [{ team: 'blue', x: 1.5, y: 1.1, velocity: { x: 0, y: 0 } }],
  }, { width: 3, height: 5, radius: CURLING_STONE_RADIUS });

  assert.equal(next.delivered.outOfPlay, true);
  assert.equal(next.finished, false);
  assert.equal(next.stones.length, 1);
  assert.equal(Math.hypot(next.stones[0].velocity.x, next.stones[0].velocity.y) < CURLING_STOP_SPEED, true);
  const final = settleCurlingMatch(next, { width: 3, height: 5, radius: CURLING_STONE_RADIUS }, 300);
  assert.equal(final.finished, true);
  assert.ok(final.delivered.x + CURLING_STONE_RADIUS <= 0);
});

test('a barely moving edge crossing slides fully out without freezing on the edge', () => {
  let state = {
    delivered: { team: 'red', x: 0.159, y: 3, velocity: { x: -0.00001, y: 0 }, outOfPlay: true },
    stones: [],
  };
  const bounds = { width: 3, height: 6, radius: CURLING_STONE_RADIUS };
  for (let step = 0; step < 300 && !state.finished; step++) {
    const next = advanceCurlingMatch(state, bounds);
    assert.ok(next.delivered.x < state.delivered.x);
    if (next.delivered.x + CURLING_STONE_RADIUS > 0) assert.equal(next.finished, false);
    state = next;
  }
  assert.equal(state.finished, true);
  assert.ok(state.delivered.x + CURLING_STONE_RADIUS <= 0);
});

test('out-of-play setup stones are removed from active match state and scoring', () => {
  const next = advanceCurlingMatch({
    delivered: { team: 'red', x: 1.5, y: 1.1, velocity: { x: 0, y: 0 } },
    stones: [{ team: 'blue', x: 2.8, y: 1.1, velocity: { x: 0.4, y: 0 } }],
  }, { width: 3, height: 5, radius: CURLING_STONE_RADIUS });

  assert.equal(next.stones.length, 0);
  assert.deepEqual(scoreCurlingEnd([
    next.delivered,
    { team: 'blue', x: 2.8, y: 1.1, outOfPlay: true },
  ]), {
    red: 1,
    blue: 0,
    scoringTeam: 'red',
    points: 1,
  });
});

test('settling a curling match stops and separates every moving stone', () => {
  // A regression that settles only the delivered stone or leaves a collision overlap would break this.
  const settled = settleCurlingMatch({
    delivered: { team: 'red', x: 1.5, y: 2.08, velocity: { x: 0, y: -0.4 } },
    stones: [{ team: 'blue', x: 1.5, y: 1.88, velocity: { x: 0, y: 0 } }],
  }, { width: 3, height: 5, radius: CURLING_STONE_RADIUS }, 1_200);
  const allStones = [settled.delivered, ...settled.stones].filter((stone) => !stone.outOfPlay);

  assert.ok(allStones.every((stone) => Math.hypot(stone.velocity.x, stone.velocity.y) < CURLING_STOP_SPEED));
  if (settled.stones.length) {
    assert.ok(Math.hypot(
      settled.delivered.x - settled.stones[0].x,
      settled.delivered.y - settled.stones[0].y,
    ) >= CURLING_STONE_RADIUS * 2);
  }
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

  let otherIndex = 0;
  const otherRandomValues = [0.91, 0.17, 0.68, 0.04, 0.77, 0.32, 0.55, 0.24];
  const other = createCurlingSetup({
    redCount: 7,
    blueCount: 8,
    random: () => otherRandomValues[otherIndex++ % otherRandomValues.length],
  });
  assert.notDeepEqual(other, first);
  assert.ok(new Set(first.map((stone) => Math.floor(stone.x))).size >= 3);
  assert.ok(new Set(first.map((stone) => Math.floor(stone.y))).size >= 2);
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
  assert.ok(Math.abs(CURLING_GAME_LANE_HEIGHT - CURLING_DELIVERY_START_Y - 1.8) < 1e-9);
});

test('curling game lane preserves the longer screen-fit three-by-six vertical proportion', () => {
  // A regression that restores the shorter lane or stretches the game lane would break this.
  assert.equal(CURLING_GAME_LANE_RATIO, 3 / 6);
  assert.equal(CURLING_GAME_LANE_WIDTH, 3);
  assert.equal(CURLING_GAME_LANE_HEIGHT, 6);
  assert.ok(CURLING_HOUSE_RADIUS >= CURLING_STONE_RADIUS * 4);
});

test('curling launch position clamps to the stone-safe lane and maps invalid input to center', () => {
  assert.equal(clampCurlingLaunchX(-1), CURLING_STONE_RADIUS);
  assert.equal(clampCurlingLaunchX(CURLING_GAME_LANE_WIDTH + 1), CURLING_GAME_LANE_WIDTH - CURLING_STONE_RADIUS);
  assert.equal(clampCurlingLaunchX(1.8), 1.8);
  assert.equal(clampCurlingLaunchX('not-a-number'), CURLING_GAME_LANE_WIDTH / 2);
});

test('reduced-motion settling matches incremental curling termination', () => {
  const bounds = { width: 300, height: 225, radius: 18 };
  const start = { position: { x: 150, y: 189 }, velocity: { x: 0, y: -18.801 * 0.18 }, curlDirection: 1 };
  let incremental = start;
  for (let step = 0; step < 600 && !incremental.finished; step += 1) {
    incremental = advanceCurlingThrow(incremental, bounds);
  }
  const reduced = settleCurlingThrow(start, bounds, 600);
  const geometry = curlingLaneGeometry(bounds.width, bounds.height);
  const score = (state) => scoreCurling(Math.hypot(
    state.position.x - geometry.targetX,
    state.position.y - geometry.targetY,
  ) / geometry.houseRadius);

  assert.equal(incremental.finished, true);
  assert.deepEqual(incremental.velocity, { x: 0, y: 0 });
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
