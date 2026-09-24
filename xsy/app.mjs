import {
  LYRIC_FRAGMENTS,
  MAX_BEETLES,
  CURLING_GAME_LANE_WIDTH,
  CURLING_GAME_LANE_HEIGHT,
  CURLING_STONE_RADIUS,
  advanceCurlingMatch,
  availableBeetleSlots,
  createCurlingSetup,
  settleCurlingMatch,
  scoreCurlingEnd,
  curlingResult,
  nextIndex,
  nextNightState,
  keyboardCurlingVelocity,
  pointerCurlingVelocity,
  createSlapGame,
  finishSlapGame,
  registerSlapHit,
  registerSlapMiss,
  scoreCurling,
  slapTitle,
} from './interactions.mjs';

export const favorites = [
  {
    id: 'yan-ge',
    name: '严格',
    kicker: 'ACADEMIC CRUSH',
    icon: '🧪',
    verdict: '严谨，但不一定严格。',
    blurb: '新国立博士后。此处不展开论文，只展开 xsy 的星星眼。',
    action: '提高严谨度',
    effect: 'strict',
    links: [
      {
        label: '个人主页',
        url: 'https://grahamyan.github.io/',
      },
    ],
  },
  {
    id: 'chafer',
    name: '金龟子',
    kicker: 'SHINY LITTLE BOSS',
    icon: '🪲',
    verdict: '会飞的金属漆。',
    blurb: '自带珠光、拒绝低调、偶尔撞墙。属于昆虫界的豪华配置。',
    action: '放虫出巡',
    effect: 'bug',
    links: [
      { label: '维基百科', url: 'https://zh.wikipedia.org/wiki/%E9%87%91%E9%BE%9C%E5%AD%90%E7%B8%BD%E7%A7%91' },
    ],
  },
  {
    id: 'stone-kettle',
    name: '石头壶',
    kicker: 'NOT THE PLASTIC ONE',
    icon: '🥌',
    verdict: '冰壶，但必须是石头的。',
    blurb: '塑料壶请在门外稍候。真正的重量感，需要一条冰道来证明。',
    action: '出壶',
    effect: 'curling',
    extras: [{ label: '投一壶', action: 'curling' }],
    links: [
      { label: '冰壶百科', url: 'https://zh.wikipedia.org/wiki/%E5%86%B0%E5%A3%BA' },
    ],
  },
  {
    id: 'hanyuecheng-butt',
    name: '韩岳成的屁股',
    kicker: 'CLASSIFIED ASSET',
    icon: '🍑',
    verdict: '本馆镇馆之谜。',
    blurb: '出于学术伦理，本藏品仅提供高度抽象的示意，不接受现场考证。',
    action: '盖章封存',
    effect: 'classified',
    extras: [{ label: '打屁股', action: 'slap' }],
    links: [
      { label: '韩岳成主页', url: '/' },
    ],
  },
  {
    id: 'ma-nan',
    name: '马楠',
    kicker: 'HISTORY HITS BACK',
    icon: '📚',
    verdict: '近代史不是过去式。',
    blurb: '交大马克思主义学院助理教授，研究中国近现代史，也研究如何让课堂突然醒来。',
    action: '接受批注',
    effect: 'history',
    links: [
      { label: '马楠交大主页', url: 'https://ma.sjtu.edu.cn/info/1196/3174.htm' },
    ],
  },
  {
    id: 'yxy',
    name: 'yxy',
    kicker: 'WHITE MOONLIGHT',
    icon: '🌕',
    verdict: '白月光不参与排名。',
    blurb: '亮度恒定，距离未知。每次准备忘记，月亮都恰好升起来。',
    action: '月光增亮',
    effect: 'moon',
  },
  {
    id: 'campus-bus',
    name: '校园巴士',
    kicker: 'NEXT STOP: MAYBE',
    icon: '🚌',
    verdict: '跑得过它，等不过它。',
    blurb: '它来时像奇迹，它走时像论文截止日期。车门一关，缘分清零。',
    action: '刷新到站',
    effect: 'bus',
    links: [
      { label: '校园巴士时刻表', url: 'https://campuslife.sjtu.edu.cn/ui/bus' },
    ],
  },
  {
    id: 'faculty-canteen',
    name: '二餐教工餐厅',
    kicker: 'LUNCH OF CHAMPIONS',
    icon: '🍛',
    verdict: '教工的餐厅，xsy 的精神食堂。',
    blurb: '午间限定的香气结界。只要端起餐盘，上午的苦难就暂时作废。',
    action: '今日吃什么',
    effect: 'canteen',
  },
  {
    id: 'yorushika',
    name: 'ヨルシカ',
    kicker: '夜しか眠れず',
    icon: '🦌',
    verdict: '夜晚负责，鹿负责。',
    blurb: '耳机一戴，天色自动变蓝。没有播放版权音乐，但脑内前奏已经响了。',
    action: '进入夜鹿时间',
    effect: 'yorushika',
    links: [
      { label: '网易云音乐', url: 'https://music.163.com/#/artist?id=12390232' },
      { label: '官方网站', url: 'https://yorushika.com/' },
    ],
    extras: [{ label: '翻开一句歌词', action: 'lyrics' }],
  },
];

