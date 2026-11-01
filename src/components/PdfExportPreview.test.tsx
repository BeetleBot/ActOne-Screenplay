import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { PdfExportPreview } from "./PdfExportPreview";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  GlobalWorkerOptions: {},
  PDFWorker: vi.fn(
    class {
      destroy = vi.fn();
    },
  ),
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({ numPages: 0, fingerprints: ["preview"], getPage: vi.fn().mockResolvedValue({ getViewport: () => ({ width: 612, height: 792 }) }) }),
    destroy: vi.fn().mockResolvedValue(undefined),
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
  vi.mocked(invoke).mockResolvedValue([37, 80, 68, 70]);
});
afterEach(() => {
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
});

it("refreshes the actual PDF bytes when font and watermark settings change", async () => {
  const { rerender } = render(
    <PdfExportPreview argumentsJson={JSON.stringify({ fontFamily: "courier-prime" })} isProse={false} />,
  );
  await waitFor(() => expect(invoke).toHaveBeenCalledWith("generate_pdf_bytes", { fontFamily: "courier-prime" }));
  rerender(
    <PdfExportPreview
      argumentsJson={JSON.stringify({
        fontFamily: "courier-prime-sans",
        watermarkCenterText: "DRAFT",
        watermarkCenterEnabled: true,
      })}
      isProse={false}
    />,
  );
  await waitFor(() =>
    expect(invoke).toHaveBeenLastCalledWith("generate_pdf_bytes", {
      fontFamily: "courier-prime-sans",
      watermarkCenterText: "DRAFT",
      watermarkCenterEnabled: true,
    }),
  );
});

it("uses the prose renderer and shows recoverable generation failures", async () => {
  vi.mocked(invoke).mockRejectedValueOnce(new Error("failed"));
  render(<PdfExportPreview argumentsJson='{"markdownText":"Hello"}' isProse />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not generate");
  expect(invoke).toHaveBeenCalledWith("generate_prose_pdf_bytes", { markdownText: "Hello" });
  screen.getByRole("button", { name: "Retry" }).click();
  await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2));
});

