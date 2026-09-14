import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AIChatMessage } from "./AIChatMessage";

vi.mock("./FountainBlock", () => ({
  FountainBlock: () => <div data-testid="fountain-block" />
}));

describe("AIChatMessage", () => {
  it("renders user messages without real img tags and anchors with noopener", () => {
    const turn = {
      role: "user" as const,
      content: "Here is an image ![test image](http://example.com/img.png) and a [link](http://example.com).",
      timestamp: Date.now()
    };
    
    render(<AIChatMessage turn={turn} />);
    
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("[Image omitted: test image]")).toBeInTheDocument();
    
    const link = screen.getByRole("link", { name: "link" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("title", "http://example.com");
  });

  it("renders assistant messages without real img tags and anchors with noopener", () => {
    const turn = {
      role: "assistant" as const,
      content: "Assistant image ![assist img](http://example.com/assist.png) and a [assist link](http://example.com/assist).",
      timestamp: Date.now()
    };
    
    render(<AIChatMessage turn={turn} />);
    
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("[Image omitted: assist img]")).toBeInTheDocument();
    
    const link = screen.getByRole("link", { name: "assist link" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("title", "http://example.com/assist");
  });
});
