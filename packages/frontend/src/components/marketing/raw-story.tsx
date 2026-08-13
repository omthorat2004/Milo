"use client";

import { useEffect, useState } from "react";

import {
  CandidateIllustration,
  type CandidatePose,
} from "@/components/marketing/candidate-illustration";
import { RawStoryScene } from "@/components/marketing/raw-story-scene";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

/**
 * The unfiltered version of the pitch, written for people applying to their
 * first roles rather than for senior hires.
 *
 * Blunt, but nothing here is exaggerated: every line is a real consequence of
 * sending a document you cannot see into a process that never reports back.
 */

type Beat = {
  text: string;
  tone: "sent" | "silence" | "gut";
};

const beats: readonly Beat[] = [
  { text: "Applied. SDE Intern, 6 months.", tone: "sent" },
  { text: "No response.", tone: "silence" },
  { text: "Applied. Graduate Trainee, off campus.", tone: "sent" },
  { text: "No response.", tone: "silence" },
  { text: "Applied. Junior Backend Developer. 0 to 1 years.", tone: "sent" },
  { text: "“We are looking for someone with more experience.”", tone: "silence" },
  { text: "He added two more projects to the resume.", tone: "gut" },
  { text: "Applied. Frontend Intern.", tone: "sent" },
  { text: "No response.", tone: "silence" },
  { text: "A senior said they would refer him internally.", tone: "sent" },
  { text: "He still does not know if they ever did.", tone: "gut" },
  { text: "Applied. Same resume. 40th time this month.", tone: "sent" },
  { text: "No response.", tone: "silence" },
  { text: "He checked his inbox at 1am. Nothing.", tone: "gut" },
  { text: "Rejected. Five weeks later. Template email.", tone: "silence" },
  { text: "He never found out if a person opened it.", tone: "gut" },
];

const INTERVAL_MS = 900;

export function RawStory() {
  const reducedMotion = usePrefersReducedMotion();
  const [visible, setVisible] = useState(1);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reducedMotion || paused) return;

    const id = window.setInterval(() => {
      setVisible((current) => (current >= beats.length ? current : current + 1));
    }, INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [reducedMotion, paused]);

  // Reduced motion shows the whole list at once, with no drip and no timer.
  const shown = reducedMotion ? beats.length : visible;
  const sent = beats.slice(0, shown).filter((beat) => beat.tone === "sent").length;
  const finished = shown >= beats.length;

  const current = beats[shown - 1];
  const pose: CandidatePose = finished
    ? "signal"
    : current?.tone === "sent"
      ? "typing"
      : current?.tone === "gut"
        ? "slumped"
        : "waiting";

  // Counts applications sent so far, so the paper animation retriggers on each.
  const sendCount = beats.slice(0, shown).filter((beat) => beat.tone === "sent").length;

  return (
    <section
      // overflow-clip, not overflow-hidden: `overflow: hidden` makes this a
      // scroll container, which silently disables `position: sticky` on the
      // left column. `overflow: clip` crops the canvas without that side effect.
      className="relative isolate overflow-clip border-y border-sand-300/8 bg-ink-900/40 py-24 sm:py-32"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
        <RawStoryScene />
      </div>
      {/* Keeps the falling cards from competing with the copy over them. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-ink-950 via-ink-950/80 to-ink-950/40"
      />

      <div className="mx-auto grid w-full max-w-6xl gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="font-mono text-xs tracking-[0.22em] text-clay-400 uppercase">
            Before the first interview
          </p>

          <h2 className="mt-5 font-display text-4xl leading-[1.05] text-balance text-sand-50 sm:text-5xl">
            You are not bad at this. You are working blind.
          </h2>

          {/*
            A named candidate rather than an abstract "you". Aarav is invented,
            and is the same person on the sample resume rendered in the 3D
            scenes, so the two surfaces describe one coherent story.
          */}
          <p className="mt-6 border-l-2 border-clay-400/40 pl-4 text-sm leading-relaxed text-sand-500">
            <span className="text-sand-200">Aarav</span>, 2026 batch. Three projects, one hackathon,
            no internship yet. He has a resume he is proud of and forty applications he has heard
            nothing about. This is one month of his search.
          </p>

          <div className="mt-7 space-y-5 text-lg leading-relaxed text-sand-500">
            <p>
              Nobody warns you that the hardest part of your first job hunt is not the interview. It
              is the silence before one. You send the same document forty times and nothing comes
              back that tells you anything.
            </p>
            <p>
              So you invent reasons. Not enough projects. The CGPA. No internship yet. The summary
              is weak. You rewrite it at midnight based on no evidence, because no evidence is all
              you have.
            </p>
            <p className="text-sand-300">
              Maybe the resume was fine and nobody opened it. You would never know. That is the
              actual problem, and it is the only one Milo tries to solve.
            </p>
          </div>

          <CandidateIllustration pose={pose} sendCount={sendCount} className="mt-10" />
          <dl className="mt-10 flex flex-wrap gap-10">
            <Metric label="Sent" value={sent} tone="neutral" />
            <Metric label="Replies" value={0} tone="warn" />
            <Metric label="Times you were told why" value={0} tone="warn" />
          </dl>
        </div>

        <div className="relative">
          <ol className="space-y-2.5" aria-label="One month of Aarav’s job search">
            {beats.slice(0, shown).map((beat, index) => (
              <li
                key={index}
                className={cn(
                  "animate-rise rounded-lg border px-4 py-3 text-sm backdrop-blur-[2px]",
                  beat.tone === "sent" && "border-sand-300/12 bg-ink-850/80 text-sand-300",
                  beat.tone === "silence" &&
                    "border-transparent bg-ink-950/40 text-sand-700 italic",
                  beat.tone === "gut" && "border-clay-400/20 bg-clay-400/5 text-sand-200",
                )}
              >
                {beat.text}
              </li>
            ))}
          </ol>

          {finished ? (
            <p className="mt-8 animate-rise rounded-lg border border-signal-400/25 bg-signal-900/40 px-4 py-3.5 text-sm text-signal-200 backdrop-blur-[2px]">
              With Milo, one of those lines reads differently: opened twice, page two for ninety
              seconds, downloaded. Now you know which door was actually open, and which follow-up is
              worth sending.
            </p>
          ) : (
            <p className="mt-8 font-mono text-xs text-sand-700" aria-hidden="true">
              hover to pause
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "warn";
}) {
  return (
    <div>
      <dt className="text-xs tracking-wide text-sand-700">{label}</dt>
      <dd
        className={cn(
          "mt-1 font-display text-3xl tabular-nums",
          tone === "neutral" ? "text-sand-50" : "text-clay-400",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
