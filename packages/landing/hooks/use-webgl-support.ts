"use client";

import { useSyncExternalStore } from "react";

let probed: boolean | null = null;

function detect(): boolean {
  if (probed !== null) return probed;

  try {
    const canvas = document.createElement("canvas");
    probed = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    probed = false;
  }

  return probed;
}

const noopSubscribe = () => () => {};

/**
 * Whether this browser can render the 3D story.
 *
 * Returns `null` on the server and during hydration, so the caller can hold the
 * layout for one frame instead of flashing the fallback. The probe itself runs
 * once per page load and is cached.
 */
export function useWebGLSupport(): boolean | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => detect(),
    () => null,
  );
}
