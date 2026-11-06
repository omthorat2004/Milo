import { cn } from "@/lib/utils";

/** A pulsing placeholder block. Decorative, so hidden from assistive tech;
 * the surrounding region announces loading with `aria-busy`. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-surface", className)} />
  );
}
