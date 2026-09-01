# POC 0.35 — physical iPhone validation gate

Status: **NOT RUN — no physical iPhone is connected to this environment.**
Do not treat automated WebKit results as real iPhone validation.

Record device model, iOS/Safari version, orientation, date and outcome for each check. Use personal table photos only on the device; no uploads or screenshots containing them are required.

| Check | Procedure | Pass condition | Physical result |
|---|---|---|---|
| Camera | Take photo, use rear camera, accept, cancel and retry | Correct orientation; cancelled capture keeps scene; calibration becomes available | Not run |
| HEIC | Choose an original HEIC from Photos/Files; save and reload | Decodes with correct orientation and restores, or clearly reports unsupported format without losing scene | Not run |
| Corners | Grab every handle off-center, drag near screen edges, release, cancel and redo | No jump; loupe and crosshair usable; corners remain reachable | Not run |
| Touch | Select a setting, drag, two-finger pinch/twist, release one finger, continue dragging | No stuck pointers or page scroll; relative geometry stays together | Not run |
| Browser bars | Collapse/expand Safari bars; rotate device during editing | Canvas and toolbar remain visible and interactive; no cropped controls | Not run |
| Fit | Narrow, wide and steeply angled table photos, each at 2/4/6 guests | Circular default plates; all piece envelopes stay on surface; fit remains readable | Not run |
| Persistence | Save, reload, close/reopen Safari, return later | Photo + calibration + geometry return; storage failure is explicit | Not run |
| Recovery | Undo fit, reset calibration, replace photo, undo, switch collections | Expected scene and photo restored; collections do not move settings | Not run |

Release gate for considering live AR: all device interaction checks pass, six-guest layouts remain usable on real photos, and the shape-preserving illustration is acceptable to test users. This prototype does not estimate physical dimensions, glass height, occlusion or camera pose.
