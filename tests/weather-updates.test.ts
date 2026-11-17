import assert from 'node:assert/strict';
import test from 'node:test';
import { presets } from '../src/locations.ts';
import { ProviderError } from '../src/providers.ts';
import { WeatherUpdates } from '../src/weather-updates.ts';
import type { WeatherStatus } from '../src/weather-updates.ts';
import type { WeatherReading } from '../src/weather.ts';

const start = Date.UTC(2026, 5, 28, 19);
const minute = 60_000;
const settle = () => new Promise<void>(resolve => setImmediate(resolve));
const reading = (fahrenheit = 58): WeatherReading => ({
  code: 45, isDay: 1, fahrenheit, sourceTime: start / 1000, timeZone: 'America/Los_Angeles',
});

test('reconciles exact age boundaries without discarding the same-place reading early', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: start });
  const display: WeatherStatus[] = [];
  const updates = new WeatherUpdates(async () => reading(), value => display.push(value));
  updates.select(presets[0]);
  await settle();
  assert.equal(display.at(-1)?.state, 'current');

  t.mock.timers.tick(30 * minute - 1);
  await settle();
  assert.equal(display.at(-1)?.state, 'current');
  t.mock.timers.tick(1);
  assert.equal(display.at(-1)?.state, 'stale');
  t.mock.timers.tick(90 * minute - 1);
  await settle();
  assert.equal(display.at(-1)?.state, 'stale');
  t.mock.timers.tick(1);
  assert.equal(display.at(-1)?.state, 'unavailable');
  assert.equal(display.at(-1)?.reading, undefined);
  await settle();
  assert.equal(display.at(-1)?.state, 'unavailable');
});

test('marks weather stale on failure, waits for Retry-After, and backs off retries', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: start });
  const display: WeatherStatus[] = [];
  const calls: number[] = [];
  const updates = new WeatherUpdates(async () => {
    calls.push(Date.now() - start);
    if (calls.length === 1) return reading();
    if (calls.length === 2) throw new ProviderError('Quota exceeded', true, 3 * minute);
    throw new Error('Offline');
  }, value => display.push(value));
  updates.select(presets[0]);
  await settle();

  t.mock.timers.tick(15 * minute);
  await settle();
  assert.equal(display.at(-1)?.state, 'stale');
  assert.equal(display.at(-1)?.reading?.fahrenheit, 58);
  updates.refresh();
  t.mock.timers.tick(3 * minute - 1);
  assert.deepEqual(calls, [0, 15 * minute]);
  t.mock.timers.tick(1);
  await settle();
  t.mock.timers.tick(5 * minute);
  await settle();
  t.mock.timers.tick(15 * minute);
  assert.deepEqual(calls, [0, 15, 18, 23, 38].map(n => n * minute));
  await settle();
});

test('coalesces unchanged selections and rejects an earlier location’s late response', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: start });
  const display: WeatherStatus[] = [];
  let bridgeResult: ((weather: WeatherReading) => void) | undefined;
  let bridgeSignal: AbortSignal | undefined;
  const calls: string[] = [];
  const updates = new WeatherUpdates(async (location, signal) => {
    calls.push(location.id);
    if (location.id === 'bridge') {
      bridgeSignal = signal;
      return new Promise<WeatherReading>(resolve => { bridgeResult = resolve; });
    }
    return reading(68);
  }, value => display.push(value));
  updates.select(presets[0]);
  updates.select(presets[0]);
  updates.select(presets[1]);
  assert.equal(bridgeSignal?.aborted, true);
  await settle();
  bridgeResult?.(reading());
  await settle();
  assert.equal(display.at(-1)?.reading?.fahrenheit, 68);
  updates.select(presets[0]);
  assert.equal(display.at(-1)?.reading, undefined);
  updates.select(presets[1]);
  assert.equal(display.at(-1)?.reading?.fahrenheit, 68);
  assert.deepEqual(calls, ['bridge', 'theatre', 'bridge']);
});

test('suspends polling while hidden or paused and reconciles on return', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: start });
  const display: WeatherStatus[] = [];
  let calls = 0;
  const updates = new WeatherUpdates(async () => {
    calls += 1;
    return { ...reading(), sourceTime: Date.now() / 1000 };
  }, value => display.push(value));
  updates.select(presets[0]);
  await settle();

  updates.setVisible(false);
  t.mock.timers.tick(17 * minute);
  assert.equal(calls, 1);
  updates.setVisible(true);
  assert.equal(calls, 2);
  await settle();

  updates.setPaused(true);
  const sourceTime = display.at(-1)?.reading?.sourceTime;
  t.mock.timers.tick(121 * minute);
  assert.equal(calls, 2);
  assert.equal(display.at(-1)?.reading?.sourceTime, sourceTime);
  updates.setPaused(false);
  assert.equal(calls, 3);
  await settle();
  assert.equal(display.at(-1)?.state, 'current');
});
