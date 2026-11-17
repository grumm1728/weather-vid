import './styles.css';
import { defaultFixture, fixtureOptions, fixtureReading } from './fixtures.ts';
import { locationControls } from './location-controls.ts';
import { loadLocation, presets, saveLocation } from './locations.ts';
import type { Location } from './locations.ts';
import { fetchWeather, searchPlaces } from './providers.ts';
import { scenes } from './scene-manifests.ts';
import { SceneView } from './scene-view.ts';
import { describeCondition, sceneWeather } from './weather.ts';
import { WeatherUpdates } from './weather-updates.ts';
import type { WeatherStatus } from './weather-updates.ts';

const scene = document.querySelector<HTMLElement>('#scene')!;
const poster = document.querySelector<HTMLImageElement>('#poster')!;
const condition = document.querySelector<HTMLElement>('#condition')!;
const temperature = document.querySelector<HTMLElement>('#temperature')!;
const status = document.querySelector<HTMLElement>('#weather-status')!;
const retry = document.querySelector<HTMLButtonElement>('#retry-weather')!;
const fixture = document.querySelector<HTMLSelectElement>('#fixture')!;
const motion = document.querySelector<HTMLInputElement>('#motion')!;
const updates = document.querySelector<HTMLInputElement>('#updates')!;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const query = new URLSearchParams(location.search);
const selectedFixture = query.get('fixture') ?? defaultFixture;
const forcedFixture = query.has('fixture');
const live = !forcedFixture && import.meta.env.VITE_WEATHER_MODE !== 'fixture';
const view = new SceneView(scene, poster);

motion.checked = reducedMotion.matches;
view.setPaused(motion.checked);
motion.addEventListener('change', () => view.setPaused(motion.checked));
reducedMotion.addEventListener('change', ({ matches }) => {
  motion.checked = matches;
  view.setPaused(matches);
});

function setText(element: HTMLElement, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}

function displayPlace(selection: Location): void {
  setText(document.querySelector<HTMLElement>('#place')!, selection.name);
  setText(document.querySelector<HTMLElement>('#region')!, selection.region);
  document.querySelector<HTMLElement>('#region')!.hidden = !selection.region;
  scene.dataset.scene = selection.scene;
  void view.select(scenes[selection.scene]);
}

function displayWeather({ reading, state, paused }: WeatherStatus): void {
  const description = reading ? describeCondition(reading.code) :
    state === 'loading' ? 'Loading weather…' : 'Weather unavailable';
  setText(condition, description);
  setText(temperature, reading?.fahrenheit === undefined ? '' : `${Math.round(reading.fahrenheit)}°F`);
  const detail = [];
  if (paused) detail.push('Weather updates paused');
  if (state === 'stale') detail.push('Stale weather');
  if (reading && live) {
    const timestamp = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: '2-digit', timeZone: reading.timeZone, timeZoneName: 'short',
    }).format(reading.sourceTime * 1000);
    detail.push(`As of ${timestamp}`);
  }
  if (!live) detail.push('Weather preview');
  setText(status, detail.join(' · '));
  const showRetry = live && !paused && (state === 'stale' || state === 'unavailable');
  if (!showRetry && document.activeElement === retry) {
    // Keep the focused control available until the user moves on.
    retry.setAttribute('aria-disabled', 'true');
  } else {
    retry.hidden = !showRetry;
    retry.removeAttribute('aria-disabled');
  }
  view.setWeather(sceneWeather(reading));
}

retry.addEventListener('blur', () => {
  if (retry.hasAttribute('aria-disabled')) retry.hidden = true;
});

if (live) {
  const weather = new WeatherUpdates(fetchWeather, displayWeather);
  const highlight = locationControls(searchPlaces, selection => {
    saveLocation(selection);
    displayPlace(selection);
    highlight(selection);
    weather.select(selection);
  });
  const selection = loadLocation();
  document.querySelector<HTMLElement>('#attribution')!.hidden = false;
  displayPlace(selection);
  highlight(selection);
  weather.setVisible(!document.hidden);
  weather.select(selection);
  updates.addEventListener('change', () => weather.setPaused(updates.checked));
  retry.addEventListener('click', () => {
    if (!retry.hasAttribute('aria-disabled')) weather.refresh();
  });
  document.addEventListener('visibilitychange', () => weather.setVisible(!document.hidden));
} else {
  function displayFixture(): void {
    const reading = fixtureReading(fixture.value);
    displayWeather({ reading, state: reading ? 'current' : 'unavailable', paused: updates.checked });
  }

  for (const { id, label } of fixtureOptions) fixture.add(new Option(label, id));
  fixture.value = fixtureOptions.some(({ id }) => id === selectedFixture) ? selectedFixture : defaultFixture;
  document.querySelector<HTMLElement>('#fixture-controls')!.hidden = false;
  const requestedScene = query.get('scene');
  const place = requestedScene === 'landscape' ? { ...presets[0], name: 'Generic landscape', region: '', scene: 'landscape' } as const :
    requestedScene === 'theatre' ? presets[1] : presets[0];
  displayPlace(place);
  if (!forcedFixture) {
    const highlight = locationControls(undefined, selection => {
      displayPlace(selection);
      highlight(selection);
    });
    highlight(place);
  }
  fixture.addEventListener('change', displayFixture);
  updates.addEventListener('change', displayFixture);
  displayFixture();
}