it("ignores stale native results and coalesces rapid settings changes", async () => {
  let resolve!: (value: number[]) => void;
  vi.mocked(invoke).mockImplementationOnce(
    () =>
      new Promise<number[]>((done) => {
        resolve = done;
      }),
  );
  const { rerender } = render(<PdfExportPreview argumentsJson='{"fontFamily":"first"}' isProse={false} />);
  await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
  rerender(<PdfExportPreview argumentsJson='{"fontFamily":"second"}' isProse={false} />);
  rerender(<PdfExportPreview argumentsJson='{"fontFamily":"latest"}' isProse={false} />);
  await act(async () => {
    resolve([]);
  });
  await waitFor(() => expect(invoke).toHaveBeenLastCalledWith("generate_pdf_bytes", { fontFamily: "latest" }));
  expect(invoke).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("reuses the PDF worker and cached bytes when returning to recent settings", async () => {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { rerender } = render(<PdfExportPreview argumentsJson='{"fontFamily":"first"}' isProse={false} />);
  await waitFor(() => expect(pdfjs.getDocument).toHaveBeenCalledTimes(1));
  rerender(<PdfExportPreview argumentsJson='{"fontFamily":"second"}' isProse={false} />);
  await waitFor(() => expect(pdfjs.getDocument).toHaveBeenCalledTimes(2));
  rerender(<PdfExportPreview argumentsJson='{"fontFamily":"first"}' isProse={false} />);
  await waitFor(() => expect(pdfjs.getDocument).toHaveBeenCalledTimes(3));
  expect(invoke).toHaveBeenCalledTimes(2);
  expect(pdfjs.PDFWorker).toHaveBeenCalledTimes(1);
  const calls = vi.mocked(pdfjs.getDocument).mock.calls;
  expect(calls[0][0]).toEqual(calls[2][0]);
});

it("regenerates image watermarks because their file contents may have changed", async () => {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const image = JSON.stringify({
    watermarkCenterEnabled: true,
    watermarkCenterType: "image",
    watermarkCenterImagePath: "logo.png",
  });
  const { rerender } = render(<PdfExportPreview argumentsJson={image} isProse={false} />);
  await waitFor(() => expect(pdfjs.getDocument).toHaveBeenCalledTimes(1));
  rerender(<PdfExportPreview argumentsJson="{}" isProse={false} />);
  await waitFor(() => expect(pdfjs.getDocument).toHaveBeenCalledTimes(2));
  rerender(<PdfExportPreview argumentsJson={image} isProse={false} />);
  await waitFor(() => expect(invoke).toHaveBeenCalledTimes(3));
});

it("zooms without regenerating the PDF and resets to fit width", async () => {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  render(<PdfExportPreview argumentsJson="{}" isProse={false} />);
  await waitFor(() => expect(pdfjs.getDocument).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: "Fit width" }));
  fireEvent.click(screen.getByRole("button", { name: "Zoom in PDF" }));
  expect(screen.getByLabelText("PDF zoom")).toHaveTextContent("125%");

  for (let i = 0; i < 8; i++) fireEvent.click(screen.getByRole("button", { name: "Zoom in PDF" }));
  expect(screen.getByRole("button", { name: "Zoom in PDF" })).toBeDisabled();
  expect(screen.getByLabelText("PDF zoom")).toHaveTextContent("200%");
  fireEvent.click(screen.getByRole("button", { name: "Fit width" }));
  expect(screen.getByLabelText("PDF zoom")).toHaveTextContent("100%");
  for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole("button", { name: "Zoom out PDF" }));
  expect(screen.getByLabelText("PDF zoom")).toHaveTextContent("10%");
  expect(screen.getByRole("button", { name: "Zoom out PDF" })).toBeDisabled();
  expect(invoke).toHaveBeenCalledTimes(1);
  expect(pdfjs.getDocument).toHaveBeenCalledTimes(1);
});

 it("constrains the preview and provides a keyboard accessible page scroll area", () => {
  render(<PdfExportPreview argumentsJson="{}" isProse={false} />);
  expect(screen.getByRole("region", { name: "Live PDF preview" })).toHaveStyle({ width: "100%", height: "100%", minHeight: 0, overflow: "hidden" });
  const pages = screen.getByRole("region", { name: "PDF pages" });
  expect(pages).toHaveAttribute("tabindex", "0");
  expect(pages).toHaveStyle({ overflow: "auto", minHeight: 0 });
});

it("defaults to fit page and keeps separate paper sheets fitted on resize", async () => {
  const callbacks: ResizeObserverCallback[] = [];
  const original = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    constructor(callback: ResizeObserverCallback) { callbacks.push(callback); }
    observe() {}
    unobserve() {}
    disconnect() {}
  } as typeof ResizeObserver;
  try {
    render(<PdfExportPreview argumentsJson="{}" isProse={false} />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("0 pages"));
    const resize = (width: number, height: number) => act(() => {
      callbacks.forEach(callback => callback([{ contentRect: { width, height } } as ResizeObserverEntry], {} as ResizeObserver));
    });
    resize(1200, 792);
    expect(screen.getByRole("button", { name: "Fit page" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("pdf-pages").style.gridTemplateColumns).toBe("repeat(1, 612px)");
    expect(screen.queryByRole("button", { name: "Two pages" })).not.toBeInTheDocument();
    expect(screen.getByTestId("pdf-pages")).toHaveStyle({ gap: "24px" });
    resize(1600, 792);
    expect(screen.getByTestId("pdf-pages").style.gridTemplateColumns).toBe("repeat(1, 612px)");
    fireEvent.click(screen.getByRole("button", { name: "Fit width" }));
    expect(screen.getByTestId("pdf-pages").style.gridTemplateColumns).toBe("repeat(1, 1600px)");
    fireEvent.click(screen.getByRole("button", { name: "Fit page" }));
    expect(screen.getByTestId("pdf-pages").style.gridTemplateColumns).toBe("repeat(1, 612px)");
    expect(invoke).toHaveBeenCalledTimes(1);
  } finally {
    globalThis.ResizeObserver = original;
  }
});


