// General muscle-region illustration, with separate front/back silhouettes.
// The leg station covers two recorded movements, so both thigh regions appear.
const profiles = {
  pull: { title: '背部', primary: ['lats'], secondary: ['upperBack', 'biceps'], main: ['背阔肌'], assist: ['上背部', '肱二头肌'], note: '高位下拉 / 高拉力背肌' },
  row: { title: '背部', primary: ['lats', 'upperBack'], secondary: ['biceps', 'rearShoulders'], main: ['背阔肌', '上背部肌群'], assist: ['肱二头肌', '三角肌后束'], note: '坐姿划船' },
  fly: { title: '胸部', primary: ['chest'], secondary: ['frontShoulders'], main: ['胸大肌'], assist: ['三角肌前束'], note: '蝴蝶机夹胸' },
  chest: { title: '胸部', primary: ['chest'], secondary: ['frontShoulders', 'triceps'], main: ['胸大肌'], assist: ['三角肌前束', '肱三头肌'], note: '坐式胸肌推举' },
  shoulder: { title: '肩部', primary: ['frontShoulders'], secondary: ['triceps'], main: ['三角肌前束 / 中束'], assist: ['肱三头肌'], note: '坐姿肩推' },
  abs: { title: '核心', primary: ['abs'], secondary: ['obliques'], main: ['腹直肌'], assist: ['腹斜肌群'], note: '坐式腹肌训练' },
  legs: { title: '腿部', primary: ['quads', 'adductors'], secondary: [], main: ['股四头肌', '大腿内收肌群'], assist: [], note: '大腿伸展 / 大腿内侧' },
  cardio: { title: '下肢', primary: ['quads', 'glutes', 'calves'], secondary: ['hamstrings'], main: ['大腿前侧', '臀部', '小腿'], assist: ['大腿后侧'], note: '步行 / 爬坡时参与的区域' },
};

const front = [
  ['frontShoulders', 'M57 86Q44 87 41 102L43 122Q51 123 58 111Q63 98 57 86Z'],
  ['chest', 'M86 92Q70 85 59 96L57 115Q69 128 86 117Z'],
  ['biceps', 'M44 124Q35 127 33 143L31 163Q39 168 44 151L48 133Z'],
  ['abs', 'M78 126Q82 122 87 125L87 143L77 142ZM77 147L87 148L87 164L77 164ZM77 169L87 169L87 186Q80 189 77 183ZM78 190L87 192L87 207L82 203Z'],
  ['obliques', 'M60 126L72 139L72 171L76 192L66 202L63 176Z'],
  ['quads', 'M69 237Q59 245 58 264L62 304Q63 316 70 322L76 312L80 268L77 245Z'],
  ['adductors', 'M79 238L88 249L86 272L76 310L77 276Z'],
  ['calves', 'M62 332Q55 348 57 362L63 383L69 375L73 340L69 330Z'],
];
const back = [
  ['upperBack', 'M87 73L77 81L61 87L70 104L87 126ZM62 109L69 105L84 129L84 140L69 128Z'],
  ['rearShoulders', 'M57 86Q44 87 41 103L43 121Q51 121 59 111L63 99Z'],
  ['lats', 'M60 115L68 130L84 143L78 171L66 186L63 159Z'],
  ['triceps', 'M44 124Q35 128 33 142L31 163Q38 170 44 153L49 135Z'],
  ['glutes', 'M66 203Q79 196 87 211L87 235Q75 244 64 231Z'],
  ['hamstrings', 'M66 240Q58 250 59 269L63 310L70 321L78 306L83 251L77 241Z'],
  ['calves', 'M62 331Q53 347 57 365L64 383L70 374L73 343L69 331Z'],
];

