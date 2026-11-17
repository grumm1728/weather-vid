import './styles.css';
import { defaultFixture, fixtureOptions, fixtureReading } from './fixtures.ts';
import { bridge } from './scene-manifests.ts';
import { SceneView } from './scene-view.ts';
import { describeCondition, sceneWeather } from './weather.ts';

const scene = document.querySelector<HTMLElement>('#scene')!;
const poster = document.querySelector<HTMLImageElement>('#poster')!;
const condition = document.querySelector<HTMLElement>('#condition')!;
const temperature = document.querySelector<HTMLElement>('#temperature')!;
const status = document.querySelector<HTMLElement>('#weather-status')!;
const fixture = document.querySelector<HTMLSelectElement>('#fixture')!;
const motion = document.querySelector<HTMLInputElement>('#motion')!;
const updates = document.querySelector<HTMLInputElement>('#updates')!;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const selectedFixture = new URLSearchParams(location.search).get('fixture') ?? defaultFixture;
const view = new SceneView(scene, poster);

for (const { id, label } of fixtureOptions) fixture.add(new Option(label, id));
fixture.value = fixtureOptions.some(({ id }) => id === selectedFixture) ? selectedFixture : defaultFixture;
document.querySelector<HTMLElement>('#fixture-controls')!.hidden = false;
motion.checked = reducedMotion.matches;
view.setPaused(motion.checked);
view.select(bridge);

function presentWeather(): void {
  const reading = fixtureReading(fixture.value);
  condition.textContent = reading ? describeCondition(reading.code) : 'Weather unavailable';
  temperature.textContent = reading?.fahrenheit === undefined ? '' : `${Math.round(reading.fahrenheit)}°F`;
  status.textContent = updates.checked ? 'Weather updates paused · Preview' : 'Weather preview';
  view.setWeather(sceneWeather(reading));
}

fixture.addEventListener('change', presentWeather);
updates.addEventListener('change', presentWeather);
motion.addEventListener('change', () => view.setPaused(motion.checked));
reducedMotion.addEventListener('change', ({ matches }) => {
  motion.checked = matches;
  view.setPaused(matches);
});
presentWeather();
