# POC 0.4 Stable architecture

## Runtime and data flow

A static browser application served by GitHub Pages; no application server or remote data service. The photo is a DOM image backed by a browser-local blob URL, not an uploaded image or remote 3D texture.

Photo selection → normalized image coordinates → optional four-corner calibration → logical items/groups → 2D or 3D rendering. Pointer movement is converted back into tabletop coordinates. Both renderers share arrangement state.

| File | Responsibility |
|---|---|
| `index.html`, `style.css` | Controls, image stage, optional expanded editor, mobile tabs/toolbar |
| `app.js` | Scene, selection, gestures, groups, history, collections, photo lifecycle and save/restore orchestration |
| `geometry.js` | Seating templates, guest-relative placement and group geometry |
| `perspective.js` | Homography, inverse projection and 2D surface approximation |
| `camera.js` | Approximate calibrated virtual camera and 3D table metric |
| `fit.js` | Full ground-footprint bounds, overlap correction and proportional group fitting |
| `assets.js` | SVG collection artwork for 2D fallback |
| `view3d.js` | Lazy loading, renderer selection/fallback, synchronization and interaction overlays |
| `src/renderer3d.js` | Three.js scene/camera, groups, lighting, shadows, picking, lifecycle and diagnostics |
| `src/models3d.js` | Shared original procedural geometry and collection materials |
| `src/frame-health.js` | Bounded active-frame measurements and slow-device quality/fallback decisions |
| `storage.js` | Atomic IndexedDB read/write/delete and explicit failure handling |

## State and coordinate model

Serialized scene schema 40 includes items, groups, guest count, collections, spacing, image aspect ratio, calibration and surface-view preference. Selection/pointer state is transient. Undo is bounded to 25 entries. Selection-only taps do not checkpoint; transforms checkpoint once per gesture.

Each guest group contains a plate, fork, knife and glass. Group transforms preserve relative geometry; one-piece mode permits fine adjustments. Fit operates on ground footprints, not elevated glass silhouettes. It can scale, translate and separate groups. Deliberate manual overlap remains possible.

Four corners anchor a homography. The 3D camera approximates orientation, aspect and height projection; it cannot uniquely recover lens intrinsics, physical dimensions or lens distortion. Near/far size follows the camera and upright models have actual height. The existing 2D fallback has a different approximate artwork metric: state survives switching, but appearance is not identical.

## Renderer and resources

Three.js 0.185.0 / WebGL2 is bundled locally with esbuild targeting Safari 16 syntax. It loads after a photo or tableware is present. Four procedural BufferGeometry assets and collection materials are shared; no model/texture CDN. Group roots track logical settings, while DOM/SVG proxies support selection and accessibility.

A generated environment, hemisphere/directional lights, PCF shadows and a small contact-shadow texture provide lighting. Glass uses ordinary alpha transparency without photographic refraction or occlusion by objects already in the photo. DPR is capped at 1.5. Rendering is demand-driven, suspended while hidden/calibrating, and continuous during benchmarking. Sustained slow rendering lowers quality and can retain the arrangement in 2D.

Disposal releases shared geometries/materials, render targets, shadows, renderer and lifecycle listeners. Benchmarks settle when cancelled. Stress checks track bounded resource counts; they are not a complete JavaScript/GPU-driver heap proof.

## Persistence and privacy

IndexedDB database `table-studio-local`, version 1, store `scenes`, key `current` stores one atomic photo-plus-scene record. Image bytes are converted to ArrayBuffer before opening the transaction to avoid Safari idle-transaction closure. Restore reconstructs a Blob; replacement revokes the old URL.

Save is explicit. Reload restores the last save, not later unsaved edits. Reset clears tableware; Delete saved removes the saved record. Invalid/missing records, quota errors and unavailable storage are reported without silently replacing a working scene. Browser eviction can still erase saves. Session storage remembers renderer preference.

The CSP permits same-origin scripts and local blob/data images, with `connect-src 'none'`. No analytics, account system or image-upload endpoint. CI fixtures are synthetic.

## Build, deployment and release boundary

`npm ci --ignore-scripts` and `npm run build` generate `dist/table3d.js` and the Three.js license. `npm run test:logic` checks numerical geometry/frame/model behavior; `npm test` runs mobile WebKit with a local static server. `BASE_URL` directs live suites to Pages.

The Pages workflow tests, publishes an application-file allowlist, byte-compares deployed runtime files and repeats public-site WebKit tests. Actions retain evidence; `/validation/` publishes selected synthetic pre-deployment artifacts.

`v0.4-stable` fixes the audited runtime. A release-only workflow verifies successful QA and that only documentation/release metadata differ from the tested commit before publishing the tag/release. `poc-1.0-live-ar` starts at the stable commit with no AR changes. Keep the stable tag fixed; version later changes separately.
