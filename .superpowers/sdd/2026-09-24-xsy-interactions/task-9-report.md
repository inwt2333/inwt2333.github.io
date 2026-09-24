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

After implementing the pure scoring/layout model, `node --test tests/xsy-interactions.test.mjs` passed 20/20. The current combined Node run passes 33/33.

The vertical/collision revision also followed RED→GREEN: missing collision and multi-stone-match exports caused the new focused tests to fail; the green model then proved input direction, collision momentum transfer, and settling of every stone.

The follow-up all-stones-settle test was RED because `advanceCurlingMatch` was missing. Its GREEN model advances the delivered and setup stones together, resolves collision before and after motion, and reports finished only when every velocity is below the shared stop threshold and no overlap remains. The application uses that model for normal animation and reduced motion; its 15-second safety boundary settles the full match before it scores.

Review fix round 1 also began with RED: missing `forceSettleCurlingMatch` stopped the focused suite. The green revision resolves every unordered stone pair iteratively (including setup-to-setup chains), only blanks a closest-distance tie when the tied stones are opposing teams, and returns the actual unfinished state at a capped settle. The explicit safety settle zeroes every velocity and separates all pairs before it reports completion. Browser coverage now dispatches an actual PointerEvent pull for normal motion and waits with a bounded poll for the after-score/collision result; reduced motion retains the full-settle assertions.

## Verification

- `node --test tests/xsy.test.mjs tests/xsy-interactions.test.mjs` — 33 passed.
- Browser evidence: controller verification completed 390px reduced motion at 7/7 passes. The initial 1440px normal failure was a harness timeout: its real PointerEvent branch polled only 5 seconds although app safety settlement may take 15 seconds. The harness now polls for 16 seconds and closes/cleans the curling dialog in `finally` on every outcome, preventing cascading checks. The final reruns could not be started here because Safari was under direct user interaction and no isolated IAB surface was available; rerun 1440px normal and 390px reduced to record the final post-fix result.
- `git diff --check -- xsy tests docs/superpowers` — passed.
- `python -m pytest -q` — known unrelated baseline failure: `tests/test_site.py::test_shared_site_styles_are_loaded_on_primary_pages` expects `assets/site.css` in a primary page. It is outside the xsy changes; 6 other Python tests passed.

## Self-review

Checked mode changes reset timer/frame state through the existing dialog cleanup, count inputs clamp in the pure model, setup stones participate in the multi-body physics after contact, and the vertical game lane keeps delivery/setup stones inside the visible mobile surface.
