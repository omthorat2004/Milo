"use client";

import { Download } from "lucide-react";
import { useEffect, useRef } from "react";

import { detectBrowser, detectDeviceCategory, detectOS } from "@/lib/device-info";
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const downloadRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    startedAtRef.current = Date.now();
    const sessionId = getOrCreateSessionId();

    const params = new URLSearchParams();
    if (sessionId) params.set("sid", sessionId);
    params.set("device_category", detectDeviceCategory(navigator.userAgent));
    params.set("browser", detectBrowser(navigator.userAgent));
    params.set("os", detectOS(navigator.userAgent));
    params.set("page_number", "1");
    const query = params.toString();

    // Set imperatively rather than through state: the iframe has no `src` at
    // all until this runs, so it loads exactly once, with the full params,
    // instead of once bare then again once device info is known (which would
    // double the view count and still log one "unknown" event in between).
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    if (iframeRef.current) iframeRef.current.src = `${baseUrl}/l/${slug}?${query}`;
    if (downloadRef.current) {
      downloadRef.current.href = `${baseUrl}/l/${slug}?${query}&download=true`;
    }

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
      <header className="flex items-center justify-between border-b border-surface-border px-5 py-3">
        <p className="font-mono text-[11px] tracking-[0.18em] text-foreground-muted uppercase">
          Shared via Milo
        </p>
        {/* `?download=true` makes the backend send Content-Disposition: attachment,
         * so this is a real file save, not another inline render of the same bytes.
         * This fallback href works even before the mount effect upgrades it with
         * device info. */}
        <a
          ref={downloadRef}
          href={`${baseUrl}/l/${slug}?download=true`}
          className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface px-3 py-1.5 text-xs text-foreground-muted transition-colors hover:text-foreground"
        >
          <Download className="size-3.5" aria-hidden="true" />
          Download
        </a>
      </header>
      <iframe
        ref={iframeRef}
        title="Resume"
        className="h-[calc(100dvh-49px)] w-full flex-1 border-0"
      />
    </div>
  );
}
