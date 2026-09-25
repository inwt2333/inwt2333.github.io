export const LYRIC_FRAGMENTS = [
  {
    song: '言って',
    ja: '言って。',
    zh: '请把没说完的心事说给我听。',
    url: 'https://yorushika.com/discography/',
  },
  {
    song: '春泥棒',
    ja: '春泥棒。',
    zh: '春天偷偷带走了你的气息。',
    url: 'https://yorushika.com/discography/',
  },
  {
    song: '忘れてください',
    ja: '忘れてください。',
    zh: '请把我留给明天的风。',
    url: 'https://yorushika.com/discography/',
  },
  {
    song: '君に晴れ',
    ja: '君に晴れ。',
    zh: '愿天晴时你也能看见我。',
    url: 'https://yorushika.com/discography/',
  },
  {
    song: 'だから僕は音楽を辞めた',
    ja: 'だから僕は音楽を辞めた。',
    zh: '我离开音乐，只是为了不忘记听见什么。',
    url: 'https://yorushika.com/discography/',
  },
];

export const MAX_BEETLES = 18;
export const CURLING_SCORE_RATIOS = Object.freeze({ three: 0.32, two: 0.65, one: 1 });
export const CURLING_HOUSE_RADIUS_RATIO = 0.2;
export const CURLING_TARGET_Y_RATIO = 0.22;
// Logical lane units per step: below 0.01 rendered pixels even on the widest lane.
// Static friction removes this imperceptible tail; scoring requires exact zero.
export const CURLING_STOP_SPEED = 0.0001;
export const CURLING_GAME_LANE_WIDTH = 3;
export const CURLING_GAME_LANE_HEIGHT = 6;
export const CURLING_GAME_LANE_RATIO = CURLING_GAME_LANE_WIDTH / CURLING_GAME_LANE_HEIGHT;
export const CURLING_STONE_RADIUS = 0.16;
export const CURLING_HOUSE_RADIUS = 0.72;
export const CURLING_DELIVERY_START_Y = 4.2;
export const CURLING_HOUSE_CENTER = Object.freeze({
  x: CURLING_GAME_LANE_WIDTH / 2,
  y: 1.1,
});

export function clampCurlingLaunchX(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return CURLING_GAME_LANE_WIDTH / 2;
  return Math.max(CURLING_STONE_RADIUS, Math.min(
    CURLING_GAME_LANE_WIDTH - CURLING_STONE_RADIUS,
    numeric,
  ));
}

export function nextNightState(isActive) {
  const active = !isActive;
  return {
    active,
    label: active ? '退出夜鹿时间' : '进入夜鹿时间',
    ariaPressed: String(active),
  };
}

export function nextIndex(index, length) {
  return (index + 1) % length;
}

export function scoreCurling(distanceRatio) {
  if (distanceRatio <= CURLING_SCORE_RATIOS.three) return 3;
  if (distanceRatio <= CURLING_SCORE_RATIOS.two) return 2;
  if (distanceRatio <= CURLING_SCORE_RATIOS.one) return 1;
  return 0;
}

export function clampCurlingSetupCounts(redCount, blueCount) {
  const clamp = (count, maximum) => Math.max(0, Math.min(maximum, Math.round(Number(count) || 0)));
  return { red: clamp(redCount, 7), blue: clamp(blueCount, 8) };
}

export function scoreCurlingEnd(stones) {
  const inHouse = stones
    .filter(({ team, x, y, outOfPlay }) => !outOfPlay
      && (team === 'red' || team === 'blue')
      && Number.isFinite(x) && Number.isFinite(y)
      && Math.hypot(x - CURLING_HOUSE_CENTER.x, y - CURLING_HOUSE_CENTER.y)
        <= CURLING_HOUSE_RADIUS + CURLING_STONE_RADIUS)
    .map((stone) => ({
      ...stone,
      distance: Math.hypot(stone.x - CURLING_HOUSE_CENTER.x, stone.y - CURLING_HOUSE_CENTER.y),
    }))
    .sort((left, right) => left.distance - right.distance);

  if (!inHouse.length || (inHouse[1]
    && inHouse[0].team !== inHouse[1].team
    && inHouse[0].distance === inHouse[1].distance)) {
    return { red: 0, blue: 0, scoringTeam: null, points: 0 };
  }

  const scoringTeam = inHouse[0].team;
  const opposingStone = inHouse.find((stone) => stone.team !== scoringTeam);
  const points = inHouse.filter((stone) => stone.team === scoringTeam
    && (!opposingStone || stone.distance < opposingStone.distance)).length;
  return {
    red: scoringTeam === 'red' ? points : 0,
    blue: scoringTeam === 'blue' ? points : 0,
    scoringTeam,
    points,
  };
}

