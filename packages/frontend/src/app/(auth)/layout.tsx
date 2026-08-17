import Link from "next/link";

import { MiloMark } from "@/components/app/milo-mark";

const points = [
  {
    title: "Your file never moves",
    body: "Milo stores the URL and the analytics. Your PDF stays wherever you already host it.",
  },
  {
    title: "Views, pages, downloads",
    body: "See whether it was opened, which page held attention, and whether anyone saved a copy.",
  },
  {
    title: "Never who",
    body: "No name, no company, no location, no IP. There is no identity field to switch on later.",
  },
] as const;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-sand-300/10 bg-ink-900/60 px-12 py-14 lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_15%,rgba(192,141,99,0.12),transparent_70%),radial-gradient(45%_45%_at_85%_90%,rgba(63,207,142,0.10),transparent_70%)]"
        />

        <Link
          href="/"
          aria-label="Milo home"
          className="relative flex items-center gap-3 text-sand-200"
        >
          <MiloMark className="size-10" />
          <span className="font-display text-2xl tracking-tight text-sand-50">Milo</span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="font-display text-4xl leading-[1.1] text-balance text-sand-50">
            Know when your resume gets seen.
          </h2>

          <ul className="mt-10 space-y-6">
            {points.map((point) => (
              <li key={point.title} className="flex gap-4">
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-signal-400"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-sm text-sand-200">{point.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-sand-500">{point.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-sand-700">
          Private beta. Building in the open at{" "}
          <Link href="/path" className="text-sand-500 transition-colors hover:text-sand-300">
            /path
          </Link>
          .
        </p>
      </aside>

      <main className="flex flex-col justify-center px-5 py-14 sm:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link
            href="/"
            aria-label="Milo home"
            className="mb-10 inline-flex items-center gap-3 text-sand-200 lg:hidden"
          >
            <MiloMark className="size-9" />
            <span className="font-display text-2xl tracking-tight text-sand-50">Milo</span>
          </Link>

          {children}

          <p className="mt-10 text-xs leading-relaxed text-sand-700">
            Milo is in private beta. These forms are not wired to an account system yet, so nothing
            you type is sent anywhere.
          </p>
        </div>
      </main>
    </div>
  );
}
