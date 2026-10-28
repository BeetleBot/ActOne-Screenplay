import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { PdfExportPreview } from "./PdfExportPreview";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  PDFWorker: vi.fn(
    class {
      destroy = vi.fn();
    },
  ),
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({ numPages: 0, fingerprints: ["preview"] }),
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
  const pdfjs = await import("pdfjs-dist");
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
  const pdfjs = await import("pdfjs-dist");
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
  const pdfjs = await import("pdfjs-dist");
  render(<PdfExportPreview argumentsJson="{}" isProse={false} />);
  await waitFor(() => expect(pdfjs.getDocument).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: "Zoom in PDF" }));
  expect(screen.getByLabelText("PDF zoom")).toHaveTextContent("125%");
  expect(screen.getByTestId("pdf-pages")).toHaveStyle({ width: "125%" });
  for (let i = 0; i < 8; i++) fireEvent.click(screen.getByRole("button", { name: "Zoom in PDF" }));
  expect(screen.getByRole("button", { name: "Zoom in PDF" })).toBeDisabled();
  expect(screen.getByLabelText("PDF zoom")).toHaveTextContent("200%");
  fireEvent.click(screen.getByRole("button", { name: "Fit width" }));
  expect(screen.getByLabelText("PDF zoom")).toHaveTextContent("100%");
  for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole("button", { name: "Zoom out PDF" }));
  expect(screen.getByLabelText("PDF zoom")).toHaveTextContent("50%");
  expect(screen.getByRole("button", { name: "Zoom out PDF" })).toBeDisabled();
  expect(invoke).toHaveBeenCalledTimes(1);
  expect(pdfjs.getDocument).toHaveBeenCalledTimes(1);
});
