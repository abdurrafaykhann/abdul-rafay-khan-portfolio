"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  ASSEMBLE_SECONDS,
  CROSSFADE_SECONDS,
  MAX_STAGGER,
  parseParticles,
  scatterFromSpeed,
  type ParticleData,
} from "@/lib/hero/intro";

/**
 * The 3D hero portrait.
 * - Intro: particles sampled from the photo fly in and assemble into the
 *   portrait (positions from the depth map), then cross-fade into the photo.
 * - After: a depth-parallax shader on the photo follows the mouse (phones
 *   sway gently instead); fast mouse moves scatter a few particles.
 * The canvas is EXTEND larger than the photo on every side so flying
 * particles aren't clipped; the photo occupies the centre.
 */

const EXTEND = 0.2; // per side, as a fraction of the photo box
const SCALE = 1 / (1 + 2 * EXTEND);
const DEPTH_WORLD = 0.28; // depth range in world units for particles
const PARALLAX = 0.022; // photo UV shift at full depth and full pointer

export type Phase = "loading" | "intro" | "crossfade" | "settled";

type Props = {
  photoSrc: string;
  depthSrc: string;
  particlesSrc: string;
  playIntro: boolean;
  touch: boolean;
  particleLimit: number;
  /** Increments when the visitor asks to skip the intro. */
  skipSignal: number;
  active: boolean;
  onPhase: (phase: Phase) => void;
};

// Shared pointer state, updated by window listeners (cheap, no re-renders).
type Pointer = {
  /** -1..1 across the photo box (can exceed slightly) */
  nx: number;
  ny: number;
  /** strength at the last fast move, and when it happened (ms) */
  scatter: number;
  scatterAt: number;
  lastX: number;
  lastY: number;
  lastT: number;
};

/** Scatter fades out over ~1 s after a fast move. */
function decayedScatter(p: Pointer, now: number): number {
  return p.scatter * Math.exp(-((now - p.scatterAt) / 1000) * 3.5);
}

const particleVertex = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aColor;
  attribute float aDelay;
  attribute float aSeed;
  uniform float uProgress;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uFade;
  uniform float uScatter;
  uniform vec2 uMouse;
  uniform float uPhotoH;
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

    // fast mouse nearby pushes particles outwards
    vec2 d = pos.xy - uMouse;
    float dist = length(d);
    float f = uScatter * smoothstep(0.32, 0.0, dist);
    pos.xy += normalize(d + 1e-4) * f * (0.06 + 0.12 * aSeed);
    pos.z += f * 0.12;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (0.6 + aSeed * 0.8) * (3.0 / -mv.z);

    // same bottom fade as the photo (CSS mask: solid to 55%, gone by 97%)
    float fromTop = 0.5 - position.y / uPhotoH;
    float mask = 1.0 - smoothstep(0.55, 0.97, fromTop);

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
    // dark pixels (the black suit) get a faint violet glow so they still read
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
    float fromTop = 1.0 - vUv.y;
    float mask = 1.0 - smoothstep(0.55, 0.97, fromTop);
    gl_FragColor = vec4(c.rgb, c.a * mask * uOpacity);
  }
