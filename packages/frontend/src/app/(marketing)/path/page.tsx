import type { Metadata } from "next";
import { ShippingLog, UpcomingWork, shippingLog, upcomingWork } from "@milo/ui/shipping-log";

export const metadata: Metadata = {
  title: "Path",
  description:
    "Everything shipped in Milo, dated the day it shipped. A public record of what gets built and how fast.",
};

export default function PathPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-20 sm:px-8 sm:py-28">
      <p className="font-mono text-xs tracking-[0.22em] text-signal-400 uppercase">Path</p>
      <h1 className="mt-5 font-display text-4xl leading-[1.05] text-balance text-sand-50 sm:text-5xl">
        Everything shipped, and the day it shipped.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-sand-500">
        Every technical and product decision behind Milo, in the open, as it gets made. What shipped
        and the tradeoff it carried, what is being worked on now, and what is only an intention.
        Dated honestly, including the quiet weeks.
      </p>

      <UpcomingWork entries={upcomingWork} className="mt-14" />

      <ShippingLog entries={shippingLog} variant="full" className="mt-12" />
    </div>
  );
}
