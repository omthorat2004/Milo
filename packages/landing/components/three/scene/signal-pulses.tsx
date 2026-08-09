"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { actProgress, mix, smoothstep } from "@/lib/three/timeline";

import { palette } from "./palette";

const RING_COUNT = 4;
const CYCLE_SECONDS = 3.2;

type Props = { progress: React.RefObject<number> };

/**
 * Act 4: one pulse per open.
 *
 * Rings expand and fade from the page — the visual grammar for "an event was
 * recorded". Nothing here represents a person; the pulse is the whole record.
 */
export function SignalPulses({ progress }: Props) {
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const offsets = useMemo(
    () => Array.from({ length: RING_COUNT }, (_, index) => (index / RING_COUNT) * CYCLE_SECONDS),
    [],
  );

  useFrame((state) => {
    const p = progress.current;
    const signal = actProgress(p, "signal");
    const insight = actProgress(p, "insight");

    const strength = smoothstep(signal) * mix(1, 0.45, smoothstep(insight));
    const time = state.clock.elapsedTime;
    const centerX = mix(0, 1.75, smoothstep(insight));

    rings.current.forEach((ring, index) => {
      if (!ring) return;

      if (strength < 0.01) {
        ring.visible = false;
        return;
      }

      const phase = ((time + (offsets[index] ?? 0)) % CYCLE_SECONDS) / CYCLE_SECONDS;
      const material = ring.material as THREE.MeshBasicMaterial;

      ring.visible = true;
      ring.position.x = centerX;
      ring.scale.setScalar(mix(0.35, 3.6, phase));
      material.opacity = (1 - phase) ** 2 * 0.55 * strength;
    });
  });

  return (
    <group>
      {offsets.map((_, index) => (
        <mesh
          key={index}
          ref={(node) => {
            rings.current[index] = node;
          }}
          rotation={[Math.PI / 2.6, 0, 0]}
          visible={false}
        >
          <torusGeometry args={[1, 0.006, 6, 96]} />
          <meshBasicMaterial
            color={index % 2 === 0 ? palette.signal : palette.signalSoft}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
