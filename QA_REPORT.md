# POC 0.4 Stable — QA report

Date: 2026-09-01. Live: https://topcod80.github.io/gastrona-table-styler/.

## Verified baseline

Runtime: `e49c627d1803dbaa8a15c734a66f1973b782841d`.
[Completed verification workflow](https://github.com/Topcod80/gastrona-table-styler/actions/runs/33547901324).
The stable freeze adds documentation/release metadata without changing this runtime.

Pre-deployment and actual-public-site checks passed. The live extended audit passed **63/63 checks**, with no normal-runtime console warnings or uncaught errors. Logic, model/frame-health, existing interaction, native UI and actual WebGL suites passed. Deployed files were byte-compared to the build.

[Complete 67-case matrix and issue register](docs/POC-0.4-AUDIT.md): methods, severity, root causes and limitations. `QA-REPORT.md` is historical POC 0.36 evidence, not this release's status.

## Coverage

| Area | Demonstrated result |
|---|---|
| Core flows | Photo chooser/camera-input routing, calibration, 2/4/6 guests, tabs, group/item manipulation, scale/rotate, duplicate/delete/Undo/front, Fit, spacing, collections, Reset |
| Geometry | Narrow, wide and strong-angle tables; complete ground footprints, group invariants and six-guest orientation |
| 3D | Actual WebGL2, four mesh types, thickness/height/material checks, camera anchors/depth, 24 pieces and six groups |
| Recovery | Unavailable WebGL, actual context loss, blocked/retried bundle and controlled slow-rendering fallback retain editing |
| Persistence | Atomic photo/calibration/arrangement/collection restore; explicit-save semantics, corrupt/missing records, IndexedDB denial and quota failures |
| Images | Invalid input retains scene; >40 MB rejected; synthetic 6000×4000 JPEG decodes locally |
| Mobile UX | 320px portrait, 390px portrait/reduced height, 844×390 landscape; reachable controls, touch sizing, labels, keyboard movement and contrast |
| Privacy | Body-free GET requests to same-origin assets/local blob/data resources; no image/blob upload |
| Stress | 146 native-control cycles in 180.839 seconds; transforms, collections and repeated save/restore; bounded resources/history/photo URLs |

## Performance measurements

Actual public-site **Linux software-rendered mobile WebKit**, not a physical iPhone. Standard quality, six guests, DPR cap 1.5; three-second benchmark after stress:

| Metric | Result |
|---|---:|
| FPS | 32.1 |
| Render + overlay CPU/frame | 6.88 ms |
| p95 / maximum frame interval | 33 / 41 ms |
| Draw calls / triangles | 73 / 35,474 |
| Geometries / materials / textures | 5 / 11 / 5 |
| Shared model buffers | 101,312 bytes |
| Estimated graphics allocations | 11,244,104 bytes (10.72 MiB) |
| Initial DOMContentLoaded / load | 96 / 175 ms |
| Lazy renderer request duration | 17 ms |
| Renderer decoded size | 579,926 bytes |

Graphics estimates include packed environment/shadow buffers, excluding MSAA/driver overhead and decoded photo memory. CPU excludes input handlers and asynchronous GPU work. WebKit exposes no JS heap value here. Long Tasks API was unavailable; the audit records a timer-delay proxy. Loading describes this runner/network, not cold cellular service.

## Findings fixed before freezing

Nine confirmed defect categories: selection-only Undo entries; stuck cancelled benchmark; stale calibration status; duplicate renderer resume work; undersized editor controls; discarded long frames/unreliable fallback; insufficient secondary-text contrast; underestimated graphics allocations; and renderer configuration warnings. Safari form text was hardened against zoom risk, but actual iPhone zoom was not reproduced. Stored mesh normals were normalized for consistency; the shader already normalized them, so no visual repair is claimed.

## Limitations and decision

No confirmed P1 blocker remains in exercised flows; this does not certify every arrangement/device. Camera matching is approximate; glass has no photo refraction; transparent intersections can sort imperfectly; 2D/3D metrics differ; short screens scroll secondary controls. Real-photo plausibility, full allocation-failure handling and indefinite memory stability remain unverified. Safari can evict saves.

Physical iPhone tests are **NOT RUN**; see [DEVICE_VALIDATION.md](DEVICE_VALIDATION.md). This is a reproducible photo-based prototype baseline, **not yet a go-ahead for live-camera AR**.

Raw artifacts in the linked workflow: `webkit-mobile-preview` (pre-deployment) and `live-pages-qa` (actual public site). `/validation/` contains synthetic pre-deployment artifacts, not physical-device evidence.
