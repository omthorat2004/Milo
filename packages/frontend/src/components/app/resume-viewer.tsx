"use client";

import { useEffect, useRef } from "react";

import { sendDwellBeacon } from "@/lib/links.api";

const SESSION_STORAGE_KEY = "milo_viewer_session_id";

/**
 * Anonymous, scoped to this browser tab's lifetime only (sessionStorage, not
 * localStorage), matches the "anonymous session id" allowed signal, never a
 * durable cross-visit identifier. Wrapped in try/catch: private browsing or a
 * blocked storage API should degrade to "no session id," not break the page.
 */
function getOrCreateSessionId(): string | null {
  try {
    const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;

    const created = crypto.randomUUID();
    sessionStorage.setItem(SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return null;
  }
}

/**
 * The public, unauthenticated page a tracking link resolves to. Milo has no
 * in-browser PDF renderer (no pdf.js), so dwell time here is "time this page
 * was open," not true per-page PDF attention, `pageNumber` is always 1. The
 * iframe's `src` hits the backend's `GET /l/{slug}` directly, which is the
 * same request that records the `view`/`download` event with retry and the
 * expiry/revocation check; this component only adds the dwell beacon.
 */
export function ResumeViewer({ slug }: { slug: string }) {
  const startedAtRef = useRef<number | null>(null);
  const sentRef = useRef(false);

  useEffect(() => {
    startedAtRef.current = Date.now();
    const sessionId = getOrCreateSessionId();

    function reportDwell() {
      if (sentRef.current || startedAtRef.current === null) return;
      sentRef.current = true;

      const dwellSeconds = (Date.now() - startedAtRef.current) / 1000;
      if (dwellSeconds < 1) return;

      sendDwellBeacon(slug, { sessionId, pageNumber: 1, dwellSeconds });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") reportDwell();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", reportDwell);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", reportDwell);
    };
  }, [slug]);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-surface-border px-5 py-3">
        <p className="font-mono text-[11px] tracking-[0.18em] text-foreground-muted uppercase">
          Shared via Milo
        </p>
      </header>
      <iframe
        title="Resume"
        src={`${baseUrl}/l/${slug}`}
        className="h-[calc(100dvh-49px)] w-full flex-1 border-0"
      />
    </div>
  );
}
