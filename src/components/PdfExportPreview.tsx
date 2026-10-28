import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, IconButton, Typography } from "@mui/material";
import { ZoomInIcon, ZoomOutIcon } from "./Icons";
import { invoke } from "@tauri-apps/api/core";
import type { PDFDocumentProxy, PDFDocumentLoadingTask, PDFWorker } from "pdfjs-dist";

interface PdfExportPreviewProps {
  argumentsJson: string;
  isProse: boolean;
}

interface PdfPageProps {
  document: PDFDocumentProxy;
  pageNumber: number;
  width: number;
}

function PdfPage({ document, pageNumber, width }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [ratio, setRatio] = useState(792 / 612);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "600px" });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || !width) return;
    let canceled = false;
    let renderTask: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | undefined;
    void document
      .getPage(pageNumber)
      .then(async (page) => {
        if (canceled || !canvasRef.current) return;
        const base = page.getViewport({ scale: 1 });
        setRatio(base.height / base.width);
        const scale = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: (width / base.width) * scale });
        const canvas = canvasRef.current;
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        renderTask = page.render({ canvas, viewport });
        await renderTask.promise;
      })
      .catch(() => {
        /* Document replacement cancels pending rendering. */
      });
    return () => {
      canceled = true;
      renderTask?.cancel();
    };
  }, [document, pageNumber, width, visible]);
  return (
    <Box ref={containerRef} sx={{ width: "100%", aspectRatio: `1 / ${ratio}`, bgcolor: "#fff", boxShadow: 3, mb: 2 }}>
      <canvas
        ref={canvasRef}
        aria-label={`PDF page ${pageNumber}`}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </Box>
  );
}

