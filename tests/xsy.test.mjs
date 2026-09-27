import test from 'node:test';
import assert from 'node:assert/strict';

import * as xsy from '../xsy/app.mjs';
import { absurdScenes, incidentAt } from '../xsy/chaos.mjs';

const { favorites, makePageModel } = xsy;

test('incident broadcasts form a full cycle of distinct crossovers', () => {
  assert.equal(absurdScenes.length, 7);
  assert.equal(new Set(absurdScenes.map(({ id }) => id)).size, 7);
  assert.equal(incidentAt(0).number, 1);
  assert.equal(incidentAt(7).id, absurdScenes[0].id);
  assert.equal(incidentAt(8).id, absurdScenes[1].id);
  for (const scene of absurdScenes) {
    assert.ok(scene.title && scene.setup && scene.punchline);
    assert.equal(scene.actors.length, 2);
  }
});

test('the title count follows the number of favorite entries', () => {
  const model = makePageModel([
    { id: 'one', name: '第一样' },
    { id: 'two', name: '第二样' },
    { id: 'three', name: '第三样' },
  ]);

  assert.equal(model.count, 3);
  assert.equal(model.title, 'xsy最喜欢的3样东西');
});

test('the initial collection contains every requested favorite exactly once', () => {
  assert.equal(favorites.length, 12);
  assert.deepEqual(
    favorites.map(({ name }) => name),
    [
      '严格',
      '金龟子',
      '石头壶',
      '韩岳成的屁股',
      '马楠',
      'yxy',
      '校园巴士',
      '二餐教工餐厅',
      'ヨルシカ',
      '日麻',
      '国际象棋',
      '心理咨询',
    ],
  );
  assert.equal(new Set(favorites.map(({ id }) => id)).size, favorites.length);
});

test('the composure report declines with interaction and stops at zero', () => {
  assert.deepEqual(xsy.composureReport(0), { percent: 100, verdict: '目前仍在硬绷' });
  assert.deepEqual(xsy.composureReport(1), { percent: 87, verdict: '嘴角已申请离岗' });
  assert.deepEqual(xsy.composureReport(8), { percent: 0, verdict: '绷住这件事已被撤稿' });
  assert.deepEqual(xsy.composureReport(100), { percent: 0, verdict: '绷住这件事已被撤稿' });
});

test('public references use verified https destinations', () => {
  const linked = Object.fromEntries(
    favorites
      .filter(({ links }) => links?.length)
      .map(({ id, links }) => [id, links]),
  );

  assert.deepEqual(Object.keys(linked), [
    'yan-ge',
    'chafer',
    'stone-kettle',
    'hanyuecheng-butt',
    'ma-nan',
    'campus-bus',
    'yorushika',
    'mahjong',
  ]);
  assert.equal(linked['yan-ge'][0].url, 'https://grahamyan.github.io/');
  assert.equal(linked['ma-nan'][0].url, 'https://ma.sjtu.edu.cn/info/1196/3174.htm');
  assert.equal(linked['campus-bus'][0].url, 'https://campuslife.sjtu.edu.cn/ui/bus');
  assert.equal(linked.yorushika[0].url, 'https://music.163.com/#/artist?id=12390232');
  assert.deepEqual(linked.mahjong, [
    { label: 'xsy 自制日麻资料馆', url: 'https://shiyixiao05.github.io/pairi-riichi-mahjong/#resources' },
  ]);

  for (const links of Object.values(linked)) {
    for (const link of links) {
      assert.ok(link.url === '/' || /^https:\/\//.test(link.url));
      assert.ok(link.label.length > 0);
    }
  }
});

test('new profile and timetable destinations are exact', () => {
  const byId = Object.fromEntries(favorites.map((item) => [item.id, item]));

  assert.deepEqual(byId['hanyuecheng-butt'].links, [
    { label: '韩岳成主页', url: '/' },
  ]);
  assert.deepEqual(byId['campus-bus'].links, [
    { label: '校园巴士时刻表', url: 'https://campuslife.sjtu.edu.cn/ui/bus' },
  ]);
  assert.equal(byId['ma-nan'].links[0].label, '马楠交大主页');
});

test('interactive cards expose the requested secondary actions', () => {
  const byId = Object.fromEntries(favorites.map((item) => [item.id, item]));

  assert.deepEqual(byId['stone-kettle'].extras, [{ label: '投一壶', action: 'curling' }]);
  assert.equal(byId['stone-kettle'].action, undefined);
  assert.deepEqual(byId['hanyuecheng-butt'].extras, [{ label: '打屁股', action: 'slap' }]);
  assert.deepEqual(byId.yorushika.extras, [{ label: '翻开一句歌词', action: 'lyrics' }]);
});

test('every favorite cycles through twelve unique interaction messages', () => {
  assert.ok(xsy.interactionOutputs);

  for (const { effect } of favorites) {
    const messages = xsy.interactionOutputs[effect];
    assert.equal(messages.length, 12, `${effect} should have twelve messages`);
    assert.equal(new Set(messages).size, 12, `${effect} messages should be unique`);
  }
});
