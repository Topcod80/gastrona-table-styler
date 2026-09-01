# Table Studio — POC 0.36

An incremental update to the existing photo-local table styling prototype.

Live: https://topcod80.github.io/gastrona-table-styler/

## Editing flow

Choose photo → optionally Calibrate table → 2/4/6 guests → pick collections → tap a plate → move/scale its full place setting → switch to Item for fine adjustments.

Tapping the table enters a viewport-bound editor. The adjustment toolbar stays below the canvas in portrait, or beside it in short landscape screens. One adjustment (Size, Rotate, Plate angle, Spacing) is shown at a time. The editor opens at 1.5× viewing zoom; Zoom cycles through 2× and 1×. Drag empty table space to pan a zoomed scene. Done returns to setup/collections. Viewing zoom does not change saved object geometry.

Place Setting is the default selection mode. A grouped plate selects its plate, fork, knife and glass. Drag, pinch, twist, size slider, rotation slider, duplicate, delete, Undo and To front apply to the whole selection. Item mode changes only one piece. Manually added individual pieces are ungrouped; duplicating in Item mode creates an ungrouped copy. Deleting a member leaves the remaining group editable.

## Layouts and spacing

- Two guests: opposing seats.
- Four guests: two seats on each long side.
- Six guests: two on each long side plus two end seats at ±90°.
- Portrait scenes rotate the layout along the longer axis.
- Fork left, knife right with its blade inward, and glass close above/right are relative to the seated guest. The opposite group rotates as a unit.
- Compact/Standard/Formal spread the setting around its plate without independently moving unrelated groups or resizing the pieces. With no selected group, the preset applies to all groups. The preset also becomes the default for the next Auto Set.
- A different guest count intentionally replaces the layout; Undo restores it. Selecting the same count preserves edits. Collection swaps preserve groups, geometry, layering and plate compression.

`geometry.js` contains the shared layout/group transform math, using a consistent logical metric so rotation and uniform scaling preserve relative spacing. `assets.js` retains the three placeholder collections per category. Contact shadows and plate-only vertical compression provide a manual visual adjustment, an additional manual adjustment; calibrated scenes also use projective mapping.

## Local photo persistence

Save writes one **atomic IndexedDB record containing both scene and original photo bytes**. Reload automatically restores that saved record, including the photo. Restore also works manually; Undo reverses manual restoration including its photo. No autosave: press Save to keep later edits. Reset clears pieces but keeps the current photo and existing saved record. Delete saved removes the stored scene/photo while retaining the current on-screen scene.

Missing photo blobs, failed decode, invalid scenes, blocked storage and quota errors produce a visible status. A failed restore does not silently show objects without their missing saved photo. An intentionally photo-free save explicitly says so when restored. A legacy POC 0.2 metadata save has no recoverable photo; the UI asks for a new photo/save rather than pretending it restored one.

Photo selection remains temporary until Save. The original selected image bytes, including any embedded metadata, stays in IndexedDB on this browser only. Nothing is uploaded. Safari/private mode/site-data cleanup can block or remove local storage; a local save is not a durable backup. Images over 40 MB are rejected. CSP blocks application connections and form submissions; static website requests still reach GitHub Pages.

## Tests and deployment

Run `npm run test:logic` for geometry invariants. For browser tests: `npm install`, `npx playwright install --with-deps webkit`, start `python3 -m http.server 8000`, then `npm test`.

The mobile WebKit suite covers focused toolbar visibility, zoom, 6-guest grouping and glass proximity, all collection choices, group transforms and presets, individual editing, duplicate/delete/undo/layers, local photo Blob storage and automatic restore after reload, failed/missing-photo storage, reset, and portrait/landscape sizes. Tests use generated synthetic pixels only.

Pushes to main test before deployment. The public allowlist contains only HTML/CSS and assets/geometry/perspective/fit/storage/app JavaScript. Deployed files are downloaded and byte-compared with the commit.

## Remaining physical-device checks

Actual iPhone camera/HEIC decoding, real two-finger gestures, dynamic Safari bars and keyboard/viewport changes, and long-term/private-browsing IndexedDB retention need real device checks. The visual remains a 2D illustrative composition, without occlusion, measured physical calibration, table detection, camera tracking or AR. Large group sizes can extend past the image; use smaller group size or viewing zoom to regain context. Overlapping groups may require moving the front setting to select a covered one.


## POC 0.35 table fit and shape-preserving rendering

