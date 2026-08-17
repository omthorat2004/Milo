"use client";

import { FileText, LayoutDashboard, ScrollText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { MiloMark } from "@/components/app/milo-mark";
import { cn } from "@/lib/utils";

const items = [
  { segment: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { segment: "links", label: "Links", icon: FileText },
  { segment: "logs", label: "Logs", icon: ScrollText },
] as const;

type Props = {
  resourceId?: string;
};

function hrefFor(segment: string, resourceId?: string): string {
  return resourceId ? `/${resourceId}/${segment}` : `/${segment}`;
}

export function AppNav({ resourceId }: Props) {
  const pathname = usePathname();

  const isActive = (segment: string) => {
    const href = hrefFor(segment, resourceId);
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-sand-300/10 bg-ink-900/60 px-4 py-6 lg:flex">
        <Link
          href="/dashboard"
          aria-label="Milo dashboard"
          className="flex items-center gap-3 px-2 text-sand-200"
        >
          <MiloMark className="size-10" />
          <span className="font-display text-2xl tracking-tight text-sand-50">Milo</span>
        </Link>

        <nav className="mt-10 flex flex-col gap-1" aria-label="Application">
          {items.map((item) => {
            const active = isActive(item.segment);
            return (
              <Link
                key={item.segment}
                href={hrefFor(item.segment, resourceId)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-ink-800 text-sand-50"
                    : "text-sand-500 hover:bg-ink-850 hover:text-sand-200",
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
                {active ? (
                  <span
                    className="ml-auto size-1.5 rounded-full bg-signal-400"
                    aria-hidden="true"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <p className="mt-auto px-3 text-xs text-sand-700">
          Private beta. Accounts are not open yet.
        </p>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-sand-300/10 bg-ink-950/95 backdrop-blur-md lg:hidden"
        aria-label="Application"
      >
        {items.map((item) => {
          const active = isActive(item.segment);
          return (
            <Link
              key={item.segment}
              href={hrefFor(item.segment, resourceId)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-[11px] transition-colors",
                active ? "text-signal-300" : "text-sand-500",
              )}
            >
              <item.icon className="size-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
