import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "Why Milo exists, and the constraint it is built around.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
      <p className="font-mono text-xs tracking-[0.22em] text-signal-400 uppercase">About</p>
      <h1 className="mt-5 font-display text-4xl leading-[1.05] text-balance text-sand-50 sm:text-5xl">
        Applying for jobs is the last thing we still do blind.
      </h1>

      <div className="mt-10 space-y-6 text-lg leading-relaxed text-sand-500">
        <p>
          You send a resume and hear nothing. You cannot tell the role that never opened it from the
          one that read it twice and passed. So you guess: follow up, or move on.
        </p>
        <p>
          Milo closes that gap. Keep hosting your resume wherever it already lives, share a Milo
          link instead of the file, and you find out whether it was opened, which page held
          attention, and whether anyone downloaded it.
        </p>
        <p>
          The obvious next step would be to tell you <em>who</em>. Milo will not. The person opening
          your resume never signed up for anything, and surveilling them to reassure you is not a
          trade worth making. That constraint is the product, not a limitation of it.
        </p>
        <p>
          It is being built in public.{" "}
          <Link href="/path" className="text-signal-400 hover:text-signal-300">
            Path
          </Link>{" "}
          shows what shipped and when, including the slow weeks.
        </p>
      </div>
    </div>
  );
}
