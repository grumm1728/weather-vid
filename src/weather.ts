const conditions = {
  0: ['clear', 'Clear'],
  1: ['partly-cloudy', 'Mostly clear'],
  2: ['partly-cloudy', 'Partly cloudy'],
  3: ['overcast', 'Overcast'],
  45: ['fog', 'Fog'],
  48: ['fog', 'Rime fog'],
  51: ['rain', 'Light drizzle'],
  53: ['rain', 'Drizzle'],
  55: ['rain', 'Heavy drizzle'],
  56: ['rain', 'Light freezing drizzle'],
  57: ['rain', 'Heavy freezing drizzle'],
  61: ['rain', 'Light rain'],
  63: ['rain', 'Rain'],
  65: ['rain', 'Heavy rain'],
  66: ['rain', 'Light freezing rain'],
  67: ['rain', 'Heavy freezing rain'],
  71: ['snow', 'Light snow'],
  73: ['snow', 'Snow'],
  75: ['snow', 'Heavy snow'],
  77: ['snow', 'Snow grains'],
  80: ['rain', 'Light showers'],
  81: ['rain', 'Showers'],
  82: ['rain', 'Heavy showers'],
  85: ['snow', 'Light snow showers'],
  86: ['snow', 'Heavy snow showers'],
  95: ['storm', 'Thunderstorm'],
  96: ['storm', 'Thunderstorm with light hail'],
  97: ['storm', 'Heavy thunderstorm'],
  99: ['storm', 'Thunderstorm with heavy hail'],
} as const;

type ConditionCode = keyof typeof conditions;
export type WeatherKind = (typeof conditions)[ConditionCode][0] | 'neutral';
export type Daylight = 'day' | 'night' | 'neutral';

export interface SceneWeather {
  kind: WeatherKind;
  daylight: Daylight;
}

export interface WeatherReading {
  code?: number;
  isDay?: 0 | 1;
  fahrenheit?: number;
  sourceTime: number;
  timeZone: string;
}

function conditionFor(code?: number) {
  return typeof code === 'number' && Object.hasOwn(conditions, code)
    ? conditions[code as ConditionCode]
    : undefined;
}

export function describeCondition(code?: number): string {
  return conditionFor(code)?.[1] ?? 'Condition unavailable';
}

export function sceneWeather(reading?: WeatherReading): SceneWeather {
  let daylight: Daylight = 'neutral';
  if (reading?.isDay === 1) daylight = 'day';
  if (reading?.isDay === 0) daylight = 'night';
  return { kind: conditionFor(reading?.code)?.[0] ?? 'neutral', daylight };
}
