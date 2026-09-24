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
  if (distanceRatio <= 0.32) return 3;
  if (distanceRatio <= 0.65) return 2;
  if (distanceRatio <= 1) return 1;
  return 0;
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

export function availableBeetleSlots(activeCount, requestedCount) {
  return Math.max(0, Math.min(requestedCount, MAX_BEETLES - activeCount));
}
