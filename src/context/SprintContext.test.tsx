import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { SprintProvider, useSprint, type SprintSession } from "./SprintContext";

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(SprintProvider, null, children);
}

describe("SprintContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with no active sprints and empty history", () => {
    const { result } = renderHook(() => useSprint(), { wrapper });
    expect(result.current.activeSprints).toEqual({});
    expect(result.current.sprintHistory).toEqual([]);
  });

  it("starts a sprint", () => {
    const { result } = renderHook(() => useSprint(), { wrapper });
    act(() => result.current.startSprint("file-1", 25, 100));
    expect(result.current.activeSprints["file-1"]).toBeDefined();
    expect(result.current.activeSprints["file-1"].durationMinutes).toBe(25);
    expect(result.current.activeSprints["file-1"].startWordCount).toBe(100);
  });

  it("stops a sprint and adds to history", () => {
    const { result } = renderHook(() => useSprint(), { wrapper });
    act(() => result.current.startSprint("file-1", 25, 100));
    let session: SprintSession | null;
    act(() => { session = result.current.stopSprint("file-1", 150, "test.fountain"); });
    expect(session).not.toBeNull();
    expect(session.wordCount).toBe(50);
    expect(session.fileName).toBe("test.fountain");
    expect(result.current.activeSprints["file-1"]).toBeUndefined();
    expect(result.current.sprintHistory).toHaveLength(1);
  });

  it("clamps sprint word count to zero if total decreased", () => {
    const { result } = renderHook(() => useSprint(), { wrapper });
    act(() => result.current.startSprint("file-1", 25, 200));
    let session: SprintSession | null;
    act(() => { session = result.current.stopSprint("file-1", 150, "x.fountain"); });
    expect(session!.wordCount).toBe(0);
  });

  it("returns null when stopping non-existent sprint", () => {
    const { result } = renderHook(() => useSprint(), { wrapper });
    let session: SprintSession | null;
    act(() => { session = result.current.stopSprint("nonexistent", 100); });
    expect(session).toBeNull();
  });

  it("cancels a sprint", () => {
    const { result } = renderHook(() => useSprint(), { wrapper });
    act(() => result.current.startSprint("file-1", 25, 100));
    act(() => result.current.cancelSprint("file-1"));
    expect(result.current.activeSprints["file-1"]).toBeUndefined();
  });

  it("adds history item", () => {
    const { result } = renderHook(() => useSprint(), { wrapper });
    const session = {
      id: "s1", startTime: 0, endTime: 1, durationMinutes: 5, wordCount: 10, content: "",
    };
    act(() => result.current.addHistoryItem(session));
    expect(result.current.sprintHistory).toHaveLength(1);
  });

  it("does not add duplicate history items", () => {
    const { result } = renderHook(() => useSprint(), { wrapper });
    const session = {
      id: "s1", startTime: 0, endTime: 1, durationMinutes: 5, wordCount: 10, content: "",
    };
    act(() => result.current.addHistoryItem(session));
    act(() => result.current.addHistoryItem(session));
    expect(result.current.sprintHistory).toHaveLength(1);
  });

  it("deletes history item", () => {
    const { result } = renderHook(() => useSprint(), { wrapper });
    const session = {
      id: "s1", startTime: 0, endTime: 1, durationMinutes: 5, wordCount: 10, content: "",
    };
    act(() => result.current.addHistoryItem(session));
    act(() => result.current.deleteHistoryItem("s1"));
    expect(result.current.sprintHistory).toHaveLength(0);
  });

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useSprint(), { wrapper });
    act(() => result.current.startSprint("file-1", 10, 50));
    expect(localStorage.getItem("actone-active-sprints")).toBeTruthy();
  });

  it("works correctly when starting from 0 words", () => {
    const { result } = renderHook(() => useSprint(), { wrapper });
    act(() => result.current.startSprint("file-1", 25, 0));
    let session: SprintSession | null;
    act(() => { session = result.current.stopSprint("file-1", 10, "test.fountain"); });
    expect(session!.wordCount).toBe(10);
  });
});
