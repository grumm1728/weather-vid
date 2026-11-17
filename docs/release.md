# Vercel release

The public address is [sfxmath.com/projects/weather/](https://sfxmath.com/projects/weather/). The owner confirmed personal, non-commercial use for the free Open-Meteo tier and Vercel Hobby. The app uses direct browser requests and requires no weather API credentials. [Open-Meteo hosted terms](https://open-meteo.com/en/terms) · [Vercel plan eligibility](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage)

## Routing

Deploy this repository as its own Vite project. The checked-in Vercel build sets Vite's base to `/projects/weather/` and rewrites the prefixed app and asset requests to the generated files. For local production parity, run `npm run build -- --base /projects/weather/`, followed by `npm run preview -- --base /projects/weather/`.

After the Weather Miniatures deployment is verified, route `/projects/weather/:path*` on the sfxmath.com project to the same path on the verified Weather Miniatures production deployment domain. Preserve the prefix, query parameters, and existing site paths. Use the stable production domain for the public rewrite and check `/projects/weather/`, `/projects/weather/?fixture=fog`, the JS and CSS assets, and the GLB and WebP requests. [Vercel rewrites](https://vercel.com/docs/rewrites)

`VITE_WEATHER_MODE` defaults to live conditions. Set it to `fixture` for an offline preview. `VITE_BASE_PATH` controls the mount point when using the default local build commands. The checked-in Vercel build command sets the production mount point explicitly.

## Preview and production checks

- Run `npm ci`, `npm run typecheck`, `npm test`, `npm run test:browser`, and the production build. Record the commit and Vercel deployment IDs for both projects.
- On the preview domain and final origin, select both landmarks and a searched place. Confirm direct forecast and geocoding succeed, the local weather reading and source timestamp render, and attribution is visible. Inspect the console and network for errors. Exercise the failed model, WebGL, offline, and quota paths with the browser test suite.
- Check Chromium, Firefox, Safari, and an actual phone. Review desktop and portrait framing, resize the window, switch scenes, and test the reduced-motion and still fallbacks. On the phone, confirm whether the busiest effects meet the 30 fps baseline.
- Verify keyboard order and focus, panel contrast, location result names, status announcements with a screen reader, and both pause controls. Confirm the location and weather remain readable alongside the static scene.
- Record the tested browser and device versions and preview and production URLs in #11.

## Local scene measurements

Chromium with SwiftShader rendered the thunderstorm fixture for each scene on a Windows desktop. The phone column uses the same machine with the Playwright Pixel 7 profile. Median frame rate is based on 75 animation-frame intervals after warmup. The GLB column records the asset bytes before HTTP headers or compression.

| Scene | GLB bytes | Desktop, 1280 × 720 | Pixel 7 emulation |
| --- | ---: | ---: | ---: |
| Golden Gate Bridge | 3,675,416 | 59.9 fps | 59.9 fps |
| Grand Lake Theater | 1,518,320 | 30.0 fps | 59.9 fps |
| Generic landscape | 2,618,124 | 59.9 fps | 59.9 fps |

## Monitoring and rollback

The free weather tier publishes limits of 600 requests per minute, 5,000 per hour, 10,000 per day, and 300,000 per month. A continuously visible tab normally makes up to 96 weather refreshes per day, plus requests for location changes, searches, and retries. Monitor weather network errors, HTTP 429s, and repeated stale or unavailable states with browser smoke checks. Use Vercel logs to inspect routing failures and unexpected asset 404s. [Open-Meteo plans](https://open-meteo.com/en/pricing)

Keep the IDs of the last verified deployments for both projects. If the weather content or its assets regress, roll the Weather Miniatures project back to its last verified build. If the hostname rewrite regresses, roll back the sfxmath.com project. On the initial release, the previous sfxmath.com deployment restores the site without the new route. Recheck the site home page and the weather path after rollback. [Vercel Instant Rollback](https://vercel.com/docs/deployments/instant-rollback)
