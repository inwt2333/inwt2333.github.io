export const absurdScenes = [
  {
    id: 'bus',
    title: '校园巴士终于来了',
    setup: '车门一开，司机端着二餐的餐盘下来了。',
    punchline: '司机：别上车，我也是来排队的。',
    actors: ['🚌', '🍛'],
    stamp: '到站失败',
  },
  {
    id: 'review',
    title: '严格开始匿名审稿',
    setup: '投稿人是一只金龟子，论文题目叫《我为什么能飞》。',
    punchline: '审稿意见：会飞，但缺少对照组。金龟子把意见书吃了。',
    actors: ['🧪', '🪲'],
    stamp: '大修',
  },
  {
    id: 'chess',
    title: '棋桌发生跨界事故',
    setup: '国际象棋的马走了个“日”，直接走进日麻牌桌。',
    punchline: '三家同时举手：这张牌能碰，但这匹马谁来养？',
    actors: ['♞', '🀄'],
    stamp: '规则失效',
  },
  {
    id: 'curling',
    title: '冰壶裁判申请休假',
    setup: '石头壶把 🍑 认成大本营，一路滑过去。',
    punchline: '裁判看了回放十七次：这分我不敢算。',
    actors: ['🥌', '🍑'],
    stamp: '禁止回放',
  },
  {
    id: 'moon',
    title: '白月光误入夜鹿时间',
    setup: '月亮被迫调成蓝色，还戴上了耳机。',
    punchline: '路灯投诉：夜班可以，脑内演唱会能不能小声点？',
    actors: ['🌕', '🦌'],
    stamp: '夜色过量',
  },
  {
    id: 'counseling',
    title: '内心会议进入议程',
    setup: '咨询师问：你今天最想解决什么问题？',
    punchline: 'xsy：二餐教工餐厅能不能给我一个长聘座位？',
    actors: ['🛋️', '🍛'],
    stamp: '先吃饭',
  },
  {
    id: 'meeting',
    title: '全部藏品集体开会',
    setup: '议题：究竟谁才是 xsy 最喜欢的？全员要求匿名投票。',
    punchline: '会议开了三小时，唯一没到的是校园巴士。',
    actors: ['📋', '🚌'],
    stamp: '继续等车',
  },
];

export function incidentAt(index) {
  const position = ((Math.trunc(index) % absurdScenes.length) + absurdScenes.length) % absurdScenes.length;
  return { ...absurdScenes[position], number: position + 1 };
}
