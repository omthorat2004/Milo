"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { createSeededRandom } from "@/lib/three/random";

import { palette } from "./palette";

const PARTICLE_COUNT = 420;

/** Slow warm dust. Gives the empty ink space depth and keeps the frame alive. */
export function DustField() {
  const points = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const random = createSeededRandom(8675309);

    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      positions[i * 3] = (random() - 0.5) * 18;
      positions[i * 3 + 1] = (random() - 0.5) * 11;
      positions[i * 3 + 2] = (random() - 0.5) * 12 - 3;
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return buffer;
  }, []);

  useFrame((state) => {
    const node = points.current;
    if (!node) return;
    node.rotation.y = state.clock.elapsedTime * 0.012;
    node.rotation.x = Math.sin(state.clock.elapsedTime * 0.06) * 0.04;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color={palette.sand}
        size={0.022}
        sizeAttenuation
        transparent
        opacity={0.32}
        depthWrite={false}
      />
    </points>
  );
}
