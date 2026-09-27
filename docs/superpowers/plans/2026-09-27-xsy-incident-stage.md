# XSY Incident Stage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the XSY page produce visible, escalating absurd incidents instead of relying on one-line card jokes.

**Architecture:** Keep the existing favorites and games. Put scene data and sequence logic in `xsy/chaos.mjs`; add a single interactive incident stage between the cover and collection. `xsy/app.mjs` updates the stage and the existing composure meter on each click.

**Tech Stack:** Static HTML, CSS, browser JavaScript modules, Node test runner, existing browser harness.

**Spec:** User feedback on 2026-09-27: “还是不够神经，现在根本没有让人发笑的点”. The user's earlier instruction authorizes implementation choices without another approval request.

## Global Constraints

- Keep all twelve favorites, their links, games, and night mode functional.
- Keep `/xsy/` unlisted from the site's public navigation.
- Make 320px, 390px, and desktop layouts readable; honor reduced motion.

---

### Task 1: Incident data and sequence

**Files:** Create `xsy/chaos.mjs`; modify `tests/xsy.test.mjs`.

**Interfaces:** Export `absurdScenes` and `incidentAt(index)`, where index 0 selects the first scene and indices wrap by scene count.

- [x] Add a failing Node test that checks first scene, uniqueness of scene IDs, required copy and icons, and wraparound.
- [x] Run `node --test tests/xsy.test.mjs` and confirm the new test fails because the module is absent.
- [x] Implement seven short incidents that cross over the existing favorites. Return `{ ...scene, number }` from `incidentAt`.
- [x] Re-run the Node test and confirm it passes.

### Task 2: Visual incident stage and browser behavior

**Files:** Modify `xsy/index.html`, `xsy/app.mjs`, `xsy/style.css`, and `tests/xsy-browser.mjs`.

**Interfaces:** `[data-chaos-start]` on the cover starts the first scene. `[data-chaos-next]` advances it. Scene output fields are `[data-incident-number]`, `[data-incident-title]`, `[data-incident-setup]`, `[data-incident-punchline]`, and two actors. Every advance calls the existing composure update.

- [x] Add a failing browser check that starts the stage, sees the first incident, advances to the second, and confirms composure changed.
- [x] Run the 390px browser harness and confirm the check fails because the stage is absent.
- [x] Add the HTML stage, event handlers, per-scene visuals, responsive layout, and reduced-motion fallback.
- [x] Re-run browser suites at 320px, 390px, and 1440px plus Node tests; inspect screenshots in light and night themes.
- [x] Commit the verified work locally. Push only if the user requests it.

Review found a launch/specimen overlap on 320×568. Added a failing geometry check, placed the narrow specimen row in document flow, and verified the full short-screen browser suite passes.
