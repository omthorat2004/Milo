"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/section";
import { cn } from "@/lib/utils";

/**
 * Every entry must resolve to something that exists today. No placeholder
 * "Contact" or "About" links — a dead nav item costs more trust than a missing
 * one. A real /features page can replace the anchor when it is built.
 *
 * This list must stay in the same order as the sections render in
 * `app/page.tsx`: story, how-it-works, analytics, features, privacy. A nav that
 * disagrees with the page sends people backwards up the page when they click.
 */
const navigation = [
  { href: "#story", label: "The story" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#analytics", label: "Dashboard" },
  { href: "#features", label: "Features" },
  { href: "#privacy", label: "Privacy" },
] as const;

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled && "border-b border-sand-300/10 bg-ink-950/80 backdrop-blur-md",
      )}
    >
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" aria-label="Milo home" className="text-sand-200">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-sand-500 transition-colors hover:text-sand-100"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <Button size="sm" asChild>
          <a href="#waitlist">Join the waitlist</a>
        </Button>
      </Container>
    </header>
  );
}
