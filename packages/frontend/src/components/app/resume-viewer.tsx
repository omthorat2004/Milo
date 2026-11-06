"use client";

import { ChevronLeft, ChevronRight, Download, GripVertical, ZoomIn, ZoomOut } from "lucide-react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { detectBrowser, detectDeviceCategory, detectOS } from "@/lib/device-info";
import { sendDwellBeacon, sendPageView } from "@/lib/links.api";
import { cn } from "@/lib/utils";

const SESSION_STORAGE_KEY = "milo_viewer_session_id";
/** How long one anonymous id is reused before a fresh one is minted. */
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_SCALE = 0.6;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.2;

/**
 * Anonymous random id, shared by every tab in this browser (localStorage, so
 * opening the link in a second tab no longer counts as a new unique viewer)
 * and replaced after 24 hours, so it never becomes a long-lived cross-visit
 * identifier. It is a random UUID, not derived from anything about the
 * viewer. Wrapped in try/catch: private browsing or a blocked storage API
 * should degrade to "no session id," not break the page.
 */
function getOrCreateSessionId(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as { id?: unknown; createdAt?: unknown };
      if (
        typeof stored.id === "string" &&
        typeof stored.createdAt === "number" &&
        Date.now() - stored.createdAt < SESSION_TTL_MS
      ) {
        return stored.id;
      }
    }

    const created = crypto.randomUUID();
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ id: created, createdAt: Date.now() }),
    );
    return created;
  } catch {
    return null;
  }
}

/** Adds the time since the clock last started to the page it was running for, then stops it. */
function bankActiveTime(
  activeSince: { current: number | null },
  page: { current: number },
  pageMs: { current: Map<number, number> },
): void {
  if (activeSince.current === null) return;
  const elapsed = Date.now() - activeSince.current;
  activeSince.current = null;
  pageMs.current.set(page.current, (pageMs.current.get(page.current) ?? 0) + elapsed);
}

type Status = "loading" | "ready" | "error";

