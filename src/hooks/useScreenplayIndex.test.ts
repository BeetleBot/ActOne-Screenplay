import { act, renderHook, waitFor } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { parseScreenplay } from "../parser";
import type { PromptConfig } from "./usePromptConfig";
const { chat } = vi.hoisted(() => ({ chat: vi.fn() }));
vi.mock("../lib/urai", async original => ({ ...(await original<typeof import("../lib/urai")>()), nativeChat: chat }));
import { formatIndexProgress, useScreenplayIndex } from "./useScreenplayIndex";
it("indexes in bounded batches, reuses unchanged scenes and retrieves a requested scene", async () => {
  localStorage.clear(); chat.mockResolvedValue({ text: "John enters the observatory." });
  const doc = parseScreenplay("INT. OBSERVATORY - DAY\n\nJohn watches the stars.\n\nEXT. BEACH - NIGHT\n\nMary walks.");
  const config = { provider: "ollama", model: "test", ollamaUrl: "http://localhost:11434" } as PromptConfig;
  const hook = renderHook(() => useScreenplayIndex(doc, config, "fixture"));
  await act(async () => hook.result.current.run());
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  expect(chat).toHaveBeenCalledTimes(2);
  expect(hook.result.current.retrieve("Read scene 2").scenes.map(scene => scene.id)).toEqual([2]);
  await act(async () => hook.result.current.run());
  expect(chat).toHaveBeenCalledTimes(2);
  hook.unmount();
});

it("formats progress retained by an older running indexing job", () => {
  expect(formatIndexProgress("Scene 101 of 303 \u00c3\u201a\u00c2\u00b7 part 1")).toBe("Scene 101 of 303 - part 1");
});
