"use client";

import { ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from "lucide-react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState } from "react";

import { detectBrowser, detectDeviceCategory, detectOS } from "@/lib/device-info";
import { sendDwellBeacon } from "@/lib/links.api";
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
  const startedAtRef = useRef<number | null>(null);
  const sentRef = useRef(false);
  const downloadRef = useRef<HTMLAnchorElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const currentPageRef = useRef(1);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const [status, setStatus] = useState<Status>("loading");
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [linkOverlays, setLinkOverlays] = useState<LinkOverlay[]>([]);

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
    startedAtRef.current = Date.now();
    const sessionId = getOrCreateSessionId();

    const params = new URLSearchParams();
    if (sessionId) params.set("sid", sessionId);
    params.set("device_category", detectDeviceCategory(navigator.userAgent));
    params.set("browser", detectBrowser(navigator.userAgent));
    params.set("os", detectOS(navigator.userAgent));
    params.set("page_number", "1");
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
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
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
          setStatus("error");
        }
      }
    }
    void load();

    function reportDwell() {
      if (sentRef.current || startedAtRef.current === null) return;
      sentRef.current = true;

      const dwellSeconds = (Date.now() - startedAtRef.current) / 1000;
      if (dwellSeconds < 1) return;

      sendDwellBeacon(slug, {
        sessionId,
        pageNumber: currentPageRef.current,
        dwellSeconds,
      });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") reportDwell();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", reportDwell);

    return () => {
      cancelled = true;
      controller.abort();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", reportDwell);
      renderTaskRef.current?.cancel();
      void loadingTaskRef.current?.destroy();
    };
  }, [slug]);

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
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage <= 1}
                aria-label="Previous page"
                className="rounded-full p-1.5 transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-30"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <span className="tabular-nums">
                {currentPage} / {numPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(numPages, page + 1))}
                disabled={currentPage >= numPages}
                aria-label="Next page"
                className="rounded-full p-1.5 transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-30"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>

              <span className="mx-1 h-4 w-px bg-surface-border" aria-hidden="true" />

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
    </div>
  );
}
