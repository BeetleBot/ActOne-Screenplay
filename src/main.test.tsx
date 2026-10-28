import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";

const startup = vi.hoisted(() => ({
  render: vi.fn(),
  resolveApp: undefined as undefined | ((module: { default: () => ReactNode }) => void),
}));
vi.mock("react-dom/client", () => ({ default: { createRoot: () => ({ render: startup.render }) } }));
vi.mock("./App", () => new Promise(resolve => { startup.resolveApp = resolve; }));
vi.mock("./utils/sentry", () => ({ initSentry: vi.fn() }));
vi.mock("./utils/errorReport", () => ({
  captureError: vi.fn(), flushErrorReports: vi.fn(), setSystemDiagnostics: vi.fn(),
  wasJustCaughtByBoundary: vi.fn(), isTransientTauriTeardownError: vi.fn(),
}));
vi.mock("./components/CrashScreen", () => ({
  showCrashScreen: vi.fn(), readCrashWindowReport: vi.fn(), CrashScreen: () => null,
}));
vi.mock("./components/ErrorBoundary", () => ({ ErrorBoundary: ({ children }: { children: ReactNode }) => children }));
vi.mock("./context/ThemeContext", () => ({ ThemeProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock("./context/UIContext", () => ({ UIProvider: ({ children }: { children: ReactNode }) => children }));

afterEach(cleanup);

it("opens without flashing loading text and displays the app when its module is ready", async () => {
  await import("./main");
  render(startup.render.mock.calls[0][0]);
  expect(screen.getByRole("status", { name: "Loading window" })).toBeInTheDocument();
  expect(document.body).not.toHaveTextContent(/Loading/);
  await waitFor(() => expect(startup.resolveApp).toBeTypeOf("function"));
  await act(async () => {
    startup.resolveApp?.({ default: () => <div>Welcome to ActOne</div> });
  });
  expect(await screen.findByText("Welcome to ActOne")).toBeInTheDocument();
});

