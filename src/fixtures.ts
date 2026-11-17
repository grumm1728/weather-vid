import type { WeatherReading } from './weather.ts';

type Fixture = [string, number | undefined, WeatherReading['isDay'], number | undefined];

const fixtures = {
  fog: ['Fog', 45, 1, 58],
  'clear-day': ['Clear day', 0, 1, 68],
  'clear-night': ['Clear night', 0, 0, 50],
  'partly-cloudy': ['Partly cloudy', 2, 1, 64],
  overcast: ['Overcast', 3, 1, 60],
  rain: ['Rain', 63, 1, 55],
  'rain-night': ['Rain at night', 63, 0, 53],
  snow: ['Snow', 73, 1, 30],
  storm: ['Thunderstorm', 95, 0, 49],
  unknown: ['Unknown condition', 999, 1, 61],
  neutral: ['Unavailable', undefined, undefined, undefined],
} satisfies Record<string, Fixture>;

export const defaultFixture = 'fog';
export const fixtureOptions = Object.entries(fixtures).map(([id, [label]]) => ({ id, label }));

export function fixtureReading(id: string): WeatherReading | undefined {
  if (id === 'neutral') return undefined;
  const [, code, isDay, fahrenheit] = Object.hasOwn(fixtures, id)
    ? fixtures[id as keyof typeof fixtures]
    : fixtures[defaultFixture];
  return { code, isDay, fahrenheit, sourceTime: 1_784_825_400, timeZone: 'America/Los_Angeles' };
}
