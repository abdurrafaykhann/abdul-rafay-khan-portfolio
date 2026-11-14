import {
  AdditiveBlending,
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  Material,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  PointLight,
  ShaderMaterial,
  Vector3,
} from "three";
import { HERO_COLORS as C, type Tier } from "@/lib/hero/config";
import {
  color,
  createGlowPoints,
  createPulseLines,
  seeded,
  type Dot,
  type Layer,
  type Segment,
} from "./shared";

/**
 * Everything around the portrait. Render order: 0–3 sit behind the photo
 * (z < 0), 7+ in front of it and always off to the sides, so nothing ever
 * crosses the face.
 */

/* ── Atmosphere: soft light behind the subject ───────────────────── */

const glowVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const glowFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAlpha;
  uniform float uShaft;
  varying vec2 vUv;
  void main() {
    float a;
    if (uShaft > 0.5) {
      // a soft shaft of light: bright along its centre, fading at both ends
      float across = smoothstep(0.5, 0.0, abs(vUv.x - 0.5));
      a = across * across * smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
    } else {
      float r = length(vUv - 0.5);
      a = smoothstep(0.5, 0.0, r);
      a *= a;
    }
    gl_FragColor = vec4(uColor, a * uAlpha);
  }
`;

function glowPlane(hex: string, shaft = false) {
  const material = new ShaderMaterial({
    vertexShader: glowVertex,
    fragmentShader: glowFragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
    uniforms: {
      uColor: { value: color(hex) },
      uAlpha: { value: 0 },
      uShaft: { value: shaft ? 1 : 0 },
    },
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1), material);
  mesh.renderOrder = 0;
  return { mesh, material };
}

export function createAtmosphere(): Layer {
  const group = new Group();
  // purple pulled a little towards magenta so the glow never reads blue
  const purple = glowPlane("#8A21AC");
  purple.mesh.position.set(0.1, 0.35, -4.6);
  purple.mesh.scale.set(8.5, 6.2, 1);
  const magenta = glowPlane(C.magenta);
  magenta.mesh.position.set(-1.9, -0.5, -4.2);
  magenta.mesh.scale.set(5, 4, 1);
  const orange = glowPlane(C.orange);
  orange.mesh.position.set(1.7, -1.5, -3.4);
  orange.mesh.scale.set(6, 2.6, 1);
  const shaftA = glowPlane(C.glow, true);
  shaftA.mesh.position.set(-0.9, 0.9, -2.6);
  shaftA.mesh.scale.set(1.5, 5.5, 1);
  shaftA.mesh.rotation.z = -0.42;
  const shaftB = glowPlane(C.glow, true);
  shaftB.mesh.position.set(1.3, 1.0, -3.1);
  shaftB.mesh.scale.set(1.1, 5.5, 1);
  shaftB.mesh.rotation.z = 0.36;
  const all = [purple, magenta, orange, shaftA, shaftB];
  all.forEach((g) => group.add(g.mesh));

  return {
    object: group,
    update(f) {
      const a = f.env * f.c.atmosphere;
      purple.material.uniforms.uAlpha.value = a * 0.27;
      magenta.material.uniforms.uAlpha.value = a * (0.1 + 0.12 * f.c.neural);
      orange.material.uniforms.uAlpha.value =
        f.env * (0.04 + 0.1 * f.c.stack + 0.14 * f.c.final);
      const sway = Math.sin(f.t * 0.2) * 0.04;
      shaftA.mesh.rotation.z = -0.42 + sway;
      shaftB.mesh.rotation.z = 0.36 - sway;
      shaftA.material.uniforms.uAlpha.value = a * 0.075;
      shaftB.material.uniforms.uAlpha.value = a * 0.055;
    },
    dispose() {
      all.forEach((g) => {
        g.mesh.geometry.dispose();
        g.material.dispose();
      });
    },
  };
}

/* ── Dust: floating particles through the whole depth of the scene ── */

export function createDust(tier: Tier): Layer {
  const rand = seeded(11);
  const palette = [
    { c: color(C.mist).multiplyScalar(0.55), w: 0.62 },
    { c: color(C.purple).lerp(color(C.mist), 0.35), w: 0.84 },
    { c: color(C.magenta).lerp(color(C.mist), 0.2), w: 0.94 },
    { c: color(C.orange).lerp(color(C.mist), 0.15), w: 1 },
  ];
  const dots: Dot[] = [];
  for (let i = 0; i < tier.dust; i++) {
    let x = (rand() - 0.5) * 6.8;
    const y = (rand() - 0.5) * 4;
    const z = -5.5 + rand() * 7.7;
    // nothing drifts in front of the subject
    if (z > -0.2 && Math.abs(x) < 0.75) {
      x = (x < 0 ? -1 : 1) * (0.75 + rand() * 2.4);
    }
    const pick = rand();
    dots.push({
      p: new Vector3(x, y, z),
      color: palette.find((p) => pick <= p.w)!.c,
      size: 0.006 + rand() * 0.012,
      order: 0,
    });
  }
  const { points, material, geometry } = createGlowPoints(dots, {
    wobble: false,
    seed: 3,
  });
  points.renderOrder = 8;
  return {
    object: points,
    update(f) {
      const u = material.uniforms;
      u.uTime.value = f.t;
      u.uScale.value = f.scale;
      u.uAlpha.value = f.env * 0.7;
      u.uPointer.value.set(f.px, -f.py);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

/* ── Neural network: connected nodes around and behind the subject ── */

export function createNeuralNetwork(tier: Tier): Layer {
  const rand = seeded(23);
  const nodes: Vector3[] = [];
  for (let i = 0; i < tier.nodes; i++) {
    const behind = rand() < 0.3;
    const side = rand() < 0.5 ? -1 : 1;
    const x = behind ? (rand() - 0.5) * 1.6 : side * (0.6 + rand() * 2.1);
    const y = -0.85 + rand() * 1.9;
    const z = behind ? -3.4 + rand() * 1.5 : -3.0 + rand() * 2.5;
    nodes.push(new Vector3(x, y, z));
  }
  const maxR = Math.max(...nodes.map((n) => n.length()));
  const orderOf = (v: Vector3) => (v.length() / maxR) * 0.75;

  const magenta = color(C.magenta);
  const purple = color(C.purple).lerp(color(C.mist), 0.15);
  const seen = new Set<string>();
  const segments: Segment[] = [];
  nodes.forEach((a, i) => {
    const near = nodes
      .map((b, j) => ({ j, d: a.distanceTo(b) }))
      .filter((n) => n.j !== i && n.d < 1.25)
      .sort((p, q) => p.d - q.d)
      .slice(0, 3);
    for (const { j } of near) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      segments.push({
        a,
        b: nodes[j],
        color: rand() < 0.5 ? magenta : purple,
        order: Math.max(orderOf(a), orderOf(nodes[j])),
      });
    }
  });

  const lines = createPulseLines(segments, { pulse: C.mist, seed: 31 });
  lines.lines.renderOrder = 2;
  const dots: Dot[] = nodes.map((p) => {
    const r = rand();
    return {
      p,
      color:
        r < 0.1
          ? color(C.orange).lerp(color(C.mist), 0.25)
          : r < 0.55
            ? color(C.magenta).lerp(color(C.mist), 0.3)
            : color(C.purple).lerp(color(C.mist), 0.45),
      size: 0.03 + rand() * 0.03,
      order: orderOf(p),
    };
  });
  const pts = createGlowPoints(dots, { wobble: true, seed: 41 });
  pts.points.renderOrder = 3;

  const group = new Group();
  group.add(lines.lines, pts.points);
  return {
    object: group,
    update(f) {
      const a = f.env;
      lines.material.uniforms.uTime.value = f.t;
      lines.material.uniforms.uReveal.value = f.c.neural;
      lines.material.uniforms.uAlpha.value = a * 0.9;
      pts.material.uniforms.uTime.value = f.t;
      pts.material.uniforms.uScale.value = f.scale;
      pts.material.uniforms.uReveal.value = f.c.neural;
      pts.material.uniforms.uAlpha.value = a * 0.9;
      group.rotation.y = Math.sin(f.t * 0.08) * 0.04;
    },
    dispose() {
      lines.geometry.dispose();
      lines.material.dispose();
      pts.geometry.dispose();
      pts.material.dispose();
    },
  };
}

/* ── Software architecture: interfaces, services, data, cloud ─────── */

const panelFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform float uAlpha;
  uniform float uVariant;
  uniform float uTime;
  varying vec2 vUv;
  float box(vec2 uv, vec2 c, vec2 h) { vec2 d = abs(uv - c) - h; return max(d.x, d.y); }
  float stroke(float d, float w) { return smoothstep(w, 0.0, abs(d)); }
  float fill(float d) { return smoothstep(0.004, 0.0, d); }
  void main() {
    float a = 0.035;                                   // faint glass
    float accent = 0.0;
    a += stroke(box(vUv, vec2(0.5), vec2(0.492, 0.488)), 0.006) * 0.85;   // frame
    a += fill(box(vUv, vec2(0.5, 0.93), vec2(0.47, 0.03))) * 0.14;        // title bar
    accent += fill(length(vUv - vec2(0.06, 0.93)) - 0.012);
    if (uVariant < 0.5) {
      // frontend: sidebar and content cards
      a += stroke(box(vUv, vec2(0.15, 0.44), vec2(0.1, 0.38)), 0.004) * 0.45;
      for (int i = 0; i < 4; i++) {
        vec2 c = vec2(0.45 + 0.34 * mod(float(i), 2.0), 0.64 - 0.38 * floor(float(i) / 2.0));
        a += stroke(box(vUv, c, vec2(0.14, 0.15)), 0.004) * 0.5;
      }
      accent += fill(box(vUv, vec2(0.45, 0.72), vec2(0.1, 0.012))) * 0.8;
    } else if (uVariant < 1.5) {
      // data dashboard: bars and a baseline
      for (int i = 0; i < 7; i++) {
        float h = 0.12 + 0.26 * abs(sin(float(i) * 1.7 + 0.6));
        float x = 0.14 + float(i) * 0.12;
        float bar = fill(box(vUv, vec2(x, 0.14 + h), vec2(0.035, h)));
        a += bar * 0.2;
        if (i == 4) accent += bar * 0.5;
      }
      a += fill(box(vUv, vec2(0.5, 0.13), vec2(0.44, 0.003))) * 0.6;
    } else {
      // API / service: rows of structured text
      for (int i = 0; i < 8; i++) {
        float y = 0.8 - float(i) * 0.095;
        float w = 0.1 + 0.26 * abs(sin(float(i) * 2.3 + 1.0));
        float indent = 0.08 + 0.06 * mod(float(i), 3.0);
        float row = fill(box(vUv, vec2(indent + w, y), vec2(w, 0.012)));
        a += row * 0.32;
        if (i == 2 || i == 5) accent += row * 0.5;
      }
    }
    a *= 0.88 + 0.12 * sin(vUv.y * 70.0 + uTime * 1.5);                   // slow scan
    vec3 col = uColor * a + uAccent * accent;
    gl_FragColor = vec4(col, (a + accent) * uAlpha);
  }
`;

