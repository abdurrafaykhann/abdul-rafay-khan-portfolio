import * as THREE from "three";
import {
  ASSEMBLE_SECONDS,
  CROSSFADE_SECONDS,
  MAX_STAGGER,
  type ParticleData,
} from "@/lib/hero/intro";
import { seeded } from "./shared";

/**
 * The subject: the original photograph on a plane (depth-parallax shader)
 * and the particles that assemble into it. Built in a 1 × 1 box; the world
 * scales and places the group so it lands exactly on the static photo.
 * The photo's pixels are never altered: the shader only shifts which pixel
 * is sampled, by a few pixels, according to the depth map.
 */

export type Phase = "loading" | "intro" | "crossfade" | "settled";

const DEPTH_RANGE = 0.28; // depth of the particle portrait, world units
const PARALLAX = 0.022; // photo shift at full depth and full pointer

const particleVertex = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aColor;
  attribute float aDelay;
  attribute float aSeed;
  uniform float uProgress;
  uniform float uTime;
  uniform float uSize;
  uniform float uScale;
  uniform float uFade;
  uniform float uScatter;
  uniform vec2 uMouse;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float start = aDelay * ${MAX_STAGGER.toFixed(3)};
    float p = clamp((uProgress - start) / (1.0 - start), 0.0, 1.0);
    p = 1.0 - pow(1.0 - p, 3.0);
    vec3 pos = mix(aStart, position, p);

    // a little drift while flying
    float fly = 1.0 - p;
    pos.x += sin(uTime * 1.7 + aSeed * 6.2831) * 0.06 * fly;
    pos.y += cos(uTime * 1.3 + aSeed * 4.0) * 0.06 * fly;

    // a fast mouse nearby pushes particles outwards
    vec2 d = pos.xy - uMouse;
    float f = uScatter * smoothstep(0.3, 0.0, length(d));
    pos.xy += normalize(d + 1e-4) * f * (0.06 + 0.12 * aSeed);
    pos.z += f * 0.12;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.6 + aSeed * 0.8) * uScale / -mv.z;

    // same bottom fade as the photo (solid to 55%, gone by 97%)
    float mask = 1.0 - smoothstep(0.55, 0.97, 0.5 - position.y);

    vColor = aColor;
    vAlpha = max(uFade, min(1.0, f * 1.6)) * mask * smoothstep(0.0, 0.08, uProgress + f);
  }
`;

const particleFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.5, 0.0, d);
    float glow = core * core;
    // dark pixels (the black suit) get a faint violet lift so they still read
    float lum = dot(vColor, vec3(0.299, 0.587, 0.114));
    vec3 col = vColor + (1.0 - lum) * vec3(0.16, 0.12, 0.26);
    gl_FragColor = vec4(col * (0.85 + glow * 0.6), glow * vAlpha);
  }
`;

const photoVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const photoFragment = /* glsl */ `
  uniform sampler2D uPhoto;
  uniform sampler2D uDepth;
  uniform vec2 uPointer;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float depth = texture2D(uDepth, vUv).r;
    vec2 uv = vUv - uPointer * (depth - 0.5) * ${PARALLAX.toFixed(4)};
    vec4 c = texture2D(uPhoto, uv);
    float mask = 1.0 - smoothstep(0.55, 0.97, 1.0 - vUv.y);
    gl_FragColor = vec4(c.rgb, c.a * mask * uOpacity);
  }
`;

