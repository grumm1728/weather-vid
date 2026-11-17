import assert from 'node:assert/strict';
import test from 'node:test';
import { describeCondition, sceneWeather } from '../src/weather.ts';
import type { WeatherKind, WeatherReading } from '../src/weather.ts';

const families: [WeatherKind, number[]][] = [
  ['clear', [0]], ['partly-cloudy', [1, 2]], ['overcast', [3]], ['fog', [45, 48]],
  ['rain', [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]],
  ['snow', [71, 73, 75, 77, 85, 86]], ['storm', [95, 96, 97, 99]],
];
const base: WeatherReading = { sourceTime: 1_784_825_400, timeZone: 'America/Los_Angeles' };

for (const [kind, codes] of families) {
  test(`maps all ${kind} conditions by day and night`, () => {
    for (const code of codes) {
      assert.deepEqual(sceneWeather({ ...base, code, isDay: 1 }), { kind, daylight: 'day' });
      assert.deepEqual(sceneWeather({ ...base, code, isDay: 0 }), { kind, daylight: 'night' });
      assert.notEqual(describeCondition(code), 'Condition unavailable');
    }
  });
}

test('handles unknown, missing, and partial readings independently from daylight', () => {
  assert.deepEqual(sceneWeather(), { kind: 'neutral', daylight: 'neutral' });
  assert.deepEqual(sceneWeather({ ...base, code: 999, isDay: 1 }), { kind: 'neutral', daylight: 'day' });
  assert.deepEqual(sceneWeather({ ...base, code: 45 }), { kind: 'fog', daylight: 'neutral' });
  assert.deepEqual(sceneWeather({ ...base, isDay: 0 }), { kind: 'neutral', daylight: 'night' });
  assert.equal(describeCondition(999), 'Condition unavailable');
  assert.equal(describeCondition(), 'Condition unavailable');
});

test('retains a detailed label for conditions with shared appearance', () => {
  assert.equal(describeCondition(66), 'Light freezing rain');
  assert.equal(describeCondition(99), 'Thunderstorm with heavy hail');
});
