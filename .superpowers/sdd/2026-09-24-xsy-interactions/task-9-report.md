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

The final browser-cleanup repair also followed RED→GREEN. Controller evidence on the former `finally` branch recorded `keyListeners:1` after an otherwise successful 1440px normal pointer throw (the following beetle check inherited the same leak). The new regression asserts that a curling run leaves both the dialog hidden and its keydown-listener set empty. Its minimal cleanup calls the dialog close control whenever the curling run opened a dialog with active curling content, a visible dialog, or a tracked keydown listener, including the former hidden-dialog case.

Pointer-capture hardening began from the controller's IAB console evidence: synthetic pointer events made `setPointerCapture` and `releasePointerCapture` throw `NotFoundError`; `pointerId` was already set, so the exception aborted pointer completion and the dialog cleanup release call before dialog/listener cleanup. The browser regression now forces both APIs to throw, cancels one drag, then launches another and requires no window error before final dialog cleanup. The application safely contains capture/release failures while retaining the tracked pointer id for pointer-up/cancel handling.

The normal-motion collision check was then made geometry-driven. Controller IAB verification after pointer-capture hardening showed the throw settled, cleaned dialog/resources, and left later checks green, but the former fixed `+8%` pull sometimes missed randomized setup stones. The regression now selects the lowest existing setup stone (breaking a row tie toward the center), converts its rendered center to logical coordinates, fixes the pull at logical `y=4.85`, and derives `x` from the target slope before clamping to the lower ice bounds. The normal branch verifies its deterministic contract instead: the reset state is enabled only after after-score appears, then every rendered stone remains stable across a later sample. The reduced-motion branch retains the explicit setup-stone movement assertion.

## Verification

- `node --test tests/xsy.test.mjs tests/xsy-interactions.test.mjs` — 33 passed.
- Browser evidence before this final cleanup repair: controller verification completed 390px reduced motion at 7/7 passes. A later 1440px normal run completed the real pointer throw, collision assertion, and after-score assertion; its sole failure was cleanup (`keyListeners:1`) because the old `finally` skipped close once the dialog was hidden. The harness now closes idempotently based on active content/listeners, then asserts a hidden dialog and zero listeners. Final 1440px normal and 390px reduced reruns are recorded below after this repair.
- Latest 1440px normal Safari run after the pointer-capture change reached the curling check but failed before its synthetic-pointer branch at the pre-existing rendered-size assertion (`setup and delivery stones use different pixel diameters (15.515625/24)`); subsequent beetle/night failures cascaded from that open dialog. This run therefore cannot verify the new pointer branch. Node verification remains green; controller should rerun the focused IAB matrix after resolving or classifying that independent rendering assertion.
- Controller IAB evidence after `14cf492`: the 1440px normal synthetic pointer throw settled, updated after-score, and fully cleaned the dialog/resources. The former requirement that every normal-motion throw move a randomized setup stone remained probabilistic even with target-derived pulls; it is therefore replaced by the deterministic post-score stability assertion while reduced motion continues to exercise explicit setup-stone movement. Final 1440px normal and 390px reduced reruns remain required for this revision.
- `git diff --check -- xsy tests docs/superpowers` — passed.
- `python -m pytest -q` — known unrelated baseline failure: `tests/test_site.py::test_shared_site_styles_are_loaded_on_primary_pages` expects `assets/site.css` in a primary page. It is outside the xsy changes; 6 other Python tests passed.

## Self-review

Checked mode changes reset timer/frame state through the existing dialog cleanup, count inputs clamp in the pure model, setup stones participate in the multi-body physics after contact, and the vertical game lane keeps delivery/setup stones inside the visible mobile surface.

## Final curling fix

The follow-up regression added a deep-clone contract for setup snapshots and a delivery-start clearance contract before implementation. The shared stone radius is now `0.16` logical units, the house radius is `0.72` (4.5 stone diameters), and the delivery starts at logical `y=3.2`, leaving the lower pull zone available. Score mode keeps an immutable generated setup snapshot; live collision state is cloned from it with zero velocities whenever a round is reset or re-laid out.

The 15-second boundary no longer force-zeroes or scores a visibly moving match. It only enters deterministic settling through the same all-stones-stopped/no-overlap condition, and animation continues if that condition is not met. Browser coverage now verifies reset positions in both motion modes, shared rendered diameters, house clearance, lower delivery clearance, and stable positions for every rendered stone after scoring.

Final verification:

- `node --test tests/xsy.test.mjs tests/xsy-interactions.test.mjs` — 35 passed.
- Browser harness at 1440px and 390px, normal and reduced motion — `DONE: 0 failures`.
- `git diff --check -- xsy tests docs/superpowers` — passed.
