# Website improvement audit

The site-wide improvement audit is complete in the local working tree as of 2026-11-03. The railway identity, existing content and private routes are preserved. Publication is a separate action; these changes have not been pushed.

## Verified in this pass

- Homepage: narrow screens previously cropped the fixed SVG, losing the about/music destinations and hiding recent updates. A responsive viewBox, scrollable layout and station board now retain all seven destinations at 320, 390 and 700px. The desktop composition remains intact at 1024 and 1440px. A plain native-link fallback is available without JavaScript.
- Homepage: denied session storage no longer aborts the whole script. Latest essay ordering is explicit, station subtitle length is bounded, coordinates are validated before footprint statistics. Background/reduced-motion SVG animation is paused.
- Gallery: photos have keyboard activation and accessible names. Opening the lightbox focuses its close button; Tab/Shift+Tab cycle within the visible controls; Escape restores focus to the triggering photo. Arrow navigation does not scroll the page. Segmented controls implement arrow/Home/End navigation and a single tab stop.
- Gallery: network failure and an empty collection have separate visitor-facing messages. Network failure offers retry, with successful recovery verified. Maintenance commands and local tooling are removed from the public empty state.
- About/gallery: load the existing shared stylesheet, including consistent visible keyboard focus.
- About: the station page now shares the homepage's day/night setting, persists it safely and keeps the mobile header usable.
- Articles: long tables scroll inside a labelled region, media stays within the reading column, failed query-mode loads have a retry path and progress recalculates after late media/font/layout changes.
- Gallery: the last row no longer creates mobile horizontal overflow; invalid GPS pairs are ignored by the map, map tiles and missing Leaflet have visitor-facing fallbacks, popup thumbnails are keyboard operable, replay cancels when leaving the map, and failed originals can retry.
- 404: root-relative assets and destination links work when the error document is served at a nested URL. Footer date matches the established site date.
- Existing module-loading test now parses script attributes and accepts cache-version query strings while retaining the private-page checks.
- Progressive content: the build updates labelled regions in essays/gallery with all 14 article links and 107 photo thumbnails. Index failures retain direct access and retry; disabled JavaScript no longer leaves an endless loading message. Homepage has eight native destinations including the concurrently added diner; gym and query articles provide an exit instead of an endless loader.
- Short/wide screens: homepage uses its responsive map for aspect ratios above 2:1; 404 footer participates in document flow rather than covering navigation.
- Build metadata: quote-containing titles/descriptions are escaped correctly, with summary truncation before escaping. Food build uses an explicit UTC+8 offset without requiring Windows tzdata. Its test reads UTF-8 explicitly.
- Concurrent update integration: resolved the build/sitemap stash conflicts by retaining both the diner build/URL and progressive content generation. No unresolved index entries remain.
- Diner: first-load index errors now offer a retry directly on the board; failed full-size photos have a retry in the viewer. Unchanged polling preserves the board DOM and keyboard focus, and failed background polls retain the last usable records. A generated no-script food record view keeps photos accessible.
- Homepage/diner integration: narrow-screen photo statistics are vertically offset from the adjacent diner subtitle. A browser assertion checks that their rendered text boxes do not overlap at the five main widths.
- Windows tooling: the food editor browser suite uses the platform-specific Python executable and directory junctions where needed, and verifies the temporary cleanup target. Food metadata tests explicitly read UTF-8.

## Evidence

- `tests/site-browser.cjs`: five homepage viewport widths, gallery keyboard activation/focus loop/restoration/photo navigation/tab navigation, failed index + retry, denied session storage, nested 404 resource/link resolution. Passed Chromium.
- `tests/public-pages.cjs`: Chromium and WebKit checks across 320, 390, 768, 844×390 and 1440px, all 14 article routes, about/friends/essays, invalid coordinates, failed photo/original/tile/map assets, popup keyboard access, replay cancellation, article overflow and late progress updates. Passed both engines.
- `tests/essays-browser.mjs`: all seven shelf/page sizes and 14 exact article bodies passed.
- `tests/gym-browser.cjs` and `tests/gym.test.mjs`: training records, backup merge, calendar, mobile layout, scene fallback and 3D controls passed.
- All 12 functions in `tests/test_site.py` and `tests/test_homepage_no_ai_learning.py` passed.
- Desktop smoke navigation across homepage, about, essays, gallery, friends, gym and 404: HTTP 200, no page exceptions or failed requests during observation.
- Mobile homepage screenshot inspected after changes; all destinations visible, no cropped labels.
- Modified Python sources parsed successfully. Scoped whitespace check passed.
- `tests/progressive-pages.cjs`: Chromium and WebKit no-script access at four screen sizes, full static content, index fallback/retry and short-screen 404 passed.
- `tests/test_progressive_build.py`: generated-region preservation/idempotence, metadata escaping and isolated current-site build passed. The isolated build preserves the existing photo index and includes the diner in sitemap while excluding private pages.
- HTML resource/link audit across 23 public documents found no missing local targets.
- Final current-tree run on 2026-11-03: Python unittest discovery passed all 13 tests, including isolated full build, metadata escaping, photo index preservation, food grouping, upload/edit authorization and conflict handling. The additional 12 site/privacy/route assertion functions passed.
- Final current-tree Node run: all 56 training, food discovery and private-collection logic tests passed.
- Final current-tree browser runs: `site-browser.cjs`, `public-pages.cjs` (Chromium and WebKit), `progressive-pages.cjs` (both), `food-resilience.cjs` (both), `food-browser.cjs`, `food-discovery-browser.cjs`, `food-editor-browser.cjs`, and the seven-size `essays-browser.html` harness passed.
- Final current-tree `gym-browser.cjs` run passed: mouse/keyboard and 3D controls, nested dialogs, training/cardio/weight persistence, backup merge, calendar and deletion, five responsive sizes, disabled 3D/storage recovery, and navigation from/to the homepage. No uncaught page errors were observed.
- Final visual inspection: desktop/mobile homepage, mobile diner board and small-screen receipt. The homepage inspection identified the adjacent subtitle collision; the fix and new overlap assertion passed afterwards.
- Final public document link audit checked 512 local asset/navigation references across 23 documents, with no missing targets or private entries. Whitespace check accepts the repository's mixed CRLF/LF line endings; no whitespace errors or unresolved merge entries remain.

## Completion audit

| Requirement | Current evidence |
|---|---|
| Improve functional reliability throughout the public site | Home storage denial and responsive navigation; gallery keyboard/map/replay/image recovery; article progress/error handling; diner refresh/retry; gym records and fallbacks exercised in the browser suites. |
| Improve visual usability while retaining the existing style | Screenshots inspected; all public article routes and primary pages checked at phone, tablet, desktop and landscape sizes; homepage map preserves stations; article/table overflow and diner board fit verified. |
| Keep content usable when interaction fails | All 14 static articles and 107 photo links, eight home destinations and diner photo records verified with JavaScript disabled; index errors retain direct content or offer retry. |
| Preserve existing content and user work | Seven-size reader harness checks exact text for every essay; isolated build retains the photo index; diner/editor suites use isolated fixtures; accumulated diff reviewed and pre-existing feed/sitemap edits retained. |
| Keep private pages private | Existing route assertions, generated sitemap checks and public-document link audit pass; no public links to private routes added. |
| Deliver reproducible local changes | README lists the build and browser checks; current-tree tests pass; generated-region replacements preserve surrounding markup and are idempotent. |

All issues identified during this audit have been addressed and verified locally. Live external services are outside this local verification; their failure paths were exercised through simulated request failures. No online publication is claimed. Existing feed/sitemap and bookshelf changes that predated the audit are retained.
