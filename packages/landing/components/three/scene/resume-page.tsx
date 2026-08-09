"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { actProgress, mix, smoothstep } from "@/lib/three/timeline";
import { PAGE_ASPECT, createResumeTexture } from "@/lib/three/resume-texture";
import { damp } from "@/lib/utils";

import { palette } from "./palette";

const PAGE_HEIGHT = 3.1;
const PAGE_WIDTH = PAGE_HEIGHT * PAGE_ASPECT;

type Props = { progress: React.RefObject<number> };

/**
 * The hero object: the candidate's resume.
 *
 * Act 1 it floats alone. Act 2 it recedes and dims as copies scatter. Act 3 it
 * returns, tethered by the tracking link. Act 4 it turns to page two under the
 * signal light. Act 5 it steps aside so the analytics can take the frame.
 */
export function ResumePage({ progress }: Props) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);

  const textures = useMemo(() => [createResumeTexture(1), createResumeTexture(2)], []);
  const shownPage = useRef(0);

  useEffect(() => {
    const loaded = textures;
    return () => loaded.forEach((texture) => texture.dispose());
  }, [textures]);

  useFrame((state, delta) => {
    const node = group.current;
    const surface = material.current;
    if (!node || !surface) return;

    const p = progress.current;
    const shared = actProgress(p, "shared");
    const link = actProgress(p, "link");
    const signal = actProgress(p, "signal");
    const insight = actProgress(p, "insight");

    const time = state.clock.elapsedTime;

    // Recede while the resume is "lost", return once the link exists.
    const depth = mix(0, -2.4, smoothstep(shared)) + mix(0, 2.4, smoothstep(link));
    const lift = Math.sin(time * 0.6) * 0.06;
    const slide = mix(0, 1.75, smoothstep(insight));

    node.position.x = damp(node.position.x, slide, 4, delta);
    node.position.y = damp(node.position.y, lift + mix(0, 0.15, smoothstep(insight)), 4, delta);
    node.position.z = damp(node.position.z, depth, 4, delta);

    // Squares up to the camera as it settles into the viewer.
    const targetTilt = mix(0.22, 0, smoothstep(link)) + Math.sin(time * 0.4) * 0.03 * (1 - link);
    node.rotation.y = damp(
      node.rotation.y,
      targetTilt + mix(0, 0.3, smoothstep(insight)),
      3,
      delta,
    );
    node.rotation.x = damp(node.rotation.x, Math.sin(time * 0.5) * 0.02, 3, delta);

    // Shrinks once the viewer chrome assembles, so the page sits inside it.
    const scale =
      mix(1, 0.94, smoothstep(shared)) *
      mix(1, 0.84, smoothstep(link)) *
      mix(1, 0.86, smoothstep(insight));
    node.scale.setScalar(damp(node.scale.x, scale, 4, delta));

    // Dim only while the resume is unaccounted for.
    surface.opacity = damp(
      surface.opacity,
      mix(1, 0.34, smoothstep(shared) * (1 - link)),
      5,
      delta,
    );

    // Page turn, once, when the signal act reports reading page two.
    const wantedPage = signal > 0.45 ? 1 : 0;
    if (wantedPage !== shownPage.current) {
      shownPage.current = wantedPage;
      surface.map = textures[wantedPage] ?? null;
      surface.needsUpdate = true;
    }
  });

  return (
    <group ref={group}>
      <mesh castShadow={false}>
        <planeGeometry args={[PAGE_WIDTH, PAGE_HEIGHT]} />
        <meshStandardMaterial
          ref={material}
          map={textures[0]}
          color={palette.paper}
          roughness={0.82}
          metalness={0}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Thin edge, so the page reads as a physical sheet rather than a decal. */}
      <mesh position={[0, 0, -0.012]}>
        <planeGeometry args={[PAGE_WIDTH * 1.005, PAGE_HEIGHT * 1.004]} />
        <meshBasicMaterial color={palette.clay} transparent opacity={0.18} />
      </mesh>
    </group>
  );
}
