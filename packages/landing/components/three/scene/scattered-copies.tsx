"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { createSeededRandom } from "@/lib/three/random";
import { actProgress, mix, smoothstep } from "@/lib/three/timeline";

import { palette } from "./palette";

const COPY_COUNT = 18;

type Copy = {
  direction: THREE.Vector3;
  spin: THREE.Euler;
  delay: number;
  distance: number;
};

type Props = { progress: React.RefObject<number> };

/**
 * Act 2: the same resume sent forty times, drifting off into the dark.
 *
 * One InstancedMesh — eighteen separate meshes would mean eighteen draw calls
 * for what is visually a single gesture.
 */
export function ScatteredCopies({ progress }: Props) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const copies = useMemo<Copy[]>(() => {
    // Deterministic, so the layout is stable across reloads and renders.
    const random = createSeededRandom(20260809);

    return Array.from({ length: COPY_COUNT }, () => {
      const angle = random() * Math.PI * 2;
      const spread = 0.35 + random() * 0.65;
      return {
        direction: new THREE.Vector3(
          Math.cos(angle) * spread,
          Math.sin(angle) * spread * 0.55,
          -0.4 - random() * 1.6,
        ),
        spin: new THREE.Euler(random() * 0.6 - 0.3, random() * 0.9 - 0.45, random() * 0.5 - 0.25),
        delay: random() * 0.35,
        distance: 3.5 + random() * 4.5,
      };
    });
  }, []);

  useFrame((state) => {
    const node = mesh.current;
    const surface = material.current;
    if (!node || !surface) return;

    const shared = actProgress(progress.current, "shared");
    const link = actProgress(progress.current, "link");

    // Visible only while the resume is lost — the link act calls them home.
    surface.opacity = Math.min(smoothstep(shared * 1.6), 1) * (1 - smoothstep(link * 1.4)) * 0.5;
    node.visible = surface.opacity > 0.01;
    if (!node.visible) return;

    const time = state.clock.elapsedTime;

    copies.forEach((copy, index) => {
      const local = smoothstep(Math.max(0, (shared - copy.delay) / (1 - copy.delay)));
      const travel = local * copy.distance;

      dummy.position
        .copy(copy.direction)
        .multiplyScalar(travel)
        .add(new THREE.Vector3(0, Math.sin(time * 0.4 + index) * 0.08, 0));

      dummy.rotation.set(
        copy.spin.x + local * 0.8,
        copy.spin.y + local * 1.2,
        copy.spin.z + local * 0.4,
      );

      const scale = mix(0.5, 0.24, local);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      node.setMatrixAt(index, dummy.matrix);
    });

    node.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, COPY_COUNT]} frustumCulled={false}>
      <planeGeometry args={[1.55, 2.0]} />
      <meshBasicMaterial
        ref={material}
        color={palette.sand}
        transparent
        opacity={0}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}
