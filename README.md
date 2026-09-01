# Table Studio — POC 0.3

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

`geometry.js` contains the shared layout/group transform math, with image width used as the physical coordinate unit so rotation and uniform scaling preserve relative spacing. `assets.js` retains the three placeholder collections per category. Contact shadows and plate-only vertical compression provide a manual visual adjustment, an additional manual adjustment; calibrated scenes also use projective mapping.

## Local photo persistence

Save writes one **atomic IndexedDB record containing both scene and original photo bytes**. Reload automatically restores that saved record, including the photo. Restore also works manually; Undo reverses manual restoration including its photo. No autosave: press Save to keep later edits. Reset clears pieces but keeps the current photo and existing saved record. Delete saved removes the stored scene/photo while retaining the current on-screen scene.

Missing photo blobs, failed decode, invalid scenes, blocked storage and quota errors produce a visible status. A failed restore does not silently show objects without their missing saved photo. An intentionally photo-free save explicitly says so when restored. A legacy POC 0.2 metadata save has no recoverable photo; the UI asks for a new photo/save rather than pretending it restored one.

Photo selection remains temporary until Save. The original selected image bytes, including any embedded metadata, stays in IndexedDB on this browser only. Nothing is uploaded. Safari/private mode/site-data cleanup can block or remove local storage; a local save is not a durable backup. Images over 40 MB are rejected. CSP blocks application connections and form submissions; static website requests still reach GitHub Pages.

## Tests and deployment

Run `npm run test:logic` for geometry invariants. For browser tests: `npm install`, `npx playwright install --with-deps webkit`, start `python3 -m http.server 8000`, then `npm test`.

The mobile WebKit suite covers focused toolbar visibility, zoom, 6-guest grouping and glass proximity, all collection choices, group transforms and presets, individual editing, duplicate/delete/undo/layers, local photo Blob storage and automatic restore after reload, failed/missing-photo storage, reset, and portrait/landscape sizes. Tests use generated synthetic pixels only.

Pushes to main test before deployment. The public allowlist contains only HTML/CSS and assets/geometry/perspective/storage/app JavaScript. Deployed files are downloaded and byte-compared with the commit.

## Remaining physical-device checks

Actual iPhone camera/HEIC decoding, real two-finger gestures, dynamic Safari bars and keyboard/viewport changes, and long-term/private-browsing IndexedDB retention need real device checks. The visual remains a 2D illustrative composition, without occlusion, measured physical calibration, table detection, camera tracking or AR. Large group sizes can extend past the image; use smaller group size or viewing zoom to regain context. Overlapping groups may require moving the front setting to select a covered one.


## POC 0.3 table surface mapping

Calibrate table opens a fitted view with four 48px draggable handles: near-left, near-right, far-right, far-left. Move them onto the visible tabletop. Done applies the surface; Cancel discards corner edits; Reset calibration returns to flat mode and is undoable. Crossed, reversed, very narrow or tiny quadrilaterals cannot be applied. A new photo clears the previous photo's calibration. Calibration is optional.

`perspective.js` solves the eight linear equations for a 3×3 homography (h33 = 1) with partial-pivot Gaussian elimination. A normalized **3:2 logical tabletop** maps to the four normalized image corners. The CSS `matrix3d` is the same homography in pixels, applied to the entire tableware layer. It projects object shapes, orientations, contact shadows and group spacing together, rather than scaling isolated stickers. Far-edge scale arises from homogeneous division; it is not an arbitrary depth multiplier. A parallel-sided calibration has little or no depth shrinkage.

Pointer positions pass through the inverse homography before the existing drag/pinch/twist math. Scaling and rotation occur in the logical plane; all four group members retain their relative geometry. Auto Set always uses the logical plane in calibrated mode, independent of image orientation. Existing grouped offsets are converted when changing between flat and calibrated coordinate metrics. Group centers are corrected together at the logical boundary; oversized settings and artwork edges can extend beyond it.

Calibrated glassware uses a circular plan-view placeholder with the same collection colors, so the front-view stem illustration is not flattened onto the plane. Plates, cutlery and shadows project directly onto the table. These are still 2D placeholders: no glass height, occlusion, lighting estimation or physical scale is inferred. Four corners do not identify the table's true aspect ratio, which is assumed to be 3:2.

Scene version 30 includes the four corners (or null). Save writes this together with the photo in the existing atomic IndexedDB record; reload restores all three. Version 25 saves migrate to flat mode with their photo intact. No automatic save of unsaved edits. Existing storage errors stay explicit. No backend, tracking, image upload or external product assets were added.

The WebKit suite now also checks calibration pointer handlers, minimum handle sizes, angled six-guest render size, projected plate hit testing, inverse-mapped group gestures, corner validation, calibration reset/undo, new-photo invalidation and saved calibration/photo restoration. Numerical tests check corner fit, inverse round trips, depth shrinkage and CSS/mathematical projection equivalence. WebKit automation is not certification of physical iPhone camera, touch or storage behavior.
