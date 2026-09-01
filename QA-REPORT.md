# POC 0.36 — live QA and UX repair

Baseline inspected: https://topcod80.github.io/gastrona-table-styler/ at commit 52ab4c968438b954749792c58a79071e3d11473f.
Tests used a generated synthetic table image; no user photos were uploaded.

## Reproduction and changes

| Finding | Live reproduction / root cause | Repair and regression |
|---|---|---|
| Fit appears ineffective | Six guests; select third plate; Size → End; selected setting reached about 199%, overlapping another setting. Fit changed no piece styles but reported success. Resizing pre-fitted to the boundary; Fit only checked that same boundary. | Explicit Fit caps grossly oversized settings for guest capacity, checks rotated footprints against other settings, repositions and scales groups together. A no-op reports Already fits and creates no Undo entry. Native enlargement/Fit test plus collision/containment numerical tests. |
| Item mode unclear | Mode changed selection from four pieces to one, but only said Item and Plate. Small cutlery was difficult to target. | Edit one piece label; direct Plate/Fork/Knife/Glass buttons for the current setting; one-item highlight. Regression changes exactly one piece through the picker and slider. |
| Setting mode unclear | Four independent dashed SVG rectangles looked like four separate objects. | Move whole setting label, Moving 4 pieces together status and one shared selection outline. Regression verifies four pieces change and other groups do not. |
| Collections hidden | Change plates to Sage was not visible while focused; Done was required to access it. Each category did switch correctly after exiting. | Persistent Arrange / Collections / Save tabs; three labelled category controls available inline and expanded. Tests change each category without changing geometry or other categories. |
| Saving unclear | Save/reload restored photo, 24 pieces and Sage collection correctly. No persistent indication distinguished later unsaved edits. Restore was outside the editor. | Persistent Not saved / Unsaved changes / Saved on this device / Save failed indicator; local save/restore panel with timestamp and explicit photo/corners/arrangement scope. Tests save, reload, compare DOM geometry, inspect restored corners and photo, then edit/restore. |
| Expansion disruptive | Selecting a plate forced full-screen mode, hid setup and collections and zoomed to 1.5×. The screenshot cropped the table. | Ordinary selection remains inline. Expand table is explicit and initially fits the entire image. Essential tools remain inside the editor. Calibration returns to the previous view. Tests tap without expansion, explicitly expand, assert full image and controls remain visible. |
| Sticker appearance | Circular plates always faced the viewer and large outlines dominated the photograph. | Bounded surface flattening and table-aligned plate/glass axes, smaller contact shadows and a single group outline. Round view remains available. This is still illustrative 2D artwork, without material/lighting estimation, occlusion or glass height. Tests verify bounded flattening and stable geometry. |
| Unnatural seating | Percentage templates put long-side plates too far into the table. Boundary-only fitting permitted oversized overlaps. | Plate center inset derives from plate radius plus edge clearance; fork/knife stay beside plate and glass remains inward toward the tabletop. Six-guest end seats retain their rotated orientation. Fit checks overlap. Regression covers seat-edge placement, attached geometry and narrow/wide/steep 2/4/6 layouts. |

## Test surfaces

- Direct interactive cloud browser inspection of the deployed baseline, with native selection, enlargement, Fit, Item/Setting controls, category changes, photo selection and save/reload.
- `tests/interaction.cjs`: existing mobile WebKit regression suite, updated for explicit expansion and calibration returning inline.
- `tests/live-qa.cjs`: native browser control path with DOM-derived observations, no application-state writes. Runs before deployment and again against the actual Pages URL after deployment. Includes native corner drags; narrow/wide/angled tables; 2/4/6 guests; enlarge/Fit; item/group changes; all category switches; photo/calibration/arrangement restore; 320px portrait and short landscape control visibility. Screenshots are retained in workflow artifacts.
- `tests/logic.cjs`: homography, grouping, placement, silhouette bounds, collision separation, proportional fitting and no-op detection.

Physical iPhone camera, genuine HEIC decoding, real two-finger touch comfort, Safari browser-bar transitions and long-term storage retention remain unverified. Automation does not establish novice-user comprehension or photorealism. Live AR has not been added.
