import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCoreCodeMirror } from "./useCoreCodeMirror";
import { setProseImages } from "./markdown/prose-media";
import { useProseCodeMirror } from "./useProseCodeMirror";

vi.mock("./useCoreCodeMirror", () => ({
  useCoreCodeMirror: vi.fn(({ extraExtensions }) => ({
    current: {
      dispatch: vi.fn(),
      state: { doc: { toString: () => "test prose" } },
      extensions: extraExtensions,
    },
  })),
}));

describe("useProseCodeMirror hook", () => {
  it("initializes useCoreCodeMirror with prose-specific markdown, media, preview and table extensions", () => {
    const containerRef = { current: document.createElement("div") };
    const { result } = renderHook(() => useProseCodeMirror({ containerRef }));

    expect(result.current.current).toBeDefined();
    expect(result.current.current?.state.doc.toString()).toBe("test prose");
  });
});

it("restores the image registry after switching documents", () => {
  const images = { image1: "data:image/png;base64,YQ==" };
  renderHook(() => useProseCodeMirror({ containerRef: { current: document.createElement("div") }, images }));
  const options = vi.mocked(useCoreCodeMirror).mock.calls.at(-1)![0];
  const dispatch = vi.fn();
  options.onScriptSwitch!({ dispatch } as unknown as import("@codemirror/view").EditorView);
  const effect = dispatch.mock.calls[0][0].effects;
  expect(effect.is(setProseImages)).toBe(true);
  expect(effect.value).toEqual(images);
});