function edges(geo: BufferGeometry, hex: string) {
  const eg = new EdgesGeometry(geo, 20);
  const material = new LineBasicMaterial({
    color: color(hex),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const lines = new LineSegments(eg, material);
  lines.renderOrder = 2;
  return { lines, material, geometry: eg };
}

function glass(geo: BufferGeometry, hex = "#120c1a") {
  const material = new MeshStandardMaterial({
    color: color(hex),
    metalness: 0.9,
    roughness: 0.28,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const mesh = new Mesh(geo, material);
  mesh.renderOrder = 1;
  return { mesh, material };
}

export function createArchitecture(tier: Tier): Layer {
  const group = new Group();
  const disposables: { dispose(): void }[] = [];
  /** [material, base opacity, 0 = always / 1 = with the stack reveal] */
  const fades: [Material & { opacity: number }, number, number][] = [];

  // Tall glass-and-metal structures far behind: the architecture of the space.
  if (tier.pillars) {
    const pillarGeo = new BoxGeometry(1, 1, 1);
    disposables.push(pillarGeo);
    const spots: [number, number, number, number][] = [
      [-2.9, -4.2, 0.45, 5.2],
      [-2.1, -5.7, 0.35, 6.0],
      [-3.7, -6.3, 0.6, 6.5],
      [2.7, -4.5, 0.4, 5.4],
      [3.5, -5.9, 0.55, 6.2],
      [2.0, -6.5, 0.3, 6.6],
    ];
    for (const [x, z, w, h] of spots) {
      const g = glass(pillarGeo);
      g.mesh.position.set(x, 0.4, z);
      g.mesh.scale.set(w, h, w);
      const e = edges(pillarGeo, C.glow);
      e.lines.position.copy(g.mesh.position);
      e.lines.scale.copy(g.mesh.scale);
      group.add(g.mesh, e.lines);
      // kept faint: they sit behind the heading and must not darken it
      fades.push([g.material, 0.14, 0], [e.material, 0.1, 0]);
      disposables.push(g.material, e.material, e.geometry);
    }
  }

  // Interface panels (frontend, dashboard, API), off to the sides.
  const panelGeo = new PlaneGeometry(0.82, 0.54);
  disposables.push(panelGeo);
  const panelSpots: [number, number, number, number, number, string][] = [
    [-1.02, 0.28, -0.9, 0.45, 0, C.purple],
    [1.08, -0.22, -0.7, -0.5, 1, C.magenta],
    [1.7, 0.78, -2.1, -0.35, 2, C.orange],
  ];
  const panels = panelSpots
    .slice(0, tier.panels)
    .map(([x, y, z, ry, v, accent]) => {
      const material = new ShaderMaterial({
        vertexShader: glowVertex,
        fragmentShader: panelFragment,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        side: DoubleSide,
        blending: AdditiveBlending,
        uniforms: {
          uColor: { value: color(C.mist) },
          uAccent: { value: color(accent) },
          uAlpha: { value: 0 },
          uVariant: { value: v },
          uTime: { value: 0 },
        },
      });
      const mesh = new Mesh(panelGeo, material);
      mesh.position.set(x, y, z);
      mesh.rotation.y = ry;
      mesh.renderOrder = z > 0 ? 7 : 2;
      group.add(mesh);
      disposables.push(material);
      return { mesh, material, home: new Vector3(x, y, z) };
    });

  // Database: three stacked discs.
  const discGeo = new CylinderGeometry(0.24, 0.24, 0.11, 28, 1);
  disposables.push(discGeo);
  const dbHome = new Vector3(-1.2, -0.5, -1.4);
  for (let i = 0; i < 3; i++) {
    const g = glass(discGeo, "#1a1024");
    g.mesh.position.set(dbHome.x, dbHome.y + i * 0.15, dbHome.z);
    const e = edges(discGeo, C.mist);
    e.lines.position.copy(g.mesh.position);
    group.add(g.mesh, e.lines);
    fades.push([g.material, 0.5, 1], [e.material, 0.55, 1]);
    disposables.push(g.material, e.material, e.geometry);
  }

  // Services around an API gateway, with category colours as small details.
  const gateway = new Vector3(1.25, 0.42, -2.2);
  const gateGeo = new OctahedronGeometry(0.13, 0);
  const gate = edges(gateGeo, C.mist);
  gate.lines.position.copy(gateway);
  group.add(gate.lines);
  fades.push([gate.material, 0.9, 1]);
  disposables.push(gateGeo, gate.material, gate.geometry);

  const boxGeo = new BoxGeometry(0.15, 0.15, 0.15);
  disposables.push(boxGeo);
  const segments: Segment[] = [];
  const mist = color(C.mist).multiplyScalar(0.7);
  const services = C.categories.map((hex, i) => {
    const ang = (i / C.categories.length) * Math.PI * 2 + 0.4;
    const p = new Vector3(
      gateway.x + Math.cos(ang) * 0.5,
      gateway.y + Math.sin(ang) * 0.4,
      gateway.z + Math.sin(ang * 2) * 0.35,
    );
    const e = edges(boxGeo, hex);
    e.lines.position.copy(p);
    group.add(e.lines);
    fades.push([e.material, 0.45, 1]);
    disposables.push(e.material, e.geometry);
    segments.push({ a: gateway, b: p, color: mist, order: 0.2 + i * 0.07 });
    return e.lines;
  });

  // Cloud: a wireframe cluster, linked back to the gateway and the database.
  const cloudGeo = new IcosahedronGeometry(0.34, 1);
  const cloud = edges(cloudGeo, C.purple);
  const cloudHome = new Vector3(-1.55, 0.72, -2.6);
  cloud.lines.position.copy(cloudHome);
  group.add(cloud.lines);
  fades.push([cloud.material, 0.5, 1]);
  disposables.push(cloudGeo, cloud.material, cloud.geometry);

  const dbTop = dbHome.clone().add(new Vector3(0, 0.36, 0));
  segments.push(
    { a: dbTop, b: gateway, color: mist, order: 0.05 },
    { a: cloudHome, b: gateway, color: mist, order: 0.12 },
    { a: cloudHome, b: dbTop, color: mist, order: 0.3 },
  );
  panels.forEach((p, i) =>
    segments.push({ a: p.home, b: gateway, color: mist, order: 0.4 + i * 0.1 }),
  );
  const links = createPulseLines(segments, {
    pulse: C.orange,
    base: 0.2,
    seed: 77,
  });
  links.lines.renderOrder = 2;
  group.add(links.lines);
  disposables.push(links.geometry, links.material);

  return {
    object: group,
    update(f) {
      const s = f.c.stack;
      for (const [m, base, withStack] of fades) {
        m.opacity = f.env * base * (withStack ? s : f.c.atmosphere);
      }
      panels.forEach((p, i) => {
        const r = Math.min(1, Math.max(0, s * 1.3 - i * 0.15));
        const out = (1 - r) * 0.6 * Math.sign(p.home.x);
        p.mesh.position.set(
          p.home.x + out,
          p.home.y + Math.sin(f.t * 0.5 + i * 2) * 0.02,
          p.home.z - (1 - r) * 0.5,
        );
        p.material.uniforms.uAlpha.value = f.env * r * 0.8;
        p.material.uniforms.uTime.value = f.t;
      });
      gate.lines.rotation.y = f.t * 0.4;
      gate.lines.rotation.x = f.t * 0.25;
      cloud.lines.rotation.y = f.t * 0.12;
      services.forEach((sv, i) => {
        sv.rotation.x = f.t * 0.2 + i;
        sv.rotation.y = f.t * 0.3 + i;
      });
      links.material.uniforms.uTime.value = f.t;
      links.material.uniforms.uReveal.value = s;
      links.material.uniforms.uAlpha.value = f.env;
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}

/* ── Lighting for the metallic / glass structures ─────────────────── */

export function createLights(): Layer {
  const group = new Group();
  const ambient = new AmbientLight(color(C.mist), 0.25);
  const key = new DirectionalLight(color(C.mist), 0.5);
  key.position.set(1, 2, 3);
  const rim = new PointLight(color(C.purple), 0, 14, 1.6);
  rim.position.set(0, 0.6, -3.2);
  const side = new PointLight(color(C.magenta), 0, 12, 1.6);
  side.position.set(-2.6, 1, -2);
  const warm = new PointLight(color(C.orange), 0, 10, 1.6);
  warm.position.set(2.4, -1.2, -1.5);
  group.add(ambient, key, rim, side, warm);
  return {
    object: group,
    update(f) {
      rim.intensity = f.env * 26 * f.c.atmosphere;
      side.intensity = f.env * (8 + 14 * f.c.neural);
      warm.intensity = f.env * (2 + 10 * f.c.stack + 14 * f.c.final);
    },
    dispose() {},
  };
}
