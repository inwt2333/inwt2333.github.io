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
      { label: '交大教师主页', url: 'https://ma.sjtu.edu.cn/info/1196/3174.htm' },
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
        ${item.links.map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)} <span aria-hidden="true">↗</span></a>`).join('')}
      </nav>`
    : '';

  return `
    <article class="favorite favorite--${escapeHtml(item.id)}" data-effect="${escapeHtml(item.effect)}" tabindex="0">
      <div class="favorite__number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</div>
      <p class="favorite__kicker">${escapeHtml(item.kicker)}</p>
      <div class="favorite__icon" aria-hidden="true">${escapeHtml(item.icon)}</div>
      <h2>${escapeHtml(item.name)}</h2>
      <p class="favorite__verdict">${escapeHtml(item.verdict)}</p>
      <p class="favorite__blurb">${escapeHtml(item.blurb)}</p>
      ${links}
      <button class="favorite__action" type="button">${escapeHtml(item.action)}</button>
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

function activateCard(card) {
  const effect = card.dataset.effect;
  const choices = interactionOutputs[effect] ?? ['已收藏。'];
  const current = Number(card.dataset.step || 0);
  card.dataset.step = String(current + 1);
  card.classList.remove('is-active');
  void card.offsetWidth;
  card.classList.add('is-active');
  card.querySelector('.favorite__output').textContent = choices[current % choices.length];

  if (effect === 'yorushika') document.body.classList.toggle('night-shift');
  if (effect === 'bug') spawnBug(card);
}

function spawnBug(card) {
  const bug = document.createElement('span');
  bug.className = 'runner-bug';
  bug.textContent = '🪲';
  bug.setAttribute('aria-hidden', 'true');
  card.append(bug);
  bug.addEventListener('animationend', () => bug.remove(), { once: true });
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
    if (button) activateCard(button.closest('.favorite'));
  });
}

if (typeof document !== 'undefined') {
  mountPage();
}