export function makePageModel(items) {
  return {
    count: items.length,
    title: `xsy最喜欢的${items.length}样东西`,
    items,
  };
}

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function cardMarkup(item, index) {
  const links = item.links?.length
    ? `<nav class="favorite__links" aria-label="${escapeHtml(item.name)}的相关资料">
        ${item.links.map((link) => {
          const externalAttrs = /^https?:\/\//.test(link.url) ? ' target="_blank" rel="noreferrer"' : '';
          return `<a href="${escapeHtml(link.url)}"${externalAttrs}>${escapeHtml(link.label)} <span aria-hidden="true">↗</span></a>`;
        }).join('')}
      </nav>`
    : '';
  const extras = item.extras?.map(({ label, action }) =>
    `<button class="favorite__extra" type="button" data-extra-action="${escapeHtml(action)}"${action === 'lyrics' ? ' disabled' : ''}>${escapeHtml(label)}</button>`
  ).join('') ?? '';
  const resources = links || extras
    ? `<div class="favorite__resources">${links}${extras}</div>`
    : '';

  return `
    <article class="favorite favorite--${escapeHtml(item.id)}" data-effect="${escapeHtml(item.effect)}" tabindex="0">
      <div class="favorite__number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</div>
      <p class="favorite__kicker">${escapeHtml(item.kicker)}</p>
      <div class="favorite__icon" aria-hidden="true">${escapeHtml(item.icon)}</div>
      <h2>${escapeHtml(item.name)}</h2>
      <p class="favorite__verdict">${escapeHtml(item.verdict)}</p>
      <p class="favorite__blurb">${escapeHtml(item.blurb)}</p>
      ${resources}
      <button class="favorite__action" type="button"${item.effect === 'yorushika' ? ' aria-pressed="false"' : ''}>${escapeHtml(item.action)}</button>
      <output class="favorite__output" aria-live="polite"></output>
    </article>`;
}

export const interactionOutputs = {
  strict: [
    '严谨度 87%',
    '严谨度 96%',
    '严谨度 101% · 已经溢出',
    '参考文献数量 +1',
    'p 值正在端正态度。',
    '审稿人二号已上线。',
    '这个结论需要再严一点。',
    '今日份学术浓度超标。',
    '假设通过，表情不通过。',
    '置信区间拒绝松懈。',
    '格式已统一到小数点后四位。',
    '博士后光环加载完成。',
  ],
  bug: [
    '金龟子已绕场一周。',
    '啪。它撞到玻璃了。',
    '金属漆仍然完好。',
    '触角检测到可疑反光。',
    '今日飞行申请已批准。',
    '正在以六条腿认真路过。',
    '昆虫界豪车开始怠速。',
    '它把灯泡当成了月亮。',
    '珠光漆今日无需补色。',
    '飞行路线：完全随机。',
    '已短暂接管本馆制空权。',
    '落地失败，但气势成功。',
  ],
  curling: [
    '前方大本营：3.7 米',
    '擦冰！擦冰！擦冰！',
    '塑料壶对此提出异议。',
    '石头正在思考摩擦系数。',
    '旋转很好，方向随缘。',
    '本壶拒绝轻量化。',
    '冰道已进入严肃状态。',
    '这一投主要靠信念。',
    '大本营表示压力很大。',
    '队友开始假装懂战术。',
    '重量：足以击碎塑料自尊。',
    '壶已出手，后悔来不及了。',
  ],
  classified: [
    '🔴 绝密：禁止截图',
    '档案已倒扣在桌面。',
    '馆长假装没看见。',
    '机密等级：不便坐下。',
    '有关细节已被厚涂。',
    '本页阅后请忘。',
    '证物拒绝正面回应。',
    '摄像头已礼貌转身。',
    '调查方向逐渐跑偏。',
    '该资产不接受估值。',
    '档案袋发出可疑笑声。',
    '封条完整，尊严待定。',
  ],
  history: [
    '批注：史料呢？',
    '批注：这个结论还可以再推敲。',
    '批注：下周课堂继续讨论。',
    '批注：请把时代背景补上。',
    '近代史突然从书里站起来了。',
    '这一页需要一个脚注。',
    '时间线拒绝被压缩。',
    '课堂清醒指数 +20。',
    '史料与观点正在对质。',
    '请勿让历史替你背锅。',
    '本段已送交过去审核。',
    '历史没有剧透，只有后果。',
  ],
  moon: [
    '月光 +25%',
    '月光 +50%',
    '太亮了，白月光拒绝降档。',
    '云层已自动让路。',
    '回忆滤镜浓度上升。',
    '距离未知，亮度稳定。',
    '今晚不参与现实讨论。',
    '月相：持续偏爱。',
    '一切都被照得很像从前。',
    '忘记进度已退回 0%。',
    '白月光正在占用内存。',
    '请勿直视，容易想太多。',
  ],
  bus: [
    '预计 2 分钟（仅供参考）',
    '车辆已进站，请不要奔跑。',
    '车辆刚刚驶离，缘分 -1。',
    '下一班：正在形成概念。',
    '司机已掌握你的迟到信息。',
    '站牌说快了，现实说再等等。',
    '车门关闭速度领先人类反应。',
    '当前位置：地图也不确定。',
    '座位余量：传说中有。',
    '它来了！不，是另一辆。',
    '已到站，请收起百米冲刺。',
    '本班车由玄学准点运营。',
  ],
  canteen: [
    '今日推荐：糖醋小排',
    '今日推荐：番茄炒蛋 + 两荤一素',
    '今日推荐：窗口前先观察三圈',
    '今日推荐：排队最长的那个。',
    '餐盘已获得临时幸福许可。',
    '米饭说今天可以续一点。',
    '午休能量正在紧急入账。',
    '窗口阿姨的手没有抖。',
    '荤素搭配，烦恼减半。',
    '今日汤品：看起来很有故事。',
    '上午的苦难已被刷卡抵扣。',
    '教工餐厅，非教工级向往。',
  ],
  yorushika: [
    '夜色加载中…',
    '耳机结界已开启。',
    '现在是 02:17，适合单曲循环。',
    '蓝色时刻已延长。',
    '前奏一响，白天自动退场。',
    '文学浓度正在升高。',
    '今晚由吉他负责叙事。',
    '鹿没有出现，夜已经到了。',
    '情绪已切换为日系摇滚。',
    '下一首仍然舍不得跳过。',
    '窗外天气：适合戴耳机。',
    '脑内演唱会拒绝散场。',
  ],
};

