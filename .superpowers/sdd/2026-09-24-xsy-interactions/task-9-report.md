# Task 9 report

Implemented the horizontal, whole-screen curling match mode and literal peach target.

## Behavior

- The fixed logical game lane is 4:1, rendered left-to-right at a uniform scale. The delivery stone starts at the right side and travels toward the house on the left.
- Practice mode preserves its single-stone scoring and controls. Score mode adds bounded red/blue setup counts, collision-free static stones, re-layout, and World Curling end scoring before and after the delivered red stone settles.
- The slap target now contains the literal `🍑`; the former CSS pseudo-element peach was removed.
- Browser checks assert the literal emoji, horizontal 4:1 game-lane ratio, whole-lane containment in the dialog viewport, no dialog overflow, responsive stone containment, score-mode setup/re-layout, and reduced-motion result text.

## TDD evidence

The initial focused run was RED as required:

```text
SyntaxError: The requested module '../xsy/interactions.mjs' does not provide an export named 'CURLING_SHEET_RATIO'
```

After implementing the pure scoring/layout model, `node --test tests/xsy-interactions.test.mjs` passed 20/20. The final combined Node run passed 26/26.

The screen-fit revision also followed RED→GREEN: the test imported the absent `CURLING_GAME_LANE_RATIO` export and failed, then passed after the 4:1 game-lane model replaced the former long-sheet coordinates.

## Verification

- `node --test tests/xsy.test.mjs tests/xsy-interactions.test.mjs` — 26 passed.
- Before the 4:1 revision, the browser regression harness completed at 390px with reduced motion and 1440px normal motion with 0 failures. For the 4:1 revision, the desktop Safari harness reached five passing checks (including the 4:1 lane, containment, no-overflow, score mode, and practice throw check) before its automation tab was replaced by user navigation; the remaining desktop/mobile harness passes need rerunning in an available isolated browser session.
- `git diff --check -- xsy tests docs/superpowers` — passed.
- `python -m pytest -q` — known unrelated baseline failure: `tests/test_site.py::test_shared_site_styles_are_loaded_on_primary_pages` expects `assets/site.css` in a primary page. It is outside the xsy changes; 6 other Python tests passed.

## Self-review

Checked mode changes reset timer/frame state through the existing dialog cleanup, count inputs clamp in the pure model, static setup stones do not participate in physics, and the horizontal letterbox sheet keeps its delivery/static stones inside the visible surface at mobile size.
