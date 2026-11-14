import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  LineSegments,
  Object3D,
  Points,
  ShaderMaterial,
  Sphere,
  Vector2,
  Vector3,
} from "three";
import type { Choreography } from "@/lib/hero/choreography";

/** Per-frame input for every layer of the hero world. */
export type Frame = {
  /** seconds since the scene started */
  t: number;
  dt: number;
  c: Choreography;
  /** 0..1: the environment fades in as the portrait assembles */
  env: number;
  /** pointer across the whole hero, -1..1 */
  px: number;
  py: number;
  /** pixels per world unit at distance 1 (for point sizes) */
  scale: number;
};

export type Layer = {
  object: Object3D;
  update(f: Frame): void;
  dispose(): void;
};

/** Small deterministic random generator (same scene on every visit). */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const color = (hex: string) => new Color(hex);

/** Gentle organic drift, identical for nodes and the lines joining them. */
export const WOBBLE_GLSL = /* glsl */ `
  vec3 wobble(vec3 p, float t) {
    return vec3(
      sin(t * 0.50 + p.y * 3.0 + p.z),
      cos(t * 0.43 + p.x * 2.7),
      sin(t * 0.37 + p.x + p.y * 2.0)
    ) * 0.03;
  }
`;

const pulseVertex = /* glsl */ `
  attribute float aT;
  attribute float aSeed;
  attribute float aOrder;
  attribute vec3 aColor;
  uniform float uTime;
  varying float vT;
  varying float vSeed;
  varying float vOrder;
  varying vec3 vColor;
  varying float vDepth;
  ${WOBBLE_GLSL}
  void main() {
    vT = aT; vSeed = aSeed; vOrder = aOrder; vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position + wobble(position, uTime), 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const pulseFragment = /* glsl */ `
  uniform float uTime;
  uniform float uReveal;
  uniform float uAlpha;
  uniform float uBase;
  uniform vec3 uPulseColor;
  varying float vT;
  varying float vSeed;
  varying float vOrder;
  varying vec3 vColor;
  varying float vDepth;
  void main() {
    // each line appears in turn as uReveal rises
    float gate = smoothstep(vOrder, vOrder + 0.25, uReveal * 1.25);
    // a soft pulse of light travels along the line
    float head = fract(uTime * (0.12 + vSeed * 0.1) + vSeed * 7.0);
    float d = abs(vT - head);
    d = min(d, 1.0 - d);
    float pulse = smoothstep(0.14, 0.0, d);
    float near = smoothstep(0.2, 0.9, vDepth);
    vec3 col = mix(vColor, uPulseColor, pulse * 0.7);
    gl_FragColor = vec4(col, gate * near * uAlpha * (uBase + pulse * 0.75));
  }
`;

export type Segment = {
  a: Vector3;
  b: Vector3;
  color: Color;
  /** 0..1: when this line appears during the reveal */
  order: number;
};

/** Thin glowing lines with light pulses running along them. */
export function createPulseLines(
  segments: Segment[],
  opts: { pulse: string; base?: number; seed?: number },
) {
  const rand = seeded(opts.seed ?? 5);
  const n = segments.length;
  const pos = new Float32Array(n * 6);
  const t = new Float32Array(n * 2);
  const seed = new Float32Array(n * 2);
  const order = new Float32Array(n * 2);
  const col = new Float32Array(n * 6);
  segments.forEach((s, i) => {
    s.a.toArray(pos, i * 6);
    s.b.toArray(pos, i * 6 + 3);
    t[i * 2] = 0;
    t[i * 2 + 1] = 1;
    seed[i * 2] = seed[i * 2 + 1] = rand();
    order[i * 2] = order[i * 2 + 1] = s.order;
    s.color.toArray(col, i * 6);
    s.color.toArray(col, i * 6 + 3);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(pos, 3));
  geometry.setAttribute("aT", new BufferAttribute(t, 1));
  geometry.setAttribute("aSeed", new BufferAttribute(seed, 1));
  geometry.setAttribute("aOrder", new BufferAttribute(order, 1));
  geometry.setAttribute("aColor", new BufferAttribute(col, 3));
  geometry.boundingSphere = new Sphere(new Vector3(), 20);
  const material = new ShaderMaterial({
    vertexShader: pulseVertex,
    fragmentShader: pulseFragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uAlpha: { value: 1 },
      uBase: { value: opts.base ?? 0.16 },
      uPulseColor: { value: color(opts.pulse) },
    },
  });
  const lines = new LineSegments(geometry, material);
  lines.frustumCulled = false;
  return { lines, material, geometry };
}

const pointVertex = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  attribute float aOrder;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uScale;
  uniform float uReveal;
  uniform float uAlpha;
  uniform float uWobble;
  uniform vec2 uPointer;
  varying vec3 vColor;
  varying float vAlpha;
  ${WOBBLE_GLSL}
  void main() {
    vec3 p = position;
    if (uWobble > 0.5) {
      p += wobble(position, uTime);
    } else {
      // free-floating dust: slow drift, slight pull towards the pointer
      p.x += sin(uTime * 0.25 + aSeed * 40.0) * 0.06;
      p.y += cos(uTime * 0.20 + aSeed * 23.0) * 0.05;
      p.xy += uPointer * 0.05 * (p.z + 6.0) / 8.0;
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = -mv.z;
    gl_PointSize = aSize * uScale / dist;
    float gate = smoothstep(aOrder, aOrder + 0.25, uReveal * 1.25);
    float twinkle = 0.75 + 0.25 * sin(uTime * (0.6 + aSeed) + aSeed * 50.0);
    // fade out instead of popping when the camera passes close by
    vAlpha = uAlpha * gate * twinkle * smoothstep(0.15, 0.8, dist);
    vColor = aColor;
  }
`;

const pointFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, a * a * vAlpha);
  }
`;

export type Dot = {
  p: Vector3;
  color: Color;
  /** world-unit diameter */
  size: number;
  order: number;
};

/** Soft glowing points (dust, network nodes). One draw call. */
export function createGlowPoints(
  dots: Dot[],
  opts: { wobble: boolean; seed?: number },
) {
  const rand = seeded(opts.seed ?? 9);
  const n = dots.length;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const seed = new Float32Array(n);
  const order = new Float32Array(n);
  dots.forEach((d, i) => {
    d.p.toArray(pos, i * 3);
    d.color.toArray(col, i * 3);
    size[i] = d.size;
    seed[i] = rand();
    order[i] = d.order;
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(pos, 3));
  geometry.setAttribute("aColor", new BufferAttribute(col, 3));
  geometry.setAttribute("aSize", new BufferAttribute(size, 1));
  geometry.setAttribute("aSeed", new BufferAttribute(seed, 1));
  geometry.setAttribute("aOrder", new BufferAttribute(order, 1));
  geometry.boundingSphere = new Sphere(new Vector3(), 20);
  const material = new ShaderMaterial({
    vertexShader: pointVertex,
    fragmentShader: pointFragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 1000 },
      uReveal: { value: 1 },
      uAlpha: { value: 1 },
      uWobble: { value: opts.wobble ? 1 : 0 },
      uPointer: { value: new Vector2() },
    },
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  return { points, material, geometry };
}
