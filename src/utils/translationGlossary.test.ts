import { expect, it, vi } from "vitest";
import type { PromptConfig } from "../hooks/usePromptConfig";
const { chat } = vi.hoisted(() => ({ chat: vi.fn() }));
vi.mock("../lib/urai", async original => ({ ...(await original<typeof import("../lib/urai")>()), nativeChat: chat }));
import { generateTranslationGlossary } from "./translationGlossary";
it("batches the source and carries forward compact glossary decisions", async () => {
  chat.mockResolvedValueOnce({ text: "Maya: preserve name" }).mockResolvedValueOnce({ text: "Maya: preserve name; Captain: nickname" });
  const progress = vi.fn();
  const result = await generateTranslationGlossary("a".repeat(2401), "French", {} as PromptConfig, new AbortController().signal, progress);
  expect(chat).toHaveBeenCalledTimes(2);
  expect(JSON.parse(chat.mock.calls[1][1][0].content).existingGlossary).toBe("Maya: preserve name");
  expect(result).toContain("Captain");
  expect(progress).toHaveBeenLastCalledWith(2, 2);
});
it("does not send text after cancellation", async () => {
  chat.mockClear(); const controller = new AbortController(); controller.abort();
  await expect(generateTranslationGlossary("source", "French", {} as PromptConfig, controller.signal, vi.fn())).rejects.toThrow("Aborted");
  expect(chat).not.toHaveBeenCalled();
});
it("retries a token-limited glossary with a larger budget and shorter instructions", async () => {
  chat.mockReset();
  chat.mockRejectedValueOnce(new Error("AI output reached its token limit. Try a smaller selection."));
  chat.mockResolvedValueOnce({ text: "Maya: keep name" });
  const result = await generateTranslationGlossary("short excerpt", "French", {} as PromptConfig, new AbortController().signal, vi.fn());
  expect(result).toContain("Maya");
  expect(chat.mock.calls[1][2].maxTokens).toBeGreaterThan(chat.mock.calls[0][2].maxTokens);
  expect(chat.mock.calls[1][2].instructions).toContain("at most 8 short entries");
});
