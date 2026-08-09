"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type Props = { progress: React.RefObject<number> };

/**
 * Motion-free stand-in for the WebGL story.
 *
 * Shown when the visitor asked for reduced motion or the device has no WebGL.
 * It still tracks the act, so the section reads as a sequence rather than a
 * frozen decoration — it just does it with opacity instead of animation.
 */
export function StoryStill({ progress }: Props) {
  const [act, setAct] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setAct(Math.min(4, Math.floor(progress.current * 5)));
    }, 200);
    return () => window.clearInterval(id);
  }, [progress]);

  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <div className="relative h-[min(60vh,26rem)] w-[min(80vw,20rem)]">
        <div className="absolute inset-0 rounded-lg border border-sand-300/25 bg-gradient-to-b from-sand-100/95 to-sand-200/85 shadow-2xl shadow-black/50">
          <div className="space-y-3 p-6">
            <div className="h-4 w-1/2 rounded-sm bg-ink-800/80" />
            <div className="h-2 w-1/3 rounded-sm bg-ink-800/35" />
            <div className="pt-4" />
            {[0.9, 0.8, 0.95, 0.6, 0.85, 0.7].map((width, index) => (
              <div
                key={index}
                className="h-1.5 rounded-sm bg-ink-800/20"
                style={{ width: `${width * 100}%` }}
              />
            ))}
          </div>
        </div>

        {/* Signal ring appears from act 3 onward, matching the 3D grammar. */}
        <div
          className={cn(
            "absolute -inset-10 rounded-full border transition-opacity duration-700",
            act >= 2 ? "border-signal-400/50 opacity-100" : "border-signal-400/0 opacity-0",
          )}
        />
        <div
          className={cn(
            "absolute -inset-20 rounded-full border transition-opacity duration-700",
            act >= 3 ? "border-signal-400/25 opacity-100" : "border-signal-400/0 opacity-0",
          )}
        />
      </div>
    </div>
  );
}
