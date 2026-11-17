# Weather Miniatures

Current weather in three live 3D miniatures, with a compact panel for conditions, place search, and display controls.

## Run locally

Use Node.js 22.12 or newer. On Windows, run the commands with `npm.cmd` and `npx.cmd`.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. **Change location** offers both landmarks and a city or postal-code search. The browser remembers the selection. **Display settings** can pause animation and live weather updates. Reduced motion starts the scene with animation paused. If WebGL2 or the model is unavailable, the scene displays its matching still.

Use `?fixture=clear-night`, `?fixture=storm&scene=theatre`, or `?fixture=snow&scene=landscape` for a deterministic preview. Set `VITE_WEATHER_MODE=fixture` in the environment to start the app in fixture mode. The live mode requests public weather and location data from Open-Meteo and credits Open-Meteo and GeoNames in the panel.

## Check and build

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:browser
npm run build
npm run preview
```

The browser tests use the nested base `/miniatures/` and verify location search, saved selection, keyboard operation, reduced motion, and still fallbacks. To use an existing compatible Chromium binary, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its path. For additional engine smoke tests, install Firefox and WebKit with `npx playwright install firefox webkit`, set `WEATHER_COMPAT=1`, and run `npm run test:browser`.

## Scene sources and stills

The original geometry, lettering, and materials were made for this project. Editable Blender scenes live in `scene-source/`. The manifest in `src/scene-manifests.ts` records the camera, preview framing, effects volume, and optional night light. Three.js uses a lower-resolution drawing buffer with nearest-neighbor scaling to give the scenes crisp pixels. The scene scripts use Blender 5.1 or its matching `bpy` package to regenerate material-batched, Y-up GLBs without exporting scene lights or cameras.

```sh
blender --background --python tools/build-scenes.py -- all --blend
```

The app serves each GLB and matching desktop and portrait WebP stills from `public/scenes/`. To regenerate the stills, start Vite on port 4173 and run the capture script with Playwright Chromium available.

```sh
npm run dev -- --port 4173
node tools/capture-posters.mjs bridge fog
node tools/capture-posters.mjs theatre rain-night
node tools/capture-posters.mjs landscape partly-cloudy
```

The [release plan](docs/first-release-plan.md) records the approved composition and production review criteria.

## Deployment

The Vercel build targets [sfxmath.com/projects/weather/](https://sfxmath.com/projects/weather/). See the [release checklist](docs/release.md) for routing, verification, quota monitoring, and rollback.
