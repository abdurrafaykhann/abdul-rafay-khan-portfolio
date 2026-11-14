"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { gsap } from "@/lib/gsap";
import type { GalaxyLegendItem, GalaxyNode } from "@/lib/galaxy/nodes";

const CORE = 0.26;
const HALO = 0.8;

/** Faint background stars (fixed seed, so every visit looks the same). */
function Stars() {
  const positions = useMemo(() => {
    let seed = 1234567;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const a = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      const r = 22 + rand() * 18;
      const t = rand() * Math.PI * 2;
      const p = Math.acos(2 * rand() - 1);
      a[i * 3] = r * Math.sin(p) * Math.cos(t);
      a[i * 3 + 1] = r * Math.cos(p);
      a[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
    }
    return a;
  }, []);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.07}
        color="#D7E2EA"
        transparent
        opacity={0.45}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/** One glowing node per project: a bright core plus a soft additive halo. */
function Nodes({
  nodes,
  hovered,
  onHover,
  onPick,
}: {
  nodes: GalaxyNode[];
  hovered: number | null;
  onHover: (i: number | null) => void;
  onPick: (i: number) => void;
}) {
  const core = useRef<THREE.InstancedMesh>(null);
  const halo = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    nodes.forEach((n, i) => {
      c.set(n.color);
      core.current?.setColorAt(i, c);
      halo.current?.setColorAt(i, c);
      m.makeTranslation(n.x, n.y, n.z);
      core.current?.setMatrixAt(i, m);
      halo.current?.setMatrixAt(i, m);
    });
    for (const mesh of [core.current, halo.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, [nodes]);

  // the hovered node swells a little
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const s = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    nodes.forEach((n, i) => {
      const k = i === hovered ? 1.7 : 1;
      m.compose(p.set(n.x, n.y, n.z), q, s.set(k, k, k));
      core.current?.setMatrixAt(i, m);
      halo.current?.setMatrixAt(i, m);
    });
    for (const mesh of [core.current, halo.current]) {
      if (mesh) mesh.instanceMatrix.needsUpdate = true;
    }
  }, [hovered, nodes]);

  return (
    <>
      <instancedMesh
        ref={core}
        args={[undefined, undefined, nodes.length]}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHover(e.instanceId ?? null);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (e.instanceId !== undefined) onPick(e.instanceId);
        }}
      >
        <sphereGeometry args={[CORE, 20, 16]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh
        ref={halo}
        args={[undefined, undefined, nodes.length]}
        raycast={() => null}
      >
        <sphereGeometry args={[HALO, 20, 16]} />
        <meshBasicMaterial
          transparent
          opacity={0.16}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  );
}

/** Orbit controls plus the camera fly-to when a node is clicked. */
function Rig({
  nodes,
  picked,
  paused,
  onArrive,
}: {
  nodes: GalaxyNode[];
  picked: number | null;
  paused: boolean;
  onArrive: (i: number) => void;
}) {
  const camera = useThree((s) => s.camera);
  const controls = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    if (picked === null) return;
    const n = nodes[picked];
    const ctl = controls.current;
    if (!n || !ctl) return;
    const target = new THREE.Vector3(n.x, n.y, n.z);
    // stop a short way in front of the node, on the side the camera is on
    const dir = camera.position.clone().sub(target).normalize();
    const to = target.clone().add(dir.multiplyScalar(4.6));
    const tl = gsap.timeline({ onComplete: () => onArrive(picked) });
    tl.to(
      camera.position,
      {
        x: to.x,
        y: to.y,
        z: to.z,
        duration: 1,
        ease: "power2.inOut",
        onUpdate: () => ctl.update(),
      },
      0,
    );
    tl.to(
      ctl.target,
      {
        x: target.x,
        y: target.y,
        z: target.z,
        duration: 1,
        ease: "power2.inOut",
      },
      0,
    );
    return () => {
      tl.kill();
    };
  }, [picked, nodes, camera, onArrive]);

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={6}
      maxDistance={32}
      autoRotate={!paused}
      autoRotateSpeed={0.45}
    />
  );
}

/** The project galaxy: category clusters of glowing nodes you can orbit and click. */
export default function GalaxyView({
  nodes,
  legend,
}: {
  nodes: GalaxyNode[];
  legend: GalaxyLegendItem[];
}) {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [visible, setVisible] = useState(true);

  // stop rendering while scrolled out of view
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onArrive = useRef((i: number) => {
    void i;
  });
  useEffect(() => {
    onArrive.current = (i: number) => router.push(nodes[i].href);
  }, [router, nodes]);

  const node = hovered !== null ? nodes[hovered] : null;

  return (
    <div
      ref={wrap}
      className="relative h-[68svh] min-h-[420px] w-full overflow-hidden rounded-[28px] border-2 border-[#D7E2EA]/30 bg-[#07070A]"
      style={{ cursor: node ? "pointer" : "grab", touchAction: "none" }}
      onPointerMove={(e) => {
        const box = wrap.current?.getBoundingClientRect();
        const t = tip.current;
        if (!box || !t) return;
        t.style.transform = `translate(${Math.min(e.clientX - box.left + 14, box.width - 230)}px, ${Math.max(e.clientY - box.top - 8, 8)}px)`;
      }}
    >
      <Canvas
        frameloop={visible ? "always" : "never"}
        dpr={[1, 1.5]}
        camera={{ position: [0, 4, 27], fov: 50 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        aria-hidden
      >
        <Stars />
        <Nodes
          nodes={nodes}
          hovered={hovered}
          onHover={setHovered}
          onPick={setPicked}
        />
        <Rig
          nodes={nodes}
          picked={picked}
          paused={hovered !== null || picked !== null}
          onArrive={(i) => onArrive.current(i)}
        />
      </Canvas>

      <div
        ref={tip}
        role="status"
        className="pointer-events-none absolute top-0 left-0 max-w-[220px] rounded-2xl border border-[#D7E2EA]/40 bg-[#0C0C0C]/90 px-3.5 py-2.5 text-sm text-[#D7E2EA] backdrop-blur transition-opacity"
        style={{ opacity: node ? 1 : 0 }}
      >
        {node && (
          <>
            <p className="font-medium">{node.title}</p>
            {node.category && (
              <p className="text-xs opacity-60">{node.category}</p>
            )}
            {node.metric && <p className="mt-1 text-xs">{node.metric}</p>}
          </>
        )}
      </div>

      <ul className="pointer-events-none absolute bottom-3 left-3 flex max-w-[80%] flex-wrap gap-2 text-xs text-[#D7E2EA]">
        {legend.map((l) => (
          <li
            key={l.name}
            className="flex items-center gap-1.5 rounded-full bg-[#0C0C0C]/70 px-2.5 py-1"
          >
            <span
              className="size-2 rounded-full"
              style={{ background: l.color }}
              aria-hidden
            />
            {l.name}
          </li>
        ))}
      </ul>
      <p className="pointer-events-none absolute right-3 bottom-3 hidden text-xs text-[#D7E2EA]/60 sm:block">
        Drag to orbit · scroll to zoom · click a project
      </p>

      {/* the galaxy is visual; this list is how keyboards and screen readers reach each project */}
      <ul className="sr-only">
        {nodes.map((n) => (
          <li key={n.id}>
            <a href={n.href}>{n.title}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
