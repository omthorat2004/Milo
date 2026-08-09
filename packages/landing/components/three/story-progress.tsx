"use client";

import { createContext, useContext, useEffect, useRef, useState, type RefObject } from "react";

import { clamp } from "@/lib/utils";

type ProgressContext = {
  /** 0..1 across the whole story section. Read in useFrame; never triggers renders. */
  progress: RefObject<number>;
  /** Coarse act index. This one is state, because HTML copy needs to re-render. */
  activeAct: number;
  /** True while the story section is anywhere near the viewport. */
  inView: boolean;
};

const StoryProgressContext = createContext<ProgressContext | null>(null);

export function useStoryProgress(): ProgressContext {
  const context = useContext(StoryProgressContext);
  if (!context) {
    throw new Error("useStoryProgress must be used inside <StoryProgressProvider>.");
  }
  return context;
}

type Props = {
  sectionRef: RefObject<HTMLElement | null>;
  actCount: number;
  children: React.ReactNode;
};

/**
 * Tracks scroll through the story section.
 *
 * Progress is written to a ref inside a rAF-throttled scroll handler, so the
 * 3D scene reads a fresh value every frame while React re-renders only when the
 * active act changes — roughly five times across the entire section.
 */
export function StoryProgressProvider({ sectionRef, actCount, children }: Props) {
  const progress = useRef(0);
  const [activeAct, setActiveAct] = useState(0);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const scrolled = -rect.top;

      const next = scrollable > 0 ? clamp(scrolled / scrollable, 0, 1) : 0;
      progress.current = next;

      const act = clamp(Math.floor(next * actCount), 0, actCount - 1);
      setActiveAct((current) => (current === act ? current : act));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? false),
      { rootMargin: "200px 0px" },
    );
    observer.observe(section);

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [sectionRef, actCount]);

  return (
    <StoryProgressContext.Provider value={{ progress, activeAct, inView }}>
      {children}
    </StoryProgressContext.Provider>
  );
}
