"use client";

import { Canvas } from "@react-three/fiber";

import { useMediaQuery } from "@/hooks/use-media-query";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useWebGLSupport } from "@/hooks/use-webgl-support";

import { StoryStage } from "./scene/story-stage";
import { StoryStill } from "./story-still";

type Props = {
  progress: React.RefObject<number>;
  /** Rendering pauses entirely when the story is off screen. */
  active: boolean;
};

/**
 * WebGL layer for the story section.
 *
 * Three guards before a frame is drawn: a reduced-motion preference, no WebGL
 * context available, and being off screen. The first two fall back to a static
 * composition so the narrative still lands; the third just stops the loop.
 */
export function StoryCanvas({ progress, active }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const supportsWebGL = useWebGLSupport();
  const compact = useMediaQuery("(max-width: 767px)");

  if (reducedMotion || supportsWebGL === false) {
    return <StoryStill progress={progress} />;
  }

  // Hold the layout for the hydration pass rather than flashing the fallback.
  if (supportsWebGL === null) return null;

  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, 1.75]}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, compact ? 8.6 : 6.4], fov: 42, near: 0.1, far: 60 }}
    >
      <StoryStage progress={progress} compact={compact} />
    </Canvas>
  );
}
