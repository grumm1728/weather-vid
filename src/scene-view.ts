import {
  Color, DirectionalLight, HemisphereLight, Material, Mesh, OrthographicCamera, PointLight, Scene, Texture,
  Vector2, WebGLRenderer,
} from 'three';
import type { Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Atmosphere } from './atmosphere.ts';
import { assetUrl } from './scene-manifests.ts';
import type { SceneManifest } from './scene-manifests.ts';
import type { SceneWeather } from './weather.ts';

function disposeModel(model: Object3D): void {
  const geometries = new Set<Mesh['geometry']>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  model.traverse(object => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof Texture) textures.add(value);
      }
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) texture.dispose();
}

export class SceneView {
  private readonly camera = new OrthographicCamera(-37, 37, 21, -21, .1, 350);
  private readonly scene = new Scene();
  private readonly ambient = new HemisphereLight();
  private readonly sun = new DirectionalLight();
  private readonly accent = new PointLight(0xffffff, 0, 22);
  private readonly loader = new GLTFLoader();
  private readonly dimensions = new Vector2();
  private renderer?: WebGLRenderer;
  private atmosphere?: Atmosphere;
  private manifest?: SceneManifest;
  private model?: Object3D;
  private weather: SceneWeather = { kind: 'neutral', daylight: 'neutral' };
  private frame = 0;
  private lastFrame?: number;
  private slowFrames = 0;
  private resolutionScale = .68;
  private time = 0;
  private generation = 0;
  private paused = false;
  private lost = false;

  constructor(private readonly container: HTMLElement, private readonly poster: HTMLImageElement) {
    this.container.dataset.renderer = 'still';
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', { alpha: false, antialias: false });
    if (!context) return;

    try {
      this.renderer = new WebGLRenderer({ canvas, context, alpha: false, antialias: false });
    } catch {
      return;
    }

    this.atmosphere = new Atmosphere();
    this.sun.position.set(-15, 38, 18);
    this.scene.add(this.ambient, this.sun, this.accent, this.atmosphere.water, this.atmosphere.cloud, this.atmosphere.precipitation);
    canvas.hidden = true;
    this.container.append(canvas);
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      this.lost = true;
      this.cancelFrame();
      this.showStill();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.lost = false;
      this.requestFrame();
    });
    new ResizeObserver(() => {
      this.resize();
      this.requestFrame();
    }).observe(this.container);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.cancelFrame();
      else this.requestFrame();
    });
  }

  async select(manifest: SceneManifest): Promise<void> {
    if (this.manifest?.id === manifest.id) return;
    const generation = ++this.generation;
    this.manifest = manifest;
    this.cancelFrame();
    this.resolutionScale = .68;
    this.slowFrames = 0;
    this.updatePoster();
    this.showStill();
    if (!this.renderer) return;
    if (this.model) {
      this.scene.remove(this.model);
      disposeModel(this.model);
      this.model = undefined;
    }

    this.resize();
    this.applyWeather();
    try {
      const { scene } = await this.loader.loadAsync(assetUrl(manifest.model));
      if (generation !== this.generation) {
        disposeModel(scene);
        return;
      }
      this.model = scene;
      this.scene.add(scene);
      this.requestFrame();
    } catch {
      if (generation === this.generation) this.showStill();
    }
  }

  setWeather(weather: SceneWeather): void {
    if (weather.kind === this.weather.kind && weather.daylight === this.weather.daylight) return;
    this.weather = weather;
    this.applyWeather();
    this.requestFrame();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.lastFrame = undefined;
    this.requestFrame();
  }

  private updatePoster(): void {
    if (!this.manifest) return;
    const portrait = this.container.clientWidth < this.container.clientHeight;
    const path = portrait ? this.manifest.portraitPoster ?? this.manifest.poster : this.manifest.poster;
    const url = assetUrl(path);
    if (this.poster.getAttribute('src') !== url) this.poster.src = url;
  }

  private resize(): void {
    this.updatePoster();
    if (!this.manifest || !this.renderer) return;
    const { clientWidth: width, clientHeight: height } = this.container;
    if (!width || !height) return;
    const aspect = width / height;
    const camera = this.manifest.camera;
    const landscapeWidth = Math.max(camera.width, camera.width / 2.1 * aspect);
    const halfWidth = (aspect < 1 ? camera.portraitWidth : landscapeWidth) / 2;
    const halfHeight = halfWidth / aspect;
    this.camera.left = -halfWidth;
    this.camera.right = halfWidth;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.position.set(...camera.position);
    this.camera.lookAt(...camera.target);
    this.camera.updateProjectionMatrix();
    const scale = Math.min(this.resolutionScale, 1100 / width, 700 / height);
    this.renderer.setSize(Math.max(1, Math.floor(width * scale)), Math.max(1, Math.floor(height * scale)), false);
  }

  private applyWeather(): void {
    if (!this.manifest || !this.atmosphere) return;
    const { kind, daylight } = this.weather;
    const night = daylight === 'night';
    const gray = kind === 'overcast' || kind === 'storm' || kind === 'rain';
    const light = kind === 'clear' || kind === 'partly-cloudy';
    this.scene.background = new Color(night ? '#111d36' : gray ? '#8896a4' : '#94b8be');
    this.ambient.color.set(night ? '#adbcfe' : '#effaff');
    this.ambient.groundColor.set(night ? '#3c4675' : '#93806e');
    this.ambient.intensity = night ? .73 : daylight === 'neutral' ? 1.7 : 1.8;
    this.sun.color.set(night ? '#a0baff' : '#ffedcd');
    this.sun.intensity = night ? .32 : daylight === 'neutral' || gray ? .65 : light ? 2.1 : 1.15;
    const accent = this.manifest.nightLight;
    this.accent.visible = Boolean(night && accent);
    if (accent) {
      this.accent.position.set(...accent.position);
      this.accent.color.set(accent.color);
      this.accent.intensity = accent.intensity;
    }
    this.atmosphere.apply(this.weather, this.manifest);
  }

  private showStill(): void {
    if (this.renderer) this.renderer.domElement.hidden = true;
    this.poster.hidden = false;
    this.container.dataset.renderer = 'still';
  }

  private cancelFrame(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.lastFrame = undefined;
  }

  private requestFrame(): void {
    if (!this.frame && this.renderer && this.model && !this.lost && !document.hidden) {
      this.frame = requestAnimationFrame(this.draw);
    }
  }

  private readonly draw = (now: number): void => {
    this.frame = 0;
    if (!this.renderer || !this.atmosphere || this.lost) return;
    if (!this.paused && this.lastFrame !== undefined) {
      const elapsed = now - this.lastFrame;
      this.time += Math.min(elapsed / 1000, .05);
      if (this.resolutionScale > .38) {
        this.slowFrames = elapsed > 35 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 1);
        if (this.slowFrames >= 6) {
          this.resolutionScale = Math.max(.38, this.resolutionScale - .10);
          this.slowFrames = 0;
          this.resize();
        }
      }
    }
    this.lastFrame = now;
    this.renderer.getDrawingBufferSize(this.dimensions);
    this.atmosphere.update(this.time, this.dimensions.x / 720);
    try {
      this.renderer.render(this.scene, this.camera);
    } catch {
      this.showStill();
      return;
    }
    this.renderer.domElement.hidden = false;
    this.poster.hidden = true;
    this.container.dataset.renderer = 'webgl';
    if (!this.paused) this.requestFrame();
  };
}
