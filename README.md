# Table Studio — POC 0.2

Built on the existing POC 0.1. A static, mobile Safari table-styling game with no backend, accounts, AR, pricing, or tracking.

Live site: https://topcod80.github.io/gastrona-table-styler/

## Main flow

Take or choose a photo → choose 2, 4, or 6 guests → mix collections → fine-tune by touch.

- Auto Set creates one plate, fork, knife, and glass per guest, in two opposing rows. Left/right are relative to the seated guest. Layouts are only applied when explicitly choosing a new guest count. Tapping the current count preserves edits. A different count replaces the arrangement; Undo restores it.
- Ivory/Sage/Cobalt plates; Silver/Brass/Ink cutlery; Clear/Amber/Rose glasses. Collection changes replace only the visuals in that category, retaining item identity, position, size, rotation, and stacking order. Forks and knives change together.
- Drag, pinch, twist, slider adjustments, add, duplicate, delete, and undo remain. Bring forward moves the selected piece to the top of the stack; Undo reverses this.
- Reset table clears the pieces and guest count, keeping the photo and collection choices. Undo restores the layout.
- Save arrangement stores a single named-by-app slot in localStorage, replacing the previous save. Restore is explicit and undoable. It restores item geometry, category choices, stacking order, guest count and the canvas ratio when there is no current photo.
- Photo replacement and viewport changes never trigger Auto Set or discard edits.

## Privacy and storage

Photos remain temporary browser-local object URLs and are never uploaded or persisted. Reloading clears the photo and unsaved arrangement. The saved JSON contains only versioned item/collection/layout metadata, never photo bytes, object URLs, filenames, or EXIF. Reselect the same photo after restoring to match the original scene. Resetting the table does not erase the saved slot. Browser site-data clearing removes the save; private browsing/storage restrictions may prevent persistence. Storage failures show an error without altering the current scene. Invalid or incompatible saves are rejected.

There are no analytics, remote fonts, network APIs, or accounts. CSP has `connect-src 'none'` and `form-action 'none'`. Hosting still receives normal requests for the app files; provider logs are outside the app's control.

## Assets

`assets.js` is the visual adapter. Stable type/category/collection IDs are independent of gesture code. Replace its trusted SVG markup with repository-hosted image assets inside the same visual envelope. Maintain transparent padding, aspect ratio, and consistent orientation; update the deployment allowlist when adding files. Do not put arbitrary user markup into this adapter. Placeholder colors are illustrative, not actual GASTRONA products or finishes.

## Run and test

Run `python3 -m http.server 8000` here, then visit `http://localhost:8000`.

`npm run test:logic` runs dependency-free app-state checks. For browser tests: `npm install`, `npx playwright install --with-deps webkit`, start the server, then `npm test`. Browser tests cover the original gestures, all layouts and collection choices, transform/category isolation, layering, reset/undo, save/restore/reload, storage errors, photo non-persistence and mobile widths. They use only generated synthetic image data.

## Deployment

Pushes to `main` run logic and mobile WebKit tests. Only successful tests allow deployment to the existing GitHub Pages site. Pull requests test without deploying. The public artifact contains only `index.html`, `style.css`, `assets.js`, `app.js`, and `.nojekyll`; code tests/docs and user photos are excluded. The deploy job verifies each served file against its commit. Pages source is GitHub Actions; deployed source branch is `main`.

## Physical iPhone acceptance / POC 0.3 questions

- Verify native camera/Photos picker, cancel/reselection, HEIC, orientation and real two-finger pinch/twist on target iOS versions. Automated desktop WebKit is not an actual iPhone camera test.
- Check selection precision with 24 pieces on a small screen and with overlapping objects. Fully covered items require moving the covering piece before selection.
- Test whether two opposing rows suit typical table-photo angles. This is a 2D layout, without perspective, table detection or physical scale; fine-tuning is expected.
- Check whether scrolling between canvas and collections feels playful enough, and whether a different guest count replacing the scene (with Undo) is clear.
- Confirm users understand that Save retains one arrangement but not its photo, and Restore uses the currently selected photo when present.
- Six-guest layouts on extremely wide photos can make pieces small. Reframing the photo can help. Photos over 40 MB are rejected; unsupported formats show an error.
