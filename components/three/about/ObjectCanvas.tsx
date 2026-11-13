"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { ABOUT_OBJECTS, type AboutObjectKind } from "./objects";

/** Mouse position across the window, -1..1 on each axis (shared by all objects). */
const pointer = { x: 0, y: 0 };
let listeners = 0;
function onPointerMove(e: PointerEvent) {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
}

function Rig({ children }: { children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const spin = useRef(0);
  const tilt = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    spin.current += dt * 0.35; // slow constant rotation
    const ease = 1 - Math.exp(-dt * 4);
    tilt.current.x += (pointer.y * 0.45 - tilt.current.x) * ease;
    tilt.current.y += (pointer.x * 0.7 - tilt.current.y) * ease;
    g.rotation.y = spin.current + tilt.current.y;
    g.rotation.x = tilt.current.x;
    g.position.y = Math.sin(state.clock.elapsedTime * 0.9) * 0.07;
  });

  return <group ref={group}>{children}</group>;
}

/** One small transparent canvas holding a single low-poly object. */
export default function ObjectCanvas({
  kind,
  active,
}: {
  kind: AboutObjectKind;
  /** false = stop rendering (offscreen) */
  active: boolean;
}) {
  useEffect(() => {
    if (listeners++ === 0) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }
    return () => {
      if (--listeners === 0) {
        window.removeEventListener("pointermove", onPointerMove);
      }
    };
  }, []);

  const Shape = ABOUT_OBJECTS[kind];
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5], fov: 35 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 5]} intensity={2.4} />
      <directionalLight position={[-4, -2, 2]} intensity={1} color="#B600A8" />
      <Rig>
        <Shape />
      </Rig>
    </Canvas>
  );
}
