"use client";

import { useCallback, useLayoutEffect, useState } from "react";

import { THEME_STORAGE_KEY } from "./theme-script";

export type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * Reads/writes the theme already applied by theme-script.ts. The initial
 * state is always "dark" — matching the hardcoded SSR markup on <html> —
 * even though theme-script.ts may have already corrected the live DOM
 * before hydration runs. Starting from readTheme() here would make this
 * component's first client render disagree with the server-rendered HTML
 * (wrong icon, wrong aria-label) and trip a hydration mismatch. The real
 * value is applied after mount instead, via useLayoutEffect below.
 */
export function useTheme(): { theme: Theme; setTheme: (next: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>("dark");

  useLayoutEffect(() => {
    // Runs after hydration, before paint: picks up whatever theme-script.ts
    // (or, in dev, React Strict Mode's remount clearing it) left on <html>.
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      const next: Theme = stored === "light" ? "light" : stored === "dark" ? "dark" : readTheme();
      document.documentElement.classList.toggle("dark", next === "dark");
      document.documentElement.style.colorScheme = next;
      setThemeState(next);
    } catch {
      setThemeState(readTheme());
    }
  }, []);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing / storage disabled: theme just won't persist.
    }
    setThemeState(next);
  }, []);

  return { theme, setTheme };
}
