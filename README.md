# Weather Miniatures

Weather in a live 3D miniature, with a compact panel for conditions and display controls.

## Run locally

Use Node.js 22.12 or newer. On Windows, run the commands with `npm.cmd` and `npx.cmd`.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Expand **Display settings** to choose a fixture or pause animation and updates. A fixture can also be linked directly with `?fixture=clear-night` or `?fixture=storm`. The fixture labels identify preview weather. When WebGL2 or the model is unavailable, the scene displays its matching still. Reduced motion starts the scene with animation paused.

## Check and build

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:browser
npm run build
npm run preview
```

The browser tests use the nested base `/miniatures/` and verify keyboard operation, reduced motion, a failed model load, and absent or lost WebGL2. To use an existing compatible Chromium binary, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its path before running the browser tests.

## Bridge source and stills

The original geometry and materials are generated with Blender. Run the following with Blender 5.1 or with its matching `bpy` Python package. Add `--blend` to save the editable Blender scene as well as the GLB.

```sh
blender --background --python tools/build-scenes.py -- bridge
```

The web app serves the GLB and two WebP stills from `public/scenes/`. To regenerate the stills, start Vite on port 4173 and run the capture script with Playwright Chromium available.

```sh
npm run dev -- --port 4173
node tools/capture-posters.mjs bridge fog
```

The [release plan](docs/first-release-plan.md) records the approved composition and production review criteria.