export function PdfExportPreview({ argumentsJson, isProse }: PdfExportPreviewProps) {
  const [loaded, setLoaded] = useState<{ document: PDFDocumentProxy; task: PDFDocumentLoadingTask } | null>(null);
  const document = loaded?.document;
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [width, setWidth] = useState(0);
  const pagesRef = useRef<HTMLDivElement>(null);
  const generationRef = useRef(0);
  // Serialize native generation: rapid changes replace the queued request.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const rendererRef = useRef<Promise<{ pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs"); worker: PDFWorker }> | null>(null);
  const cacheRef = useRef(new Map<string, Uint8Array>());
  const desktop = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  useEffect(() => {
    if (!desktop) return;
    const renderer = Promise.all([import("pdfjs-dist/legacy/build/pdf.mjs"), import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")]).then(
      async ([pdfjs, { default: workerUrl }]) => {
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        const worker = new pdfjs.PDFWorker();
        try {
          await worker.promise;
          return { pdfjs, worker };
        } catch (error) {
          worker.destroy();
          throw error;
        }
      },
    );
    rendererRef.current = renderer;
    void renderer.catch(() => {});
    return () => {
      void renderer.then(({ worker }) => worker.destroy()).catch(() => {});
    };
  }, [desktop]);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(1, Math.floor(entry.contentRect.width))));
    if (pagesRef.current) observer.observe(pagesRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const generation = ++generationRef.current;
    if (!desktop) return;
    setBusy(true);
    setError("");
    let loading: PDFDocumentLoadingTask | undefined;
    let adopted = false;
    const timer = window.setTimeout(() => {
      queueRef.current = queueRef.current
        .catch(() => {})
        .then(async () => {
          if (generation !== generationRef.current) return;
          try {
            const cacheKey = `${isProse}:${argumentsJson}`;
            let bytes = cacheRef.current.get(cacheKey);
            if (!bytes) {
              const result = await invoke<number[] | null>(
                isProse ? "generate_prose_pdf_bytes" : "generate_pdf_bytes",
                JSON.parse(argumentsJson),
              );
              if (!result?.length) throw new Error("No PDF generated");
              bytes = new Uint8Array(result);
              // Bound cache memory, and avoid caching image files that can change on disk.
              const settings = JSON.parse(argumentsJson);
              if (
                bytes.byteLength <= 16 * 1024 * 1024 &&
                !(settings.watermarkCenterEnabled && settings.watermarkCenterType === "image")
              ) {
                cacheRef.current.set(cacheKey, bytes);
                while (
                  cacheRef.current.size > 3 ||
                  Array.from(cacheRef.current.values()).reduce((sum, value) => sum + value.byteLength, 0) >
                    16 * 1024 * 1024
                ) {
                  cacheRef.current.delete(cacheRef.current.keys().next().value!);
                }
              }
            } else {
              cacheRef.current.delete(cacheKey);
              cacheRef.current.set(cacheKey, bytes);
            }
            if (generation !== generationRef.current) return;
            const renderer = await rendererRef.current;
            if (!renderer || generation !== generationRef.current) return;
            const { pdfjs, worker } = renderer;
            // PDF.js transfers this buffer to its worker, so retain the cached original.
            const task = pdfjs.getDocument({ data: bytes.slice(), worker });
            loading = task;
            const next = await task.promise;
            if (generation !== generationRef.current) {
              await task.destroy();
              return;
            }
            adopted = true;
            setLoaded({ document: next, task });
          } catch {
            if (generation === generationRef.current)
              setError("Could not generate the PDF preview. Change a setting or retry.");
          } finally {
            if (generation === generationRef.current) setBusy(false);
          }
        });
    }, 80);
    return () => {
      ++generationRef.current;
      window.clearTimeout(timer);
      if (!adopted) void loading?.destroy();
    };
  }, [argumentsJson, isProse, desktop, retry]);

  useEffect(
    () => () => {
      void loaded?.task.destroy();
    },
    [loaded],
  );

  return (
    <Box
      component="section"
      aria-label="Live PDF preview"
      aria-busy={desktop && busy}
      sx={{
        width: "60%",
        flexShrink: 0,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        borderLeft: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box sx={{ px: 2, py: 1, display: "flex", gap: 1, alignItems: "center", minHeight: 40, flexWrap: "wrap" }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700 }}>PDF Preview</Typography>
        {desktop && busy && <CircularProgress size={14} />}
        <Typography role="status" sx={{ fontSize: 11, color: "text.secondary" }}>
          {!desktop
            ? "Preview is available in the desktop app"
            : busy
              ? "Updating…"
              : error
                ? "Preview unavailable"
                : `${document?.numPages ?? 0} pages`}
        </Typography>
        <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton
            size="small"
            aria-label="Zoom out PDF"
            disabled={zoom <= 50}
            onClick={() => setZoom((value) => Math.max(50, value - 25))}
          >
            <ZoomOutIcon fontSize="small" />
          </IconButton>
          <Typography aria-label="PDF zoom" sx={{ fontSize: 12, minWidth: 36, textAlign: "center" }}>
            {zoom}%
          </Typography>
          <IconButton
            size="small"
            aria-label="Zoom in PDF"
            disabled={zoom >= 200}
            onClick={() => setZoom((value) => Math.min(200, value + 25))}
          >
            <ZoomInIcon fontSize="small" />
          </IconButton>
          <Button size="small" onClick={() => setZoom(100)} sx={{ fontSize: 11 }}>
            Fit width
          </Button>
        </Box>
      </Box>
      {error && (
        <Alert
          severity="error"
          action={<button onClick={() => setRetry((value) => value + 1)}>Retry</button>}
          sx={{ mx: 2 }}
        >
          {error}
        </Alert>
      )}
      <Box sx={{ overflow: "auto", flex: 1, minHeight: 0, p: 3 }}>
        <Box ref={pagesRef} sx={{ width: "100%" }}>
          <Box
            data-testid="pdf-pages"
            sx={{ width: `${zoom}%`, mx: zoom <= 100 ? "auto" : 0, opacity: busy ? 0.65 : 1 }}
          >
            {document &&
              Array.from({ length: document.numPages }, (_, index) => (
                <PdfPage
                  key={`${document.fingerprints[0]}-${index}`}
                  document={document}
                  pageNumber={index + 1}
                  width={Math.round((width * zoom) / 100)}
                />
              ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
