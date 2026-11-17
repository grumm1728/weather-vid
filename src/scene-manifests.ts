import type { SceneId } from './locations.ts';

type Vector = [number, number, number];

export interface SceneManifest {
  id: string;
  model: string;
  poster: string;
  portraitPoster?: string;
  camera: {
    position: Vector;
    target: Vector;
    width: number;
    portraitWidth: number;
  };
  effects: {
    width: number;
    depth: number;
    height: number;
    fogHeight: number;
  };
  water: boolean;
  nightLight?: { position: Vector; color: string; intensity: number };
}

export function assetUrl(path: string): string {
  return import.meta.env.BASE_URL + path;
}

export const scenes: Record<SceneId, SceneManifest> = {
  bridge: {
    id: 'bridge',
    model: 'scenes/bridge.glb',
    poster: 'scenes/bridge.webp',
    portraitPoster: 'scenes/bridge-portrait.webp',
    camera: { position: [-26, 105, 174], target: [0, 0, 0], width: 74, portraitWidth: 59 },
    effects: { width: 107, depth: 73, height: 25, fogHeight: 4.3 },
    water: true,
  },
  theatre: {
    id: 'theatre',
    model: 'scenes/theatre.glb',
    poster: 'scenes/theatre.webp',
    portraitPoster: 'scenes/theatre-portrait.webp',
    camera: { position: [35, 58, 151], target: [0, 6.4, 1.5], width: 46, portraitWidth: 30 },
    effects: { width: 62, depth: 80, height: 37, fogHeight: 8.7 },
    water: false,
    nightLight: { position: [0, 3.1, 9.75], color: '#ffb158', intensity: 94 },
  },
  landscape: {
    id: 'landscape',
    model: 'scenes/landscape.glb',
    poster: 'scenes/landscape.webp',
    portraitPoster: 'scenes/landscape-portrait.webp',
    camera: { position: [14, 127, 158], target: [0, 7, -10], width: 108, portraitWidth: 68 },
    effects: { width: 127, depth: 129, height: 38, fogHeight: 6 },
    water: true,
  },
};
