"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribes to a CSS media query.
 *
 * `useSyncExternalStore` rather than an effect writing state: it reads the
 * browser's value at render time, gives a defined server snapshot, and avoids
 * the cascading render that setState-in-an-effect causes.
 */
export function useMediaQuery(query: string, serverFallback = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = useCallback(() => serverFallback, [serverFallback]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
