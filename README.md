# Table Studio — POC 0.4

Photo-local table styling with real-time Three.js tableware and a 2D fallback.

Live: https://topcod80.github.io/gastrona-table-styler/

## Use

Choose photo → Calibrate table → choose 2/4/6 guests → pick collections → move a
whole place setting. Edit one piece is available for deliberate fine adjustments.
Selection stays inline; Expand table is optional and starts with the whole image.
Arrange / Collections / Save stay available in both views.

Original unbranded plate, fork, knife and stemmed glass meshes have real thickness,
height, materials and shadows. Rotation and group scaling act on 3D objects.
The existing four-corner homography anchors the tabletop; camera-space axes estimate
its proportions. This is approximate camera matching, not measured physical scale.
See [the 3D implementation and limitations](docs/POC-0.4.md).

Compact / Standard / Formal spacing, category switching, duplicate, delete, Undo,
To front, Fit and Reset remain available. Fit checks complete ground footprints,
reduces oversized settings and clears overlaps while keeping members together.
To front resolves rendering ties in 3D; solid geometry still respects depth.

The 3D/2D toggle compares the same arrangement. Graphics failures restore 2D editing.
Sustained slow rendering lowers quality and can fall back to 2D. Save → 3D performance
runs a local three-second check. Its FPS and allocation estimate describe the current
browser, not a physical iPhone certification.

## Privacy and persistence

Save writes the photo blob, calibration and arrangement into one atomic IndexedDB
record. Reload restores that last explicit save. Save again after changes; there is
no autosave. Visible status distinguishes saved, unsaved and failed operations.
Reset clears the tableware while retaining the photo; Undo restores the arrangement.

Photos and their embedded metadata remain browser-local. They are not uploaded or
copied into the 3D renderer. No backend, accounts, analytics, checkout, AI, live camera
AR or WebXR. Static application files are served by GitHub Pages; the application CSP
blocks outbound connections. Safari may clear site storage, so this is not a backup.

## Build and test

```sh
npm ci --ignore-scripts
npm run build
npm run test:logic
npx playwright install --with-deps webkit
python3 -m http.server 8000
# In another terminal:
npm test
```

The build creates a self-hosted, lazy-loaded `dist/table3d.js` bundle and includes the
Three.js MIT license. Procedural model definitions are in `src/models3d.js`.

- `tests/logic.cjs`: calibration, camera depth/height, group geometry and 2D/3D fitting.
- `tests/interaction.cjs`: existing interaction, persistence/error and migration tests.
- `tests/live-qa.cjs`: native-control 2D fallback user flows and viewport checks.
- `tests/three.cjs`: actual WebGL meshes, native calibration/group drag, transforms,
  collections, persistence, fitting, comparison images, performance and failure fallback.

GitHub Actions tests before deploying main, compares deployed files against the
commit, then repeats user-flow and 3D tests against the actual Pages URL.
Synthetic comparison images and runner performance are published under `validation/`;
these contain no customer photographs. Workflow artifacts retain additional evidence.

## Validation limits

Mobile WebKit automation is not a physical iPhone. Actual finger gestures, camera
capture, genuine HEIC, Safari browser bars, thermal throttling and long-term local
storage retention still need device checks. Lighting is approximate; glass is
transparent but does not refract the photograph. There is no occlusion by objects
already present in the photo. Extreme calibration or unknown lenses can distort the
match. Live-camera AR should remain gated on physical-device and visual validation.

Earlier UX evidence: [POC 0.36 QA report](QA-REPORT.md).

See [the POC 0.4 audit matrix and device limits](docs/POC-0.4-AUDIT.md) for deployed-site QA evidence and the remaining physical iPhone acceptance checks.
