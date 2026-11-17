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
}

export function assetUrl(path: string): string {
  return import.meta.env.BASE_URL + path;
}

export const bridge: SceneManifest = {
  id: 'bridge',
  model: 'scenes/bridge.glb',
  poster: 'scenes/bridge.webp',
  portraitPoster: 'scenes/bridge-portrait.webp',
  camera: { position: [-26, 105, 174], target: [0, 0, 0], width: 74, portraitWidth: 59 },
  effects: { width: 107, depth: 73, height: 25, fogHeight: 4.3 },
  water: true,
};
