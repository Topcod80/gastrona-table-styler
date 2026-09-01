# POC 1.0A — Single plate in native AR

Branch: `poc-1.0-live-ar`. Stable source remains `main` / `v0.4-stable` at `2d044013ae71992a82ffe72169ab90156b1287e8`.

Test URL: https://topcod80.github.io/gastrona-table-styler/poc-1.0a/

## Decision, checked 2026-09-01

Use Apple AR Quick Look from Safari. Export the existing procedural plate to USDZ with horizontal plane anchoring. Apple owns the camera, surface detection and world tracking within its native viewer. This is a native handoff from the page, not browser-owned AR.

| Approach | Finding / decision |
|---|---|
| Safari native WebXR `immersive-ar` | Not a supported iPhone route in the Apple/WebKit material reviewed. The page checks the actual API rather than relying only on a browser name. It does not implement a WebXR renderer. |
| Apple AR Quick Look | Mature Safari-to-native route for a single object placed on an ARKit-detected surface. Selected for this POC. Native controls handle placement, dragging and rotation. |
| Safari 27 beta HTML `model` | New inline 3D rendering on iOS. Its presence does not provide camera-pose/plane/anchor APIs; immersive website environments are described for visionOS. Not a substitute for iPhone world tracking. |
| Camera video + Three.js | Camera permission/video alone supplies no world pose or tabletop plane. Rejected as a misleading AR substitute. |
| Marker/third-party visual SLAM | Custom tracking may be possible in Safari with a separate SDK or printed target, but introduces different tracking, licensing and validation requirements. Not equivalent to native WebXR or justified for this one-object test. |
| Native ARKit / RealityKit app or App Clip | Suitable next feasibility step if custom tap-to-place, anchor access and in-session application controls become essential. Outside this POC. |

Primary sources:

- [Apple WWDC26: HTML Model Element](https://developer.apple.com/videos/play/wwdc2026/215/), section 11:06: iPhone AR still launches Quick Look.
- Current [WebKit Cocoa feature defaults](https://github.com/WebKit/WebKit/blob/main/Source/WTF/wtf/PlatformEnableCocoa.h) enable WebXR for `PLATFORM(VISION)`; the [generic defaults](https://github.com/WebKit/WebKit/blob/main/Source/WTF/wtf/PlatformEnable.h) otherwise disable it. Read on 2026-09-01; source defaults alone are not a device test.

- [Apple AR Quick Look](https://developer.apple.com/quick-look-gallery/) and [surface placement overview](https://developer.apple.com/documentation/arkit/previewing-a-model-with-ar-quick-look).
- [WebKit: Safari AR links, MIME and feature detection](https://webkit.org/blog/8421/viewing-augmented-reality-assets-in-safari-for-ios/).
- [Apple engineer on WebXR immersive-ar](https://developer.apple.com/forums/thread/756850). This older explicit statement is read alongside the current release material, not presented as a 2026 announcement.
- [WebKit Safari 27 beta, June 2026](https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/): inline model on iOS; immersive website environments on visionOS. No iPhone immersive-ar announcement was found there.
- [Three.js USDZ exporter](https://threejs.org/docs/pages/USDZExporter.html) and the repository's pinned r185 exporter source.

This is a conclusion about Safari's native browser API route, not a claim that all custom computer-vision tracking on the web is impossible.

## What this implements

- Native `rel=ar` link with exactly one image child and USDZ MIME type.
- `relList.supports('ar')` plus Apple mobile-device detection to avoid advertising desktop object viewing as camera AR.
- The original plate from `src/models3d.js`, uniformly converted to 26 cm diameter, translated so its foot lies at Y=0, without remodelling vertices.
- One mesh, 1,152 triangles, approximately 86 KB USDZ. Metres/Y-up, horizontal plane anchoring, ivory ceramic material. Scaling is disabled in Quick Look to keep the size meaningful.
- A separately labelled optional Three.js preview with rotation and reset. It has no camera background, anchor or tracking claim. Lazy-loaded, on-demand rendering, DPR cap 1.5, and graphics failure messaging.
- Clear native-viewer instructions and compatibility diagnostics. No indication falsely asserts that a native anchor was created.

The page does not use `getUserMedia`; camera access opens through Apple's AR viewer launched by Safari. It cannot force Apple's precise tap sequence, select between two detected horizontal surfaces, read anchor coordinates, or confirm plane detection. If the viewer starts in Object mode, the user must select AR. Repositioning/rotation use native gestures, not the old app's toolbar.

Anchoring persists during the viewer session, subject to ARKit tracking quality. It does not persist after closing/reopening the viewer. No save/restore, settings, collections, cutlery, glasses, accounts or backend are added to this experiment.

## Build and checks

From the repository root:

```sh
npm ci --ignore-scripts
node poc-1.0a/build.cjs
python -m pip install usd-core==26.5
python poc-1.0a/validate.py
npx playwright install --with-deps webkit
node poc-1.0a/serve.cjs
# Separate terminal:
node poc-1.0a/tests.cjs
```

Build output is `poc-1.0a/dist/`; generated binaries are built from source in CI. `build.json` records geometry dimensions, source/asset hashes and the commit. OpenUSD opens the actual archive and verifies topology, bounds, material binding, metre units, horizontal anchoring and 64-byte ZIP alignment.

Mobile WebKit tests exercise the real 3D preview, rotate/reset, small portrait/landscape, native link markup under simulated capability detection, unavailable graphics, context loss, bundle failure, storage absence and network requests. Simulating capability does **not** emulate Apple's native viewer or certify world tracking. Post-deployment tests also verify USDZ delivery/MIME. Raw results are retained in workflow artifacts. Playwright’s WebKit screenshot helper injects an inline stylesheet, so screenshot calls are excluded from the strict-CSP clean-console regression instead of relaxing the production policy.

## Deployment isolation

Only this folder and `.github/workflows/poc-1.0a.yml` change on the development branch. CI verifies `main` and the stable tag still point to the fixed stable SHA. It downloads the already verified stable Pages artifact from run `33553271090`, adds only `/poc-1.0a/`, and verifies all stable published files are byte-identical after deployment. No push to main/tag is performed.

That pinned Actions artifact must remain available for future preview redeployments; after its retention expires, restore the same stable archive or explicitly regenerate and verify it. Do not silently substitute an unverified main build. The existing main deployment workflow is unchanged and could remove the preview path if main is redeployed; this is an isolated experiment, not a second production release.

## Physical iPhone acceptance — NOT RUN

1. Open the URL in Safari directly, tap Place plate, allow camera, select AR.
2. Scan a well-lit tabletop with visible texture; confirm the plate uses the table rather than the floor.
3. Move about 0.5–1 metre sideways and around the table for 30–60 seconds. Observe drift, scale stability and contact.
4. Reposition using Apple's controls and rotate with two fingers; move again.
5. Test narrow/wide, glossy and low-texture surfaces, oblique views, interrupted camera access and session return.
6. Confirm approximately 26 cm apparent size with a ruler; confirm plate thickness/contact and native rendering quality.
7. Deny permission, use an in-app browser, and try unsupported hardware; messages/fallback must remain honest.

Native camera launch, Quick Look asset acceptance, plane choice, gestures and tracking stability cannot be certified by Linux WebKit automation. This delivers a real native-AR route for those tests, not a completed physical anchoring validation.

## Privacy

Only self-hosted code and the original model are downloaded. The experiment does not request/read camera frames or write local arrangement storage. Apple's viewer handles camera permission and processing. No image upload, analytics, backend or tracking service is included. The stable photo-based application at the root keeps its existing browser-local behavior.
