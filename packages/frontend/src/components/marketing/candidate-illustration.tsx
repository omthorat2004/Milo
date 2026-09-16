import Image from "next/image";

import { cn } from "@/lib/utils";

export type CandidatePose = "typing" | "waiting" | "slumped" | "signal";

type Props = {
  pose: CandidatePose;

  sendCount: number;
  className?: string;
};

const sceneOpacity: Record<CandidatePose, number> = {
  typing: 1,
  waiting: 0.78,
  slumped: 0.6,
  signal: 1,
};

const figureMotion: Record<CandidatePose, string> = {
  typing: "animate-typing-bob",
  waiting: "animate-breathe",
  slumped: "animate-breathe",
  signal: "animate-breathe",
};

const figureTransform: Record<CandidatePose, string> = {
  typing: "translateY(0) rotate(0deg) scale(1)",
  waiting: "translateY(4px) rotate(-0.4deg) scale(0.995)",
  slumped: "translateY(12px) rotate(1.2deg) scale(0.985)",
  signal: "translateY(-8px) rotate(-0.6deg) scale(1.015)",
};

export function CandidateIllustration({ pose, sendCount, className }: Props) {
  return (
    <figure className={cn("relative w-full max-w-md", className)}>
      <div
        className="transition-transform duration-700 ease-out"
        style={{ transform: figureTransform[pose] }}
      >
        <div className={figureMotion[pose]}>
          <Image
            src="/illustrations/candidate.svg"
            alt="A person working alone at a laptop late at night"
            width={880}
            height={620}
            priority={false}
            className="h-auto w-full transition-opacity duration-700"
            style={{ opacity: sceneOpacity[pose] }}
          />
        </div>
      </div>

      <svg
        viewBox="0 0 880 620"
        aria-hidden="true"
        fill="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        {sendCount > 0 ? (
          <g
            key={sendCount}
            className="animate-send-off"
            style={{ transformOrigin: "560px 330px" }}
          >
            <rect
              x="548"
              y="306"
              width="46"
              height="58"
              rx="3"
              className="fill-sand-100/85 stroke-sand-300/50"
              strokeWidth="2"
            />
            <path
              d="M558 322h26M558 334h26M558 346h16"
              className="stroke-sand-700"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        ) : null}

        <g
          className="text-signal-400"
          stroke="currentColor"
          fill="none"
          style={{ opacity: pose === "signal" ? 1 : 0, transition: "opacity 600ms ease" }}
        >
          <circle cx="690" cy="196" r="13" strokeWidth="3" />
          <circle cx="690" cy="196" r="30" strokeWidth="2" opacity="0.5" />
          <circle cx="690" cy="196" r="50" strokeWidth="1.5" opacity="0.22" />
        </g>
      </svg>

      <figcaption className="sr-only">{describe(pose)}</figcaption>
    </figure>
  );
}

function describe(pose: CandidatePose): string {
  switch (pose) {
    case "typing":
      return "Sending another application.";
    case "waiting":
      return "Waiting for a reply that has not come.";
    case "slumped":
      return "Sitting back, out of explanations.";
    case "signal":
      return "Seeing the first real signal come back.";
  }
}
