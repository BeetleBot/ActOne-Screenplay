import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DocumentLoadingGate } from "./DocumentLoadingGate";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("shows a spinning logo before mounting the editor, then replaces it with content", async () => {
  const editor = vi.fn(() => <div>Document content</div>);
  const Editor = editor;
  const onPresented = vi.fn();
  const view = render(<DocumentLoadingGate ready={false} onPresented={onPresented}><Editor /></DocumentLoadingGate>);
  expect(screen.getByRole("status", { name: "Loading document" })).toHaveClass("actone-document-loading");
  expect(editor).not.toHaveBeenCalled();
  view.rerender(<DocumentLoadingGate ready onPresented={onPresented}><Editor /></DocumentLoadingGate>);
  expect(editor).not.toHaveBeenCalled();
  await act(async () => { await vi.advanceTimersByTimeAsync(40); });
  expect(screen.getByRole("status")).toBeInTheDocument();
  await act(async () => { await vi.advanceTimersByTimeAsync(30); });
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByText("Document content")).toBeInTheDocument();
  expect(onPresented).not.toHaveBeenCalled();
  await act(async () => { await vi.advanceTimersByTimeAsync(30); });
  expect(onPresented).toHaveBeenCalledTimes(1);
  view.unmount();
});

it("cancels the old mount when another document is selected", async () => {
  const view = render(<DocumentLoadingGate key="old" ready><div>Old content</div></DocumentLoadingGate>);
  view.rerender(<DocumentLoadingGate key="new" ready={false}><div>New content</div></DocumentLoadingGate>);
  await act(async () => { await vi.advanceTimersByTimeAsync(100); });
  expect(screen.getByRole("status")).toBeInTheDocument();
  expect(screen.queryByText("Old content")).toBeNull();
  expect(screen.queryByText("New content")).toBeNull();
  view.unmount();
});
