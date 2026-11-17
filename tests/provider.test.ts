import assert from 'node:assert/strict';
import test from 'node:test';
import { loadLocation, normalizeSearchResult, presets } from '../src/locations.ts';
import { normalizeReading, ProviderError } from '../src/providers.ts';

test('normalizes usable partial readings and falls back to UTC for an invalid time zone', () => {
  const time = Math.floor(Date.now() / 1000);
  assert.deepEqual(normalizeReading({
    current: { time, temperature_2m: 58, weather_code: null, is_day: '1' },
    timezone: 'Unknown/Place',
  }), { sourceTime: time, fahrenheit: 58, code: undefined, isDay: undefined, timeZone: 'UTC' });
});

test('rejects unusable and future-dated provider responses', () => {
  const time = Math.floor(Date.now() / 1000);
  assert.throws(() => normalizeReading({ current: { time } }), ProviderError);
  assert.throws(() => normalizeReading({ current: { time: time + 600, temperature_2m: 58 } }), ProviderError);
  assert.throws(() => normalizeReading(null), ProviderError);
});

test('keeps coordinate and place fields safe to restore without treating a search result as a preset', () => {
  const place = normalizeSearchResult({
    id: 5378538, name: 'Oakland', latitude: 37.8044, longitude: -122.2712,
    admin1: 'California', country: 'United States',
  });
  assert.equal(place?.region, 'California, United States');
  assert.equal(place?.scene, 'landscape');
  assert.equal(normalizeSearchResult({ id: 1, name: 'Bad', latitude: 101, longitude: 0 }), undefined);

  const store = (value: string) => () => ({ getItem: () => value });
  assert.deepEqual(loadLocation(store(JSON.stringify({ ...place, scene: 'theatre' }))), place);
  assert.deepEqual(loadLocation(store('bad data')), presets[0]);
  assert.deepEqual(loadLocation(() => { throw new Error('Storage not available'); }), presets[0]);
});
