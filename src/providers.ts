import { normalizeSearchResult } from './locations.ts';
import type { Location } from './locations.ts';
import type { WeatherReading } from './weather.ts';

export class ProviderError extends Error {
  readonly transient: boolean;
  readonly retryAfter: number;

  constructor(message: string, transient: boolean, retryAfter = 0) {
    super(message);
    this.name = 'ProviderError';
    this.transient = transient;
    this.retryAfter = retryAfter;
  }
}

function delayFromHeader(header: string | null, now = Date.now()): number {
  if (!header) return 0;
  if (/^\d+$/.test(header)) return Math.min(2_147_483_647, Number(header) * 1000);
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.min(2_147_483_647, Math.max(0, date - now)) : 0;
}

async function request(url: string, signal: AbortSignal): Promise<unknown> {
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(10_000)]);
  const response = await fetch(url, { signal: requestSignal, cache: 'no-store' });
  if (!response.ok) {
    const status = response.status;
    throw new ProviderError(`Provider returned HTTP ${status}`, status === 408 || status === 429 || status >= 500,
      delayFromHeader(response.headers.get('Retry-After')));
  }
  try {
    return await response.json();
  } catch (error) {
    if (requestSignal.aborted) throw error;
    throw new ProviderError('Invalid provider response', false);
  }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

export function normalizeReading(payload: unknown): WeatherReading {
  const data = record(payload);
  const current = record(data?.current);
  const sourceTime = current?.time;
  if (typeof sourceTime !== 'number' || !Number.isSafeInteger(sourceTime) || sourceTime <= 0 ||
      sourceTime * 1000 > Date.now() + 5 * 60_000) {
    throw new ProviderError('Invalid weather timestamp', false);
  }
  const { weather_code, is_day, temperature_2m } = current!;
  const code = typeof weather_code === 'number' && Number.isInteger(weather_code) ? weather_code : undefined;
  const isDay = is_day === 1 || is_day === 0 ? is_day : undefined;
  const fahrenheit = typeof temperature_2m === 'number' && Number.isFinite(temperature_2m) ? temperature_2m : undefined;
  if (code === undefined && isDay === undefined && fahrenheit === undefined) {
    throw new ProviderError('No usable weather fields', false);
  }
  let timeZone = typeof data?.timezone === 'string' ? data.timezone : 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
  } catch {
    timeZone = 'UTC';
  }
  return { code, isDay, fahrenheit, sourceTime, timeZone };
}

export async function fetchWeather(selection: Location, signal: AbortSignal): Promise<WeatherReading> {
  const params = new URLSearchParams({
    latitude: String(selection.latitude),
    longitude: String(selection.longitude),
    current: 'temperature_2m,weather_code,is_day',
    temperature_unit: 'fahrenheit',
    timeformat: 'unixtime',
    timezone: 'auto',
  });
  return normalizeReading(await request(`https://api.open-meteo.com/v1/forecast?${params}`, signal));
}

export async function searchPlaces(query: string, signal: AbortSignal): Promise<Location[]> {
  const params = new URLSearchParams({ name: query, count: '8', language: 'en' });
  const data = record(await request(`https://geocoding-api.open-meteo.com/v1/search?${params}`, signal));
  if (!data || data.error || (data.results !== undefined && !Array.isArray(data.results))) {
    throw new ProviderError('Invalid place results', false);
  }
  const matches: Location[] = [];
  const seen = new Set<string>();
  for (const raw of data.results ?? []) {
    const normalized = normalizeSearchResult(raw);
    if (!normalized || seen.has(normalized.id)) continue;
    matches.push(normalized);
    seen.add(normalized.id);
    if (matches.length === 8) break;
  }
  return matches;
}