Four corners still define the unit-square-to-image homography. There is **no fixed 3:2 plane** in current layouts. The average opposing edge lengths in image pixels provide an adaptive layout ratio (limited to 0.2–5 to avoid degenerate layout metrics). This is a visual estimate, not a recovery of unknown physical table dimensions. The homography is solved with partial-pivot Gaussian elimination and inverted for logical dragging/pinching.

Artwork no longer inherits the homography's shear or unequal scaling. Each product center is projected individually. At that point, the local homography Jacobian supplies a single uniform scale (its smaller singular value) and the projected direction of the cutlery's longitudinal axis. Plates with the default angle remain circular on screen, while their position and size change with perspective. The manual Plate angle control remains an explicit user-selected compression. This is a shape-preserving illustration, not a physically exact perspective rendering of a 3D circular plate. Glasses retain plan-view placeholders. Shadows scale with the artwork.

`fit.js` shares the exact rendering envelopes with the editor. Rotated bounds for plate, fork, knife and glass, plus a contact-shadow allowance, are inverse-projected into tabletop coordinates and checked against an inset usable area. Fitting first translates the entire setting inward. If necessary, it reduces all member sizes and their relative offsets together in 5% steps, down to the existing minimum item size. Groups, rotations, collection IDs and relative geometry are retained. It does not separate cutlery/glassware from their plate. Fitting is deterministic, idempotent and undoable. It does not resolve every overlap in a heavily duplicated arrangement.

Auto Set fits calibrated 2/4/6-guest layouts. Fit to table is available in setup and the focused toolbar. Group drag/resize/rotation and spacing edits also respect the fitted footprint. Uncalibrated mode retains its existing interactions; the explicit Fit command can fit to the image rectangle. If the minimum size cannot fit, the UI reports the limitation rather than silently declaring success.

Corner controls use a 72px touch target with a precise center crosshair, numbered badge and local-photo magnifier. Grabbing off-center preserves the initial finger offset. Cancel leaves the previous calibration intact; Done applies and fits it; Reset calibration and Undo remain available. A new photo clears the old calibration.

Scene version 35 saves photo, arrangement and four corners in the existing atomic IndexedDB record. POC 0.3 saves migrate their grouped offsets from the old layout metric; POC 0.25 saves retain flat mode. Reload restores the last explicitly saved state. No backend, uploads, real products, telemetry or AR was added.

## Validation status

Numerical tests cover adaptive proportions, corner/inverse mapping, depth scale, narrow/wide/strong-angle layouts, 2/4/6 complete footprint containment, oversized group recovery, relative geometry and fit idempotence. Mobile WebKit tests cover circular DOM artwork, containment, fit/undo, large handles/loupe, local persistence and simulated viewport-height changes, alongside the existing POC 0.25/0.3 regression suite.

**Physical iPhone Safari, camera capture, valid HEIC decoding and actual browser-bar transitions have not been tested in this environment.** Synthetic PointerEvents and viewport changes are not physical device evidence. Unsupported image handling is tested using intentionally invalid HEIC bytes, which does not establish valid HEIC support. See [DEVICE_VALIDATION.md](DEVICE_VALIDATION.md) for the exact remaining device checks. POC 1.0 live AR should remain gated on those checks and visual evaluation with real table photos.


## POC 0.36 live QA repairs

See [QA-REPORT.md](QA-REPORT.md) for baseline reproductions, causes and regression coverage. Selecting an object now stays inline. Expand table is optional and starts at 1×. Arrange, Collections and Save tabs remain available in either view. Move whole setting is the default; Edit one piece exposes a direct item picker. Save state is persistent and Restore is available inside the editor.

Explicit Fit repairs gross oversized settings and overlaps as well as boundary overflow. It retains group geometry, applies consistent guest capacity limits, uses convex footprint collision tests and searches nearby free positions. It is atomic on failure and reports an actual no-op accurately. Ordinary resizing remains deliberate until Fit is pressed. Auto Set uses seat-edge clearances and overlap-aware fitting.

Surface view adds only bounded compression (0.66–1) and aligns circular product silhouettes with the local table axis; it never stretches them beyond their circular envelope. Round view retains the POC 0.35 circular preview. Both are stylized alternatives, not physical 3D reconstruction. Calibration, photo and view preference persist together in scene version 36; prior saves migrate locally.

`npm run test:live` runs native-control WebKit QA at BASE_URL (defaults to the local server). The Pages workflow also runs it against the deployed URL, retaining screenshot evidence. Physical-iPhone tests are still a separate release gate; do not infer them from WebKit automation.
