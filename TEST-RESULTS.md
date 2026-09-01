# POC 0.25 verification

Local geometry checks: 2/4/6 templates, end-seat angles, guest-relative fork/knife/glass positions, glass-to-plate proximity, group-transform distance invariants, preset spacing, whole-group boundary correction, portrait/wide scenes.

The GitHub Actions run for each commit records the mobile WebKit result. Its browser suite covers existing collections/undo/layering and the focused editor, group and item transforms, 6-guest layout, contact/compression controls, IndexedDB photo+scene save, automatic reload restoration, missing-photo/quota failures and mobile viewport sizes. Deployment is gated on these checks and followed by byte verification.

Synthetic images only. Actual iPhone camera/HEIC, real multi-touch and Safari storage retention require device testing; automated desktop WebKit is not proof of those physical-device behaviors.