let activeDialog = null;
let lyricIndex = 0;
const beetleSwarmStates = new WeakMap();

function dialogElements() {
  const dialog = document.querySelector('#exhibit-dialog');
  if (!dialog) return null;
  return {
    dialog,
    title: dialog.querySelector('#exhibit-dialog-title'),
    content: dialog.querySelector('[data-dialog-content]'),
    close: dialog.querySelector('[data-dialog-close]'),
    backdrop: dialog.querySelector('[data-dialog-backdrop]'),
  };
}

function dialogFocusableElements(dialog) {
  return [...dialog.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((element) => !element.hidden && element.offsetParent !== null);
}

function handleDialogKeydown(event) {
  if (!activeDialog) return;
  if (event.key === 'Escape') {
    closeDialog();
    return;
  }
  if (event.key !== 'Tab') return;

  const focusable = dialogFocusableElements(activeDialog.elements.dialog);
  if (!focusable.length) {
    event.preventDefault();
    activeDialog.elements.close.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!activeDialog.elements.dialog.contains(document.activeElement)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function openDialog({ title, kind, trigger, render }) {
  if (typeof document === 'undefined') return;
  if (activeDialog) closeDialog({ restoreFocus: false });

  const elements = dialogElements();
  if (!elements) return;

  activeDialog = {
    trigger,
    kind,
    cleanup: null,
    previousOverflow: document.body.style.overflow,
    elements,
  };

  elements.dialog.dataset.kind = kind;
  elements.title.textContent = title;
  elements.content.replaceChildren();
  const cleanup = render?.(elements.content);
  activeDialog.cleanup = typeof cleanup === 'function' ? cleanup : null;

  document.body.style.overflow = 'hidden';
  elements.dialog.hidden = false;
  document.addEventListener('keydown', handleDialogKeydown);
  elements.close.addEventListener('click', closeDialog);
  elements.backdrop.addEventListener('click', closeDialog);
  elements.close.focus();
}

export function closeDialog({ restoreFocus = true } = {}) {
  if (!activeDialog) return;

  const { trigger, cleanup, previousOverflow, elements } = activeDialog;
  activeDialog = null;
  if (cleanup) cleanup();
  elements.content.replaceChildren();
  elements.title.textContent = '';
  delete elements.dialog.dataset.kind;
  elements.dialog.hidden = true;
  document.body.style.overflow = previousOverflow;
  document.removeEventListener('keydown', handleDialogKeydown);
  elements.close.removeEventListener('click', closeDialog);
  elements.backdrop.removeEventListener('click', closeDialog);

  if (restoreFocus && trigger && typeof trigger.focus === 'function') trigger.focus();
}

export function setNightMode(isActive, button) {
  const state = nextNightState(isActive);
  const closesLyrics = !state.active && activeDialog?.kind === 'lyrics';
  document.body.classList.toggle('night-shift', state.active);
  button.textContent = state.label;
  button.setAttribute('aria-pressed', state.ariaPressed);

  if (closesLyrics) closeDialog({ restoreFocus: false });

  for (const lyricsButton of document.querySelectorAll('[data-extra-action="lyrics"]')) {
    lyricsButton.disabled = !state.active;
  }

  if (closesLyrics) button.focus();
}

export function openLyrics(trigger) {
  openDialog({
    title: 'ヨルシカ · 夜鹿时间',
    kind: 'lyrics',
    trigger,
    render(content) {
      const renderFragment = () => {
        const fragment = LYRIC_FRAGMENTS[lyricIndex];
        const song = document.createElement('h3');
        song.className = 'lyrics__song';
        song.textContent = fragment.song;

        const japanese = document.createElement('p');
        japanese.className = 'lyrics__japanese';
        japanese.lang = 'ja';
        japanese.textContent = fragment.ja;

        const paraphrase = document.createElement('p');
        paraphrase.className = 'lyrics__paraphrase';
        paraphrase.textContent = fragment.zh;

        const link = document.createElement('a');
        link.className = 'lyrics__link';
        link.href = fragment.url;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = '查看官方作品目录 ↗';

        const next = document.createElement('button');
        next.className = 'lyrics__next';
        next.type = 'button';
        next.textContent = '换一句';
        next.addEventListener('click', () => {
          lyricIndex = nextIndex(lyricIndex, LYRIC_FRAGMENTS.length);
          renderFragment();
          content.querySelector('.lyrics__next').focus();
        });

        content.replaceChildren(song, japanese, paraphrase, link, next);
      };

      renderFragment();
    },
  });
}

const CURLING_START_Y = 3.9;
const CURLING_MAX_DURATION = 15_000;
const CURLING_MAX_STEPS = Math.ceil(CURLING_MAX_DURATION / (1000 / 60));

function curlingFrame(callback) {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return { id: window.requestAnimationFrame(callback), native: true };
  }
  return { id: setTimeout(() => callback(Date.now()), 16), native: false };
}

function cancelCurlingFrame(frame) {
  if (!frame) return;
  if (frame.native && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(frame.id);
  } else {
    clearTimeout(frame.id);
  }
}

export function openCurlingGame(trigger) {
  openDialog({
    title: '投一壶 · 石头壶冰道',
    kind: 'curling',
    trigger,
    render(content) {
      content.innerHTML = `
        <div class="curling-game" data-curling-game>
          <p class="curling-game__instructions">向下拖动冰壶蓄力，松开后让它向上滑向大本营。也可以用键盘设置左右方向和力度再投壶。</p>
          <div class="curling-game__modes" role="group" aria-label="冰壶玩法模式">
            <button type="button" data-curling-mode="practice" aria-pressed="true">练习模式</button>
            <button type="button" data-curling-mode="score" aria-pressed="false">比分模式</button>
          </div>
          <div class="curling-game__setup" data-curling-setup hidden>
            <label>已有红壶 <input data-curling-red-count type="number" min="0" max="7" value="2"></label>
            <label>已有蓝壶 <input data-curling-blue-count type="number" min="0" max="8" value="2"></label>
            <button type="button" data-curling-relayout>重新布局</button>
          </div>
          <div class="curling-game__lane" data-curling-lane tabindex="0" role="application" aria-label="冰壶投掷冰道">
            <div class="curling-house" data-curling-target aria-hidden="true"><span></span></div>
            <div class="curling-aim" data-curling-aim aria-hidden="true"></div>
            <div class="curling-stone" data-curling-stone aria-label="石头壶" role="img">🥌</div>
          </div>
          <div class="curling-game__readout" aria-live="polite">
            <span><span data-curling-score-prefix>本轮得分：</span><strong data-curling-score>—</strong></span>
            <span data-curling-status>准备投壶</span>
          </div>
          <p class="curling-game__result" data-curling-result aria-live="assertive"></p>
          <div class="curling-game__controls">
            <label>方向 <input data-curling-direction type="range" min="-80" max="80" value="0" step="1"><output data-curling-direction-value>0</output></label>
            <label>力度 <input data-curling-strength type="range" min="25" max="100" value="72" step="1"><output data-curling-strength-value>72</output></label>
            <button class="curling-game__launch" data-curling-launch type="button">投壶</button>
            <button class="curling-game__reset" data-curling-reset type="button">再投一壶</button>
          </div>
        </div>`;

      const lane = content.querySelector('[data-curling-lane]');
      const stone = content.querySelector('[data-curling-stone]');
      const aim = content.querySelector('[data-curling-aim]');
      const target = content.querySelector('[data-curling-target]');
      const score = content.querySelector('[data-curling-score]');
      const scorePrefix = content.querySelector('[data-curling-score-prefix]');
      const result = content.querySelector('[data-curling-result]');
      const status = content.querySelector('[data-curling-status]');
      const launch = content.querySelector('[data-curling-launch]');
      const reset = content.querySelector('[data-curling-reset]');
      const direction = content.querySelector('[data-curling-direction]');
      const strength = content.querySelector('[data-curling-strength]');
      const directionValue = content.querySelector('[data-curling-direction-value]');
      const strengthValue = content.querySelector('[data-curling-strength-value]');
      const setup = content.querySelector('[data-curling-setup]');
      const redCount = content.querySelector('[data-curling-red-count]');
      const blueCount = content.querySelector('[data-curling-blue-count]');
      const relayout = content.querySelector('[data-curling-relayout]');
      const modeButtons = [...content.querySelectorAll('[data-curling-mode]')];

      let position = { x: 0, y: 0 };
      let velocity = { x: 0, y: 0 };
      let frame = null;
      let initializationFrame = null;
      let startedAt = 0;
      let pointerId = null;
      let dragging = false;
      let phase = 'idle';
      let pullPoint = null;
      let laneRect = null;
      let mode = 'practice';
      let setupStones = [];

      const reducedMotion = prefersReducedMotion();

      const laneMetrics = () => {
        const borderRect = lane.getBoundingClientRect();
        const rect = {
          left: borderRect.left + lane.clientLeft,
          top: borderRect.top + lane.clientTop,
          width: lane.clientWidth,
          height: lane.clientHeight,
        };
        if (rect.width && rect.height) {
          lane.style.setProperty(
            '--curling-stone-diameter',
            `${CURLING_STONE_RADIUS * 2 / CURLING_GAME_LANE_WIDTH * rect.width}px`,
          );
          renderHouse(rect);
        }
        laneRect = rect;
        return rect;
      };

      const logicalToRendered = (point, rect = laneRect || laneMetrics()) => ({
        x: point.x / CURLING_GAME_LANE_WIDTH * rect.width,
        y: point.y / CURLING_GAME_LANE_HEIGHT * rect.height,
      });

      const renderedToLogical = (point, rect = laneRect || laneMetrics()) => ({
        x: point.x / rect.width * CURLING_GAME_LANE_WIDTH,
        y: point.y / rect.height * CURLING_GAME_LANE_HEIGHT,
      });

      const renderHouse = (rect) => {
        const geometry = { outerDiameter: 1.24, twoDiameter: 0.806, threeDiameter: 0.397 };
        const center = logicalToRendered({ x: CURLING_GAME_LANE_WIDTH / 2, y: 1.1 }, rect);
        const scale = rect.width / CURLING_GAME_LANE_WIDTH;
        target.style.setProperty('--curling-house-left', `${center.x}px`);
        target.style.setProperty('--curling-house-top', `${center.y}px`);
        target.style.setProperty('--curling-house-diameter', `${geometry.outerDiameter * scale}px`);
        target.style.setProperty('--curling-two-ring-diameter', `${geometry.twoDiameter * scale}px`);
        target.style.setProperty('--curling-three-ring-diameter', `${geometry.threeDiameter * scale}px`);
      };

      const updateStone = () => {
        const rendered = logicalToRendered(position);
        const diameter = CURLING_STONE_RADIUS * 2 / CURLING_GAME_LANE_WIDTH * (laneRect || laneMetrics()).width;
        lane.style.setProperty('--curling-stone-diameter', `${diameter}px`);
        stone.style.left = `${rendered.x}px`;
        stone.style.top = `${rendered.y}px`;
      };

      const renderSetupStones = () => {
        for (const existingStone of lane.querySelectorAll('[data-curling-static-stone]')) existingStone.remove();
        const rect = laneRect || laneMetrics();
        for (const existingStone of setupStones) {
          const rendered = logicalToRendered(existingStone, rect);
          const element = document.createElement('span');
          element.className = `curling-static-stone curling-static-stone--${existingStone.team}`;
          element.dataset.curlingStaticStone = existingStone.team;
          element.setAttribute('aria-label', existingStone.team === 'red' ? '已有红壶' : '已有蓝壶');
          element.setAttribute('role', 'img');
          element.style.left = `${rendered.x}px`;
          element.style.top = `${rendered.y}px`;
          lane.append(element);
        }
      };

      const setScoreReadout = (afterThrow = false) => {
        if (mode === 'practice') {
          scorePrefix.textContent = '本轮得分：';
          score.textContent = '—';
          return;
        }
        const end = scoreCurlingEnd(afterThrow ? [...setupStones, { team: 'red', ...position }] : setupStones);
        scorePrefix.textContent = `${afterThrow ? '投掷后比分' : '投掷前比分'}：`;
        score.textContent = `红 ${end.red} · 蓝 ${end.blue}`;
      };

      const resetPosition = () => {
        const rect = laneMetrics();
        if (!rect.width || !rect.height) {
          laneRect = null;
          stone.style.left = '50%';
          stone.style.top = `${CURLING_START_Y / CURLING_GAME_LANE_HEIGHT * 100}%`;
          return;
        }
        position = { x: CURLING_GAME_LANE_WIDTH / 2, y: CURLING_START_Y };
        updateStone();
        aim.hidden = true;
      };

      const updateAim = () => {
        if (!pullPoint) {
          aim.hidden = true;
          return;
        }
        const renderedPosition = logicalToRendered(position);
        const renderedPull = logicalToRendered(pullPoint);
        const dx = renderedPull.x - renderedPosition.x;
        const dy = renderedPull.y - renderedPosition.y;
        const length = Math.hypot(dx, dy);
        aim.hidden = length < 2;
        aim.style.left = `${renderedPosition.x}px`;
        aim.style.top = `${renderedPosition.y}px`;
        aim.style.width = `${length}px`;
        aim.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
      };

      const endThrow = () => {
        if (phase !== 'flying') return;
        phase = 'complete';
        if (frame) {
          cancelCurlingFrame(frame);
          frame = null;
        }
        const rect = laneRect || laneMetrics();
        const geometry = { targetX: CURLING_GAME_LANE_WIDTH / 2, targetY: 1.1, houseRadius: 0.62 };
        const distanceRatio = Math.hypot(
          position.x - geometry.targetX,
          position.y - geometry.targetY,
        ) / geometry.houseRadius;
        const roundScore = scoreCurling(distanceRatio);
        if (mode === 'practice') {
          score.textContent = String(roundScore);
          result.textContent = curlingResult(roundScore);
          status.textContent = `投掷结束 · 距离圆心 ${(distanceRatio).toFixed(2)} 圈`;
        } else {
          setScoreReadout(true);
          const end = scoreCurlingEnd([...setupStones, { team: 'red', ...position }]);
          result.textContent = end.points ? `${end.scoringTeam === 'red' ? '红队' : '蓝队'}本局 ${end.points} 分。` : '本局无人得分。';
          status.textContent = '投掷结束 · 已按大本营内最近壶计分';
        }
        launch.disabled = true;
        reset.disabled = false;
        reset.focus();
      };

      const advancePhysics = () => {
        const next = advanceCurlingMatch({
          delivered: { team: 'red', ...position, velocity },
          stones: setupStones,
        }, { width: CURLING_GAME_LANE_WIDTH, height: CURLING_GAME_LANE_HEIGHT, radius: CURLING_STONE_RADIUS });
        position = { x: next.delivered.x, y: next.delivered.y };
        velocity = next.delivered.velocity;
        setupStones = next.stones;
        updateStone();
        renderSetupStones();
        return next.finished;
      };

      const settleMatch = () => {
        const settled = settleCurlingMatch({
          delivered: { team: 'red', ...position, velocity },
          stones: setupStones,
        }, { width: CURLING_GAME_LANE_WIDTH, height: CURLING_GAME_LANE_HEIGHT, radius: CURLING_STONE_RADIUS }, CURLING_MAX_STEPS);
        position = { x: settled.delivered.x, y: settled.delivered.y };
        velocity = settled.delivered.velocity;
        setupStones = settled.stones;
        updateStone();
        renderSetupStones();
      };

      const animate = (timestamp) => {
        if (phase !== 'flying') return;
        if (timestamp - startedAt >= CURLING_MAX_DURATION) {
          settleMatch();
          endThrow();
          return;
        }
        if (advancePhysics()) {
          endThrow();
          return;
        }
        frame = curlingFrame(animate);
      };

      const beginThrow = (nextVelocity) => {
        if (phase === 'flying') return;
        const rect = laneMetrics();
        velocity = nextVelocity;
        phase = 'flying';
        startedAt = performance.now();
        score.textContent = '…';
        result.textContent = '';
        status.textContent = '石头壶滑行中…';
        launch.disabled = true;
        reset.disabled = true;
        aim.hidden = true;
        if (reducedMotion) {
          settleMatch();
          endThrow();
          return;
        }
        frame = curlingFrame(animate);
      };

      const pointerPosition = (event) => {
        const rect = laneRect || laneMetrics();
        return renderedToLogical({ x: event.clientX - rect.left, y: event.clientY - rect.top }, rect);
      };

      const onPointerDown = (event) => {
        if (phase !== 'idle' || event.button !== 0) return;
        const point = pointerPosition(event);
        if (point.y < CURLING_GAME_LANE_HEIGHT * 0.55) return;
        dragging = true;
        pointerId = event.pointerId;
        pullPoint = point;
        lane.setPointerCapture?.(pointerId);
        updateAim();
        status.textContent = '蓄力中，松开投壶';
        event.preventDefault();
      };

      const onPointerMove = (event) => {
        if (!dragging || event.pointerId !== pointerId) return;
        const rect = laneRect || laneMetrics();
        const point = pointerPosition(event);
        pullPoint = {
          x: Math.max(CURLING_STONE_RADIUS, Math.min(CURLING_GAME_LANE_WIDTH - CURLING_STONE_RADIUS, point.x)),
          y: Math.max(CURLING_GAME_LANE_HEIGHT * 0.55, Math.min(CURLING_GAME_LANE_HEIGHT - CURLING_STONE_RADIUS, point.y)),
        };
        updateAim();
        event.preventDefault();
      };

      const onPointerUp = (event) => {
        if (!dragging || event.pointerId !== pointerId) return;
        dragging = false;
        lane.releasePointerCapture?.(pointerId);
        pointerId = null;
        beginThrow(pointerCurlingVelocity(position, pullPoint || position));
        pullPoint = null;
        aim.hidden = true;
      };

      const onPointerCancel = (event) => {
        if (event.pointerId !== pointerId) return;
        dragging = false;
        lane.releasePointerCapture?.(pointerId);
        pointerId = null;
        pullPoint = null;
        aim.hidden = true;
        status.textContent = '准备投壶';
      };

      const resetGame = () => {
        if (frame) {
          cancelCurlingFrame(frame);
          frame = null;
        }
        if (initializationFrame) {
          cancelCurlingFrame(initializationFrame);
          initializationFrame = null;
        }
        phase = 'idle';
        velocity = { x: 0, y: 0 };
        dragging = false;
        pointerId = null;
        pullPoint = null;
        if (mode === 'practice') score.textContent = '—';
        result.textContent = '';
        status.textContent = '准备投壶';
        launch.disabled = false;
        reset.disabled = true;
        resetPosition();
        if (mode === 'score') {
          renderSetupStones();
          setScoreReadout(false);
          status.textContent = '投掷前 · 静态壶已就位';
        }
      };

      const launchFromKeyboard = () => {
        if (phase !== 'idle') return;
        const strengthRatio = Number(strength.value) / 100;
        const directionRatio = Number(direction.value) / 100;
        beginThrow(keyboardCurlingVelocity(directionRatio, strengthRatio, CURLING_GAME_LANE_HEIGHT));
      };

      const updateSetup = () => {
        setupStones = createCurlingSetup({ redCount: redCount.value, blueCount: blueCount.value });
        resetGame();
      };

      const setMode = (nextMode) => {
        mode = nextMode;
        setup.hidden = mode !== 'score';
        for (const button of modeButtons) button.setAttribute('aria-pressed', String(button.dataset.curlingMode === mode));
        if (mode === 'score') updateSetup();
        else {
          setupStones = [];
          renderSetupStones();
          resetGame();
        }
      };

      const onSliderInput = () => {
        directionValue.textContent = direction.value;
        strengthValue.textContent = strength.value;
      };
      const onLaneKeydown = (event) => {
        if ((event.key === 'Enter' || event.key === ' ') && phase === 'idle') {
          event.preventDefault();
          launchFromKeyboard();
        }
      };

      lane.addEventListener('pointerdown', onPointerDown);
      lane.addEventListener('pointermove', onPointerMove);
      lane.addEventListener('pointerup', onPointerUp);
      lane.addEventListener('pointercancel', onPointerCancel);
      lane.addEventListener('keydown', onLaneKeydown);
      launch.addEventListener('click', launchFromKeyboard);
      reset.addEventListener('click', resetGame);
      relayout.addEventListener('click', updateSetup);
      redCount.addEventListener('change', updateSetup);
      blueCount.addEventListener('change', updateSetup);
      for (const button of modeButtons) button.addEventListener('click', () => setMode(button.dataset.curlingMode));
      direction.addEventListener('input', onSliderInput);
      strength.addEventListener('input', onSliderInput);
      resetGame();
      reset.disabled = true;
      initializationFrame = curlingFrame(() => {
        initializationFrame = null;
        if (phase === 'idle') resetPosition();
      });

      return () => {
        if (frame) cancelCurlingFrame(frame);
        if (initializationFrame) cancelCurlingFrame(initializationFrame);
        if (pointerId !== null) lane.releasePointerCapture?.(pointerId);
        lane.removeEventListener('pointerdown', onPointerDown);
        lane.removeEventListener('pointermove', onPointerMove);
        lane.removeEventListener('pointerup', onPointerUp);
        lane.removeEventListener('pointercancel', onPointerCancel);
        lane.removeEventListener('keydown', onLaneKeydown);
        launch.removeEventListener('click', launchFromKeyboard);
        reset.removeEventListener('click', resetGame);
        relayout.removeEventListener('click', updateSetup);
        redCount.removeEventListener('change', updateSetup);
        blueCount.removeEventListener('change', updateSetup);
        direction.removeEventListener('input', onSliderInput);
        strength.removeEventListener('input', onSliderInput);
      };
    },
  });
}

const SLAP_GAME_DURATION = 10_000;

export function openSlapGame(trigger) {
  openDialog({
    title: '打屁股 · 十秒钟拍手训练',
    kind: 'slap',
    trigger,
    render(content) {
      content.innerHTML = `
        <div class="slap-game" data-slap-game>
          <p class="slap-game__instructions">点按抽象桃子开始。命中加分和连击，点空白处只会清空连击。</p>
          <div class="slap-game__readout" aria-live="polite">
            <span>剩余 <strong data-slap-countdown>10.0</strong> 秒</span>
            <span>得分 <strong data-slap-score>0</strong></span>
            <span>连击 <strong data-slap-combo>0</strong></span>
          </div>
          <div class="slap-game__arena" data-slap-arena tabindex="0" role="region" aria-label="抽象桃子拍击区域，按 Enter 或空格可判定未命中">
            <button class="slap-game__target" data-slap-target type="button" aria-label="抽象桃子目标">🍑</button>
          </div>
          <p class="slap-game__status" data-slap-status aria-live="polite">点击桃子开始，键盘可聚焦目标后按 Enter 或空格。</p>
          <div class="slap-game__finish" data-slap-finish hidden>
            <p data-slap-result aria-live="assertive"></p>
            <button class="slap-game__restart" data-slap-restart type="button">再来一局</button>
          </div>
        </div>`;

      const arena = content.querySelector('[data-slap-arena]');
      const target = content.querySelector('[data-slap-target]');
      const countdown = content.querySelector('[data-slap-countdown]');
      const score = content.querySelector('[data-slap-score]');
      const combo = content.querySelector('[data-slap-combo]');
      const status = content.querySelector('[data-slap-status]');
      const finish = content.querySelector('[data-slap-finish]');
      const result = content.querySelector('[data-slap-result]');
      const restart = content.querySelector('[data-slap-restart]');
      const reducedMotion = prefersReducedMotion();
      let gameState = null;
      let countdownInterval = null;
      let closed = false;

      const clearCountdown = () => {
        if (countdownInterval !== null) {
          clearInterval(countdownInterval);
          countdownInterval = null;
        }
      };

      const displayRemaining = (now) => {
        if (!gameState) return SLAP_GAME_DURATION;
        return Math.max(0, gameState.endsAt - now);
      };

      const refreshReadout = (now = performance.now()) => {
        countdown.textContent = (displayRemaining(now) / 1000).toFixed(1);
        score.textContent = String(gameState?.score ?? 0);
        combo.textContent = String(gameState?.combo ?? 0);
      };

      const finishRound = (now = performance.now()) => {
        if (!gameState || closed) return;
        gameState = finishSlapGame(gameState, now);
        if (!gameState.finished) return;
        clearCountdown();
        refreshReadout(now);
        target.disabled = true;
        arena.classList.remove('is-hit');
        status.textContent = '时间到，桃子已撤离。';
        result.textContent = `${slapTitle(gameState.score)} · 本局 ${gameState.score} 分，最高连击 ${gameState.bestCombo}。`;
        finish.hidden = false;
        restart.focus();
      };

      const tick = () => {
        if (closed || !gameState) return;
        const now = performance.now();
        gameState = finishSlapGame(gameState, now);
        refreshReadout(now);
        if (gameState.finished) finishRound(now);
      };

      const startRound = (now) => {
        if (gameState) return;
        gameState = createSlapGame(SLAP_GAME_DURATION, now);
        countdownInterval = setInterval(tick, 100);
      };

      const moveTarget = () => {
        const targetWidth = target.offsetWidth || 96;
        const targetHeight = target.offsetHeight || 88;
        const halfWidth = targetWidth / 2;
        const halfHeight = targetHeight / 2;
        const minLeft = (halfWidth / arena.clientWidth) * 100;
        const maxLeft = 100 - minLeft;
        const minTop = (halfHeight / arena.clientHeight) * 100;
        const maxTop = 100 - minTop;
        const left = minLeft + Math.random() * Math.max(0, maxLeft - minLeft);
        const top = minTop + Math.random() * Math.max(0, maxTop - minTop);
        target.style.left = `${left}%`;
        target.style.top = `${top}%`;
      };

      const addMarker = () => {
        const marker = document.createElement('span');
        marker.className = 'slap-game__marker';
        marker.setAttribute('aria-hidden', 'true');
        marker.textContent = '啪';
        marker.style.left = target.style.left;
        marker.style.top = target.style.top;
        marker.addEventListener('animationend', () => marker.remove(), { once: true });
        arena.append(marker);
      };

      const registerHit = () => {
        const now = performance.now();
        startRound(now);
        gameState = registerSlapHit(gameState, now);
        if (gameState.finished) {
          finishRound(now);
          return;
        }
        refreshReadout(now);
        status.textContent = `命中！${gameState.combo} 连击`;
        addMarker();
        if (!reducedMotion) {
          arena.classList.remove('is-hit');
          void arena.offsetWidth;
          arena.classList.add('is-hit');
        }
        moveTarget();
      };

      const registerMiss = () => {
        if (!gameState || gameState.finished) return;
        const now = performance.now();
        gameState = registerSlapMiss(gameState, now);
        if (gameState.finished) {
          finishRound(now);
          return;
        }
        refreshReadout(now);
        status.textContent = '扑空了，分数不变，连击归零。';
      };

      const restartRound = () => {
        clearCountdown();
        gameState = null;
        target.disabled = false;
        target.style.left = '50%';
        target.style.top = '55%';
        arena.classList.remove('is-hit');
        finish.hidden = true;
        result.textContent = '';
        status.textContent = '点击桃子开始，键盘可聚焦目标后按 Enter 或空格。';
        refreshReadout();
        target.focus();
      };

      const onTargetClick = (event) => {
        event.stopPropagation();
        registerHit();
      };
      const onArenaClick = (event) => {
        if (event.target === arena) registerMiss();
      };
      const onArenaKeydown = (event) => {
        if (event.target !== arena) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          registerMiss();
        }
      };
      const onArenaAnimationEnd = (event) => {
        if (event.animationName === 'slap-arena-shake') arena.classList.remove('is-hit');
      };

      target.addEventListener('click', onTargetClick);
      arena.addEventListener('click', onArenaClick);
      arena.addEventListener('keydown', onArenaKeydown);
      arena.addEventListener('animationend', onArenaAnimationEnd);
      restart.addEventListener('click', restartRound);
      restartRound();

      return () => {
        closed = true;
        clearCountdown();
        target.removeEventListener('click', onTargetClick);
        arena.removeEventListener('click', onArenaClick);
        arena.removeEventListener('keydown', onArenaKeydown);
        arena.removeEventListener('animationend', onArenaAnimationEnd);
        restart.removeEventListener('click', restartRound);
      };
    },
  });
}

function activateCard(card) {
  const effect = card.dataset.effect;
  const choices = interactionOutputs[effect] ?? ['已收藏。'];
  const current = Number(card.dataset.step || 0);
  card.dataset.step = String(current + 1);
  card.classList.remove('is-active');
  void card.offsetWidth;
  card.classList.add('is-active');
  card.querySelector('.favorite__output').textContent = choices[current % choices.length];

  if (effect === 'yorushika') {
    const button = card.querySelector('.favorite__action');
    setNightMode(document.body.classList.contains('night-shift'), button);
  }
  if (effect === 'bug') spawnBeetleSwarm(card);
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function cleanupBeetleSwarm(card) {
  const state = beetleSwarmStates.get(card);
  if (!state) return;
  if (state.staticTimer) clearTimeout(state.staticTimer);
  for (const { element, handler } of state.listeners) {
    element.removeEventListener('animationend', handler);
  }
  for (const element of state.elements) element.remove();
  beetleSwarmStates.delete(card);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function spawnBeetleSwarm(card) {
  const reducedMotion = prefersReducedMotion();
  let state = beetleSwarmStates.get(card);
  if (reducedMotion) {
    cleanupBeetleSwarm(card);
    state = { elements: new Set(), listeners: [], staticTimer: null };
    beetleSwarmStates.set(card, state);
    const staticBeetle = document.createElement('span');
    staticBeetle.className = 'beetle-static';
    staticBeetle.setAttribute('role', 'status');
    staticBeetle.textContent = '🪲 金龟子停在卡片里。';
    card.append(staticBeetle);
    state.elements.add(staticBeetle);
    state.staticTimer = setTimeout(() => {
      staticBeetle.remove();
      state.elements.delete(staticBeetle);
      state.staticTimer = null;
    }, 800);
    return;
  }

  if (!state) {
    state = { elements: new Set(), listeners: [], staticTimer: null };
    beetleSwarmStates.set(card, state);
  }

  const activeCount = card.querySelectorAll('.flying-beetle').length;
  const requestedCount = 4 + Math.floor(Math.random() * 4);
  const count = availableBeetleSlots(activeCount, Math.min(requestedCount, MAX_BEETLES));

  for (let index = 0; index < count; index += 1) {
    const beetle = document.createElement('button');
    beetle.type = 'button';
    beetle.className = 'flying-beetle';
    beetle.setAttribute('aria-label', '驱赶金龟子');
    beetle.textContent = '🪲';
    beetle.style.setProperty('--beetle-start-x', `${randomBetween(8, 80)}%`);
    beetle.style.setProperty('--beetle-start-y', `${randomBetween(16, 72)}%`);
    beetle.style.setProperty('--beetle-end-x', `${randomBetween(8, 80)}%`);
    beetle.style.setProperty('--beetle-end-y', `${randomBetween(16, 72)}%`);
    beetle.style.setProperty('--beetle-duration', `${randomBetween(1.35, 2.45).toFixed(2)}s`);
    beetle.style.setProperty('--beetle-delay', `${randomBetween(0, .24).toFixed(2)}s`);
    beetle.style.setProperty('--beetle-rotation', `${Math.round(randomBetween(-540, 540))}deg`);

    const remove = () => {
      beetle.remove();
      state.elements.delete(beetle);
      state.listeners = state.listeners.filter((entry) => entry.element !== beetle);
    };
    const handleAnimationEnd = (event) => {
      if (event.animationName === 'beetle-flight' || event.animationName === 'beetle-dismiss') remove();
    };
    beetle.addEventListener('animationend', handleAnimationEnd);
    beetle.addEventListener('click', () => {
      if (beetle.disabled) return;
      beetle.disabled = true;
      beetle.textContent = '啪';
      beetle.classList.add('is-dismissed');
    }, { once: true });
    state.elements.add(beetle);
    state.listeners.push({ element: beetle, handler: handleAnimationEnd });
    card.append(beetle);
  }
}

export function mountPage(root = document) {
  const model = makePageModel(favorites);
  const count = root.querySelector('[data-favorite-count]');
  const grid = root.querySelector('[data-favorites]');

  document.title = model.title;
  count.textContent = String(model.count);
  grid.innerHTML = model.items.map(cardMarkup).join('');

  grid.addEventListener('click', (event) => {
    const button = event.target.closest('.favorite__action');
    if (button) {
      const card = button.closest('.favorite');
      if (card?.dataset.effect === 'curling') {
        openCurlingGame(button);
      } else {
        activateCard(card);
      }
      return;
    }

    const extra = event.target.closest('[data-extra-action]');
    if (extra?.dataset.extraAction === 'lyrics' && !extra.disabled) openLyrics(extra);
    if (extra?.dataset.extraAction === 'curling') openCurlingGame(extra);
    if (extra?.dataset.extraAction === 'slap') openSlapGame(extra);
  });
}

if (typeof document !== 'undefined') {
  mountPage();
}
