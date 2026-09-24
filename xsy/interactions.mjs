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
export const CURLING_STOP_SPEED = 0.08;
export const CURLING_GAME_LANE_WIDTH = 4;
export const CURLING_GAME_LANE_HEIGHT = 1;
export const CURLING_GAME_LANE_RATIO = CURLING_GAME_LANE_WIDTH / CURLING_GAME_LANE_HEIGHT;
export const CURLING_STONE_RADIUS = 0.035;
export const CURLING_HOUSE_RADIUS = 0.16;
export const CURLING_HOUSE_CENTER = Object.freeze({
  x: CURLING_GAME_LANE_WIDTH * CURLING_TARGET_Y_RATIO,
  y: CURLING_GAME_LANE_HEIGHT / 2,
});

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
    .filter(({ team, x, y }) => (team === 'red' || team === 'blue')
      && Number.isFinite(x) && Number.isFinite(y)
      && Math.hypot(x - CURLING_HOUSE_CENTER.x, y - CURLING_HOUSE_CENTER.y)
        <= CURLING_HOUSE_RADIUS + CURLING_STONE_RADIUS)
    .map((stone) => ({
      ...stone,
      distance: Math.hypot(stone.x - CURLING_HOUSE_CENTER.x, stone.y - CURLING_HOUSE_CENTER.y),
    }))
    .sort((left, right) => left.distance - right.distance);

  if (!inHouse.length || (inHouse[1] && inHouse[0].distance === inHouse[1].distance)) {
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
    stones.push({ ...candidate, team, static: true });
    return true;
  };

  for (const team of teams) {
    let added = false;
    for (let attempt = 0; attempt < 120 && !added; attempt += 1) {
      added = addCandidate({
        x: CURLING_STONE_RADIUS + random() * (CURLING_GAME_LANE_WIDTH - CURLING_STONE_RADIUS * 2),
        y: CURLING_STONE_RADIUS + random() * (CURLING_GAME_LANE_HEIGHT - CURLING_STONE_RADIUS * 2),
      }, team);
    }
    for (let row = 0; row < 4 && !added; row += 1) {
      for (let column = 0; column < 16 && !added; column += 1) {
        added = addCandidate({
          x: 0.12 + column * 0.25,
          y: 0.12 + row * 0.2,
        }, team);
      }
    }
  }
  return stones;
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

  if (nextPosition.x <= minX || nextPosition.x >= maxX) {
    nextPosition.x = Math.max(minX, Math.min(maxX, nextPosition.x));
    nextVelocity.x *= -0.58;
  }
  if (nextPosition.y <= minY || nextPosition.y >= maxY) {
    nextPosition.y = Math.max(minY, Math.min(maxY, nextPosition.y));
    nextVelocity.y *= -0.58;
  }

  const speed = Math.hypot(nextVelocity.x, nextVelocity.y);
  nextVelocity.x = (nextVelocity.x + curlDirection * 0.0009 * speed) * 0.965;
  nextVelocity.y *= 0.965;
  return { position: nextPosition, velocity: nextVelocity, speed };
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
    finished: physics.speed < CURLING_STOP_SPEED,
  };
}

export function settleCurlingThrow(state, bounds, maxSteps) {
  let next = state;
  for (let step = 0; step < maxSteps && !next.finished; step += 1) {
    next = advanceCurlingThrow(next, bounds);
  }
  return { ...next, finished: true };
}

export function pointerCurlingVelocity(stone, pull) {
  const x = stone.x - pull.x;
  const y = stone.y - pull.y;
  const distance = Math.hypot(x, y);
  const magnitude = distance * 0.18;
  const angle = distance > 1 ? Math.atan2(y, x) : -Math.PI / 2;
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
