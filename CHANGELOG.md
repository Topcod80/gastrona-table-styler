# Changelog

## v0.4-stable — 2026-09-01

Frozen release: **POC 0.4 Stable**. No application behavior changed in the freeze commit. It records the audited runtime and starts `poc-1.0-live-ar` at the same baseline.

### Capabilities retained

- Browser-local photo/camera input and four-corner tabletop calibration.
- 2/4/6 guest Auto Set, Compact/Standard/Formal spacing and whole-setting/one-piece editing.
- Drag, pinch/scale, rotate, duplicate, delete, Undo, To front, Fit and Reset.
- Arrange/Collections/Save tabs and three collections per category.
- Original Three.js plate, fork, knife and stemmed glass with editable 2D fallback.
- Atomic local photo, calibration, arrangement and collection save/restore with explicit save status.

### Audit repairs included before freezing

- Selection-only taps no longer consume Undo history.
- Benchmarks settle when rendering is suspended or switched to 2D.
- Calibration status refreshes; redundant renderer resume work is eliminated.
- Larger editor touch targets, improved small-text contrast and safer form text sizing.
- Correct long-frame measurement, quality reduction and slow-device fallback.
- Graphics estimates include packed environment and shadow buffers.
- Supported shadow configuration and bounded environment blur remove console warnings.
- Regression coverage for lifecycle, geometry, storage faults, privacy and sustained interaction.

Stored-normal cleanup is asset hardening, not a demonstrated visual fix. [QA_REPORT.md](QA_REPORT.md) and [the detailed issue register](docs/POC-0.4-AUDIT.md) provide evidence, severity and root causes.

### Documentation and scope

Updated README and device validation; added architecture, current QA report, changelog and release notes. `QA-REPORT.md` remains historical POC 0.36 evidence. No AR, WebXR, LiDAR, AI detection, backend, accounts, checkout or real branded assets. Physical iPhone acceptance remains pending.
