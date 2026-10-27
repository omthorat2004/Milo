"use client";

import { Moon, Sun } from "lucide-react";
import { useRef } from "react";

import { useTheme } from "./use-theme";

type Props = {
  className?: string;
};

const TRANSITION_MS = 650;

/**
 * Toggles light/dark via the View Transitions API: the new theme reveals
 * through a circle that grows from this button outward, rather than an
 * instant swap. Falls back to an instant (unanimated) toggle in browsers
 * without View Transitions, or when the visitor prefers reduced motion.
 */
export function ThemeToggle({ className }: Props) {
  const { theme, setTheme } = useTheme();
  const buttonRef = useRef<HTMLButtonElement>(null);

  function handleClick() {
    const next = theme === "dark" ? "light" : "dark";
    const button = buttonRef.current;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!button || prefersReducedMotion || !document.startViewTransition) {
      setTheme(next);
      return;
    }

    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = document.startViewTransition(() => setTheme(next));

    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
          },
          {
            duration: TRANSITION_MS,
            easing: "ease-in-out",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      })
      .catch(() => {
        // Transition was skipped (e.g. a second click mid-animation). The
        // class toggle inside startViewTransition's callback already ran.
      });
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className={className}
    >
      {theme === "dark" ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}
