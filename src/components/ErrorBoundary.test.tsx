import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { ErrorBoundary } from "./ErrorBoundary";

describe("ErrorBoundary", () => {
  it("renders children when there is no error", () => {
    render(
      React.createElement(ErrorBoundary, null,
        React.createElement("div", null, "Hello World")
      )
    );
    expect(screen.getByText("Hello World")).toBeTruthy();
  });

  it("renders error UI when a child throws", () => {
    const ThrowingComponent = () => {
      throw new Error("Test error");
    };

    render(
      React.createElement(ErrorBoundary, null,
        React.createElement(ThrowingComponent)
      )
    );
    expect(screen.getByText(/component crashed/)).toBeTruthy();
    expect(screen.getByText("Test error")).toBeTruthy();
    expect(screen.getByText("Retry")).toBeTruthy();
  });

  it("resets error state when Retry is clicked", async () => {
    let shouldThrow = true;
    const ThrowingComponent = () => {
      if (shouldThrow) throw new Error("Test error");
      return React.createElement("div", null, "Recovered");
    };

    const { rerender } = render(
      React.createElement(ErrorBoundary, null,
        React.createElement(ThrowingComponent)
      )
    );

    expect(screen.getByText(/component crashed/)).toBeTruthy();
    shouldThrow = false;
    rerender(
      React.createElement(ErrorBoundary, null,
        React.createElement(ThrowingComponent)
      )
    );
    screen.getByText("Retry").click();
    await waitFor(() => expect(screen.getByText("Recovered")).toBeTruthy());
  });
});
