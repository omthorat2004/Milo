"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";

import { actProgress, mix, smoothstep } from "@/lib/three/timeline";
import { damp } from "@/lib/utils";

import { DownloadBeat } from "./download-beat";
import { DustField } from "./dust-field";
import { InsightBars } from "./insight-bars";
import { palette } from "./palette";
import { ResumePage } from "./resume-page";
import { ScatteredCopies } from "./scattered-copies";
import { SignalPulses } from "./signal-pulses";
import { TrackingLink } from "./tracking-link";
import { ViewerChrome } from "./viewer-chrome";

type Props = {
  progress: React.RefObject<number>;
  /** Narrow viewports get a wider framing so nothing crops. */
  compact: boolean;
};

/**
 * Assembles the scene and drives the camera.
 *
 * Every act's camera move is derived from one scroll number rather than
 * scripted keyframes, so the whole story stays scrubbable in both directions.
 */
export function StoryStage({ progress, compact }: Props) {
  const key = useRef<THREE.DirectionalLight>(null);
  const signalLight = useRef<THREE.PointLight>(null);

  /**
   * Shared between the download beat (writer) and the viewer chrome (reader),
   * so the Download button flashes on the same frame the sheet detaches. A ref
   * keeps that in the render loop instead of causing React updates at 60fps.
   */
  const downloadFlashRef = useRef(0);

  useFrame((state, delta) => {
    // Read the camera off the frame state rather than useThree(): the camera is
    // an external mutable object, not React-owned state.
    const { camera } = state;
    const p = progress.current;
    const shared = smoothstep(actProgress(p, "shared"));
    const link = smoothstep(actProgress(p, "link"));
    const signal = smoothstep(actProgress(p, "signal"));
    const insight = smoothstep(actProgress(p, "insight"));

    const baseDistance = compact ? 8.6 : 6.4;
    const distance =
      baseDistance +
      mix(0, 1.4, shared) -
      mix(0, 0.9, link) -
      mix(0, 0.3, signal) +
      mix(0, 0.7, insight);

    const targetY = mix(0, 0.28, shared) - mix(0, 0.2, link) + mix(0, 0.34, insight);
    const drift = Math.sin(state.clock.elapsedTime * 0.18) * 0.12;

    camera.position.x = damp(camera.position.x, drift - mix(0, 0.5, insight), 2.5, delta);
    camera.position.y = damp(camera.position.y, targetY, 2.5, delta);
    camera.position.z = damp(camera.position.z, distance, 2.5, delta);
    camera.lookAt(mix(0, 0.4, insight), mix(0, -0.15, insight), 0);

    if (key.current) {
      key.current.intensity = damp(
        key.current.intensity,
        mix(2.6, 1.1, shared * (1 - link)),
        3,
        delta,
      );
    }

    if (signalLight.current) {
      const wanted = Math.max(signal, insight * 0.6, link * 0.35) * 5.5;
      signalLight.current.intensity = damp(signalLight.current.intensity, wanted, 3, delta);
      signalLight.current.position.x = mix(0, 1.75, insight);
    }
  });

  return (
    <>
      <ambientLight intensity={0.95} color={palette.sand} />
      <directionalLight
        ref={key}
        position={[3.4, 4.2, 4.6]}
        intensity={1.9}
        color={palette.keyLight}
      />
      <directionalLight position={[-5, -1.5, 2]} intensity={0.45} color={palette.fillLight} />
      <pointLight ref={signalLight} position={[0, 0, 2.4]} intensity={0} color={palette.signal} />

      <DustField />

      {/*
        On wide screens the whole composition sits right of centre so the copy
        rail on the left never overlaps the document. On narrow screens the copy
        moves to the bottom of the viewport, so the scene lifts instead.
      */}
      <group position-x={compact ? 0 : 1.15} position-y={compact ? 1.05 : 0}>
        <ScatteredCopies progress={progress} />
        <ViewerChrome progress={progress} downloadFlashRef={downloadFlashRef} />
        <ResumePage progress={progress} />
        <TrackingLink progress={progress} />
        <SignalPulses progress={progress} />
        <DownloadBeat progress={progress} downloadFlashRef={downloadFlashRef} />
        <InsightBars progress={progress} />
      </group>
    </>
  );
}
