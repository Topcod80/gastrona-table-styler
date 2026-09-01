# POC 0.2 verification

Local JavaScript syntax and dependency-free logic checks passed for the original actions and the game layer: 2/4/6 guest layouts, collection swaps without transform changes, reset/undo, metadata-only storage, restore validation and stacking order.

The GitHub Actions workflow is the deployment gate and records the mobile WebKit result for each commit. It runs original interactions plus all collection variants, layouts, preservation checks, save/restore/reload, corrupt/blocked storage and responsive layouts. Deployment is followed by served-file byte comparison.

Physical iPhone camera, HEIC and real multi-touch still require device testing. Synthetic images are used by the automated tests; no user table photos are committed or uploaded.
