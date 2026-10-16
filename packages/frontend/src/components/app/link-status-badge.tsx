import { cn } from "@/lib/utils";
import type { LinkStatus } from "@/stores/links-store";

const labels: Record<LinkStatus, string> = {
  active: "Active",
  paused: "Paused",
};

const styles: Record<LinkStatus, string> = {
  active: "bg-signal-400/10 text-signal-400",
  paused: "bg-surface text-foreground-muted",
};

export function LinkStatusBadge({ status, className }: { status: LinkStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        styles[status],
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "active" ? "bg-signal-400" : "bg-foreground-muted",
        )}
        aria-hidden="true"
      />
      {labels[status]}
    </span>
  );
}
