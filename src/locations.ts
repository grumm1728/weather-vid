export type SceneId = 'bridge' | 'theatre' | 'landscape';

export interface Location {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  scene: SceneId;
}

export const presets: readonly [Location, Location] = [
  { id: 'bridge', name: 'Golden Gate Bridge', region: 'San Francisco, CA', latitude: 37.8199, longitude: -122.4783, scene: 'bridge' },
  { id: 'theatre', name: 'Grand Lake Theater', region: 'Oakland, CA', latitude: 37.811, longitude: -122.2473, scene: 'theatre' },
];

const selectionKey = 'weather-miniatures.location.v1';

function validText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

export function validCoordinate(value: unknown, limit: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;
}

export function normalizeSearchResult(raw: unknown): Location | undefined {
  if (!raw || typeof raw !== 'object') return;
  const fields = raw as Record<string, unknown>;
  const { id, name, latitude, longitude } = fields;
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0 || !validText(name, 150) ||
      !validCoordinate(latitude, 90) || !validCoordinate(longitude, 180)) return;
  const parts = [fields.admin1, fields.country].filter(part => validText(part, 150) && part !== name);
  return {
    id: `geonames:${id}`,
    name,
    region: [...new Set(parts)].join(', '),
    latitude,
    longitude,
    scene: 'landscape',
  };
}

export function loadLocation(getStorage: () => Pick<Storage, 'getItem'> = () => localStorage): Location {
  try {
    const saved = getStorage().getItem(selectionKey);
    if (!saved) return presets[0];
    const selection = JSON.parse(saved) as Record<string, unknown> | null;
    if (!selection) return presets[0];
    const preset = presets.find(({ id }) => id === selection.id);
    if (preset) return preset;
    const { id, name, region, latitude, longitude } = selection;
    if (typeof id === 'string' && /^geonames:[1-9]\d{0,15}$/.test(id) &&
        validText(name, 150) && typeof region === 'string' && region.length <= 302 &&
        validCoordinate(latitude, 90) && validCoordinate(longitude, 180)) {
      return { id, name, region, latitude, longitude, scene: 'landscape' };
    }
  } catch {
    // Storage access and legacy values are optional.
  }
  return presets[0];
}

export function saveLocation(selection: Location, getStorage: () => Pick<Storage, 'setItem'> = () => localStorage): void {
  try {
    getStorage().setItem(selectionKey, JSON.stringify(selection));
  } catch {
    // A selection still works when storage is full or disabled.
  }
}
