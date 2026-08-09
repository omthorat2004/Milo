import { cn } from "@/lib/utils";

/**
 * Wordmark: a document outline with a signal dot. The dot is the only green
 * element, matching the scene's rule that green means a recorded signal.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="none">
        <path
          d="M6 3h8l4 4v14H6z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
          opacity="0.85"
        />
        <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <circle cx="12" cy="14" r="2" className="fill-signal-400" />
        <circle cx="12" cy="14" r="4.6" className="stroke-signal-400/45" strokeWidth="1" />
      </svg>
      <span className="font-display text-lg tracking-tight text-sand-50">Milo</span>
    </span>
  );
}