export function createCurlingSetup({ redCount = 0, blueCount = 0, random = Math.random } = {}) {
  const counts = clampCurlingSetupCounts(redCount, blueCount);
  const teams = [
    ...Array.from({ length: counts.red }, () => 'red'),
    ...Array.from({ length: counts.blue }, () => 'blue'),
  ];
  const stones = [];
  const isLegal = (candidate) => stones.every((stone) => Math.hypot(
    candidate.x - stone.x,
    candidate.y - stone.y,
  ) >= CURLING_STONE_RADIUS * 2);
  const addCandidate = (candidate, team) => {
    if (!isLegal(candidate)) return false;
    stones.push({ ...candidate, team, velocity: { x: 0, y: 0 } });
    return true;
  };

  for (let index = teams.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [teams[index], teams[swapIndex]] = [teams[swapIndex], teams[index]];
  }
  const grid = Array.from({ length: 15 }, (_, index) => ({
    x: 0.42 + (index % 5) * 0.54,
    y: 0.58 + Math.floor(index / 5) * 0.58,
  }));
  for (let index = grid.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [grid[index], grid[swapIndex]] = [grid[swapIndex], grid[index]];
  }
  for (const [index, team] of teams.entries()) {
    const base = grid[index];
    const candidate = {
      x: base.x + (random() - 0.5) * 0.16,
      y: base.y + (random() - 0.5) * 0.16,
    };
    addCandidate(candidate, team);
  }
  return stones;
}

export function cloneCurlingStones(stones) {
  return stones.map(({ team, x, y }) => ({
    team,
    x,
    y,
    velocity: { x: 0, y: 0 },
  }));
}

export function resolveCurlingStoneCollisions(delivered, stones, bounds = null) {
  const deliveredOutOfPlay = Boolean(delivered?.outOfPlay);
  const collisionDelivered = deliveredOutOfPlay
    ? { ...delivered, x: -100, y: -100, velocity: { x: 0, y: 0 } }
    : delivered;
  const allStones = [
    { ...collisionDelivered, velocity: { ...(collisionDelivered.velocity || { x: 0, y: 0 }) } },
    ...stones.filter((stone) => !stone.outOfPlay)
      .map((stone) => ({ ...stone, velocity: { ...stone.velocity } })),
  ];
  const minimumDistance = CURLING_STONE_RADIUS * 2;
  const clamp = (stone) => {
    if (!bounds) return;
    stone.x = Math.max(bounds.radius, Math.min(bounds.width - bounds.radius, stone.x));
    stone.y = Math.max(bounds.radius, Math.min(bounds.height - bounds.radius, stone.y));
  };

  for (let iteration = 0; iteration < allStones.length * 3; iteration += 1) {
    let resolved = false;
    for (let left = 0; left < allStones.length; left += 1) {
      for (let right = left + 1; right < allStones.length; right += 1) {
        const first = allStones[left];
        const second = allStones[right];
        const dx = first.x - second.x;
        const dy = first.y - second.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= minimumDistance - 1e-9) continue;
        const normal = distance > 1e-9 ? { x: dx / distance, y: dy / distance } : { x: 0, y: 1 };
        const overlap = minimumDistance - distance;
        first.x += normal.x * overlap / 2;
        first.y += normal.y * overlap / 2;
        second.x -= normal.x * overlap / 2;
        second.y -= normal.y * overlap / 2;
        clamp(first);
        clamp(second);
        const approachSpeed = (first.velocity.x - second.velocity.x) * normal.x
          + (first.velocity.y - second.velocity.y) * normal.y;
        if (approachSpeed < 0) {
          first.velocity.x -= approachSpeed * normal.x;
          first.velocity.y -= approachSpeed * normal.y;
          second.velocity.x += approachSpeed * normal.x;
          second.velocity.y += approachSpeed * normal.y;
        }
        resolved = true;
      }
    }
    if (!resolved) break;
  }
  return {
    delivered: deliveredOutOfPlay ? delivered : allStones[0],
    stones: allStones.slice(1),
  };
}

