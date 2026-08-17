"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Every entry must resolve to a route that exists. A dead nav item costs more
 * trust than a missing one, so new links land here only once their page does.
 */
const navigation = [
  { href: "/features", label: "Features" },
  { href: "/path", label: "Path" },
  { href: "/about", label: "About" },
] as const;

export function MarketingHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-sand-300/10 bg-ink-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="Milo home" className="inline-flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" className="size-5 text-sand-200" aria-hidden="true" fill="none">
            <path
              d="M6 3h8l4 4v14H6z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
              opacity="0.85"
            />
            <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <circle cx="12" cy="14" r="2" className="fill-signal-400" />
          </svg>
          <span className="font-display text-lg tracking-tight text-sand-50">Milo</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {navigation.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-sm transition-colors",
                  active ? "text-sand-50" : "text-sand-500 hover:text-sand-100",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/*
          Both actions render unconditionally. Session-aware navigation waits
          until authentication exists; guessing at it now would mean writing
          state we would only have to tear out.
        */}
        <div className="flex items-center gap-2">
          <Button href="/login" variant="ghost" size="sm">
            Log in
          </Button>
          <Button href="/register" size="sm">
            Get started
          </Button>
        </div>
      </div>
    </header>
  );
}
