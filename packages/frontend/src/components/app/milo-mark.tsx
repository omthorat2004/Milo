import { cn } from "@/lib/utils";

export function MiloMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6", className)} aria-hidden="true" fill="none">
      <path
        d="M6 3h8l4 4v14H6z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="12" cy="14" r="2" className="fill-signal-400" />
      <circle cx="12" cy="14" r="4.6" className="stroke-signal-400/45" strokeWidth="0.9" />
    </svg>
  );
}
