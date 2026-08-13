"use client";

import { useRef } from "react";

import { StoryCanvas } from "@/components/three/story-canvas";
import { StoryProgressProvider, useStoryProgress } from "@/components/three/story-progress";
import { Container } from "@/components/ui/section";
import { storyActs } from "@/lib/story";
import { cn } from "@/lib/utils";

/**
 * The scrollytelling centrepiece.
 *
 * The section is `acts × 100vh` tall with a sticky viewport inside it: the 3D
 * scene stays fixed while the copy scrolls past, and one scroll value drives
 * both. Each act is a real <article> in the DOM, so the story is readable by a
 * screen reader and indexable without WebGL.
 */
export function Story() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section id="story" ref={sectionRef} className="relative" aria-label="How Milo works">
      <StoryProgressProvider sectionRef={sectionRef} actCount={storyActs.length}>
        <StoryViewport />
      </StoryProgressProvider>
    </section>
  );
}

function StoryViewport() {
  const { progress, activeAct, inView } = useStoryProgress();

  return (
    <>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0">
          <StoryCanvas progress={progress} active={inView} />
        </div>

        {/*
          On narrow screens the copy sits over the lower half of the scene.
          This scrim keeps it readable without dimming the document itself.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-950 via-ink-950/85 to-transparent sm:hidden"
        />

        {/* Copy rail, sits above the canvas, pinned to the bottom on mobile. */}
        <Container className="relative flex h-full items-end pb-16 sm:items-center sm:pb-0">
          <div className="relative w-full sm:max-w-md">
            {storyActs.map((act, index) => (
              <article
                key={act.id}
                aria-hidden={activeAct !== index}
                className={cn(
                  "transition-all duration-500 ease-out",
                  index === 0 ? "relative" : "absolute inset-x-0 top-0",
                  activeAct === index
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-4 opacity-0",
                )}
              >
                <p className="font-mono text-xs tracking-[0.22em] text-signal-400 uppercase">
                  {act.eyebrow}
                </p>
                <h2 className="mt-4 font-display text-3xl leading-[1.08] text-balance text-sand-50 sm:text-4xl md:text-[2.75rem]">
                  {act.headline}
                </h2>
                <p className="mt-5 text-base leading-relaxed text-sand-500">{act.body}</p>
              </article>
            ))}

            <ActProgressRail activeAct={activeAct} total={storyActs.length} />
          </div>
        </Container>
      </div>

      {/* Scroll runway. Each act owns one viewport of scroll distance. */}
      <div aria-hidden="true" style={{ height: `${storyActs.length * 100}vh` }} />
    </>
  );
}

function ActProgressRail({ activeAct, total }: { activeAct: number; total: number }) {
  return (
    <div className="mt-10 flex gap-1.5" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-0.5 flex-1 rounded-full transition-colors duration-500",
            index <= activeAct ? "bg-signal-400" : "bg-sand-700/40",
          )}
        />
      ))}
    </div>
  );
}