type LinkOverlay = {
  key: string;
  href: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

/** The subset of a pdf.js annotation object this viewer reads. pdf.js itself
 * types `getAnnotations()` as `Promise<Array<any>>`, so the real shape is
 * asserted at this one boundary rather than threaded through as `any`. */
type PdfLinkAnnotation = {
  rect?: [number, number, number, number];
  url?: string;
};

/**
 * The public, unauthenticated page a tracking link resolves to. Renders the
 * PDF itself onto a canvas via pdf.js rather than handing the bytes to the
 * browser's own PDF viewer: a native viewer (Chrome's PDFium UI, Firefox's
 * pdf.js chrome) ships its own download/print controls that save whatever
 * is already loaded in the viewport, bypassing `/l/{slug}?download=true`
 * entirely, so a click there was never counted as a tracked `download`
 * event. Rendering to a canvas means Milo's own Download button (below) is
 * the only way to save the file, and every save is tracked. It also means
 * `pageNumber` on the dwell beacon reflects the page actually being looked
 * at, not a hardcoded 1.
 */
export function ResumeViewer({ slug }: { slug: string }) {
  // Time on each page, in ms. Only the page on screen accrues, and only while the tab is
  // visible. Nothing is sent until the tab closes or the viewer unmounts.
  const pageMsRef = useRef<Map<number, number>>(new Map());
  const activeSinceRef = useRef<number | null>(null);
  const trackedPageRef = useRef(1);
  const sentRef = useRef(false);
  const downloadRef = useRef<HTMLAnchorElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const currentPageRef = useRef(1);
  // One id per page load. It ties this visit's view, its later page views and its dwell time together.
  const visitIdRef = useRef<string>("");
  const sessionIdRef = useRef<string | null>(null);
  const reportedPagesRef = useRef<Set<number>>(new Set([1]));
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const [status, setStatus] = useState<Status>("loading");
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [linkOverlays, setLinkOverlays] = useState<LinkOverlay[]>([]);
  // null = default spot (bottom centre); set once the viewer drags the pill.
  const [navPos, setNavPos] = useState<{ x: number; y: number } | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  const goToPage = useCallback(
    (delta: number) => setCurrentPage((page) => Math.min(numPages, Math.max(1, page + delta))),
    [numPages],
  );

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const nav = navRef.current;
    if (!nav) return;
    const rect = nav.getBoundingClientRect();
    dragRef.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    const nav = navRef.current;
    if (!drag || !nav) return;
    const x = Math.min(window.innerWidth - nav.offsetWidth, Math.max(0, event.clientX - drag.dx));
    const y = Math.min(window.innerHeight - nav.offsetHeight, Math.max(0, event.clientY - drag.dy));
    setNavPos({ x, y });
  }

  function endDrag() {
    dragRef.current = null;
  }

  useEffect(() => {
    if (status !== "ready") return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") goToPage(1);
      else if (event.key === "ArrowLeft") goToPage(-1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [status, goToPage]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const renderCurrentPage = useCallback(async () => {
    const pdfDoc = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!pdfDoc || !canvas) return;

    renderTaskRef.current?.cancel();

    const page = await pdfDoc.getPage(currentPage);
    const containerWidth =
      containerRef.current?.clientWidth ?? page.getViewport({ scale: 1 }).width;
    const fitScale = (containerWidth - 32) / page.getViewport({ scale: 1 }).width;
    const viewport = page.getViewport({ scale: fitScale * scale });

    const context = canvas.getContext("2d");
    if (!context) return;

    const outputScale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    const renderTask = page.render({
      canvas,
      canvasContext: context,
      viewport,
      transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
    });
    renderTaskRef.current = renderTask;

    try {
      await renderTask.promise;
    } catch (error) {
      if (error instanceof Error && error.name === "RenderingCancelledException") return;
      throw error;
    }

    setPageSize({ width: viewport.width, height: viewport.height });

    // Canvas pixels have no DOM, so a link baked into the PDF (LinkedIn,
    // GitHub, mailto:) isn't clickable on its own, unlike in a native
    // browser PDF viewer. Overlay a transparent <a> for every Link
    // annotation, positioned by converting its PDF-space rect into this
    // page's viewport (CSS pixel) coordinates.
    const rawAnnotations = (await page.getAnnotations()) as unknown as PdfLinkAnnotation[];
    const overlays: LinkOverlay[] = [];
    rawAnnotations.forEach((annotation, index) => {
      const rect = annotation.rect;
      const href = annotation.url;
      if (!href || !rect || rect.length !== 4) return;

      const [x1, y1] = viewport.convertToViewportPoint(rect[0], rect[1]) as [number, number];
      const [x2, y2] = viewport.convertToViewportPoint(rect[2], rect[3]) as [number, number];
      overlays.push({
        key: `${currentPageRef.current}-${index}`,
        href,
        left: Math.min(x1, x2),
        top: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
      });
    });
    setLinkOverlays(overlays);
  }, [scale, currentPage]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    sentRef.current = false;
    pageMsRef.current = new Map();
    activeSinceRef.current = null;
    const sessionId = getOrCreateSessionId();
    const visitId = crypto.randomUUID();
    visitIdRef.current = visitId;
    sessionIdRef.current = sessionId;
    reportedPagesRef.current = new Set([1]);

    const params = new URLSearchParams();
    if (sessionId) params.set("sid", sessionId);
    params.set("device_category", detectDeviceCategory(navigator.userAgent));
    params.set("browser", detectBrowser(navigator.userAgent));
    params.set("os", detectOS(navigator.userAgent));
    params.set("page_number", "1");
    params.set("visit_id", visitId);
    const query = params.toString();

    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    const viewUrl = `${baseUrl}/l/${slug}?${query}`;
    if (downloadRef.current) {
      downloadRef.current.href = `${baseUrl}/l/${slug}?${query}&download=true`;
    }

    // Fetching the whole document (once, here) is what hits the backend's
    // GET /l/{slug} and records the `view` event, the same request the
    // previous iframe-based viewer made by setting `src`. The AbortController
    // is load-bearing, not just for tidiness: React's dev-only Strict Mode
    // double-invokes this effect (mount, cleanup, mount) before the first
    // fetch resolves, and a plain `cancelled` flag only suppresses the
    // discarded result, it doesn't stop the request from reaching the
    // backend, so the view got recorded twice for one real visit. Aborting
    // actually cancels the in-flight request before that happens.
    async function load() {
      try {
        // The legacy build, not the default one: the default targets the newest
        // browsers and fails to load on older Safari, which shows the error
        // state below before the view request is even sent.
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const response = await fetch(viewUrl, { signal: controller.signal });
        if (!response.ok) throw new Error(`Fetch failed with ${response.status}`);
        const data = await response.arrayBuffer();
        if (cancelled) return;

        const loadingTask = pdfjsLib.getDocument({ data });
        loadingTaskRef.current = loadingTask;
        const pdfDoc = await loadingTask.promise;
        if (cancelled) return;

        pdfDocRef.current = pdfDoc;
        setNumPages(pdfDoc.numPages);
        setStatus("ready");
      } catch (err) {
        if (!cancelled && !(err instanceof DOMException && err.name === "AbortError")) {
          console.error("Milo viewer failed to load the resume", err);
          setStatus("error");
        }
      }
    }
    void load();

    // Once per visit, when the tab closes (pagehide) or this component unmounts. The
    // totals are cumulative, so even if both fire the second send is skipped.
    function reportDwell() {
      if (sentRef.current) return;

      bankActiveTime(activeSinceRef, trackedPageRef, pageMsRef);

      const pages = Array.from(pageMsRef.current.entries())
        .map(([pageNumber, ms]) => ({ pageNumber, dwellSeconds: Math.round(ms / 100) / 10 }))
        // A page flipped past in under a second has no real dwell: leave it out so it
        // reads "no time data" instead of dragging the average toward 0.
        .filter((page) => page.dwellSeconds >= 1)
        .sort((x, y) => x.pageNumber - y.pageNumber);
      if (pages.length === 0) return;

      sentRef.current = true;
      sendDwellBeacon(slug, { visitId, pages });
    }

    window.addEventListener("pagehide", reportDwell);

    return () => {
      cancelled = true;
      controller.abort();
      reportDwell();
      window.removeEventListener("pagehide", reportDwell);
      renderTaskRef.current?.cancel();
      void loadingTaskRef.current?.destroy();
    };
  }, [slug]);

  // Times the page on screen. Re-runs on every page turn, so the cleanup banks the page being
  // left. Switching to another tab pauses the clock; coming back resumes it. Nothing is sent
  // from here, see reportDwell above.
  useEffect(() => {
    if (status !== "ready") return;

    trackedPageRef.current = currentPage;
    activeSinceRef.current = document.visibilityState === "visible" ? Date.now() : null;

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        bankActiveTime(activeSinceRef, trackedPageRef, pageMsRef);
      } else if (activeSinceRef.current === null) {
        activeSinceRef.current = Date.now();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      bankActiveTime(activeSinceRef, trackedPageRef, pageMsRef);
    };
  }, [status, currentPage]);

  // Turning to page 2 or later is its own event, once per page per visit. Page 1 is the
  // view itself, recorded when the document is fetched.
  useEffect(() => {
    if (status !== "ready" || currentPage < 2) return;
    if (reportedPagesRef.current.has(currentPage)) return;
    reportedPagesRef.current.add(currentPage);
    sendPageView(slug, {
      visitId: visitIdRef.current,
      sessionId: sessionIdRef.current,
      pageNumber: currentPage,
      deviceCategory: detectDeviceCategory(navigator.userAgent),
      browser: detectBrowser(navigator.userAgent),
      os: detectOS(navigator.userAgent),
    });
  }, [status, currentPage, slug]);

  useEffect(() => {
    if (status !== "ready") return;
    void renderCurrentPage();
  }, [status, currentPage, scale, renderCurrentPage]);

  useEffect(() => {
    if (status !== "ready") return;
    function handleResize() {
      void renderCurrentPage();
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [status, renderCurrentPage]);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between border-b border-surface-border px-5 py-3">
        <p className="font-mono text-[11px] tracking-[0.18em] text-foreground-muted uppercase">
          Shared via Milo
        </p>

        <div className="flex items-center gap-2">
          {status === "ready" ? (
            <div className="flex items-center gap-1 text-xs text-foreground-muted">
              <button
                type="button"
                onClick={() => setScale((value) => Math.max(MIN_SCALE, value - SCALE_STEP))}
                disabled={scale <= MIN_SCALE}
                aria-label="Zoom out"
                className="rounded-full p-1.5 transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-30"
              >
                <ZoomOut className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setScale((value) => Math.min(MAX_SCALE, value + SCALE_STEP))}
                disabled={scale >= MAX_SCALE}
                aria-label="Zoom in"
                className="rounded-full p-1.5 transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-30"
              >
                <ZoomIn className="size-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}

          {/* `?download=true` makes the backend send Content-Disposition:
           * attachment, so this is a real tracked file save, the only way
           * to download the resume, since the canvas render above has no
           * browser-native save/print controls of its own. */}
          <a
            ref={downloadRef}
            href={`${baseUrl}/l/${slug}?download=true`}
            className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface px-3 py-1.5 text-xs text-foreground-muted transition-colors hover:text-foreground"
          >
            <Download className="size-3.5" aria-hidden="true" />
            Download
          </a>
        </div>
      </header>

      <div
        ref={containerRef}
        className="flex h-[calc(100dvh-49px)] w-full flex-1 items-start justify-center overflow-auto p-4"
      >
        {status === "loading" ? (
          <p className="mt-16 text-sm text-foreground-muted">Loading resume…</p>
        ) : null}
        {status === "error" ? (
          <p className="mt-16 text-sm text-foreground-muted">
            {"Milo couldn't load this resume. Try the download button above instead."}
          </p>
        ) : null}
        <div
          className={cn("relative", status === "ready" ? "block" : "hidden")}
          style={{ width: pageSize.width, height: pageSize.height }}
        >
          <canvas ref={canvasRef} className="rounded-sm shadow-lg" />
          {linkOverlays.map((overlay) => (
            <a
              key={overlay.key}
              href={overlay.href}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute rounded-sm outline-offset-2 hover:bg-signal-400/10 focus-visible:outline focus-visible:outline-signal-400"
              style={{
                left: overlay.left,
                top: overlay.top,
                width: overlay.width,
                height: overlay.height,
              }}
            />
          ))}
        </div>
      </div>
      {status === "ready" && numPages > 1 ? (
        <div
          ref={navRef}
          role="navigation"
          aria-label="Page navigation"
          className={cn(
            "fixed z-20 flex items-center gap-1 rounded-full border border-surface-border bg-surface/90 px-1.5 py-1.5 text-sm text-foreground-muted shadow-lg backdrop-blur",
            navPos ? "" : "bottom-6 left-1/2 -translate-x-1/2",
          )}
          style={navPos ? { left: navPos.x, top: navPos.y } : undefined}
        >
          <button
            type="button"
            aria-label="Drag to move page navigation"
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="cursor-grab touch-none rounded-full p-1.5 hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => goToPage(-1)}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            className="rounded-full p-1.5 transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <span className="min-w-16 text-center tabular-nums" aria-live="polite">
            <span className="text-foreground">{currentPage}</span> of {numPages}
          </span>
          <button
            type="button"
            onClick={() => goToPage(1)}
            disabled={currentPage >= numPages}
            aria-label="Next page"
            className="rounded-full p-1.5 transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
