import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Log in" };

/**
 * Placeholder. Authentication is not built yet.
 *
 * This exists so the header's actions lead somewhere real instead of 404ing.
 * When auth lands, move it into an (auth) route group with its own layout.
 */
export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-5 py-32 text-center">
      <p className="font-mono text-xs tracking-[0.22em] text-signal-400 uppercase">Log in</p>
      <h1 className="mt-5 font-display text-3xl text-sand-50">Not open yet.</h1>
      <p className="mt-4 text-sand-500">
        Milo is in private beta and accounts are not available. Follow along on{" "}
        <Link href="/path" className="text-signal-400 hover:text-signal-300">
          Path
        </Link>{" "}
        to see when this ships.
      </p>
    </div>
  );
}