export function hasCurlingStoneOverlap(delivered, stones) {
  const allStones = [delivered, ...stones].filter((stone) => stone && !stone.outOfPlay);
  return allStones.some((stone, index) => allStones.slice(index + 1).some((other) => Math.hypot(
    stone.x - other.x,
    stone.y - other.y,
  ) < CURLING_STONE_RADIUS * 2 - 1e-9));
}

export function curlingResult(score) {
  return {
    3: '正中圆心，石头壶封神！',
    2: '稳稳进营，塑料壶沉默了。',
    1: '擦边得分，冰面替你圆场。',
    0: '壶很自由，大本营很孤独。',
  }[score] ?? '壶很自由，大本营很孤独。';
}

export function advanceCurlingPhysics(position, velocity, bounds, curlDirection = 1) {
  const nextPosition = {
    x: position.x + velocity.x,
    y: position.y + velocity.y,
  };
  const nextVelocity = { ...velocity };
  const radius = bounds.radius;
  const minX = radius;
  const maxX = bounds.width - radius;
  const minY = radius;
  const maxY = bounds.height - radius;

  const outOfPlay = nextPosition.x < minX || nextPosition.x > maxX
    || nextPosition.y < minY || nextPosition.y > maxY;

  const speed = Math.hypot(nextVelocity.x, nextVelocity.y);
  nextVelocity.x = (nextVelocity.x + curlDirection * 0.0009 * speed) * 0.965;
  nextVelocity.y *= 0.965;
  if (Math.hypot(nextVelocity.x, nextVelocity.y) < CURLING_STOP_SPEED) {
    nextVelocity.x = 0;
    nextVelocity.y = 0;
  }
  return { position: nextPosition, velocity: nextVelocity, speed: Math.hypot(nextVelocity.x, nextVelocity.y), outOfPlay };
}

export function curlingLaneGeometry(width, height) {
  const houseRadius = height * CURLING_HOUSE_RADIUS_RATIO;
  return {
    targetX: width / 2,
    targetY: height * CURLING_TARGET_Y_RATIO,
    houseRadius,
    outerDiameter: houseRadius * 2,
    twoDiameter: houseRadius * 2 * CURLING_SCORE_RATIOS.two,
    threeDiameter: houseRadius * 2 * CURLING_SCORE_RATIOS.three,
  };
}

export function advanceCurlingThrow(state, bounds) {
  const physics = advanceCurlingPhysics(
    state.position,
    state.velocity,
    bounds,
    state.curlDirection,
  );
  return {
    ...state,
    position: physics.position,
    velocity: physics.velocity,
    speed: physics.speed,
    finished: physics.speed === 0,
  };
}

