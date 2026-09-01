# POC 0.4 — deployed application audit

Audit date: 2026-09-01. Target: https://topcod80.github.io/gastrona-table-styler/.
The existing POC 0.4 was extended, not rebuilt. No AR or new backend was added.

## Evidence and environments

- Original application: `3d55e79f87f967d719cbd068e843061b08e21623`.
- Completed baseline: [deployed WebKit audit, run 33543105737](https://github.com/Topcod80/gastrona-table-styler/actions/runs/33543105737). 46 checks, 8 failed checks representing 6 distinct defects. This was observational baseline mode, so the successful workflow means the audit completed, not that every check passed.
- Direct cloud Chrome interaction exercised the actual public site: synthetic photo selection, corner adjustment, guest counts, Fit after enlargement, Item/Setting modes, three category selectors and photo/arrangement reload. WebGL is disabled in that browser environment; its 2D fallback worked. It is not evidence of working 3D on Chrome hardware.
- Actual 3D: Playwright 1.62.1 mobile WebKit, Linux runner, Mesa software WebGL2, Three.js r185, iPhone-sized viewports and touch enabled. Not physical Safari/iPhone hardware.
- Native UI tests use the real deployed HTML, JS and bundle. Fault injection is explicitly limited to browser capabilities/storage failures and synthetic multitouch events. `live-qa.cjs` uses native controls and DOM observations without writing application state.
- Per-check pass/fail and measured results are generated in `audit.json`, including the exact commit, timestamp and target URL. [Pre-deployment results](https://topcod80.github.io/gastrona-table-styler/validation/audit.json) are published with the site; the `live-pages-qa` workflow artifact contains the post-deployment results. Raw reports and screenshots are retained in the workflow's `webkit-mobile-preview` and `live-pages-qa` artifacts. The latter is the actual public-site result; `/validation/` contains the corresponding pre-deployment test artifacts.

## Reproduced issues and fixes

Severity: P1 blocks a core function/data integrity; P2 materially degrades interaction or recovery; P3 usability/diagnostic defect. No confirmed photo upload or saved-data loss was found.

| ID | Severity | Reproduction and root cause | Fix / regression |
|---|---|---|---|
| A01 | P2 | Choose 6 guests, tap another plate, Undo. The scene stays unchanged because pointer-down saves history even for selection-only taps. Repeated selection can evict useful history. | Checkpoint starts on actual movement, once per gesture. `selection-is-not-edit`; existing drag/pinch/Undo regressions. |
| A02 | P2 | Save → performance check → Arrange → switch to 2D → Save. “Measuring…” remains indefinitely. Suspending cancels RAF but never settles the benchmark promise. | Settle measurements on suspend, visibility change, disposal and replacement; prevent simultaneous UI checks. `benchmark-cancels-on-2d`. |
| A03 | P3 | Choose photo, calibrate, Done. Renderer still says “Calibrate for a table match.” Status is written only during initialization/toggle. | Refresh status from current calibration during synchronization. `calibration-status`. |
| A04 | P3 | Call resume on an already active renderer: it solves the camera again. Every paint resumes and then synchronizes, processing the scene twice. | Idempotent suspend/resume; one scene synchronization per application paint. `resume-is-idempotent` counts camera solves. |
| A05 | P2 | Mobile computed boxes: secondary controls as short as 28px in landscape, 32px renderer toggle in portrait; many other controls 36–42px. | Editor buttons at least 44px high; short screens scroll only the inspector while retaining a visible canvas. Portrait/landscape size and reachability checks. Small rendered cutlery still relies on the large Item picker. |
| A06 | P2 risk | Guest selector has 13px computed font size, a Safari form-focus zoom risk. Actual zoom on an iPhone was not reproduced here. | Use 16px text and 44px select height; `select-no-ios-zoom` verifies the CSS condition, not physical Safari behavior. |
| A07 | P2 | Source/controlled frame diagnostics show frames ≥250ms are discarded, producing missing FPS and preventing reliable slow-device detection. User pauses are also mixed with active frame timing. | Retain long scheduled frames, distinguish idle scheduling, bound samples, report p95/max/slow frames. Reduce quality then fall back after sustained <12.5 FPS windows. `frame-health.cjs`, `slow-frames-counted`, `slow-device-fallback` use 300/320ms frames. |
| A08 | P2 | Small secondary text #737970 on #f5f2eb measures 3.998:1, below 4.5:1 for ordinary text. | Darken the existing muted color to #62695f; `small-text-contrast` calculates the browser-computed ratio. No typography/layout redesign. |
| A09 | P3 | Generated center-ring normals have magnitude 0.066 on the plate and 0.0063 on the glass. Interpolation therefore weights lighting unevenly despite valid outward geometry. | Normalize shared geometry normals once on creation. `tests/models.cjs` checks every normal, finite vertices, outward volume, actual thickness, glass height and material properties. |

The contrast criterion follows [W3C WCAG 2.2 SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). This is a targeted accessibility check, not a claim of full WCAG conformance.

## Complete test matrix

L = `tests/logic.cjs`; I = `tests/interaction.cjs`; U = `tests/live-qa.cjs`; T = `tests/three.cjs`; A = `tests/audit.cjs`; H = `tests/frame-health.cjs`; M = `tests/models.cjs`. The workflow gates deployment on these regressions, then repeats U/T/A against the actual deployed URL. Physical-device and visual limitations are explicitly marked; passing automation does not convert those into passes.

| Area / case | Method and acceptance | Coverage / limitation |
|---|---|---|
| Choose photo | Native file input/chooser; image appears using blob URL | I/U/T/A; cloud live interaction |
| Take photo | Camera button opens camera input; synthetic file accepted; capture=environment | A/I; real OS camera still required |
| Calibration | Four native corner drags; Done/Cancel/Reset; loupe and offset grabs | U/T/I; cloud native corner adjustment |
| Invalid calibration | Crossed quad cannot be committed; cancel preserves prior scene | I/L |
| 2 / 4 / 6 guests | 8/16/24 pieces; 2/4/6 groups and real meshes | I/U/T/A |
| Repeated guest taps | Rapid 2→4→6 repetitions; correct final counts | A |
| Arrange / Collections / Save | Visible selected state, usable controls in each tab | U/A; live cloud UI |
| Move whole setting | Four selected objects, shared geometry transform, siblings unchanged | I/U/T/A |
| Edit one piece | Picker targets plate/fork/knife/glass; one item changes | I/U/T; live cloud Knife edit |
| Drag | Native mouse path through pointer handler moves actual 3D group | T; inverse-plane event tests I |
| Pinch / twist | Synthetic two-pointer events; proportional internal distances; pointers released | I/A; physical fingers untested |
| Scale / rotate | Sliders plus group distance invariants | I/T/A/L |
| Plate angle | Existing stored tilt affects plate only; actual mesh tilt/lift reviewed | I + renderer source |
| Duplicate / delete / Undo | Whole setting and single item counts; reversible state | I/T/A stress |
| Selection / Undo | Selecting alone does not create history entries | A regression |
| Bring forward | Item ordering reversible; solid meshes retain physical depth | I + renderer source; transparent overlap limitations below |
| Fit after enlargement/movement | Correct full footprints, preserved proportions, overlap separation, idempotent repeat | L/I/U/T/A |
| Compact / Standard / Formal | Group spacing updated; item dimensions preserved except necessary boundary fit | L/I/A |
| Plates only | All plate variants; unrelated geometry/categories unchanged | I/U/T/A |
| Cutlery only | Fork and knife variants together; other categories unchanged | I/U/T/A |
| Glassware only | All glass variants; other categories unchanged | I/U/T/A |
| Reset | Clears pieces, preserves photo; Undo restores scene | I |
| Explicit save / restore | Atomic photo bytes plus complete arrangement, calibration, collections | I/U/T/A; live cloud save/reload |
| Reload during editing | Last explicit save returns; later unsaved edits are not autosaved | A |
| WebGL initialization | Actual WebGL2 required, not a fallback counted as a pass | T/A |
| Four object models | All mesh types; nonzero triangles, unit normals, outward winding, thickness and shared geometry | T/A/M + asset source review |
| Six-guest renderer | 24 objects / 6 roots, finite camera, stable resources | T/A/L |
| Narrow table | Calibrated layout ground containment and all guest counts | L/I/U/T |
| Wide table | Calibrated layout ground containment and all guest counts | L/I/U/T |
| Strong perspective | Native calibration, depth projection, all guest counts | L/I/U/T/A |
| Camera match | Four zero-height anchors equal homography; height/up and near/far depth | L; synthetic screenshot inspection |
| Materials / lighting | Ceramic thickness/rim, metallic profile/highlights, hollow transparent glass, environment and contact shadows | Source + screenshots; not photorealism certification |
| Clipping / floating / z-fighting | Ground footprint tests and visual inspection of standard scenes | No severe defect seen in reviewed fixture; arbitrary edited overlap not exhaustively validated |
| Seat orientation | Opposite sides 180°, end seats ±90°, guest-relative fork/knife/glass | L/I |
| No severe auto-layout overlap | Pairwise setting footprint separation and size cap | L; visually reviewed six-guest fixture |
| WebGL unavailable | Block getContext; editable 2D with original scene | T; cloud environment corroboration |
| Actual context loss | WEBGL_lose_context extension; scene retained in fallback | A; T also tests dispatched loss event |
| 3D bundle failure/retry | Abort bundle request; fallback editable; unblock and retry restores 3D | A |
| Poor performance fallback | Controlled slow RAF; retain stalls, downgrade, fallback without scene loss | A/H |
| Renderer lifecycle | Active resume no-op, measurement cancellation, no idle loop by design | A/H + source review |
| Portrait | 390×844, 390×664 and smaller heights | I/U/A |
| Small portrait | 320px width, including 320×568 | U/A |
| Landscape | 844×390; inspector can scroll without moving tabletop | I/U/A |
| Toolbar reachability | Tabs/Fit/renderer and collections/save controls reachable in viewport | U/A |
| Touch targets | Editor buttons ≥44px, corners 72px; small pieces have explicit picker | A/I |
| Safe areas | env(safe-area-inset-*) source review | Actual notches/home indicator need iPhone |
| Browser bars | Available viewport-height changes simulated | I; real bar transitions need iPhone |
| Accidental zoom | Stage touch-action:none, controls manipulation, form text ≥16px | Source/A; real pinch/browser zoom needs iPhone |
| Focus / labels | Native labels and aria-pressed; keyboard arrows and Undo; visible focus styles | A/I + source; VoiceOver untested |
| Contrast | Computed small-text foreground/background luminance ratio | A; not a complete automated WCAG audit |
| Continuous rendering performance | Three-second benchmark; FPS, CPU, draw calls, triangles, resources | T/A |
| Sustained interaction | ≥180 seconds native operations including duplicate/delete, collection changes, repeated save/restore | A |
| Resource growth | Geometry/textures, DOM pieces, Undo cap, live photo object URLs | A; no JS heap API on WebKit |
| Long tasks | Feature-detect PerformanceObserver longtask; event-loop delay proxy when unsupported | A; proxy is not a Long Tasks API trace |
| Lazy loading | No Three.js bundle before a photo/items; same-origin bundle only | A + source |
| Loading time | Browser Navigation/Resource Timing | A; cached/zero entries reported honestly, not cold mobile network data |
| IndexedDB unavailable | Real open access throws SecurityError; startup releases inert; edits work; save failure shown | A |
| Quota failure | IDBObjectStore.put throws QuotaExceededError; current state retained | A; I also mocks storage wrapper |
| Corrupt record | Invalid metadata rejected without replacing current scene | A |
| Missing image | hadPhoto with missing blob rejected visibly | I/A |
| Delete saved / clear data | Current scene retained; reload empty after deletion | I |
| Invalid image / corrupt HEIC | Error message; existing photo retained | I/A; genuine HEIC decoding untested |
| Very large file | >40MB rejected | A |
| Large valid photo | Synthetic 6000×4000 JPEG decodes locally | A; does not prove iPhone memory safety |
| Privacy / network | GET-only same-origin assets, no request body/image/blob uploads; CSP connect-src:none | U/T/A + source |
| Console quality | No uncaught errors on normal flows; expected injected loss/load-denial warnings separated | I/U/T/A |
| Deployment identity | Every deployed application file/bundle byte-compared against build | Pages workflow, followed by live U/T/A |

## Rendering and code review

The renderer continues to use four original shared procedural BufferGeometry models: plate 1,152 triangles; fork 312; knife 128; glass 1,360. Their combined attribute/index buffers total 101,312 bytes. Nine collection materials plus floor/contact materials are reused. No external product models or textures are downloaded. One generated environment and one tiny radial contact texture are used. A normal six-guest draw reports 5 geometries and 5 textures, including renderer-managed resources.

CPU/frame now includes the render call and DOM overlay update. It excludes time spent in input event handlers and asynchronous GPU work; it is not total device CPU consumption. Estimated graphics allocations include approximate render-target buffers and geometry, not browser-process memory, decoded photo memory or complete driver allocation. WebKit does not expose `performance.memory`; no claim of a complete heap leak audit is made. Bounded counts over three minutes are evidence against the tested resource leak patterns, not a proof of indefinite memory stability.

Photo operations use one atomic IndexedDB record. Blob bytes are converted before opening the transaction to avoid WebKit idle transaction closure. Object URLs are revoked on replacement. Storage errors, missing/corrupt photos and scene validation failures keep the current arrangement. Existing event listeners are installed once; the 3D visibility/context listeners are removed on disposal. There is no service worker, analytics, network API, account system or upload endpoint.

Deferred source risks: the app still rebuilds SVG proxy markup for structural scene changes and keeps some parallel 2D/3D footprint logic. That is acceptable at 24 objects, but should be profiled before substantially larger catalogs/scenes. Construction failures after some GPU allocations are created are not covered by a complete allocation-failure/fuzzing harness. No speculative renderer rewrite was made.

## Unfixed limitations and physical-device requirements

- **P2 visual limitation:** four manually selected corners do not uniquely identify lens intrinsics, absolute dimensions or lens distortion. Exact tabletop anchors coexist with approximate upright geometry. Extreme quads can distort the visual result. Real photographed scenes need human validation; no camera/AR inference was introduced.
- **P2 visual limitation:** glass alpha compositing does not refract the photo; intersecting transparent surfaces and deliberate overlapping objects can still produce sorting artifacts. [Three.js documents the limitations of ordinary transparency sorting](https://threejs.org/manual/en/transparency.html). No claim that arbitrary overlaps are artifact-free.
- **P2 visual limitation:** 2D fallback uses its existing approximate artwork metric; it is not visually identical to the 3D camera. State is preserved when switching, but repeated edits across both renderer modes need more design/metric validation.
- **P3 UX tradeoff:** very short portrait and landscape screens require scrolling the inspector for secondary controls. The tabletop remains visible. Actual hand comfort and novice comprehension remain human tests.
- **Persistence limitation:** reload restores only the last explicit save. Browser/site-data deletion or Safari eviction can remove it. It is not a backup or multi-device sync.
- **Unverified resource extremes:** 24MP decoding succeeded in software WebKit. True iPhone memory-pressure termination, huge decompression-bomb images, thermal throttling and all GPU driver allocation failures are outside the demonstrated test coverage.

Physical iPhone tests still required, explicitly:

1. Rear-camera permission, shutter, cancel, retake, orientation and return to Safari.
2. Genuine HEIC/HEIF files, EXIF rotation, iCloud Photos selection, portrait/live-photo exports and large camera images.
3. Real simultaneous two-finger drag/pinch/twist, gesture cancellation, accidental browser zoom and finger occlusion of handles.
4. Safari toolbar collapse/expand, notch/home indicator, safe areas, keyboard/form focus, portrait↔landscape and app switching.
5. Native Apple GPU FPS/CPU/energy and memory under 10–15 minutes of use; Low Power Mode, thermal throttling, context recovery and background restoration.
6. IndexedDB across force-quit, relaunch, private browsing, low disk space, OS eviction and Safari upgrades.
7. VoiceOver, Dynamic Type/text zoom and external keyboard navigation.
8. Real table photos under varied lighting: plate contact, glass translucency, plausible heights, correct seat orientation and camera matching.

**AR readiness: not yet.** These tests can establish a more robust photo-based prototype. They do not validate live-camera tracking, occlusion, camera permissions or iPhone thermal limits. Complete the physical-device and real-photo acceptance pass before committing to POC 1.0 live-camera AR.

## Measured checkpoints and release verification

The completed original-site baseline ran 216 cycles in 180.5 seconds. It held 5 geometries and 5 textures throughout. Its final continuous benchmark reported 59.5 FPS / 2.18 ms CPU at reduced quality (55 calls, 25,922 triangles). These numbers are not directly comparable with the newer inclusive CPU metric or standard-quality rendering.

The repaired renderer checkpoint at `2e4ed65b2f538170619e6665f4c11cb138f95968` passed all 57 audit checks before deployment in [run 33544555176](https://github.com/Topcod80/gastrona-table-styler/actions/runs/33544555176). It completed 147 cycles in 181.0 seconds at standard quality. The following three-second benchmark measured 33.0 FPS, 5.35 ms render/overlay CPU per frame, 32 ms p95 frame interval, 73 draw calls, 35,474 triangles, 5 geometries, 5 textures, 11 materials and about 4.2 MiB estimated graphics allocations. Live photo object URLs remained at one and Undo entries at or below 25. Long Tasks API was unavailable; the timer-lag proxy observed delays, with a 91 ms maximum. This checkpoint precedes the final lighting-normal correction and additional 3D reset/order checks.

For the final build, use the commit-stamped generated reports and the successful final workflow rather than treating the checkpoint as a physical-iPhone or cold-network benchmark. `initialLoading` records a fresh browser-context navigation and renderer-resource timing; `loading` records the later warm reload. Zero cache/resource-timing values are retained as unavailable, not invented transfer measurements.

The deployment job checks each shipped application file and the generated Three.js bundle byte-for-byte before running public-site UI and stress tests. It publishes only application files and synthetic QA images/metrics. No selected personal table photo is included in repository writes, workflow uploads or Pages deployment.