function figure(view, profile, id) {
  const base = `<ellipse cx="90" cy="39" rx="18" ry="24"/><path d="M80 60L78 76L68 81L58 85Q50 91 51 108L59 141L64 170L66 190Q60 214 65 235L75 249L105 249L115 235Q120 214 114 190L116 170L121 141L129 108Q130 91 122 85L112 81L102 76L100 60Z"/><path d="M54 88Q41 85 35 105L27 143L20 176L15 212L9 229Q7 236 12 242L21 241L28 222L35 203L42 177L48 158L54 132L60 112ZM68 232Q57 241 56 263L60 313L56 332Q51 352 57 377L57 394L50 405Q49 410 60 411L72 408L74 395L73 375L79 340L81 317L87 277L90 250Z"/><g transform="translate(180 0) scale(-1 1)"><path d="M54 88Q41 85 35 105L27 143L20 176L15 212L9 229Q7 236 12 242L21 241L28 222L35 203L42 177L48 158L54 132L60 112ZM68 232Q57 241 56 263L60 313L56 332Q51 352 57 377L57 394L50 405Q49 410 60 411L72 408L74 395L73 375L79 340L81 317L87 277L90 250Z"/></g>`;
  const muscles = (view === 'front' ? front : back).map(([muscle, path]) => {
    const state = profile.primary.includes(muscle) ? 'is-primary' : profile.secondary.includes(muscle) ? 'is-secondary' : '';
    return `<g class="muscle ${state}" data-muscle="${muscle}"><path d="${path}"/><path d="${path}" transform="translate(180 0) scale(-1 1)"/></g>`;
  }).join('');
  const details = view === 'front' ? '<path d="M74 72L87 85M106 72L93 85M90 91V118M68 211L87 230M112 211L93 230M65 321L72 327M115 321L108 327M64 384L65 394M116 384L115 394"/>' : '<path d="M90 76V200M83 143L80 184M97 143L100 184M90 204V239M64 321L72 325M116 321L108 325M64 383L65 394M116 383L115 394"/>';
  return `<div class="body-view"><svg class="body-figure" viewBox="0 0 180 422" aria-hidden="true"><defs><linearGradient id="body-${id}-${view}" x1="0" x2="1" y2=".3"><stop stop-color="#a9c1c7" stop-opacity=".14"/><stop offset=".5" stop-color="#e6f2f4" stop-opacity=".34"/><stop offset="1" stop-color="#a9bec6" stop-opacity=".14"/></linearGradient></defs><g class="body-shell" fill="url(#body-${id}-${view})">${base}</g><g class="body-muscles">${muscles}</g><g class="body-lines">${details}</g></svg><span class="body-view-label" aria-hidden="true">${view === 'front' ? '正面' : '背面'}</span></div>`;
}

export function musclePanel(station) {
  const profile = profiles[station.id];
  if (!profile) return '';
  return `<aside class="muscle-panel glass-card" aria-labelledby="muscle-title"><div class="muscle-panel-top"><span class="eyebrow">BODY MAP</span><svg class="anatomy-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" aria-hidden="true"><path d="M12 3V21M3 12H21M5.6 5.6L18.4 18.4M5.6 18.4L18.4 5.6"/></svg></div><div class="muscle-heading"><div><p>这一次，练到哪里</p><h3 id="muscle-title">${profile.title}<span>肌群</span></h3></div><span class="body-map-index">${String(Object.keys(profiles).indexOf(station.id) + 1).padStart(2, '0')}</span></div><div class="anatomy-stage" role="img" aria-label="正面和背面肌群示意。主要区域：${profile.main.join('、')}。${profile.assist.length ? `辅助参与：${profile.assist.join('、')}。` : ''}"><div class="anatomy-halo"></div>${figure('front', profile, station.id)}${figure('back', profile, station.id)}</div><div class="muscle-legend"><span><i class="primary-dot"></i>主要区域</span>${profile.assist.length ? '<span><i class="secondary-dot"></i>辅助参与</span>' : ''}</div><div class="muscle-list"><p><span>主要</span>${profile.main.join(' · ')}</p>${profile.assist.length ? `<p><span>辅助</span>${profile.assist.join(' · ')}</p>` : ''}</div><p class="anatomy-note">${profile.note} · 肌群区域示意</p></aside>`;
}
