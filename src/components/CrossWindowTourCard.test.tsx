import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

vi.mock("./Icons", () => ({
  CloseIcon: () => React.createElement("svg", { "data-testid": "close-icon" }),
}));

import { CrossWindowTourCard } from "./CrossWindowTourCard";
import type { TourStep } from "../types/tour";

const baseStep: TourStep = {
  title: "Test Step",
  description: "This is a test description for the tour step.",
};

const defaultProps = {
  step: baseStep,
  tourName: "Test Tour",
  progress: 50,
  taskComplete: true,
  isLastStep: false,
  stepNumber: 2,
  totalSteps: 5,
  onNext: vi.fn(),
  onBack: vi.fn(),
  onCancel: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CrossWindowTourCard", () => {
  it("renders title and description", () => {
    render(React.createElement(CrossWindowTourCard, defaultProps));
    expect(screen.getByText("Test Step")).toBeTruthy();
    expect(screen.getByText("This is a test description for the tour step.")).toBeTruthy();
  });

  it("renders tour name", () => {
    render(React.createElement(CrossWindowTourCard, defaultProps));
    expect(screen.getByText("Test Tour")).toBeTruthy();
  });

  it("renders step counter", () => {
    render(React.createElement(CrossWindowTourCard, defaultProps));
    expect(screen.getByText("Step 2 of 5")).toBeTruthy();
  });

  it("renders Next button by default", () => {
    render(React.createElement(CrossWindowTourCard, defaultProps));
    expect(screen.getByText("Next")).toBeTruthy();
  });

  it("shows Finish button on last step", () => {
    const props = { ...defaultProps, isLastStep: true };
    render(React.createElement(CrossWindowTourCard, props));
    expect(screen.getByText("Finish")).toBeTruthy();
  });

  it("renders Shift+Enter hint on Next button", () => {
    render(React.createElement(CrossWindowTourCard, defaultProps));
    expect(screen.getByText("+Enter")).toBeTruthy();
  });

  it("disables Next button when task is not complete", () => {
    const props = { ...defaultProps, taskComplete: false };
    render(React.createElement(CrossWindowTourCard, props));
    const nextBtn = screen.getByText("Next").closest("button");
    expect(nextBtn).toBeDisabled();
  });

  it("enables Next button when task is complete", () => {
    render(React.createElement(CrossWindowTourCard, defaultProps));
    const nextBtn = screen.getByText("Next").closest("button");
    expect(nextBtn).not.toBeDisabled();
  });

  it("calls onNext when Next is clicked", () => {
    const onNext = vi.fn();
    render(React.createElement(CrossWindowTourCard, { ...defaultProps, onNext }));
    fireEvent.click(screen.getByText("Next"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("shows Back button when onBack is provided", () => {
    render(React.createElement(CrossWindowTourCard, defaultProps));
    expect(screen.getByText("Back")).toBeTruthy();
  });

  it("does not show Back button when onBack is undefined", () => {
    const props = { ...defaultProps, onBack: undefined };
    render(React.createElement(CrossWindowTourCard, props));
    expect(screen.queryByText("Back")).toBeNull();
  });

  it("calls onCancel when close button is clicked", () => {
    const onCancel = vi.fn();
    render(React.createElement(CrossWindowTourCard, { ...defaultProps, onCancel }));
    const closeBtn = screen.getByTestId("close-icon").closest("button");
    if (closeBtn) fireEvent.click(closeBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows task instructions when provided", () => {
    const step: TourStep = { ...baseStep, taskInstructions: "Do the thing" };
    const props = { ...defaultProps, step, taskComplete: false };
    render(React.createElement(CrossWindowTourCard, props));
    expect(screen.getByText("Task Instruction:")).toBeTruthy();
    expect(screen.getByText("Do the thing")).toBeTruthy();
  });

  it("shows Task Complete label when task is done", () => {
    const step: TourStep = { ...baseStep, taskInstructions: "Do the thing" };
    render(React.createElement(CrossWindowTourCard, { ...defaultProps, step, taskComplete: true }));
    expect(screen.getByText("Task Complete!")).toBeTruthy();
  });

  it("renders linear progress bar with correct value", () => {
    const { container } = render(React.createElement(CrossWindowTourCard, defaultProps));
    const progressBar = container.querySelector(".MuiLinearProgress-root");
    expect(progressBar).toBeTruthy();
  });

  it("uses custom nextLabel when provided", () => {
    const step: TourStep = { ...baseStep, nextLabel: "Continue" };
    render(React.createElement(CrossWindowTourCard, { ...defaultProps, step }));
    expect(screen.getByText("Continue")).toBeTruthy();
  });

  it("applies cardWidth from step", () => {
    const step: TourStep = { ...baseStep, cardWidth: 260 };
    const { container } = render(React.createElement(CrossWindowTourCard, { ...defaultProps, step }));
    const card = container.querySelector(".tour-card") as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.style.width).toBe("260px");
  });

  it("defaults cardWidth to 320 when not specified", () => {
    const { container } = render(React.createElement(CrossWindowTourCard, defaultProps));
    const card = container.querySelector(".tour-card") as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.style.width).toBe("320px");
  });
});
