import { regions } from './anatomy/regions.mjs';

// Broad exercise regions. The combined leg station includes two movements.
const profiles = {
  pull: { title: '背部', primary: ['lats'], secondary: ['upper_back', 'biceps'], main: ['背阔肌'], assist: ['上背部', '肱二头肌'], note: '高位下拉 / 高拉力背肌' },
  row: { title: '背部', primary: ['lats', 'upper_back'], secondary: ['biceps', 'shoulders'], main: ['背阔肌', '上背部肌群'], assist: ['肱二头肌', '三角肌后束'], note: '坐姿划船' },
  fly: { title: '胸部', primary: ['chest'], secondary: ['shoulders'], main: ['胸大肌'], assist: ['三角肌前束'], note: '蝴蝶机夹胸' },
  chest: { title: '胸部', primary: ['chest'], secondary: ['shoulders', 'triceps'], main: ['胸大肌'], assist: ['三角肌前束', '肱三头肌'], note: '坐式胸肌推举' },
  shoulder: { title: '肩部', primary: ['shoulders'], secondary: ['triceps'], main: ['三角肌前束 / 中束'], assist: ['肱三头肌'], note: '坐姿肩推' },
  abs: { title: '核心', primary: ['abs'], secondary: ['obliques'], main: ['腹直肌'], assist: ['腹斜肌群'], note: '坐式腹肌训练' },
  legs: { title: '腿部', primary: ['quads', 'adductors'], secondary: [], main: ['股四头肌', '大腿内收肌群'], assist: [], note: '大腿伸展 / 大腿内侧' },
  cardio: { title: '下肢', primary: ['quads', 'glutes', 'calves'], secondary: ['hamstrings'], main: ['大腿前侧', '臀部', '小腿'], assist: ['大腿后侧'], note: '步行 / 爬坡时参与的区域' },
};

const defaultViews = { pull: 'back', row: 'back', fly: 'front', chest: 'front', shoulder: 'front', abs: 'front', legs: 'front', cardio: 'back' };
const regionEnglish = { back: 'BACK', chest: 'CHEST', shoulders: 'SHOULDERS', core: 'CORE', legs: 'LEGS', cardio: 'ENDURANCE' };

function figure(view, profile, visible) {
  const parts = regions[view].filter(region => profile.primary.includes(region.group) || profile.secondary.includes(region.group));
  // Inner-thigh region is drawn separately because the upstream mask set has no adductors.
  if (view === 'front' && profile.primary.includes('adductors')) parts.push({ group: 'adductors', offset: [0, 0], d: 'M170 261Q175 262 178 272L176 294L170 319L164 337L163 316L167 284ZM191 261Q186 262 183 272L185 294L191 319L197 337L198 316L194 284Z' });
  const masks = parts.map(({ group, d, offset }) => `<path class="muscle ${profile.primary.includes(group) ? 'is-primary' : 'is-secondary'}" data-muscle="${group}" d="${d}" transform="translate(${offset.join(' ')})"/>`).join('');
  return `<div class="anatomy-view" data-body-view="${view}" ${visible ? '' : 'hidden'}><svg class="body-figure" viewBox="26 0 309 541.86667" role="img" aria-label="${view === 'front' ? '正面' : '背面'}人体肌群示意"><image class="anatomy-base" href="anatomy/${view}.webp" x="0" y="0" width="361.15625" height="541.86667"/><g class="muscle-overlays">${masks}</g></svg></div>`;
}

export function musclePanel(station) {
  const profile = profiles[station.id];
  if (!profile) return '';
  const view = defaultViews[station.id];
  return `<aside class="muscle-panel" aria-labelledby="muscle-title"><div class="anatomy-topline"><span>人体肌群</span><span class="anatomy-edition">ANATOMY / ${String(Object.keys(profiles).indexOf(station.id) + 1).padStart(2, '0')}</span></div><div class="anatomy-title"><div><h3 id="muscle-title">${profile.title}<span>训练区域</span></h3></div><div class="body-view-switch" role="group" aria-label="切换人体视图"><button type="button" data-anatomy-view="front" aria-pressed="${view === 'front'}">正面</button><button type="button" data-anatomy-view="back" aria-pressed="${view === 'back'}">背面</button></div></div><div class="anatomy-stage"><span class="anatomy-watermark" aria-hidden="true">${regionEnglish[station.zone]}</span><div class="anatomy-orbit" aria-hidden="true"></div>${figure('front', profile, view === 'front')}${figure('back', profile, view === 'back')}<div class="anatomy-ground" aria-hidden="true"></div></div><div class="muscle-key"><div><i class="primary-dot"></i><span>主要训练</span><strong>${profile.main.join(' · ')}</strong></div>${profile.assist.length ? `<div><i class="secondary-dot"></i><span>辅助参与</span><strong>${profile.assist.join(' · ')}</strong></div>` : ''}</div><p class="anatomy-note">${profile.note}<span>肌群区域示意</span></p></aside>`;
}
