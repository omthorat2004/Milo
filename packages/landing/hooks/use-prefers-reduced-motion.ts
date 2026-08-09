"use client";

import { useMediaQuery } from "./use-media-query";

/** True when the visitor has asked their OS to reduce motion. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