`;

function Scene({
  data,
  photo,
  depth,
  playIntro,
  touch,
  skipSignal,
  pointer,
  onPhase,
}: {
  data: ParticleData;
  photo: THREE.Texture;
  depth: THREE.Texture;
  playIntro: boolean;
  touch: boolean;
  skipSignal: number;
  pointer: React.RefObject<Pointer>;
  onPhase: (phase: Phase) => void;
}) {
  const { viewport, gl } = useThree();
  const w = viewport.width * SCALE;
  const h = viewport.height * SCALE;

  const clock = useRef({
    phase: (playIntro ? "intro" : "settled") as Phase,
    t: 0, // seconds into the current phase
    speed: 1,
  });
  const smooth = useRef({ x: 0, y: 0 });
  const reported = useRef<Phase | null>(null);
  const skipSeen = useRef(skipSignal);
  const pointsRef = useRef<THREE.Points>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = data.count;
    const target = new Float32Array(n * 3);
    const start = new Float32Array(n * 3);
    const delay = new Float32Array(n);
    const seed = new Float32Array(n);
    // deterministic pseudo-random so the intro looks the same each time
    let s = 1234567;
    const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) {
      target[i * 3] = data.positions[i * 3] * w;
      target[i * 3 + 1] = data.positions[i * 3 + 1] * h;
      target[i * 3 + 2] = (data.positions[i * 3 + 2] - 0.5) * DEPTH_WORLD;
      // start scattered in a wide shell around the portrait, some behind it
      const a = rand() * Math.PI * 2;
      const r = 0.9 + rand() * 1.4;
      start[i * 3] = Math.cos(a) * r * w;
      start[i * 3 + 1] = Math.sin(a) * r * h * 0.8;
      start[i * 3 + 2] = -1.6 + rand() * 2.6;
      delay[i] = rand();
      seed[i] = rand();
    }
    g.setAttribute("position", new THREE.BufferAttribute(target, 3));
    g.setAttribute("aStart", new THREE.BufferAttribute(start, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(data.colors, 3));
    g.setAttribute("aDelay", new THREE.BufferAttribute(delay, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
    return g;
  }, [data, w, h]);

  const particleMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: particleVertex,
        fragmentShader: particleFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uProgress: { value: playIntro ? 0 : 1 },
          uTime: { value: 0 },
          uSize: { value: touch ? 5 : 4 },
          uPixelRatio: { value: gl.getPixelRatio() },
          uFade: { value: playIntro ? 1 : 0 },
          uScatter: { value: 0 },
          uMouse: { value: new THREE.Vector2(99, 99) },
          uPhotoH: { value: h },
        },
      }),
    // created once; uniforms are updated every frame
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const photoMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: photoVertex,
        fragmentShader: photoFragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uPhoto: { value: photo },
          uDepth: { value: depth },
          uPointer: { value: new THREE.Vector2() },
          uOpacity: { value: playIntro ? 0 : 1 },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [photo, depth],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => particleMat.dispose(), [particleMat]);
  useEffect(() => () => photoMat.dispose(), [photoMat]);

  useFrame((state, delta) => {
    const pts = pointsRef.current;
    const mesh = meshRef.current;
    if (!pts || !mesh) return;
    const dt = Math.min(delta, 0.05);
    const c = clock.current;
    const pu = (pts.material as THREE.ShaderMaterial).uniforms;
    const ph = (mesh.material as THREE.ShaderMaterial).uniforms;
    pu.uTime.value = state.clock.elapsedTime;
    pu.uPhotoH.value = h;

    // skip: finish the assembly now and cross-fade quickly
    if (skipSignal !== skipSeen.current) {
      skipSeen.current = skipSignal;
      if (c.phase === "intro" || c.phase === "crossfade") {
        c.phase = "crossfade";
        c.t = Math.max(c.t, 0);
        c.speed = CROSSFADE_SECONDS / 0.2;
        pu.uProgress.value = 1;
      }
    }

    c.t += dt * c.speed;
    if (c.phase === "intro") {
      pu.uProgress.value = Math.min(1, c.t / ASSEMBLE_SECONDS);
      if (c.t >= ASSEMBLE_SECONDS) {
        c.phase = "crossfade";
        c.t = 0;
      }
    } else if (c.phase === "crossfade") {
      const k = Math.min(1, c.t / CROSSFADE_SECONDS);
      ph.uOpacity.value = k;
      pu.uFade.value = 1 - k;
      if (k >= 1) {
        c.phase = "settled";
        c.speed = 1;
      }
    }

    // pointer: mouse on desktop, a slow sway on touch screens
    const p = pointer.current;
    const tx = touch ? Math.sin(state.clock.elapsedTime * 0.6) * 0.55 : p.nx;
    const ty = touch ? Math.sin(state.clock.elapsedTime * 0.37) * 0.3 : p.ny;
    const ease = 1 - Math.exp(-dt * 5);
    smooth.current.x += (tx - smooth.current.x) * ease;
    smooth.current.y += (ty - smooth.current.y) * ease;
    ph.uPointer.value.set(smooth.current.x, -smooth.current.y);

    // scatter decays quickly after a fast move
    const scatter = decayedScatter(p, performance.now());
    pu.uScatter.value = c.phase === "settled" ? scatter : 0;
    pu.uMouse.value.set((p.nx * w) / 2, (-p.ny * h) / 2);

    if (reported.current !== c.phase) {
      reported.current = c.phase;
      onPhase(c.phase);
    }
  });

  return (
    <>
      <mesh ref={meshRef} material={photoMat} renderOrder={0}>
        <planeGeometry args={[w, h]} />
      </mesh>
      <points
        ref={pointsRef}
        geometry={geometry}
        material={particleMat}
        renderOrder={1}
      />
    </>
  );
}

function loadTexture(src: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) =>
    new THREE.TextureLoader().load(
      src,
      (t) => {
        t.colorSpace = THREE.NoColorSpace;
        t.minFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        resolve(t);
      },
      undefined,
      reject,
    ),
  );
}

export default function HeroScene(props: Props) {
  const {
    photoSrc,
    depthSrc,
    particlesSrc,
    particleLimit,
    active,
    touch,
    onPhase,
  } = props;
  const wrapper = useRef<HTMLDivElement>(null);
  const pointer = useRef<Pointer>({
    nx: 0,
    ny: 0,
    scatter: 0,
    scatterAt: 0,
    lastX: 0,
    lastY: 0,
    lastT: 0,
  });
  const [assets, setAssets] = useState<{
    data: ParticleData;
    photo: THREE.Texture;
    depth: THREE.Texture;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(particlesSrc).then((r) => {
        if (!r.ok) throw new Error(`particles: ${r.status}`);
        return r.arrayBuffer();
      }),
      loadTexture(photoSrc),
      loadTexture(depthSrc),
    ])
      .then(([buf, photo, depth]) => {
        if (!cancelled)
          setAssets({ data: parseParticles(buf, particleLimit), photo, depth });
      })
      .catch((e) => {
        console.warn("[hero] 3D portrait unavailable, keeping the photo:", e);
        onPhase("loading");
      });
    return () => {
      cancelled = true;
    };
  }, [photoSrc, depthSrc, particlesSrc, particleLimit, onPhase]);

  // pointer position relative to the photo box (the wrapper's centre area)
  useEffect(() => {
    if (touch) return;
    const onMove = (e: PointerEvent) => {
      const el = wrapper.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const boxW = r.width * SCALE;
      const boxH = r.height * SCALE;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const p = pointer.current;
      p.nx = Math.max(-1.6, Math.min(1.6, ((e.clientX - cx) / boxW) * 2));
      p.ny = Math.max(-1.6, Math.min(1.6, ((e.clientY - cy) / boxH) * 2));
      const now = performance.now();
      const dtMs = now - p.lastT;
      if (p.lastT && dtMs > 0 && dtMs < 100) {
        const speed =
          Math.hypot(e.clientX - p.lastX, e.clientY - p.lastY) / dtMs;
        const s = scatterFromSpeed(speed);
        if (s > decayedScatter(p, now)) {
          p.scatter = s;
          p.scatterAt = now;
        }
      }
      p.lastX = e.clientX;
      p.lastY = e.clientY;
      p.lastT = now;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [touch]);

  return (
    <div
      ref={wrapper}
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        inset: `-${EXTEND * 100}%`,
      }}
    >
      {assets && (
        <Canvas
          linear
          flat
          dpr={[1, touch ? 1.25 : 1.5]}
          frameloop={active ? "always" : "never"}
          camera={{ position: [0, 0, 3], fov: 30, near: 0.1, far: 20 }}
          gl={{
            antialias: false,
            alpha: true,
            powerPreference: "high-performance",
          }}
        >
          <Scene
            data={assets.data}
            photo={assets.photo}
            depth={assets.depth}
            playIntro={props.playIntro}
            touch={touch}
            skipSignal={props.skipSignal}
            pointer={pointer}
            onPhase={onPhase}
          />
        </Canvas>
      )}
    </div>
  );
}
