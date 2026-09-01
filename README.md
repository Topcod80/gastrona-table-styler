# Table Studio

A dependency-free, mobile-first dining-table photo editor. Static HTML, CSS, and JavaScript; no backend, accounts, analytics, remote fonts, or image uploads.

## Run locally

Run `python3 -m http.server 8000` in this directory, then open `http://localhost:8000`. On an iPhone connected to the same Wi-Fi, open `http://YOUR_COMPUTER_LAN_IP:8000` in Safari. Opening an HTML file inside an iPhone file preview is not a reliable way to run the app.

Choose a photo or take one using the rear-camera file picker. Tap a piece to add it, drag with one finger, and use two fingers on the canvas to pinch and twist the selected item. Size and rotation sliders provide precise alternatives. Duplicate, delete, and undo work on the arrangement. Desktop users can select items and use arrow keys or Delete.

## Privacy

Images use a browser-local object URL. No image bytes are sent to a server, saved to browser persistent storage, or included in deployment. Refreshing discards the arrangement and photo. Removing/replacing a photo releases its object URL. The CSP sets `connect-src 'none'` and disallows form submissions. GitHub Pages will still receive normal requests for the website's three static files; hosting-provider logs are outside this app's control.

## GitHub Pages deployment

The workflow runs on pushes to `main`, checks app logic and mobile WebKit interactions, and deploys only after those checks pass. Pull requests run tests without deploying. A manual run is also available in Actions.

Only `index.html`, `style.css`, and `app.js` enter the deployment artifact. Relative asset paths support the repository subpath. The final workflow step downloads all three deployed files and compares them with the commit.

Expected URL: https://topcod80.github.io/gastrona-table-styler/

If GitHub blocks automatic Pages enablement, the repository owner must select **Settings → Pages → Source → GitHub Actions** once, then rerun the failed deployment job. All deployed code comes from `main`.

## Tests

Install development dependencies with `npm install`, then install browser test engines with `npx playwright install webkit chromium`. Start the local server, and run `npm test` in another terminal. Tests use synthetic image data, mobile viewports, and browser pointer events; no personal photo is required. Set `BROWSER=chromium` to use Chromium instead of the default WebKit. Set `BASE_URL` to test a different local port.

## Physical iPhone acceptance check

- Open the deployed HTTPS page in Safari. Test both camera capture and Photos selection; confirm portrait and landscape photos are correctly oriented.
- Add all four items; drag, pinch, twist, duplicate, delete, and undo.
- Try portrait/landscape rotation and a large photo. Confirm items remain selectable and sliders scroll naturally outside the canvas.
- Cancel the picker, choose the same photo again, and remove/replace a photo.
- Reload and confirm the photo and arrangement are gone.

Camera picker behavior and HEIC decoding depend on the real iOS version. Automated desktop WebKit testing is not proof of physical iPhone camera or multi-touch behavior.

## Prototype limits

This is a 2D illustrative overlay, not AR: no depth detection, perspective matching, physical scale calibration, occlusion, export, or persistent projects. Included vector pieces are generic illustrations, not supplier product photographs. Undo applies to item edits, not photo replacement. Files over 40 MB are rejected; unsupported formats show an error and preserve the existing photo.
