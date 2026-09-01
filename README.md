# Table Studio — POC 0.25

An incremental update to the existing photo-local table styling prototype.

Live: https://topcod80.github.io/gastrona-table-styler/

## Editing flow

Choose photo → 2/4/6 guests → pick collections → tap a plate → move/scale its full place setting → switch to Item for fine adjustments.

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

`geometry.js` contains the shared layout/group transform math, with image width used as the physical coordinate unit so rotation and uniform scaling preserve relative spacing. `assets.js` retains the three placeholder collections per category. Contact shadows and plate-only vertical compression provide a manual visual adjustment, not perspective or AR.

## Local photo persistence

Save writes one **atomic IndexedDB record containing both scene and photo Blob**. Reload automatically restores that saved record, including the photo. Restore also works manually; Undo reverses manual restoration including its photo. No autosave: press Save to keep later edits. Reset clears pieces but keeps the current photo and existing saved record. Delete saved removes the stored scene/photo while retaining the current on-screen scene.

Missing photo blobs, failed decode, invalid scenes, blocked storage and quota errors produce a visible status. A failed restore does not silently show objects without their missing saved photo. An intentionally photo-free save explicitly says so when restored. A legacy POC 0.2 metadata save has no recoverable photo; the UI asks for a new photo/save rather than pretending it restored one.

Photo selection remains temporary until Save. The original selected image Blob, including any embedded metadata, stays in IndexedDB on this browser only. Nothing is uploaded. Safari/private mode/site-data cleanup can block or remove local storage; a local save is not a durable backup. Images over 40 MB are rejected. CSP blocks application connections and form submissions; static website requests still reach GitHub Pages.

## Tests and deployment

Run `npm run test:logic` for geometry invariants. For browser tests: `npm install`, `npx playwright install --with-deps webkit`, start `python3 -m http.server 8000`, then `npm test`.

The mobile WebKit suite covers focused toolbar visibility, zoom, 6-guest grouping and glass proximity, all collection choices, group transforms and presets, individual editing, duplicate/delete/undo/layers, local photo Blob storage and automatic restore after reload, failed/missing-photo storage, reset, and portrait/landscape sizes. Tests use generated synthetic pixels only.

Pushes to main test before deployment. The public allowlist contains only HTML/CSS and assets/geometry/storage/app JavaScript. Deployed files are downloaded and byte-compared with the commit.

## Remaining physical-device checks

Actual iPhone camera/HEIC decoding, real two-finger gestures, dynamic Safari bars and keyboard/viewport changes, and long-term/private-browsing IndexedDB retention need real device checks. The visual remains a 2D illustrative composition, without perspective mapping, occlusion, physical calibration, table detection, camera tracking or AR. Large group sizes can extend past the image; use smaller group size or viewing zoom to regain context. Overlapping groups may require moving the front setting to select a covered one.
