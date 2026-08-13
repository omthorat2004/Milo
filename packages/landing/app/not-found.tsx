import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/section";

export default function NotFound() {
  return (
    <Container className="flex min-h-dvh flex-col items-center justify-center text-center">
      <p className="font-mono text-xs tracking-[0.22em] text-signal-400 uppercase">404</p>
      <h1 className="mt-5 font-display text-4xl text-sand-50">This page isn&rsquo;t here.</h1>
      <p className="mt-4 max-w-sm text-sand-500">
        The link may be old, or the page may not exist yet, Milo is still being built.
      </p>
      <Button className="mt-8" asChild>
        <Link href="/">Back to the homepage</Link>
      </Button>
    </Container>
  );
}
