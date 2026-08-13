"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { actProgress, mix, smoothstep } from "@/lib/three/timeline";
import { damp } from "@/lib/utils";

import { palette } from "./palette";

/** Shape only: an abstract silhouette of engagement, not a data claim. */
const BAR_HEIGHTS = [0.55, 1.0, 0.78, 1.35, 0.62, 0.92, 0.44] as const;
const BAR_WIDTH = 0.2;
const BAR_GAP = 0.34;

type Props = { progress: React.RefObject<number> };

/**
 * Act 5: the pattern the candidate actually gets to see.
 *
 * Bars grow from the floor as the resume steps aside. Heights are decorative
 * and fixed in code, never presented as real analytics.
 */
export function InsightBars({ progress }: Props) {
  const group = useRef<THREE.Group>(null);
  const bars = useRef<(THREE.Mesh | null)[]>([]);

  const positions = useMemo(() => {
    const total = (BAR_HEIGHTS.length - 1) * BAR_GAP;
    return BAR_HEIGHTS.map((_, index) => index * BAR_GAP - total / 2);
  }, []);

  useFrame((state, delta) => {
    const node = group.current;
    if (!node) return;

    const insight = actProgress(progress.current, "insight");
    const reveal = smoothstep(insight);

    node.visible = reveal > 0.01;
    if (!node.visible) return;

    // Kept right of the copy rail; the resume slides further right still.
    node.position.x = -0.35;
    node.position.y = -1.1;
    node.rotation.y = mix(0.5, 0.22, reveal);

    const time = state.clock.elapsedTime;

    bars.current.forEach((bar, index) => {
      if (!bar) return;

      const stagger = index / BAR_HEIGHTS.length;
      const local = smoothstep(Math.max(0, (reveal - stagger * 0.45) / (1 - stagger * 0.45)));
      const breathe = 1 + Math.sin(time * 1.2 + index) * 0.03;
      const height = (BAR_HEIGHTS[index] ?? 0.5) * local * breathe;

      bar.scale.y = damp(bar.scale.y, Math.max(height, 0.001), 8, delta);
      bar.position.y = bar.scale.y / 2;

      const material = bar.material as THREE.MeshBasicMaterial;
      material.opacity = local * 0.9;
    });
  });

  return (
    <group ref={group} visible={false}>
      {/* Baseline, so the bars read as a chart rather than floating blocks. */}
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[(BAR_HEIGHTS.length - 1) * BAR_GAP + 0.5, 0.008]} />
        <meshBasicMaterial color={palette.sand} transparent opacity={0.25} depthWrite={false} />
      </mesh>

      {BAR_HEIGHTS.map((_, index) => (
        <mesh
          key={index}
          ref={(node) => {
            bars.current[index] = node;
          }}
          position={[positions[index] ?? 0, 0, 0]}
        >
          <boxGeometry args={[BAR_WIDTH, 1, BAR_WIDTH]} />
          <meshBasicMaterial
            color={index === 3 ? palette.signal : palette.signalSoft}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