export function createPortrait(o: {
  data: ParticleData;
  photo: THREE.Texture;
  depth: THREE.Texture;
  playIntro: boolean;
  touch: boolean;
}) {
  const group = new THREE.Group();

  const photoMat = new THREE.ShaderMaterial({
    vertexShader: photoVertex,
    fragmentShader: photoFragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uPhoto: { value: o.photo },
      uDepth: { value: o.depth },
      uPointer: { value: new THREE.Vector2() },
      uOpacity: { value: o.playIntro ? 0 : 1 },
    },
  });
  const planeGeo = new THREE.PlaneGeometry(1, 1);
  const photo = new THREE.Mesh(planeGeo, photoMat);
  photo.renderOrder = 5;

  const n = o.data.count;
  const target = new Float32Array(n * 3);
  const start = new Float32Array(n * 3);
  const delay = new Float32Array(n);
  const seed = new Float32Array(n);
  const rand = seeded(1234567);
  for (let i = 0; i < n; i++) {
    target[i * 3] = o.data.positions[i * 3];
    target[i * 3 + 1] = o.data.positions[i * 3 + 1];
    target[i * 3 + 2] = (o.data.positions[i * 3 + 2] - 0.5) * DEPTH_RANGE;
    // start in a wide shell around the portrait, some of it behind
    const a = rand() * Math.PI * 2;
    const r = 0.9 + rand() * 1.4;
    start[i * 3] = Math.cos(a) * r;
    start[i * 3 + 1] = Math.sin(a) * r * 0.8;
    start[i * 3 + 2] = -1.6 + rand() * 2.6;
    delay[i] = rand();
    seed[i] = rand();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(target, 3));
  geo.setAttribute("aStart", new THREE.BufferAttribute(start, 3));
  geo.setAttribute("aColor", new THREE.BufferAttribute(o.data.colors, 3));
  geo.setAttribute("aDelay", new THREE.BufferAttribute(delay, 1));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20);
  const particleMat = new THREE.ShaderMaterial({
    vertexShader: particleVertex,
    fragmentShader: particleFragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uProgress: { value: o.playIntro ? 0 : 1 },
      uTime: { value: 0 },
      uSize: { value: 0.0064 },
      uScale: { value: 1000 },
      uFade: { value: o.playIntro ? 1 : 0 },
      uScatter: { value: 0 },
      uMouse: { value: new THREE.Vector2(99, 99) },
    },
  });
  const particles = new THREE.Points(geo, particleMat);
  particles.frustumCulled = false;
  particles.renderOrder = 6;
  group.add(photo, particles);

  let phase: Phase = o.playIntro ? "intro" : "settled";
  let clock = 0;
  let speed = 1;
  let arrive = 0; // environment fade-in when there is no intro
  const smooth = { x: 0, y: 0 };

  return {
    object: group,
    get phase() {
      return phase;
    },
    /** 0..1: how far the portrait has come together (drives the environment). */
    get presence() {
      if (!o.playIntro) return Math.min(1, arrive / 0.8);
      if (phase === "intro") return (clock / ASSEMBLE_SECONDS) * 0.7;
      if (phase === "crossfade") return 0.7 + 0.3 * (clock / CROSSFADE_SECONDS);
      return 1;
    },
    /** Finish the assembly now and cross-fade quickly. */
    skip() {
      if (phase === "intro" || phase === "crossfade") {
        if (phase === "intro") clock = 0;
        phase = "crossfade";
        speed = CROSSFADE_SECONDS / 0.2;
        particleMat.uniforms.uProgress.value = 1;
      }
    },
    update(
      t: number,
      dt: number,
      scale: number,
      /** pointer relative to the portrait box (-1..1), and scatter strength */
      pointer: { nx: number; ny: number; scatter: number },
    ) {
      const pu = particleMat.uniforms;
      const ph = photoMat.uniforms;
      pu.uTime.value = t;
      pu.uScale.value = scale;
      arrive += dt;

      clock += dt * speed;
      if (phase === "intro") {
        pu.uProgress.value = Math.min(1, clock / ASSEMBLE_SECONDS);
        if (clock >= ASSEMBLE_SECONDS) {
          phase = "crossfade";
          clock = 0;
        }
      } else if (phase === "crossfade") {
        const k = Math.min(1, clock / CROSSFADE_SECONDS);
        ph.uOpacity.value = k;
        pu.uFade.value = 1 - k;
        if (k >= 1) {
          phase = "settled";
          speed = 1;
        }
      }

      // mouse on desktop, a slow sway on touch screens
      const tx = o.touch ? Math.sin(t * 0.6) * 0.55 : pointer.nx;
      const ty = o.touch ? Math.sin(t * 0.37) * 0.3 : pointer.ny;
      const ease = 1 - Math.exp(-dt * 5);
      smooth.x += (tx - smooth.x) * ease;
      smooth.y += (ty - smooth.y) * ease;
      ph.uPointer.value.set(smooth.x, -smooth.y);

      pu.uScatter.value = phase === "settled" ? pointer.scatter : 0;
      pu.uMouse.value.set(pointer.nx / 2, -pointer.ny / 2);
    },
    dispose() {
      planeGeo.dispose();
      photoMat.dispose();
      geo.dispose();
      particleMat.dispose();
    },
  };
}
