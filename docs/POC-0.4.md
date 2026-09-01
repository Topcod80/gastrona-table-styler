# POC 0.4 — real-time 3D tableware

Extends POC 0.36. The scene data and existing UI still own grouping, transforms,
collections, undo and IndexedDB photo/arrangement storage. No AR or photo upload.

## Renderer and original assets

Three.js 0.185.0 / WebGL2, bundled locally with esbuild and loaded only when a photo
or tableware is present. There are no runtime CDN or model downloads. Build with
`npm ci --ignore-scripts && npm run build`. Three.js MIT license ships with the bundle.

`src/models3d.js` creates four shared BufferGeometry meshes: a lathed ceramic plate
with rim, recess, foot and thickness; bevelled fork with four tines; bevelled knife;
and a hollow lathed stemmed glass with lip, bowl, stem and foot. These are original,
unbranded procedural models, not scans or licensed product assets. Collection
switching swaps shared ceramic, metallic and transparent materials. This adapter
can later be replaced with approved glTF/GLB assets while keeping item IDs and units.

Lighting uses a small generated environment map, hemisphere and directional
lights, soft directional shadows and soft procedural contact patches. Glass uses
alpha transparency, clearcoat and highlights. It does not refract the underlying
photo. No user image is copied into a GPU texture or sent across the network.

## Camera and calibration

`camera.js` extends the existing tabletop homography to a 3D projective camera.
All points at height zero map exactly through the calibrated homography. A centered
principal point and vanishing-direction focal estimate (moderate-FOV fallback) give
an approximate upright direction and rigid camera pose. A residual projection
correction retains the four exact tabletop anchors. Elevated vertices participate
in perspective division; no per-object sprite/Jacobian scaling drives the 3D meshes.

This is projective camera matching, not calibrated metric reconstruction. Four
corners without lens metadata or a known dimension cannot uniquely determine
physical proportions, camera pose and lens distortion. Extreme shapes can still
look stretched. Physical scale is illustrative.

## Interaction and fitting

Actual Three.js place-setting groups contain the four meshes. Group and child
transforms mirror the existing scene model. Projected mesh bounds provide accessible
DOM targets; raycasting resolves the selected object. Rotate changes the 3D yaw;
plate angle tilts the actual mesh while lifting its lower edge clear of the table.

Fit uses complete 3D ground footprints, keeps all members proportional and checks
neighboring settings. Glass height may extend visually beyond the table boundary;
its foot remains within the usable tabletop. Bring forward resolves rendering ties;
solid objects still respect physical depth. Manual oversized edits can overlap until
Fit is used, as in POC 0.36.

## Performance, fallback and privacy

Geometry/materials/environment are reused. Device pixel ratio is capped at 1.5.
The renderer draws on change, sleeps when idle and pauses when the document is hidden.
The Save tab contains a local three-second rendering benchmark: FPS, CPU frame time,
triangles and estimated graphics allocation. Reported memory is an estimate, not
Safari process memory; JS heap is reported only where the browser exposes it.

Sustained slow rendering first reduces resolution/disables directional shadows,
then falls back to 2D. WebGL initialization/shader/context failures also restore the
2D view without changing the arrangement. A visible toggle compares the same scene.
The 2D preference is session-local. No telemetry is transmitted.

## Validation

`tests/logic.cjs` covers exact camera anchors, projected height/depth and 3D footprint
fitting for narrow, wide and strongly angled 2/4/6 layouts. Existing mobile WebKit
suites continue to cover the 2D fallback and interaction behavior.
`tests/three.cjs` requires actual WebGL rendering, uses native controls and group drag,
checks persistence/collections/fit/rotation/duplicates, captures a same-scene 2D/3D
comparison and records performance. It also tests initialization and context-loss
fallback. The pipeline repeats user-path and 3D tests against deployed GitHub Pages.

Physical iPhone FPS, thermal throttling, actual finger gestures, camera/HEIC input,
Safari browser bars and extended storage retention still require a real device.
Successful automated tests do not establish photorealism or live-camera AR readiness.
