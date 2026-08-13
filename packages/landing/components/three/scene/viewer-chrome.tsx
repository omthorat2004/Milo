"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { actProgress, mix, smoothstep } from "@/lib/three/timeline";
import { VIEWER_BAR_ASPECT, createViewerBarTexture } from "@/lib/three/viewer-texture";
import { damp } from "@/lib/utils";

import { palette } from "./palette";

const BAR_WIDTH = 2.8;
const BAR_HEIGHT = BAR_WIDTH / VIEWER_BAR_ASPECT;
const PANEL_HEIGHT = 2.9;
const PANEL_OFFSET_Y = -0.2;

/** Download button centre, as a fraction of the bar texture's width. */
const DOWNLOAD_BUTTON_X = BAR_WIDTH * (871 / 1024 - 0.5);
const DOWNLOAD_BUTTON_SIZE: [number, number] = [(218 / 1024) * BAR_WIDTH, (54 / 176) * BAR_HEIGHT];

/** How far behind the page the chrome sits. */
const DEPTH = -1.3;
/** Cancels the perspective shrink that DEPTH would otherwise introduce. */
const DEPTH_SCALE = 1.26;

type Props = {
  progress: React.RefObject<number>;
  /** Rises to 1 for the moment the Download button is "pressed". */
  downloadFlashRef: React.RefObject<number>;
};

/**
 * Act 3 onward: the resume is now open inside Milo.
 *
 * A viewer shell assembles around the page, top bar with the tracking URL and
 * a Download button, and a panel behind the document. The button flashes each
 * time the download beat fires, so cause and effect are visible.
 */
export function ViewerChrome({ progress, downloadFlashRef }: Props) {
  const group = useRef<THREE.Group>(null);
  const barMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const panelMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const glow = useRef<THREE.Mesh>(null);

  const barTexture = useMemo(() => createViewerBarTexture(), []);

  useEffect(() => {
    const texture = barTexture;
    return () => texture.dispose();
  }, [barTexture]);

  useFrame((_state, delta) => {
    const node = group.current;
    const bar = barMaterial.current;
    const panel = panelMaterial.current;
    if (!node || !bar || !panel) return;

    const p = progress.current;
    const link = smoothstep(actProgress(p, "link"));
    const insight = smoothstep(actProgress(p, "insight"));

    // Assembles as the link act lands, clears once analytics take the frame.
    const presence = link * (1 - insight);
    node.visible = presence > 0.01;
    if (!node.visible) return;

    bar.opacity = presence;
    panel.opacity = presence * 0.55;

    node.position.x = damp(node.position.x, mix(0, 1.75, insight), 4, delta);
    node.position.y = damp(node.position.y, mix(-0.3, 0.15, link), 4, delta);
    node.scale.setScalar(
      damp(node.scale.x, DEPTH_SCALE * mix(0.85, 1, link) * mix(1, 0.86, insight), 4, delta),
    );
    node.rotation.y = damp(node.rotation.y, mix(0, 0.3, insight), 3, delta);

    if (glow.current) {
      const material = glow.current.material as THREE.MeshBasicMaterial;
      material.opacity = downloadFlashRef.current * 0.85 * presence;
      glow.current.scale.setScalar(mix(1, 1.35, downloadFlashRef.current));
    }
  });

  return (
    /*
     * Pushed back in z so it stays behind the page for the whole entry
     * transition, the page is still travelling forward from the "lost" act
     * while the chrome assembles, and a semi-transparent panel in front of it
     * would tint the document.
     */
    <group ref={group} position-z={DEPTH} visible={false}>
      {/* Panel behind the page, gives the document a viewer to sit in. */}
      <mesh position={[0, PANEL_OFFSET_Y, -0.06]}>
        <planeGeometry args={[BAR_WIDTH, PANEL_HEIGHT]} />
        <meshBasicMaterial
          ref={panelMaterial}
          color={palette.ink}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, PANEL_HEIGHT / 2 + PANEL_OFFSET_Y + BAR_HEIGHT / 2, -0.05]}>
        <planeGeometry args={[BAR_WIDTH, BAR_HEIGHT]} />
        <meshBasicMaterial ref={barMaterial} map={barTexture} transparent opacity={0} />
      </mesh>

      {/* Flash over the Download button when an event is recorded. */}
      <mesh
        ref={glow}
        position={[DOWNLOAD_BUTTON_X, PANEL_HEIGHT / 2 + PANEL_OFFSET_Y + BAR_HEIGHT / 2, -0.04]}
      >
        <planeGeometry args={DOWNLOAD_BUTTON_SIZE} />
        <meshBasicMaterial color={palette.signalSoft} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