export function advanceCurlingMatch(state, bounds) {
  const activeSetupStones = state.stones.filter((stone) => !stone.outOfPlay);
  const deliveredWasOut = Boolean(state.delivered?.outOfPlay);
  const initialCollision = deliveredWasOut
    ? { delivered: { ...state.delivered, velocity: { ...state.delivered.velocity } }, stones: activeSetupStones }
    : resolveCurlingStoneCollisions(state.delivered, activeSetupStones, bounds);
  const deliveredPhysics = deliveredWasOut
    ? {
      position: { x: initialCollision.delivered.x, y: initialCollision.delivered.y },
      velocity: { ...(initialCollision.delivered.velocity || { x: 0, y: 0 }) },
      outOfPlay: true,
    }
    : advanceCurlingPhysics(
      initialCollision.delivered,
      initialCollision.delivered.velocity,
      bounds,
      state.delivered.velocity.x < 0 ? -1 : 1,
    );
  const movedStones = initialCollision.stones.map((stone) => {
    const physics = advanceCurlingPhysics(
      stone,
      stone.velocity,
      bounds,
      stone.velocity.x < 0 ? -1 : 1,
    );
    return physics.outOfPlay
      ? { ...stone, ...physics.position, velocity: physics.velocity, outOfPlay: true }
      : { ...stone, ...physics.position, velocity: physics.velocity };
  }).filter((stone) => !stone.outOfPlay);
  const movedDelivered = deliveredWasOut
    ? { ...initialCollision.delivered, outOfPlay: true }
    : { ...initialCollision.delivered, ...deliveredPhysics.position, velocity: deliveredPhysics.velocity };
  const collision = resolveCurlingStoneCollisions(movedDelivered, movedStones, bounds);
  const delivered = deliveredWasOut || deliveredPhysics.outOfPlay
    ? { ...movedDelivered, ...(!deliveredWasOut ? deliveredPhysics.position : {}), outOfPlay: true }
    : collision.delivered;
  const allStones = [delivered, ...collision.stones].filter((stone) => !stone.outOfPlay);
  return {
    delivered,
    stones: collision.stones,
    finished: allStones.every((stone) => stone.velocity.x === 0 && stone.velocity.y === 0)
      && !hasCurlingStoneOverlap(delivered, collision.stones),
  };
}

export function settleCurlingThrow(state, bounds, maxSteps) {
  let next = state;
  for (let step = 0; step < maxSteps && !next.finished; step += 1) {
    next = advanceCurlingThrow(next, bounds);
  }
  return { ...next, finished: Boolean(next.finished) };
}

export function settleCurlingMatch(state, bounds, maxSteps) {
  let next = state;
  for (let step = 0; step < maxSteps; step += 1) {
    next = advanceCurlingMatch(next, bounds);
    if (next.finished) return next;
  }
  return { ...next, finished: false };
}

export function forceSettleCurlingMatch(state, bounds) {
  const stopped = {
    delivered: { ...state.delivered, velocity: { x: 0, y: 0 } },
    stones: state.stones
      .filter((stone) => !stone.outOfPlay)
      .map((stone) => ({ ...stone, velocity: { x: 0, y: 0 } })),
  };
  const separated = resolveCurlingStoneCollisions(stopped.delivered, stopped.stones, bounds);
  return { ...separated, finished: !hasCurlingStoneOverlap(separated.delivered, separated.stones) };
}

export function pointerCurlingVelocity(stone, pull) {
  const x = stone.x - pull.x;
  const y = stone.y - pull.y;
  const distance = Math.hypot(x, y);
  const magnitude = distance * 0.18;
  const angle = distance > 0.001 ? Math.atan2(y, x) : -Math.PI / 2;
  return {
    x: Math.cos(angle) * magnitude,
    y: Math.sin(angle) * magnitude,
  };
}

export function keyboardCurlingVelocity(directionRatio, strengthRatio, laneHeight) {
  const magnitude = laneHeight * strengthRatio * 0.12;
  return {
    x: directionRatio * magnitude,
    y: -magnitude,
  };
}

export function createSlapGame(durationMs, startedAt) {
  return {
    score: 0,
    combo: 0,
    bestCombo: 0,
    startedAt,
    endsAt: startedAt + durationMs,
    finished: false,
  };
}

export function finishSlapGame(state, now) {
  if (state.finished || now < state.endsAt) return state;
  return { ...state, finished: true };
}

export function registerSlapHit(state, now) {
  const finishedState = finishSlapGame(state, now);
  if (finishedState.finished) return finishedState;

  const combo = state.combo + 1;
  return {
    ...state,
    score: state.score + 1,
    combo,
    bestCombo: Math.max(state.bestCombo, combo),
  };
}

export function registerSlapMiss(state, now) {
  const finishedState = finishSlapGame(state, now);
  if (finishedState.finished) return finishedState;
  return { ...state, combo: 0 };
}

export function slapTitle(score) {
  if (score >= 20) return '镇馆之手';
  if (score >= 8) return '掌声雷动';
  return '文明观众';
}

export function availableBeetleSlots(activeCount, requestedCount) {
  return Math.max(0, Math.min(requestedCount, MAX_BEETLES - activeCount));
}
