import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, description, action, className }: Props) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="font-mono text-xs tracking-[0.22em] text-signal-400 uppercase">{eyebrow}</p>
        ) : null}
        <h1 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-3 leading-relaxed text-foreground-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}
