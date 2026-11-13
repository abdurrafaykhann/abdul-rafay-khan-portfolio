"use client";

import { useMemo } from "react";
import * as THREE from "three";

/** Palette: the page's mist tone plus the ContactButton gradient colours. */
const MIST = "#D7E2EA";
const MAGENTA = "#B600A8";
const PURPLE = "#7621B0";
const ORANGE = "#BE4C00";
const DARK = "#23232B";

function Flat({ color, emissive = 0 }: { color: string; emissive?: number }) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={emissive}
      roughness={0.55}
      metalness={0.15}
      flatShading
    />
  );
}

/* ── 1. Neural network node cluster ─────────────────────────────── */

const NODES: [number, number, number][] = [
  [0, 0, 0],
  [1.05, 0.55, 0.2],
  [-1.0, 0.65, -0.25],
  [0.35, -1.05, 0.45],
  [-0.7, -0.75, -0.5],
  [0.25, 0.95, -0.75],
  [-0.2, 0.15, 1.05],
];
const LINKS: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [0, 6],
  [1, 5],
  [2, 4],
  [3, 6],
  [1, 3],
  [2, 6],
];
const NODE_COLORS = [MIST, MAGENTA, PURPLE, ORANGE, MIST, PURPLE, MAGENTA];

export function NeuralCluster() {
  const links = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    return LINKS.map(([a, b]) => {
      const start = new THREE.Vector3(...NODES[a]);
      const end = new THREE.Vector3(...NODES[b]);
      const dir = end.clone().sub(start);
      return {
        position: start.clone().add(end).multiplyScalar(0.5),
        quaternion: new THREE.Quaternion().setFromUnitVectors(
          up,
          dir.clone().normalize(),
        ),
        length: dir.length(),
      };
    });
  }, []);

  return (
    <group scale={0.95}>
      {NODES.map((position, i) => (
        <mesh key={i} position={position}>
          <icosahedronGeometry args={[i === 0 ? 0.36 : 0.24, 0]} />
          <Flat color={NODE_COLORS[i]} emissive={0.25} />
        </mesh>
      ))}
      {links.map((link, i) => (
        <mesh key={i} position={link.position} quaternion={link.quaternion}>
          <cylinderGeometry args={[0.03, 0.03, link.length, 5]} />
          <Flat color={MIST} />
        </mesh>
      ))}
    </group>
  );
}

/* ── 2. Camera lens (computer vision) ───────────────────────────── */

export function CameraLens() {
  // cylinders are built along Y; turn the lens to face the viewer
  return (
    <group rotation={[Math.PI / 2, 0, 0]} scale={0.95}>
      <mesh position={[0, -0.55, 0]}>
        <cylinderGeometry args={[0.72, 0.72, 0.4, 14]} />
        <Flat color={DARK} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[1.0, 0.92, 0.8, 14]} />
        <Flat color={DARK} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[1.04, 1.04, 0.14, 14]} />
        <Flat color={PURPLE} />
      </mesh>
      <mesh position={[0, 0.46, 0]}>
        <cylinderGeometry args={[1.1, 1.0, 0.16, 14]} />
        <Flat color={MIST} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.86, 0.86, 0.12, 14]} />
        <Flat color={DARK} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.62, 0.62, 0.06, 14]} />
        <Flat color={MAGENTA} emissive={0.35} />
      </mesh>
      <mesh position={[0, 0.58, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.06, 10]} />
        <Flat color={ORANGE} emissive={0.4} />
      </mesh>
    </group>
  );
}

/* ── 3. Chat bubble (agents) ────────────────────────────────────── */

export function ChatBubble() {
  return (
    <group position={[0, 0.15, 0]} scale={0.95}>
      <mesh>
        <boxGeometry args={[2.3, 1.5, 0.55]} />
        <Flat color={PURPLE} />
      </mesh>
      <mesh position={[-0.65, -0.95, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.38, 0.6, 4]} />
        <Flat color={PURPLE} />
      </mesh>
      {/* typing dots on both faces, so they show whichever way it turns */}
      {[0.32, -0.32].flatMap((z) =>
        [-0.6, 0, 0.6].map((x, i) => (
          <mesh key={`${z}:${x}`} position={[x, 0, z]}>
            <icosahedronGeometry args={[0.17, 0]} />
            <Flat color={i === 1 ? ORANGE : MIST} emissive={0.3} />
          </mesh>
        )),
      )}
    </group>
  );
}

/* ── 4. Data cube ───────────────────────────────────────────────── */

const CUBE_COLORS = [MIST, PURPLE, MIST, MAGENTA, MIST, PURPLE, ORANGE];

export function DataCube() {
  const cells = useMemo(() => {
    const out: { position: [number, number, number]; color: string }[] = [];
    let n = 0;
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          out.push({
            position: [x * 0.62, y * 0.62, z * 0.62],
            color: CUBE_COLORS[(n * 3 + x + y * 2) % CUBE_COLORS.length],
          });
          n++;
        }
      }
    }
    return out;
  }, []);

  return (
    <group rotation={[0.45, 0.6, 0]} scale={0.9}>
      {cells.map((cell, i) => (
        <mesh key={i} position={cell.position}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <Flat color={cell.color} emissive={cell.color === MIST ? 0 : 0.2} />
        </mesh>
      ))}
    </group>
  );
}

export type AboutObjectKind = "neural" | "lens" | "chat" | "cube";

export const ABOUT_OBJECTS: Record<AboutObjectKind, () => React.ReactNode> = {
  neural: NeuralCluster,
  lens: CameraLens,
  chat: ChatBubble,
  cube: DataCube,
};
