# XSY Interactive Exhibits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add verified links, a stateful Yorushika mode with short bilingual lyric fragments, a beetle swarm, a curling game, and a timed slap game to the existing `/xsy/` page.

**Architecture:** Keep collection data and page mounting in `xsy/app.mjs`, move reusable pure interaction state and scoring into `xsy/interactions.mjs`, and use one accessible dialog shell in `xsy/index.html` for lyrics and both games. DOM-specific controllers in `app.mjs` own event listeners, timers, and animation frames and expose one cleanup path through the dialog controller.

**Tech Stack:** Static HTML, CSS, browser-native JavaScript modules, Pointer Events, Node built-in test runner, pytest, Codex in-app browser for visual QA.

**Spec:** `docs/superpowers/specs/2026-09-24-xsy-interactions-design.md`

## Global Constraints

- Keep `/xsy/` unlinked from the public site and excluded from `sitemap.xml`.
- Add no framework, build step, backend, leaderboard, persistence, audio, or third-party embed.
- Open external links in a new tab with `rel="noreferrer"`; use `/` for the internal homepage link.
- Use Pointer Events so mouse, touch, and pen share one interaction path.
- Every dialog controller must cancel timers, animation frames, and temporary listeners during cleanup.
- Lyric content is limited to one very short Japanese fragment per song, a new Chinese paraphrase, the song name, and an official work link; no stanza or third-party translation is included.
- Respect `prefers-reduced-motion: reduce` for cross-screen beetles and game shake effects.

---

### Task 1: Link Data and Action Metadata

**Files:**
- Modify: `xsy/app.mjs`
- Modify: `tests/xsy.test.mjs`

**Interfaces:**
- Consumes: existing `favorites: Favorite[]` and `cardMarkup(item, index)`.
- Produces: link labels and URLs in `favorites`; optional `extras: Array<{ label: string, action: "lyrics" | "curling" | "slap" }>` rendered as buttons with `data-extra-action`.

- [ ] **Step 1: Write failing data assertions**

```js
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
  assert.deepEqual(byId['hanyuecheng-butt'].extras, [{ label: '打屁股', action: 'slap' }]);
  assert.deepEqual(byId.yorushika.extras, [{ label: '翻开一句歌词', action: 'lyrics' }]);
});
```

- [ ] **Step 2: Run the tests and verify red**

Run: `node --test tests/xsy.test.mjs`

Expected: FAIL because the new links, labels, and `extras` data are absent.

- [ ] **Step 3: Add the exact data and render secondary buttons**

Add the three link changes above. Render each extra action next to the existing resource links:

```js
const extras = item.extras?.map(({ label, action }) =>
  `<button class="favorite__extra" type="button" data-extra-action="${escapeHtml(action)}">${escapeHtml(label)}</button>`
).join('') ?? '';
```

Place `extras` inside a `.favorite__resources` container with the existing links so all non-primary actions occupy one consistent row.

- [ ] **Step 4: Run the focused tests and verify green**

