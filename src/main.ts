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
const sampleFrames = forcedFixture && query.get('benchmark') === '1' ? frameBenchmark() : undefined;
const profile = forcedFixture && query.get('quality') === 'baseline' ? 'baseline' : 'detailed';
const view = new SceneView(scene, poster, sampleFrames, profile);
const display = document.querySelector<HTMLElement>('#display')!;
const panel = document.querySelector<HTMLElement>('#weather-panel')!;
const hide = document.querySelector<HTMLButtonElement>('#hide-controls')!;
const show = document.querySelector<HTMLButtonElement>('#show-controls')!;
const ghost = document.querySelector<HTMLInputElement>('#ghost')!;
const openPreview = document.querySelector<HTMLAnchorElement>('#open-preview')!;
const exitPreview = document.querySelector<HTMLAnchorElement>('#exit-preview')!;
const previewScene = document.querySelector<HTMLSelectElement>('#preview-scene')!;
const settings = document.querySelector<HTMLDetailsElement>('.display-panel')!;

function syncLinks(): void {
  const next = new URL(location.href);
  next.search = query.toString();
  history.replaceState(null, '', next);
  next.searchParams.delete('fixture');
  next.searchParams.delete('scene');
  next.searchParams.delete('benchmark');
  next.hash = '';
  exitPreview.href = next.href;
  next.searchParams.set('fixture', defaultFixture);
  next.searchParams.set('scene', scene.dataset.scene ?? 'bridge');
  next.hash = 'preview-controls';
  openPreview.href = next.href;
}

function setControlsHidden(hidden: boolean): void {
  panel.hidden = hidden;
  show.hidden = !hidden;
  if (hidden) query.set('controls', 'hidden');
  else query.delete('controls');
  syncLinks();
}

setControlsHidden(query.get('controls') === 'hidden');
hide.addEventListener('click', () => {
  setControlsHidden(true);
  display.focus({ preventScroll: true });
});
function restoreControls(): void {
  setControlsHidden(false);
  hide.focus({ preventScroll: true });
}
show.addEventListener('click', restoreControls);
document.addEventListener('keydown', event => {
  if (panel.hidden && event.key === 'Escape') restoreControls();
});

ghost.checked = query.get('display') === 'ghost';
view.setGhostDisplay(ghost.checked);
ghost.addEventListener('change', () => {
  if (ghost.checked) query.set('display', 'ghost');
  else query.delete('display');
  view.setGhostDisplay(ghost.checked);
  syncLinks();
});

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

function frameBenchmark(): (elapsed: number | undefined) => void {
  const output = document.createElement('p');
  output.id = 'frame-benchmark';
  output.className = 'weather-status';
  output.setAttribute('role', 'status');
  status.after(output);
  output.textContent = 'Measuring frame rate. Keep this tab visible with animation running.';
  const intervals: number[] = [];
  let warmup = 10;
  let finished = false;
  return elapsed => {
    if (finished) return;
    if (elapsed === undefined) {
      warmup = 10;
      intervals.length = 0;
      return;
    }
    if (warmup > 0) {
      warmup -= 1;
      return;
    }
    intervals.push(elapsed);
    if (intervals.length === 75) {
      intervals.sort((left, right) => left - right);
      const median = intervals[37];
      output.textContent = `Median frame rate: ${(1000 / median).toFixed(1)} fps`;
      finished = true;
    }
  };
}

function displayPlace(selection: Location): void {
  setText(document.querySelector<HTMLElement>('#place')!, selection.name);
  setText(document.querySelector<HTMLElement>('#region')!, selection.region);
  document.querySelector<HTMLElement>('#region')!.hidden = !selection.region;
  document.querySelector<HTMLElement>('#scene-attribution')!.hidden = selection.scene !== 'theatre';
  scene.dataset.scene = selection.scene;
  void view.select(scenes[selection.scene]);
  syncLinks();
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
  openPreview.hidden = false;
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
  exitPreview.hidden = import.meta.env.VITE_WEATHER_MODE === 'fixture';
  if (location.hash === '#preview-controls') settings.open = true;
  function selectPreviewScene(id: string): void {
    const place: Location = id === 'landscape'
      ? { ...presets[0], name: 'Generic landscape', region: '', scene: 'landscape' }
      : id === 'theatre' ? presets[1] : presets[0];
    previewScene.value = place.scene;
    query.set('scene', place.scene);
    displayPlace(place);
  }
  selectPreviewScene(query.get('scene') ?? 'bridge');
  previewScene.addEventListener('change', () => selectPreviewScene(previewScene.value));
  fixture.addEventListener('change', () => {
    query.set('fixture', fixture.value);
    syncLinks();
    displayFixture();
  });
  updates.addEventListener('change', displayFixture);
  displayFixture();
}
