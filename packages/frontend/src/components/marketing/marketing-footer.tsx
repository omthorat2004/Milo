import Link from "next/link";

const links = [
  { href: "/features", label: "Features" },
  { href: "/path", label: "Path" },
  { href: "/about", label: "About" },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-sand-300/8 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-4">
          <span className="font-display text-lg tracking-tight text-sand-50">Milo</span>
          <span className="text-xs text-sand-700">Resume analytics without surveillance.</span>
        </div>

        <nav
          className="flex flex-wrap items-center gap-6 text-sm text-sand-700"
          aria-label="Footer"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-sand-300"
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/omthorat2004/milo"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-sand-300"
          >
            Source
          </a>
          <span className="text-sand-700/60">© {new Date().getFullYear()} Milo</span>
        </nav>
      </div>
    </footer>
  );
}
