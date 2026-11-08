import Link from "next/link";

import { Logo } from "@/components/site/logo";
import { Container } from "@/components/ui/section";

export function Footer() {
  return (
    <footer className="border-t border-surface-border py-12">
      <Container className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 text-foreground-muted">
          <Logo />
          <span className="text-xs text-foreground-muted">
            Resume analytics without surveillance.
          </span>
        </div>

        {/* Only links that lead somewhere real. Nothing placeholder. */}
        <nav className="flex items-center gap-6 text-sm text-foreground-muted" aria-label="Footer">
          <Link href="/#features" className="transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link href="/#waitlist" className="transition-colors hover:text-foreground">
            Waitlist
          </Link>
          {/* Source available, not open source. The repo is public so the
              privacy claims can be audited. */}
          <a
            href="https://github.com/omthorat2004/milo"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            Source
          </a>
          <a
            href="https://startupbenchmarks.com/product/milo-nu-two-vercel"
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* Third-party badge served as-is, so a plain img rather than next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://startupbenchmarks.com/assets/images/badge.png"
              alt="Startup Benchmarks"
              height={54}
              className="h-[54px] w-auto"
              loading="lazy"
            />
          </a>
          <span className="text-foreground-muted/60">© {new Date().getFullYear()} Milo</span>
        </nav>
      </Container>
    </footer>
  );
}
