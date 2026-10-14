import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border border-surface-border bg-surface/70 p-6 backdrop-blur-sm",
        "transition-colors duration-300 hover:border-foreground-muted/25",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-signal-400/25 bg-signal-900/40",
        "px-3 py-1 font-mono text-[11px] tracking-[0.14em] text-signal-500 uppercase",
        className,
      )}
      {...props}
    />
  );
}
