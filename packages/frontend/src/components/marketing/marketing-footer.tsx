import Link from "next/link";

const links = [
  { href: "/features", label: "Features" },
  { href: "/path", label: "Path" },
  { href: "/about", label: "About" },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-surface-border py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-4">
          <span className="font-display text-lg tracking-tight text-foreground">Milo</span>
          <span className="text-xs text-foreground-muted">
            Resume analytics without surveillance.
          </span>
        </div>

        <nav
          className="flex flex-wrap items-center gap-6 text-sm text-foreground-muted"
          aria-label="Footer"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/omthorat2004/milo"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            Source
          </a>
          <a
            href="https://startupbenchmarks.com/product/milo-frontend-lake-vercel"
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* Third-party badge served as-is, so a plain img rather than next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://startupbenchmarks.com/assets/images/badge-dark.png"
              alt="Startup Benchmarks"
              height={54}
              className="h-[54px] w-auto"
              loading="lazy"
            />
          </a>
          <span className="text-foreground-muted/60">© {new Date().getFullYear()} Milo</span>
        </nav>
      </div>
    </footer>
  );
}
