# POC 0.4 Stable — physical iPhone validation

Status: **NOT RUN. No physical iPhone was connected to the QA environment.** Automated WebKit passes in [QA_REPORT.md](QA_REPORT.md) do not establish physical Safari or Apple GPU behavior.

Baseline: `v0.4-stable` / **POC 0.4 Stable**.
Live: https://topcod80.github.io/gastrona-table-styler/.

Record device model, iOS/Safari version, date, battery/Low Power Mode, orientation, renderer mode and result. Keep personal table photos on the device; sharing them is unnecessary.

| ID | Physical procedure | Acceptance | Result |
|---|---|---|---|
| D01 | Rear-camera permission, shutter, cancel, retake and return | Correct local photo orientation; cancellation retains scene | Not run |
| D02 | Genuine HEIC/HEIF, EXIF rotation, iCloud Photos and Live Photo exports | Correct decode/restore or clear unsupported message retaining scene | Not run |
| D03 | Large original camera images and repeated replacements | No tab termination; usable editing; old URLs released | Not run |
| D04 | All calibration handles, off-center grabs, screen edges, cancel/reset/Done | No jumps/trapped controls; usable loupe and corner targets | Not run |
| D05 | Real simultaneous drag/pinch/twist; one-finger release/continuation; interruption | No stuck pointers, page scroll or unwanted zoom; group geometry preserved | Not run |
| D06 | Narrow/wide/steep real tables, 2/4/6 guests, enlarge/move then Fit | Ground footprints fit; no severe unintended overlap; realistic seat orientation | Not run |
| D07 | Item picker/whole setting; scale/rotate/duplicate/delete/Undo/front | Scope clear; unrelated settings unchanged | Not run |
| D08 | Arrange/Collections/Save, inline and expanded | Categories discoverable; layout retained; save status understood | Not run |
| D09 | Browser bars, notch/home indicator, rotation, app switching, form focus | Visible tabletop/reachable toolbar; no clipped controls or surprise zoom | Not run |
| D10 | Six guests for 10–15 minutes; normal/Low Power Mode | Record Apple GPU FPS, responsiveness, heat/battery; no unbounded degradation | Not run |
| D11 | Backgrounding/memory pressure; retry 3D after fallback | Editable scene retained; explicit fallback; no stuck benchmark | Not run |
| D12 | Save/reload/force-quit/relaunch; private mode/low disk/later revisit | Last explicit full save returns or a clear storage failure appears | Not run |
| D13 | Delete saved, clear site data, reload | Expected empty save; unsaved scene not presented as durable | Not run |
| D14 | VoiceOver, Dynamic Type/text zoom, external keyboard | Understandable labels/selection and reachable actions | Not run |
| D15 | Varied real photos/lighting | Plausible contact, glass height/translucency, plate shape and camera match | Not run |

## Acceptance boundary

Resolve core-flow/data-loss blockers, validate novice comprehension and approve real-photo appearance before an AR feasibility decision. Models have real height, but four-corner matching does not recover absolute dimensions, photographic lighting, real occlusion or unique camera intrinsics. Glass does not refract the photo.

Passing this checklist does not validate tracking/occlusion absent from this release. Do not move the stable tag for later fixes: issue a new version and preserve this baseline.
