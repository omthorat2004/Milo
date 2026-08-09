import Link from "next/link";

import { Logo } from "@/components/site/logo";
import { Container } from "@/components/ui/section";

export function Footer() {
  return (
    <footer className="border-t border-sand-300/8 py-12">
      <Container className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 text-sand-500">
          <Logo />
          <span className="text-xs text-sand-700">Resume analytics without surveillance.</span>
        </div>

        {/* Only links that lead somewhere real. Nothing placeholder. */}
        <nav className="flex items-center gap-6 text-sm text-sand-700" aria-label="Footer">
          <Link href="/#features" className="transition-colors hover:text-sand-300">
            Features
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-sand-300">
            Privacy
          </Link>
          <Link href="/#waitlist" className="transition-colors hover:text-sand-300">
            Waitlist
          </Link>
          <span className="text-sand-700/60">© {new Date().getFullYear()} Milo</span>
        </nav>
      </Container>
    </footer>
  );
}
