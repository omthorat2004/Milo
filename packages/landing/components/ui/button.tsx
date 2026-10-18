import { Slot } from "@/components/ui/slot";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

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
  // Paired with the lg waitlist field, keep the heights identical.
  lg: "h-14 px-7 text-base",
};

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** Render the single child element instead of a <button>, keeping the styles. */
  asChild?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  asChild = false,
  ...props
}: Props) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap",
        "transition-colors duration-200 disabled:pointer-events-none disabled:opacity-55",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
