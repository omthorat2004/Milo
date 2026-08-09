"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";

import { actProgress, mix, smoothstep } from "@/lib/three/timeline";

import { palette } from "./palette";

type Props = { progress: React.RefObject<number> };

/**
 * Act 3: the Milo link closing around the resume.
 *
 * A single ring, drawn in signal green — the first green in the whole story, so
 * it reads as the moment tracking begins.
 */
export function TrackingLink({ progress }: Props) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state, delta) => {
    const node = group.current;
    const surface = material.current;
    if (!node || !surface) return;

    const p = progress.current;
    const link = actProgress(p, "link");
    const insight = actProgress(p, "insight");

    const appear = smoothstep(link);
    surface.opacity = appear * mix(0.9, 0.25, smoothstep(insight));
    node.visible = surface.opacity > 0.01;
    if (!node.visible) return;

    node.scale.setScalar(mix(0.2, 1, appear) * mix(1, 0.86, smoothstep(insight)));
    node.rotation.z += delta * 0.12;
    node.rotation.x = Math.sin(state.clock.elapsedTime * 0.35) * 0.18;
    node.position.x = mix(0, 1.75, smoothstep(insight));
  });

  return (
    <group ref={group} visible={false}>
      <mesh rotation={[Math.PI / 2.6, 0, 0]}>
        <torusGeometry args={[1.85, 0.012, 8, 128]} />
        <meshBasicMaterial ref={material} color={palette.signal} transparent opacity={0} />
      </mesh>
    </group>
  );
}