Run: `node --test tests/xsy.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit the link and metadata change**

```bash
git add xsy/app.mjs tests/xsy.test.mjs
git commit -m "feat: add xsy exhibit links and actions"
```

### Task 2: Pure Interaction Models

**Files:**
- Create: `xsy/interactions.mjs`
- Create: `tests/xsy-interactions.test.mjs`

**Interfaces:**
- Produces: `LYRIC_FRAGMENTS`, `MAX_BEETLES`, `nextNightState(isActive)`, `scoreCurling(distanceRatio)`, `createSlapGame(durationMs, startedAt)`, `registerSlapHit(state, now)`, `registerSlapMiss(state, now)`, `finishSlapGame(state, now)`, and `availableBeetleSlots(activeCount, requestedCount)`.
- Types: slap state is `{ score: number, combo: number, bestCombo: number, startedAt: number, endsAt: number, finished: boolean }`.

- [ ] **Step 1: Write failing tests for night state and lyric data**

```js
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
```

- [ ] **Step 2: Write failing tests for game models**

```js
test('curling score decreases across ring boundaries', () => {
  assert.equal(scoreCurling(0), 3);
  assert.equal(scoreCurling(0.32), 3);
  assert.equal(scoreCurling(0.33), 2);
  assert.equal(scoreCurling(0.66), 1);
  assert.equal(scoreCurling(1.01), 0);
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

test('beetle slots enforce the global cap', () => {
  assert.equal(availableBeetleSlots(0, 7), 7);
  assert.equal(availableBeetleSlots(MAX_BEETLES - 2, 7), 2);
  assert.equal(availableBeetleSlots(MAX_BEETLES, 4), 0);
});
```

- [ ] **Step 3: Run model tests and verify red**

Run: `node --test tests/xsy-interactions.test.mjs`

Expected: FAIL because `xsy/interactions.mjs` does not exist.

- [ ] **Step 4: Implement pure models and curated lyric records**

Implement boundary-only functions with no DOM access. Use five short fragments drawn from the approved titles/phrases: `言って`, `春泥棒`, `忘れてください`, `君に晴れ`, and `だから僕は音楽を辞めた`. Pair each with an original concise Chinese paraphrase and `https://yorushika.com/discography/`, the official catalog containing the works. Set `MAX_BEETLES = 18`.

```js
export function nextNightState(isActive) {
  const active = !isActive;
  return {
    active,
    label: active ? '退出夜鹿时间' : '进入夜鹿时间',
    ariaPressed: String(active),
  };
}

export function scoreCurling(distanceRatio) {
  if (distanceRatio <= 0.32) return 3;
  if (distanceRatio <= 0.65) return 2;
  if (distanceRatio <= 1) return 1;
  return 0;
}
```

- [ ] **Step 5: Run model tests and verify green**

Run: `node --test tests/xsy-interactions.test.mjs`

Expected: all tests PASS.

- [ ] **Step 6: Commit the pure models**

```bash
git add xsy/interactions.mjs tests/xsy-interactions.test.mjs
git commit -m "feat: add xsy interaction models"
```

### Task 3: Accessible Shared Dialog

**Files:**
- Modify: `xsy/index.html`
- Modify: `xsy/app.mjs`
- Modify: `xsy/style.css`
- Modify: `tests/test_site.py`

**Interfaces:**
- Produces: static `#exhibit-dialog`.
- Produces: `openDialog({ title, kind, trigger, render })`, where `title` and `kind` are strings, `trigger` is the opening `HTMLElement`, and `render(mount)` receives the dialog content element and returns an optional cleanup function.
- Produces: `closeDialog({ restoreFocus = true } = {})`; the render cleanup is called exactly once before dialog content is cleared.

- [ ] **Step 1: Add failing structure assertions**

```python
def test_xsy_has_one_accessible_exhibit_dialog():
    html = (ROOT / "xsy" / "index.html").read_text(encoding="utf-8")
    assert 'id="exhibit-dialog"' in html
    assert 'role="dialog"' in html
    assert 'aria-modal="true"' in html
    assert 'id="exhibit-dialog-title"' in html
```

- [ ] **Step 2: Run the focused pytest and verify red**

Run: `python -m pytest tests/test_site.py::test_xsy_has_one_accessible_exhibit_dialog -q`

Expected: FAIL because the dialog shell is absent.

- [ ] **Step 3: Add dialog markup, controller, and styles**

Add one hidden dialog shell before `</body>` with a backdrop, close icon button, title, and content mount. Implement `openDialog` to save the trigger and `kind`, assign the title, call `render(mount)`, save its cleanup return value, lock body scroll, attach one Escape listener, and show the dialog. Implement `closeDialog` to call cleanup, clear content, unlock scrolling, hide the dialog, detach Escape, and restore trigger focus when requested.

The dialog must use `max-height: min(760px, calc(100svh - 32px))`, internal overflow, an 8px-or-less radius, and a stable close button position. At 390px, use `width: calc(100% - 24px)`.

- [ ] **Step 4: Run the focused and full tests**

Run: `python -m pytest tests/test_site.py -q && node --test tests/xsy.test.mjs tests/xsy-interactions.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit the shared dialog**

```bash
git add xsy/index.html xsy/app.mjs xsy/style.css tests/test_site.py
git commit -m "feat: add accessible xsy exhibit dialog"
```

### Task 4: Night Toggle and Lyric Viewer

**Files:**
- Modify: `xsy/app.mjs`
- Modify: `xsy/style.css`
- Modify: `tests/xsy-interactions.test.mjs`

**Interfaces:**
- Consumes: `nextNightState`, `LYRIC_FRAGMENTS`, `openDialog`, and `closeDialog`.
- Produces in `interactions.mjs`: `nextIndex(index, length)` with modulo wraparound.
- Produces: `setNightMode(active, button)` and `openLyrics(trigger)` DOM controllers.

- [ ] **Step 1: Extend failing state tests for wraparound**

```js
test('lyric selection wraps only after the last fragment', () => {
  assert.equal(nextIndex(0, LYRIC_FRAGMENTS.length), 1);
  assert.equal(nextIndex(LYRIC_FRAGMENTS.length - 1, LYRIC_FRAGMENTS.length), 0);
});
```

- [ ] **Step 2: Run the focused test and verify red**

Run: `node --test tests/xsy-interactions.test.mjs`

Expected: FAIL because `nextIndex` is absent.

- [ ] **Step 3: Implement the stateful button and lyric viewer**

Import the pure helpers into `app.mjs`. `setNightMode` must toggle `body.night-shift`, update text content, and set `aria-pressed`. If it disables night mode while the current dialog kind is `lyrics`, call `closeDialog()`.

`openLyrics` renders song name, Japanese fragment, Chinese paraphrase, an official work link, and a “换一句” button. Keep `lyricIndex` in module state and advance with `nextIndex`.

- [ ] **Step 4: Verify in the browser**

At desktop and 390px viewports:

1. Click “进入夜鹿时间”; verify the label becomes “退出夜鹿时间”, `aria-pressed="true"`, and the dark palette is legible.
2. Open lyrics; click “换一句” through all records; verify wraparound.
3. Click “退出夜鹿时间”; verify the dialog closes and the label/state reset.
4. Press Escape; verify focus returns to “翻开一句歌词”.

- [ ] **Step 5: Run all automated tests and commit**

```bash
python -m pytest -q
node --test tests/xsy.test.mjs tests/xsy-interactions.test.mjs
git add xsy/app.mjs xsy/style.css xsy/interactions.mjs tests/xsy-interactions.test.mjs
git commit -m "feat: add xsy night lyrics viewer"
```

### Task 5: Clickable Beetle Swarm

**Files:**
- Modify: `xsy/app.mjs`
- Modify: `xsy/style.css`
- Modify: `tests/xsy-interactions.test.mjs`

**Interfaces:**
- Consumes: `MAX_BEETLES` and `availableBeetleSlots(activeCount, requestedCount)`.
- Produces: `spawnBeetleSwarm(card)`, whose generated buttons use class `.flying-beetle` and remove themselves on click or animation completion.

- [ ] **Step 1: Add boundary tests for negative and oversized counts**

```js
test('beetle slot calculation clamps invalid requests', () => {
  assert.equal(availableBeetleSlots(-2, 4), 4);
  assert.equal(availableBeetleSlots(0, 99), MAX_BEETLES);
  assert.equal(availableBeetleSlots(MAX_BEETLES + 3, 2), 0);
});
```

- [ ] **Step 2: Run the focused test and verify red**

Run: `node --test tests/xsy-interactions.test.mjs`

Expected: FAIL on at least one unclamped boundary.

- [ ] **Step 3: Clamp the model and implement the swarm**

Generate 4 to 7 `<button type="button" aria-label="驱赶金龟子">🪲</button>` elements with CSS custom properties for start/end positions, duration, delay, and rotation. Count active `.flying-beetle` nodes before spawning. A click replaces the icon with “啪”, sets disabled, and removes it after the exit animation. Animation completion removes untouched nodes.

For reduced motion, add one `.beetle-static` element inside the card and remove it after 800ms without crossing the viewport.

- [ ] **Step 4: Browser-verify swarm lifecycle**

Click “放虫出巡” repeatedly. Confirm no more than 18 beetles coexist, beetles can be clicked, and all nodes disappear after animations. Emulate reduced motion and confirm no cross-screen flight.

- [ ] **Step 5: Run tests and commit**

```bash
node --test tests/xsy.test.mjs tests/xsy-interactions.test.mjs
git add xsy/app.mjs xsy/style.css xsy/interactions.mjs tests/xsy-interactions.test.mjs
git commit -m "feat: add clickable beetle swarm"
```

### Task 6: Curling Mini-Game

**Files:**
- Modify: `xsy/app.mjs`
- Modify: `xsy/style.css`
- Modify: `tests/xsy-interactions.test.mjs`

**Interfaces:**
- Consumes: `scoreCurling(distanceRatio)`, `curlingResult(score)`, and shared dialog controller.
- Produces in `interactions.mjs`: `curlingResult(score)` for scores 0 through 3.
- Produces: `openCurlingGame(trigger)` with cleanup that cancels its current animation frame and pointer listeners.

- [ ] **Step 1: Add score-label tests**

```js
test('curling result copy matches each score', () => {
  assert.equal(curlingResult(3), '正中圆心，石头壶封神！');
  assert.equal(curlingResult(2), '稳稳进营，塑料壶沉默了。');
  assert.equal(curlingResult(1), '擦边得分，冰面替你圆场。');
  assert.equal(curlingResult(0), '壶很自由，大本营很孤独。');
});
```

- [ ] **Step 2: Run the focused test and verify red**

Run: `node --test tests/xsy-interactions.test.mjs`

Expected: FAIL because `curlingResult` is absent.

- [ ] **Step 3: Implement the ice lane and Pointer Events**

Render a fixed-aspect-ratio lane with stable start and target geometry. On `pointerdown`, capture the pointer and store the start coordinate. On `pointermove`, clamp a pull vector to the lower 35% of the lane and update an aim line. On `pointerup`, convert the vector into velocity, then animate position with friction `0.965` per frame and a small lateral curl. Stop when speed is below `0.08` or after 4 seconds.

Calculate the final center distance from the house radius, call `scoreCurling`, show `curlingResult`, and enable “再投一壶”. Cleanup releases pointer capture when present, cancels the animation frame, and removes listeners.

- [ ] **Step 4: Browser-verify complete rounds**

Play at least three throws on desktop and three on 390px mobile emulation. Confirm the stone remains inside the lane, every round terminates, scores display, reset works, and closing mid-flight stops movement.

- [ ] **Step 5: Run tests and commit**

```bash
python -m pytest -q
node --test tests/xsy.test.mjs tests/xsy-interactions.test.mjs
git add xsy/app.mjs xsy/style.css xsy/interactions.mjs tests/xsy-interactions.test.mjs
git commit -m "feat: add xsy curling game"
```

### Task 7: Timed Slap Mini-Game

**Files:**
- Modify: `xsy/app.mjs`
- Modify: `xsy/style.css`
- Modify: `tests/xsy-interactions.test.mjs`

**Interfaces:**
- Consumes: `createSlapGame`, `registerSlapHit`, `registerSlapMiss`, `finishSlapGame`, `slapTitle`, and shared dialog controller.
- Produces in `interactions.mjs`: `slapTitle(score)` with thresholds at 0, 8, and 20 hits.
- Produces: `openSlapGame(trigger)` with cleanup that clears its countdown interval and target listener.

- [ ] **Step 1: Add combo and result-title tests**

```js
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
```

- [ ] **Step 2: Run the focused test and verify red**

Run: `node --test tests/xsy-interactions.test.mjs`

Expected: FAIL because combo progression or `slapTitle` is absent.

- [ ] **Step 3: Implement the timed target game**

Render score, combo, a 10.0-second countdown, target area, and peach button. Start on the first target click. Each hit updates state, moves the target to clamped random percentages that keep the whole target visible, creates a short “啪” marker, and refreshes score text. A target-area miss sets combo to zero without changing score.

Use a 100ms interval only for display; derive remaining time from `performance.now()` rather than decrementing a counter. At zero, disable the target, show `slapTitle(score)`, and reveal “再来一局”. Cleanup clears the interval and listeners. Under reduced motion, remove area shake but keep target relocation.

- [ ] **Step 4: Browser-verify timing and cleanup**

Complete one game, restart, and close a second game before time expires. Confirm the closed game produces no later DOM updates or console errors. Repeat at 390px and verify the target never clips outside its area.

- [ ] **Step 5: Run tests and commit**

```bash
python -m pytest -q
node --test tests/xsy.test.mjs tests/xsy-interactions.test.mjs
git add xsy/app.mjs xsy/style.css xsy/interactions.mjs tests/xsy-interactions.test.mjs
git commit -m "feat: add xsy slap game"
```

### Task 8: Integrated Accessibility and Visual Verification

**Files:**
- Verify: `xsy/index.html`
- Verify: `xsy/app.mjs`
- Verify: `xsy/interactions.mjs`
- Verify: `xsy/style.css`
- Verify: `tests/xsy.test.mjs`
- Verify: `tests/xsy-interactions.test.mjs`
- Verify: `tests/test_site.py`

**Interfaces:**
- Consumes: the complete page and all prior task interfaces.
- Produces: a verified `/xsy/` experience with no remaining required changes.

- [ ] **Step 1: Run all automated tests**

```bash
python -m pytest -q
node --test tests/xsy.test.mjs tests/xsy-interactions.test.mjs
```

Expected: zero failures.

- [ ] **Step 2: Run static and HTTP checks**

```bash
git diff --check -- xsy tests docs/superpowers
curl -fsS http://127.0.0.1:4173/xsy/ >/dev/null
curl -fsS http://127.0.0.1:4173/xsy/app.mjs >/dev/null
curl -fsS http://127.0.0.1:4173/xsy/interactions.mjs >/dev/null
curl -fsS http://127.0.0.1:4173/xsy/style.css >/dev/null
```

Expected: every command exits 0.

- [ ] **Step 3: Inspect desktop and mobile layouts**

At 1440x900 and 390x844, capture and inspect the page top, all affected cards, every dialog, both game end states, and night mode. Verify no text overlaps, no horizontal overflow, stable game geometry, legible focus states, and no console warnings or errors.

- [ ] **Step 4: Perform keyboard and reduced-motion checks**

Use Tab, Enter/Space, and Escape to exercise all triggers and close every dialog. Verify focus restoration. Enable reduced motion and verify static beetle feedback and no strong shake.

- [ ] **Step 5: Commit any verification fixes separately**

If verification required changes, add a failing regression test first, implement the smallest fix, rerun the complete checks, then commit only those files:

```bash
git add xsy tests
git commit -m "fix: polish xsy interactive exhibits"
```

### Task 9: Standard-Proportion Curling Match Mode and Peach Target

**Files:**
- Modify: `xsy/interactions.mjs`
- Modify: `xsy/app.mjs`
- Modify: `xsy/style.css`
- Modify: `tests/xsy-interactions.test.mjs`
- Modify: `tests/xsy-browser.mjs`

**Interfaces:**
- Preserves the existing practice mode, Pointer Events, keyboard controls, and dialog cleanup.
- Produces pure `scoreCurlingEnd(stones)` behavior using World Curling scoring: only stones in or touching the house count, and the closest team scores one point for each stone closer than the opponent's closest stone.
- Produces configurable red/blue setup counts, deterministic legal non-overlapping layouts when supplied a random source, and before/after score text.
- Produces a fixed 4:1 screen-fit logical game-lane ratio that is only scaled, never stretched; the horizontal delivery origin leaves a useful pull range.

- [ ] **Step 1: Add pure scoring, layout, and sheet-ratio tests**

Add hand-derived fixtures that cover a blank end, multiple points for one team, stones outside the house, an opponent stone splitting the count, clamped setup counts, non-overlap, and a game lane whose rendered dimensions preserve `4 / 1` across desktop and mobile widths. Add a browser assertion that the slap target exposes the literal `🍑`.

- [ ] **Step 2: Run focused tests and verify red**

Run: `node --test tests/xsy-interactions.test.mjs`

Expected: FAIL because match scoring/layout exports do not exist.

- [ ] **Step 3: Implement match mode and peach target**

Add “练习模式 / 比分模式” controls. In score mode, let the user set existing red stones from 0–7 and blue stones from 0–8, regenerate a collision-free setup, show the score before the throw, and add the delivered red stone to compute the score after it settles. Existing setup stones remain static in this scoring-focused mode. Keep practice score/copy unchanged.

Render the sheet using one fixed logical coordinate system and scale it uniformly. Keep the house, stones, pointer coordinate conversion, and keyboard velocity in that coordinate system. Move the delivery origin far enough above the lower boundary to allow a useful pull range. Replace the slap target's CSS-drawn symbol with the literal peach emoji `🍑` and remove obsolete pseudo-element drawing.

- [ ] **Step 4: Browser-verify both modes**

At desktop and 390 px widths, confirm the sheet ratio does not change, pointer/keyboard throws terminate, setup counts can be changed, before/after scoring updates, reset/re-layout works, the start stone is visibly separated from the lower edge, and the peach emoji is centered and keyboard-operable. Repeat the relevant checks with reduced motion and night mode.

- [ ] **Step 5: Run tests and commit**

```bash
node --test tests/xsy.test.mjs tests/xsy-interactions.test.mjs
python -m pytest -q
git diff --check -- xsy tests docs/superpowers
git add xsy tests docs/superpowers .superpowers/sdd/2026-09-24-xsy-interactions
git commit -m "feat: expand xsy curling match mode"
```
