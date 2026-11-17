# Repository Guidelines

## Project Purpose

Build a browser weather display with live 3D miniature scenes for the Golden Gate Bridge, Grand Lake Theater, and a generic landscape for searched locations. The first release targets Vercel hosting on sfxmath.com. Pepper's ghost display support is a later phase. See [the first release plan](docs/first-release-plan.md) for the product and technical decisions.

## Project Structure

The repository is in the planning phase. Read `CONTEXT.md` for project terminology and `docs/first-release-plan.md` for the implementation slices. Document the source, test, and asset directories as they are introduced.

## Development and Verification

When introducing the build system and test runner, document installation, local serving, testing, and build commands here. Verify that the page loads through a local server, live weather requests succeed in preview, and the scene and still fallback work in supported browsers. Check the browser console for errors.

## Coding Style and Architecture

Use readable, consistently formatted HTML and TypeScript. Keep location selection, weather fetching, scene weather mapping, and rendering easy to distinguish. Provide a neutral fallback for unknown codes and preserve animation continuity when the visual state stays the same. Apply the same-location stale-weather policy in the release plan. Add formatter or linter instructions here if tools are adopted.

## Testing Guidelines

As functionality is added, test clear, cloudy, fog, rain, snow, and thunderstorm codes, including day, night, and unknown codes. Verify request failures, stale and expired weather, location switching, and unchanged scene weather. Check framing, keyboard access, reduced-motion behavior, and the static fallback. Document test commands and naming conventions once established.

## Commits and Pull Requests

There is no Git history from which to infer a commit convention. Use short, descriptive, imperative subjects, such as `Add weather condition mapping`. Pull requests should describe the change and verification performed, link any relevant issue, and include a screenshot or recording for visual changes. Note any hardware-specific checks or limitations.

## Deployment

Target Vercel for hosting on sfxmath.com. The project's final URL and integration with the existing site are undecided; avoid assuming a root domain or URL path. Use asset paths that work at the chosen deployment location, and verify forecast, geocoding, and scene loading in a Vercel preview before release. Document deployment settings once established.

## Configuration

Keep credentials out of source control if a future weather provider requires them. Document configuration variables and defaults without committing secrets. Review the weather provider's terms before commercial distribution.


## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for `grumm1728/weather-vid`.
See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-label vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository. See `docs/agents/domain.md`.
