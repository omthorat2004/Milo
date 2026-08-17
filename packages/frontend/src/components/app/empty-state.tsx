import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-card border border-dashed border-sand-300/15 bg-ink-900/40 px-6 py-14 text-center",
        className,
      )}
    >
      <h3 className="font-display text-lg text-sand-200">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-sand-500">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
