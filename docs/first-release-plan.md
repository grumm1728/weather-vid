# Weather Miniatures first browser release plan

This plan covers the Golden Gate Bridge, Grand Lake Theater, and a generic landscape for searched locations. It records decisions from [visual direction (#3)](https://github.com/grumm1728/weather-vid/issues/3), [location and scene selection (#4)](https://github.com/grumm1728/weather-vid/issues/4), [scene weather (#5)](https://github.com/grumm1728/weather-vid/issues/5), and [weather and location data (#6)](https://github.com/grumm1728/weather-vid/issues/6). It is the working plan for [staged implementation (#7)](https://github.com/grumm1728/weather-vid/issues/7).

The animation is the primary view. A discreet control panel provides location selection, current weather, status, and display controls. The three scenes ship in the first public release. Pepper’s ghost display support is a later phase.

## Product behavior

- The Golden Gate Bridge opens by default. The panel has two landmark presets, each with fixed coordinates at the landmark. Search accepts a city or postal code on submit and presents up to eight results with region and country when supplied. Any selected search result uses the generic landscape, including search results for San Francisco and Oakland. Preserve the scene and selection through empty results, search failure, and edits to the query.
- Save the last valid selection in this browser. An invalid record or inaccessible store falls back to the Golden Gate Bridge; a failed write never prevents selection. A selection changes the scene and place label together. While its weather loads, use a valid reading cached for that selection or the neutral scene. Ignore late search and weather responses that no longer match the active request. The display requires neither an account nor browser location access.
- Show the available condition description, temperature with units, source time in the selected location’s time zone, and loading, stale, or unavailable status in text. Use degrees Fahrenheit for the initial US-oriented release and include the unit for every location. Use the provider’s time-zone identifier for formatting and a labeled UTC fallback if it is invalid. Search and weather errors have independent status and retry paths.
- Render daytime and nighttime from the selected location’s provider flag. Unknown weather codes use neutral weather effects and an unavailable condition label. Missing day/night uses neutral lighting. A valid temperature can remain visible when the condition or day/night flag is unknown. At expiry or before any usable reading, use the neutral scene and omit temperature and source time.

| Scene weather | Open-Meteo codes | Visual distinction |
| --- | --- | --- |
| Clear | 0 | Clear sky and day or night lighting |
| Partly cloudy | 1–2 | Broken cloud cover |
| Overcast | 3 | Continuous cloud cover with softer light |
| Fog | 45, 48 | Reduced scene visibility |
| Rain | 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82 | Rain or drizzle particles |
| Snow | 71, 73, 75, 77, 85, 86 | Snow particles |
| Thunderstorm | 95, 96, 97, 99 | Dark storm clouds and precipitation with no flashes |
| Unknown | Any other code or missing value | Neutral weather effects |

Preserve the detailed provider description for distinctions grouped into one scene effect, including freezing precipitation and hail. Use the visual review criteria in slice 3 for each production scene. [Provider code reference](https://open-meteo.com/en/docs#wmo_weather_interpretation_codes)

## Technical decisions

Use Vite, vanilla TypeScript and semantic HTML, one Three.js WebGL2 renderer, and Blender-authored GLB scene geometry. Keep selection, provider normalization, refresh, and scene weather mapping independent of rendering. Give each scene a manifest for model, poster, camera, and effect bounds. Use one shared weather effects layer. Dispose the previous scene’s resources on switch, and ignore asset completions for superseded selections. Serve a still of the selected scene if WebGL2 is unavailable, a model fails to load, or the context is lost. Keep controls and text usable in those cases. [Vite TypeScript](https://vite.dev/guide/features.html#typescript) · [Three.js WebGL2 renderer](https://threejs.org/docs/pages/WebGLRenderer.html) · [Blender glTF export](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html)

Use Open-Meteo Forecast and Geocoding through adapters. Request `temperature_2m`, `weather_code`, and `is_day` in `current`, with `timeformat=unixtime`, `timezone=auto`, and `temperature_unit=fahrenheit`. Validate the valid time and supported field types before applying the response. Keep up to 20 readings for distinct selections in a tab-local cache, replacing the least recently used entry first. Compare `current.time` to the local clock. Fetch on first use and thereafter when due, including on visibility return. Poll every 15 minutes while visible. A failed refresh marks a matching cached result stale immediately, as does reaching 30 minutes of age. Expire it at two hours even if no new request finishes. Retry transient errors after 1, 5, then 15 minutes, using 15-minute intervals thereafter and honoring longer `Retry-After` values. Pause background polling and retries when hidden. [Provider verification](research/provider-verification.md)

Use direct keyless access for eligible non-commercial use, with visible Open-Meteo and GeoNames attribution where applicable. If commercial access is required, use Open-Meteo Standard behind same-origin Vercel functions with the key stored server-side. Validate and bound inputs and rate-limit public routes before enabling paid traffic. Use fixture data in automated tests and when no hosted tier has been approved. [Hosted terms](https://open-meteo.com/en/terms) · [Vercel Vite and functions](https://vercel.com/docs/frameworks/frontend/vite)

## Implementation slices

Each slice can become a build ticket. Start the shell with fixture data and provisional geometry. The data integration and the two additional scenes can proceed independently after the shell is in place. Complete the release check after all three production scenes and live data are integrated.

### 1. Golden Gate Bridge vertical slice

Deliver a local Vite app showing a Golden Gate Bridge scene driven by weather fixtures. Build the shared scene runtime, accessible panel, weather mapping, and fallback path. Use temporary geometry and a still until the production art handoff.

- A clean checkout installs through `npm ci` and runs through documented `npm run dev`, `npm run build`, `npm run typecheck`, and `npm test` scripts. The production build includes the static fallback and works at the configured base path.
- Test every listed code and representative unknown or partial inputs in the mapper. Fixtures exercise each visual category and both day and night. Refreshing a reading with the same visual state preserves animation continuity.
- Reduced motion starts with a still view. Provide keyboard-accessible controls to pause motion and live updates. While updates are paused, suspend automatic refresh and retain the presented timestamp. On resume, reconcile its age and refresh if due. Simulated unsupported WebGL2, context loss, or asset failure shows the selected still and keeps the panel operable.

### 2. Location search and live weather

Deliver the two landmark presets, search, persistence, weather normalization, and refresh state. Use placeholder scene manifests during integration if production scenes are pending.

- The default, restoration, search failures, duplicate names, and rapid switching behave as specified above. Searching Oakland and picking the Oakland result gives the generic landscape. Choosing Grand Lake Theater gives the landmark scene. Both fetch at their own selected coordinates.
- Fixture-driven browser tests cover API success, no search matches, network and quota errors, missing fields, hidden-tab handling, pause/resume, stale and expired weather, and out-of-order responses. Test exact 30-minute and two-hour boundaries with a fake clock. A response for a previous place cannot change the current reading.
- In a Vercel preview using the authorized tier, confirm real forecast and geocoding requests succeed. Confirm attribution and, when using the paid route, confirm the browser bundle and network responses expose no key.

### 3. Production scenes and posters

Deliver the three production miniatures in the [approved aerial pixel-art style](https://github.com/grumm1728/weather-vid/issues/3#issuecomment-6959958905). The [Golden Gate Bridge mockup](../design-explorations/weather-miniatures/01-initial-exploration/06-isometric-pixel-art-bridge.png) is the primary composition reference. The [Grand Lake Theatre mockup](../design-explorations/weather-miniatures/01-initial-exploration/07-isometric-pixel-art-theatre.png) shows the lower aerial angle and signage treatment. Treat the bridge, theater, and generic landscape as separately reviewable assets.

- Give each scene a full-bleed aerial composition with crisp pixel edges, legible silhouettes, and restrained colors. Let the animation fill the view. Keep the weather and location panel compact, use legible interface text, and place it over a quiet part of the scene. Use the widescreen mockups for desktop and reframe for portrait so the landmark and controls remain visible and usable.
- Keep both Golden Gate Bridge towers, the continuous span, and the shoreline readable in fog. Use a lower aerial angle at Grand Lake Theater to show the three-line **GRAND LAKE THEATRE** rooftop sign, its open metal frame and bulbs, and the curved **GRAND LAKE** marquee. Carry the same aerial view and pixel treatment into the generic landscape with a distinct focal landform or feature.
- Record each production scene’s camera, framing, scale, pixel treatment, lighting, effect bounds, and supported aspect ratios. Keep editable Blender sources, exported GLBs, and matching posters reproducible through documented export settings. Use original or properly licensed assets and record the credits.
- Review each scene with clear day, clear night, fog, rain, snow, and thunderstorm fixtures. The scene remains recognizable through weather changes. The generic landscape uses the same asset for every searched location. Under reduced motion, the selected scene remains recognizable and weather is conveyed in text.
- Load only the selected model for first view. Repeated switching releases obsolete resources and keeps the interface responsive. Review the approved composition at a representative phone size and desktop size. Record model transfer sizes and median frame rate on those devices, with 30 fps as the initial baseline for the busiest effect on the agreed mobile reference device.

### 4. Preview and release

Deploy the integrated release to Vercel preview, then serve it at `sfxmath.com/projects/weather/` on the approved personal, non-commercial tiers. Verify the app, dynamic model and poster paths, and the direct forecast and geocoding requests at the preview and final mounts. [Release checklist](release.md) · [Vite public base path](https://vite.dev/guide/build#public-base-path) · [Vercel rewrites](https://vercel.com/docs/routing/rewrites)

- Run the automated suite and smoke-test all three experiences in Chromium, Firefox, and Safari, including an actual mobile device. Verify WebGL rendering, model switching, resizing, static fallback, and both live provider requests from the deployed page. Use mocked Playwright tests for failure paths and visible status changes. [Playwright network mocking](https://playwright.dev/docs/mock)
- Target WCAG 2.2 AA. Manually verify logical keyboard order and focus, a visible focus indicator, text contrast, screen-reader announcements for actionable state changes, operation without relying on color, and pause controls. Check motion with the system preference enabled and confirm ongoing animation and weather updates can be paused. [WCAG 2.2](https://www.w3.org/TR/WCAG22/) · [Reduced motion media feature](https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion)
- Record eligibility for the chosen Open-Meteo and Vercel tiers, final URL, environment variable names, and provider quota and failure signals to check after launch. Verify the final origin separately from preview. Use the last verified deployment as the rollback target and document the process. [Open-Meteo pricing](https://open-meteo.com/en/pricing) · [Vercel plan eligibility](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage)
