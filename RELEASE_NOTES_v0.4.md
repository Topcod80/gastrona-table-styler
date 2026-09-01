# POC 0.4 Stable

Tag: **v0.4-stable**. Date: 2026-09-01.

Live application: https://topcod80.github.io/gastrona-table-styler/.

This freezes the audited photo-based prototype before AR development. The freeze changes documentation/release metadata only; application source is identical to verified commit `e49c627d1803dbaa8a15c734a66f1973b782841d`. The tag identifies the complete stable commit including these documents. `poc-1.0-live-ar` starts from that same commit with no AR changes.

## Current capabilities

- Local photo selection/camera input; four-corner tabletop calibration; flat behavior if calibration is skipped.
- Auto Set for 2/4/6 guests, Compact/Standard/Formal spacing and boundary-aware Fit to table.
- Whole-setting or one-piece editing: drag, pinch/scale, rotate, duplicate, delete, Undo and To front.
- Arrange/Collections/Save tabs, optional expanded editor and three collections per category.
- Explicit local photo/calibration/arrangement/collection save and restore, clear save status, Reset and delete-save controls.

## 3D renderer

Three.js r185 / WebGL2 renders original unbranded procedural plate, fork, knife and stemmed-glass meshes, with real thickness/height, shared ceramic/metal/transparent materials, environment lighting and contact/cast shadows. Four-corner calibration approximates a virtual camera; perspective drives near/far size.

The self-hosted renderer loads on demand (579,926 bytes; approximately 147 KiB gzip). Rendering is demand-driven with a DPR cap/adaptive quality. Graphics failures or sustained poor performance fall back to editable 2D. No real products, live-camera AR, WebXR, LiDAR or AI detection.

## QA status

[Verified workflow](https://github.com/Topcod80/gastrona-table-styler/actions/runs/33547901324): pre-deployment tests, deployed-file byte verification and actual-public-site mobile WebKit tests passed, including **63/63 extended audit checks**. The detailed audit contains a **67-case matrix**. No normal-runtime console warnings or uncaught errors in tested flows.

The live six-guest stress run completed 146 cycles over 180.839 seconds, including save/restore and collection changes, without growth in tracked geometry/texture counts or photo URLs. Software-WebKit benchmark: 32.1 FPS, 6.88 ms render/overlay CPU/frame, 73 draw calls, 35,474 triangles and about 10.72 MiB estimated graphics allocations. These are **not physical iPhone measurements**; driver/MSAA and photo memory are excluded.

See [QA_REPORT.md](https://github.com/Topcod80/gastrona-table-styler/blob/v0.4-stable/QA_REPORT.md) and [DEVICE_VALIDATION.md](https://github.com/Topcod80/gastrona-table-styler/blob/v0.4-stable/DEVICE_VALIDATION.md).

## Known limitations

- Physical iPhone camera, genuine HEIC, simultaneous finger gestures, browser bars/safe areas, VoiceOver and Apple GPU/thermal behavior remain untested.
- Approximate camera matching/lighting; no photographic glass refraction or occlusion by existing photographed objects; transparent intersections may sort imperfectly.
- 2D fallback preserves state but differs visually. Very short screens scroll secondary controls.
- Safari can evict/clear storage. Reload returns the last explicit save, not unsaved edits.
- Automated resource stability is not proof of indefinite heap/driver stability or safety under extreme image sizes.

This is a stable prototype baseline, not production/live-AR certification. Complete physical-device and real-photo acceptance before a POC 1.0 AR decision.

## Privacy

Selected photo bytes and embedded metadata remain in the browser. One atomic IndexedDB record stores photo plus arrangement/calibration. No photo upload, backend, analytics, accounts or checkout. CSP blocks outbound application connections. Network tests observed body-free same-origin/local GETs only. CI/published validation use synthetic images, never customer photos.
