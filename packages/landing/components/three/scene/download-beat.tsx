"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { PAGE_ASPECT, createResumeTexture } from "@/lib/three/resume-texture";
import { actProgress, mix, smoothstep } from "@/lib/three/timeline";

import { palette } from "./palette";

const SHEET_HEIGHT = 2.0;
const SHEET_WIDTH = SHEET_HEIGHT * PAGE_ASPECT;

const CYCLE_SECONDS = 4.2;
/** Fraction of the cycle the download animation occupies. */
const ACTIVE_WINDOW = 0.55;

type Props = {
  progress: React.RefObject<number>;
  /** Written each frame; the viewer chrome reads it to flash its button. */
  downloadFlashRef: React.RefObject<number>;
};

/**
 * The download event, on a loop.
 *
 * A ghost of the page detaches, falls, and lands on a tray — the visual for
 * "the DOWNLOAD event is recorded before the file is handed over". The arrow
 * and tray are the only other green objects in the scene, matching the pulses.
 */
export function DownloadBeat({ progress, downloadFlashRef }: Props) {
  const group = useRef<THREE.Group>(null);
  const sheet = useRef<THREE.Mesh>(null);
  const arrow = useRef<THREE.Group>(null);
  const tray = useRef<THREE.Mesh>(null);

  // The falling sheet carries the document itself, so the beat reads as "this
  // file was downloaded" rather than an abstract shape moving.
  const sheetTexture = useMemo(() => createResumeTexture(1), []);

  useEffect(() => {
    const texture = sheetTexture;
    return () => texture.dispose();
  }, [sheetTexture]);

  useFrame((state) => {
    const node = group.current;
    if (!node) return;

    const p = progress.current;
    const signal = smoothstep(actProgress(p, "signal"));
    const insight = smoothstep(actProgress(p, "insight"));

    // Belongs to the signal act only — act 5 hands the frame to the analytics.
    const presence = signal * (1 - insight);
    node.visible = presence > 0.02;

    if (!node.visible) {
      downloadFlashRef.current = 0;
      return;
    }

    node.position.x = mix(0, 1.75, insight);

    const cycle = (state.clock.elapsedTime % CYCLE_SECONDS) / CYCLE_SECONDS;
    const local = cycle < ACTIVE_WINDOW ? cycle / ACTIVE_WINDOW : -1;

    // Button flash fires at the top of the cycle and decays quickly.
    downloadFlashRef.current = local >= 0 ? Math.max(0, 1 - local * 5) * presence : 0;

    if (sheet.current) {
      const material = sheet.current.material as THREE.MeshBasicMaterial;

      if (local < 0) {
        material.opacity = 0;
      } else {
        const fall = local ** 1.6;
        sheet.current.position.y = mix(1.15, -1.5, fall);
        sheet.current.scale.setScalar(mix(0.62, 0.34, fall));
        sheet.current.rotation.z = mix(0, 0.16, fall);
        material.opacity = Math.min(local * 6, 1) * (1 - local ** 4) * presence;
      }
    }

    if (arrow.current) {
      arrow.current.visible = local >= 0;
      if (local >= 0) {
        arrow.current.position.y = mix(0.4, -1.25, local);
        arrow.current.children.forEach((child) => {
          const mesh = child as THREE.Mesh;
          const material = mesh.material as THREE.MeshBasicMaterial;
          material.opacity = (1 - local) * 0.8 * presence;
        });
      }
    }

    if (tray.current) {
      const material = tray.current.material as THREE.MeshBasicMaterial;
      // Tray brightens as the sheet lands on it.
      const landing = local > 0.75 ? (local - 0.75) / 0.25 : 0;
      material.opacity = (0.25 + landing * 0.6) * presence;
      tray.current.scale.x = 1 + landing * 0.12;
    }
  });

  return (
    <group ref={group} visible={false}>
      {/* Falling copy of the document, in front of the viewer. */}
      <mesh ref={sheet} position={[0, 1.15, 0.9]}>
        <planeGeometry args={[SHEET_WIDTH, SHEET_HEIGHT]} />
        <meshBasicMaterial
          map={sheetTexture}
          color={palette.paper}
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Download arrow, trailing the sheet. */}
      <group ref={arrow} position={[0.95, 0.4, 0.95]} visible={false}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.3, 8]} />
          <meshBasicMaterial color={palette.signal} transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh position={[0, -0.09, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.075, 0.16, 12]} />
          <meshBasicMaterial color={palette.signal} transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      {/* Tray the download lands on. */}
      <mesh ref={tray} position={[0, -1.62, 0.9]}>
        <planeGeometry args={[1.5, 0.02]} />
        <meshBasicMaterial color={palette.signal} transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  );
}
