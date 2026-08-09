import { cn } from "@/lib/utils";

export function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)} {...props} />;
}

type SectionProps = React.HTMLAttributes<HTMLElement> & { id?: string };

export function Section({ className, ...props }: SectionProps) {
  return <section className={cn("relative py-24 sm:py-32", className)} {...props} />;
}

type HeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: HeadingProps) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? (
        <p className="mb-4 font-mono text-xs tracking-[0.22em] text-signal-400 uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-display text-3xl leading-[1.1] text-balance text-sand-50 sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-5 text-base leading-relaxed text-sand-500 sm:text-lg">{description}</p>
      ) : null}
    </div>
  );
}
