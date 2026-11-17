import type { Location } from './locations.ts';
import { ProviderError } from './providers.ts';
import type { WeatherReading } from './weather.ts';

const minute = 60_000;
const pollInterval = 15 * minute;
const staleAt = 30 * minute;
const expiresAt = 120 * minute;
const retry = [minute, 5 * minute, pollInterval];

export interface WeatherStatus {
  reading?: WeatherReading;
  state: 'loading' | 'current' | 'stale' | 'unavailable';
  paused: boolean;
}

interface Entry {
  reading?: WeatherReading;
  expired?: boolean;
  failures: number;
  nextAttempt: number;
  blockedUntil: number;
}

interface ActiveRequest {
  controller: AbortController;
}

type FetchWeather = (location: Location, signal: AbortSignal) => Promise<WeatherReading>;

export class WeatherUpdates {
  private readonly entries = new Map<string, Entry>();
  private readonly fetchWeather: FetchWeather;
  private readonly publish: (weather: WeatherStatus) => void;
  private location?: Location;
  private entry?: Entry;
  private active?: ActiveRequest;
  private timer?: ReturnType<typeof setTimeout>;
  private visible = true;
  private paused = false;

  constructor(fetchWeather: FetchWeather, publish: (weather: WeatherStatus) => void) {
    this.fetchWeather = fetchWeather;
    this.publish = publish;
  }

  select(location: Location): void {
    if (this.location?.id === location.id &&
        this.location.latitude === location.latitude && this.location.longitude === location.longitude) return;
    this.cancelActive();
    this.location = location;
    const key = `${location.id}:${location.latitude}:${location.longitude}`;
    const entry = this.entries.get(key) ?? { failures: 0, nextAttempt: 0, blockedUntil: 0 };
    this.entries.delete(key);
    this.entries.set(key, entry);
    if (this.entries.size > 20) this.entries.delete(this.entries.keys().next().value!);
    this.entry = entry;
    this.reconcile();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (!this.paused) this.reconcile();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) this.cancelActive();
    this.reconcile();
  }

  refresh(): void {
    if (!this.entry || this.paused || !this.visible || this.active) return;
    this.entry.nextAttempt = this.entry.blockedUntil;
    this.reconcile();
  }

  private cancelActive(): void {
    const request = this.active;
    this.active = undefined;
    request?.controller.abort();
  }

  private reconcile(): void {
    clearTimeout(this.timer);
    const entry = this.entry;
    if (!entry || !this.location) return;

    const now = Date.now();
    if (entry.reading && now >= entry.reading.sourceTime * 1000 + expiresAt) {
      entry.reading = undefined;
      entry.expired = true;
    }
    const running = this.visible && !this.paused;
    if (running && !this.active && now >= entry.nextAttempt) {
      void this.load(this.location, entry);
    }

    const reading = entry.reading;
    const source = reading ? reading.sourceTime * 1000 : 0;
    const stale = entry.failures > 0 || now >= source + staleAt;
    const state = reading ? (stale ? 'stale' : 'current') :
      this.active && !entry.expired ? 'loading' : 'unavailable';
    this.publish({ reading, state, paused: this.paused });
    if (!running) return;

    const deadlines = [];
    if (!this.active) deadlines.push(entry.nextAttempt);
    if (reading) deadlines.push(stale ? source + expiresAt : source + staleAt);
    if (deadlines.length) {
      this.timer = setTimeout(() => this.reconcile(), Math.max(1, Math.min(...deadlines) - now));
    }
  }

  private async load(location: Location, entry: Entry): Promise<void> {
    const active: ActiveRequest = { controller: new AbortController() };
    this.active = active;
    try {
      const reading = await this.fetchWeather(location, active.controller.signal);
      if (this.active !== active) return;
      if (entry.reading && entry.reading.sourceTime > reading.sourceTime) {
        throw new ProviderError('Provider returned an older weather reading', false);
      }
      entry.reading = reading;
      entry.expired = false;
      entry.failures = 0;
      entry.blockedUntil = 0;
      entry.nextAttempt = Date.now() + pollInterval;
    } catch (error) {
      if (this.active !== active) return;
      const transient = !(error instanceof ProviderError) || error.transient;
      const interval = transient ? retry[Math.min(entry.failures, retry.length - 1)] : pollInterval;
      const wait = error instanceof ProviderError ? error.retryAfter : 0;
      const now = Date.now();
      entry.failures += 1;
      entry.blockedUntil = now + wait;
      entry.nextAttempt = now + Math.max(interval, wait);
    } finally {
      if (this.active === active) {
        this.active = undefined;
        this.reconcile();
      }
    }
  }
}
