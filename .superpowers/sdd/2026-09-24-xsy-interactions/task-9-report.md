# Task 9 report

Implemented the vertical, whole-screen curling match mode and literal peach target.

## Behavior

- The fixed logical game lane is 3:5, uniformly rendered with a lower delivery point and upper house. The player pulls down to launch upward; keyboard direction maps directly to signed horizontal velocity.
- Practice mode preserves its single-stone scoring and controls. Score mode adds bounded red/blue setup counts, collision-free initial layouts near the house and guard area, re-layout, real equal-mass stone collisions, and World Curling end scoring before and after all stones settle.
- The slap target now contains the literal `🍑`; the former CSS pseudo-element peach was removed.
- Browser checks assert the literal emoji, vertical 3:5 game-lane ratio, whole-lane containment in the dialog viewport, no dialog overflow, identical rendered stone sizes, a house at least four stone diameters wide, lower-start clearance, score-mode collision movement, and reduced-motion settling.

## TDD evidence

The initial focused run was RED as required:

```text
SyntaxError: The requested module '../xsy/interactions.mjs' does not provide an export named 'CURLING_SHEET_RATIO'
```

After implementing the pure scoring/layout model, `node --test tests/xsy-interactions.test.mjs` passed 20/20. The final combined Node run passed 26/26.

The vertical/collision revision also followed RED→GREEN: missing collision and multi-stone-match exports caused the new focused tests to fail; the green model then proved input direction, collision momentum transfer, and settling of every stone.

The follow-up all-stones-settle test was RED because `advanceCurlingMatch` was missing. Its GREEN model advances the delivered and setup stones together, resolves collision before and after motion, and reports finished only when every velocity is below the shared stop threshold and no overlap remains. The application uses that model for normal animation and reduced motion; its 15-second safety boundary settles the full match before it scores.

## Verification

- `node --test tests/xsy.test.mjs tests/xsy-interactions.test.mjs` — 26 passed.
- Desktop browser regression was rerun after the vertical revision. It found and helped fix a real size-source defect: the delivered stone still used its 24px CSS fallback while setup stones measured 15.52px. Both now read the same lane-level `--curling-stone-diameter`, assigned as soon as the lane is measured. A final isolated IAB run was unavailable in this environment and the final Safari reload had not completed before handoff; rerun 1440px normal and 390px reduced motion in the browser harness to close this remaining UI verification gap.
- `git diff --check -- xsy tests docs/superpowers` — passed.
- `python -m pytest -q` — known unrelated baseline failure: `tests/test_site.py::test_shared_site_styles_are_loaded_on_primary_pages` expects `assets/site.css` in a primary page. It is outside the xsy changes; 6 other Python tests passed.

## Self-review

Checked mode changes reset timer/frame state through the existing dialog cleanup, count inputs clamp in the pure model, static setup stones do not participate in physics, and the horizontal letterbox sheet keeps its delivery/static stones inside the visible surface at mobile size.
