import { describe, it, expect, vi } from "vitest";
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
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("Test error")).toBeTruthy();
    expect(screen.getByText("Try Again")).toBeTruthy();
  });

  it("resets error state when Try Again is clicked", () => {
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

    expect(screen.getByText("Something went wrong")).toBeTruthy();
    shouldThrow = false;
    rerender(
      React.createElement(ErrorBoundary, null,
        React.createElement(ThrowingComponent)
      )
    );
    // Click reset
    screen.getByText("Try Again").click();
    waitFor(() => expect(screen.getByText("Recovered")).toBeTruthy());
  });
});
