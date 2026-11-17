import {
  BufferAttribute, BufferGeometry, Color, Mesh, PlaneGeometry, Points, ShaderMaterial,
} from 'three';
import type { SceneManifest } from './scene-manifests.ts';
import type { SceneWeather, WeatherKind } from './weather.ts';

const planeVertex = `
  varying vec2 world;
  void main() {
    world = (modelMatrix * vec4(position, 1.)).xz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
  }
`;

const noise = `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.-2.*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
  }
`;

const cloudOpacity: Record<WeatherKind, number> = {
  neutral: 0, clear: 0, 'partly-cloudy': .34, overcast: .53,
  fog: .66, rain: .42, snow: .32, storm: .68,
};

export class Atmosphere {
  readonly water: Mesh<PlaneGeometry, ShaderMaterial>;
  readonly cloud: Mesh<PlaneGeometry, ShaderMaterial>;
  readonly precipitation: Points<BufferGeometry, ShaderMaterial>;

  constructor() {
    this.water = new Mesh(new PlaneGeometry(500, 500), new ShaderMaterial({
      uniforms: { time: { value: 0 }, tint: { value: new Color('#24535d') }, shine: { value: .7 } },
      vertexShader: planeVertex,
      fragmentShader: `
        varying vec2 world;
        uniform float time, shine;
        uniform vec3 tint;
        ${noise}
        void main() {
          vec2 p = floor(world * 15.) / 15.;
          float current = noise(p * .22 + vec2(time * .07, 0.));
          float foam = noise(p * vec2(1.9, 7.) + vec2(time * .55, time * .08));
          float sparkle = smoothstep(.61, .93, foam) * smoothstep(.45, .71, current);
          gl_FragColor = vec4(tint * (.8 + .38 * current) + sparkle * shine * vec3(.27,.43,.45), 1.);
          #include <colorspace_fragment>
        }
      `,
    }));
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = -.02;

    this.cloud = new Mesh(new PlaneGeometry(230, 200), new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        time: { value: 0 }, opacity: { value: 0 }, density: { value: .51 },
        tint: { value: new Color('#b4ccd4') },
      },
      vertexShader: planeVertex,
      fragmentShader: `
        varying vec2 world;
        uniform float time, opacity, density;
        uniform vec3 tint;
        ${noise}
        void main() {
          vec2 p = floor(world * 12.) / 12. * vec2(.105,.26) + vec2(time*.065,-time*.036);
          float vapor = noise(p)*.65 + noise(p*2.2)*.23 + noise(p*5.3)*.12;
          float coverage = smoothstep(density, .85, vapor);
          gl_FragColor = vec4(tint * (.86 + .2 * vapor), coverage * opacity);
          #include <colorspace_fragment>
        }
      `,
    }));
    this.cloud.rotation.x = -Math.PI / 2;
    this.cloud.renderOrder = 1;

    const distribution = new Float32Array(1750 * 3);
    let seed = 913;
    for (let i = 0; i < distribution.length; i += 1) {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      distribution[i] = seed / 4294967296;
    }
    const geometry = new BufferGeometry().setAttribute('position', new BufferAttribute(distribution, 3));
    this.precipitation = new Points(geometry, new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        time: { value: 0 }, snow: { value: 0 }, strength: { value: .7 }, scale: { value: 1 },
        width: { value: 100 }, depth: { value: 70 }, height: { value: 25 },
      },
      vertexShader: `
        uniform float time, snow, scale, width, depth, height;
        varying float phase;
        void main() {
          phase = position.x;
          vec3 p = vec3(
            (fract(position.x + time * .008) - .5) * width + sin(time+position.z*13.) * snow * .6,
            fract(position.y - time * mix(.76,.12,snow)) * height,
            (position.z - .5) * depth
          );
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.);
          gl_PointSize = mix(8.,3.2,snow) * clamp(scale, .6, 1.35);
        }
      `,
      fragmentShader: `
        uniform float snow, strength;
        varying float phase;
        void main() {
          vec2 p = gl_PointCoord - .5;
          float streak = step(abs(p.x - p.y*.33), .095) * (1.-abs(p.y)*1.4);
          float flake = 1. - smoothstep(.25,.51,length(p));
          gl_FragColor = vec4(mix(vec3(.54,.67,.79),vec3(.82,.9,.98),snow),
            mix(streak, flake, snow)*strength*(.35+.65*phase));
          #include <colorspace_fragment>
        }
      `,
    }));
    this.precipitation.frustumCulled = false;
    this.precipitation.renderOrder = 2;
  }

  apply(weather: SceneWeather, manifest: SceneManifest): void {
    const { kind, daylight } = weather;
    const night = daylight === 'night';
    const fog = kind === 'fog';
    const cloud = this.cloud.material.uniforms;
    const water = this.water.material.uniforms;
    const drops = this.precipitation.material.uniforms;

    this.water.visible = manifest.water;
    water.tint.value.set(night ? '#122734' : fog ? '#23505a' : '#236473');
    water.shine.value = night ? .12 : .32;

    this.cloud.visible = cloudOpacity[kind] > 0;
    this.cloud.position.y = fog ? manifest.effects.fogHeight : manifest.effects.height * .75;
    cloud.opacity.value = cloudOpacity[kind];
    cloud.density.value = kind === 'overcast' || kind === 'storm' ? .31 : .49;
    cloud.tint.value.set(kind === 'storm' ? '#344466' : night ? '#606d8a' : '#c5d8dc');

    this.precipitation.visible = kind === 'rain' || kind === 'snow' || kind === 'storm';
    drops.snow.value = Number(kind === 'snow');
    drops.strength.value = kind === 'storm' ? .77 : kind === 'rain' ? .54 : .85;
    drops.width.value = manifest.effects.width;
    drops.depth.value = manifest.effects.depth;
    drops.height.value = manifest.effects.height;
  }

  update(time: number, scale: number): void {
    this.water.material.uniforms.time.value = time;
    this.cloud.material.uniforms.time.value = time;
    this.precipitation.material.uniforms.time.value = time;
    this.precipitation.material.uniforms.scale.value = scale;
  }
}
