# Task 9 report

Implemented the horizontal, whole-sheet curling match mode and literal peach target.

## Behavior

- The fixed logical sheet is 45.72 m × 4.75 m, rendered left-to-right at a uniform scale. The delivery stone starts at the right side and travels toward the house on the left.
- Practice mode preserves its single-stone scoring and controls. Score mode adds bounded red/blue setup counts, collision-free static stones, re-layout, and World Curling end scoring before and after the delivered red stone settles.
- The slap target now contains the literal `🍑`; the former CSS pseudo-element peach was removed.
- Browser checks assert the literal emoji, horizontal sheet ratio, whole-sheet containment in the dialog viewport, no dialog overflow, responsive stone containment, score-mode setup/re-layout, and reduced-motion result text.

## TDD evidence

The initial focused run was RED as required:

```text
SyntaxError: The requested module '../xsy/interactions.mjs' does not provide an export named 'CURLING_SHEET_RATIO'
```

After implementing the pure scoring/layout model, `node --test tests/xsy-interactions.test.mjs` passed 20/20. The final combined Node run passed 26/26.

## Verification

- `node --test tests/xsy.test.mjs tests/xsy-interactions.test.mjs` — 26 passed.
- Browser regression harness — 0 failures at 390px with reduced motion and 1440px normal motion; each run also enables night mode for its existing interaction checks. The horizontal sheet containment/no-overflow assertions passed in both.
- `git diff --check -- xsy tests docs/superpowers` — passed.
- `python -m pytest -q` — known unrelated baseline failure: `tests/test_site.py::test_shared_site_styles_are_loaded_on_primary_pages` expects `assets/site.css` in a primary page. It is outside the xsy changes; 6 other Python tests passed.

## Self-review

Checked mode changes reset timer/frame state through the existing dialog cleanup, count inputs clamp in the pure model, static setup stones do not participate in physics, and the horizontal letterbox sheet keeps its delivery/static stones inside the visible surface at mobile size.
