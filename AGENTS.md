# Repository Guidelines

## Project Purpose

Build a small weather display that selects and loops a pre-rendered animation for current conditions. The initial concept uses San Francisco weather and a Pepper's ghost display. Plan to host it as a project on sfxmath.com using Vercel. Keep the scene, camera position, and framing consistent across clips; use bright subjects against black and test the reflection on the actual hardware.

## Project Structure

The repository is currently empty; no source, tests, or assets have been established. If following the supplied prototype, place the web page at the project root and MP4 loops in `videos/` beside it. Use descriptive, lowercase, hyphenated names such as `clear-day.mp4`, `clear-night.mp4`, and `partly-cloudy.mp4`. Document any different structure as it is introduced.

## Development and Verification

No build system, package manager, test runner, or project commands are configured yet. When adding them, document installation, local serving, testing, and build commands here. For a browser prototype, verify that the page loads through a local server, the weather request succeeds, and video playback works on the intended display. Check the browser console for errors.

## Coding Style and Architecture

Use readable, consistently formatted HTML and JavaScript. Keep weather fetching, condition-to-clip mapping, and playback responsibilities easy to distinguish. Map day and night separately where needed, provide a fallback for unknown codes, and avoid restarting a clip when the selected condition has not changed. On request failure, retain the last successful animation. Add formatter or linter instructions here if tools are adopted.

## Testing Guidelines

No testing framework or coverage target is currently defined. As functionality is added, test representative clear, cloudy, rain, snow, fog, and thunderstorm codes, including day/night and unknown-code cases. Verify failed requests and unchanged conditions, then check looping, orientation, brightness, and framing on the physical display. Document automated test commands and naming conventions once established.

## Commits and Pull Requests

There is no Git history from which to infer a commit convention. Use short, descriptive, imperative subjects, such as `Add weather condition mapping`. Pull requests should describe the change and verification performed, link any relevant issue, and include a screenshot or recording for visual changes. Note any hardware-specific checks or limitations.

## Deployment

Target Vercel for hosting on sfxmath.com. The project's final URL and integration with the existing site are undecided; avoid assuming a root domain or URL path. Use asset paths that work at the chosen deployment location, and verify weather requests and video playback in a Vercel preview before release. Document deployment settings once established.

## Configuration

Keep credentials out of source control if a future weather provider requires them. Document configuration variables and defaults without committing secrets. Review the weather provider's terms before commercial distribution.

