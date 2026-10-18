import Link from "next/link";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary:
    "bg-signal-400 text-ink-950 hover:bg-signal-300 active:bg-signal-500 shadow-[0_0_28px_-8px] shadow-signal-400/60",
  secondary:
    "border border-surface-border bg-surface text-foreground hover:border-foreground-muted/40",
  ghost: "text-foreground-muted hover:text-foreground hover:bg-surface-hover",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
};

const base = cn(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap",
  "transition-colors duration-200 disabled:pointer-events-none disabled:opacity-55",
);

type CommonProps = { variant?: Variant; size?: Size; className?: string };

export function Button({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: CommonProps &
  ({ href: string } | ({ href?: undefined } & React.ButtonHTMLAttributes<HTMLButtonElement>)) & {
    children: React.ReactNode;
  }) {
  const classes = cn(base, variants[variant], sizes[size], className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
