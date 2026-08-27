import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  usePromptConfig,
  setPromptConfigField,
  getEndpointForProvider,
  getActiveModelName,
  PromptConfig,
} from "./usePromptConfig";
import { STORAGE_KEYS } from "../constants";
import { DEFAULTS } from "../constants/defaults";

describe("usePromptConfig Hook and Helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("usePromptConfig Hook", () => {
    it("returns default prompt configuration when localStorage is empty", () => {
      const { result } = renderHook(() => usePromptConfig());
      expect(result.current.provider).toBe("none");
      expect(result.current.model).toBe(DEFAULTS[STORAGE_KEYS.PROMPT_MODEL]);
      expect(result.current.systemPrompt).toBe(DEFAULTS[STORAGE_KEYS.PROMPT_SYSTEM_PROMPT]);
      expect(result.current.chatTemp).toBe(DEFAULTS[STORAGE_KEYS.PROMPT_CHAT_TEMP]);
      expect(result.current.rephraseTemp).toBe(DEFAULTS[STORAGE_KEYS.PROMPT_REPHRASE_TEMP]);
      expect(result.current.translateTemp).toBe(DEFAULTS[STORAGE_KEYS.PROMPT_TRANSLATE_TEMP]);
      expect(result.current.rephrasePresets.length).toBeGreaterThanOrEqual(1);
      expect(result.current.rephrasePresets[0].name).toBe("Standard");
    });

    it("updates configuration reactively when setPromptConfigField is called", () => {
      const { result } = renderHook(() => usePromptConfig());

      act(() => {
        setPromptConfigField("provider", "openai-compatible");
        setPromptConfigField("apiModel", "gpt-4o");
        setPromptConfigField("chatTemp", 0.9);
      });

      expect(result.current.provider).toBe("openai-compatible");
      expect(result.current.apiModel).toBe("gpt-4o");
      expect(result.current.chatTemp).toBe(0.9);
      expect(localStorage.getItem(STORAGE_KEYS.PROMPT_PROVIDER)).toBe("openai-compatible");
      expect(localStorage.getItem(STORAGE_KEYS.PROMPT_API_MODEL)).toBe("gpt-4o");
      expect(localStorage.getItem(STORAGE_KEYS.PROMPT_CHAT_TEMP)).toBe("0.9");
    });

    it("handles rephrasePresets and translateLanguages arrays properly", () => {
      const { result } = renderHook(() => usePromptConfig());

      const customPresets = [
        { name: "Standard", prompt: "Standard prompt" },
        { name: "Punchy", prompt: "Make it punchy" },
      ];

      act(() => {
        setPromptConfigField("rephrasePresets", customPresets as any);
        setPromptConfigField("translateLanguages", ["Spanish", "French"]);
      });

      expect(result.current.rephrasePresets).toEqual(customPresets);
      expect(result.current.translateLanguages).toEqual(["Spanish", "French"]);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.PROMPT_REPHRASE_PRESETS) || "[]")).toEqual(customPresets);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.PROMPT_TRANSLATE_LANGUAGES) || "[]")).toEqual(["Spanish", "French"]);
    });
  });

  describe("getEndpointForProvider", () => {
    it("returns /v1 ollama endpoint from config or default url", () => {
      const endpoint = getEndpointForProvider("ollama", {
        ollamaUrl: "http://192.168.1.100:11434",
      } as PromptConfig);
      expect(endpoint).toBe("http://192.168.1.100:11434/v1");

      const defaultEndpoint = getEndpointForProvider("ollama");
      expect(defaultEndpoint).toBe("http://localhost:11434/v1");
    });

    it("returns openai-compatible apiEndpoint", () => {
      const endpoint = getEndpointForProvider("openai-compatible", {
        apiEndpoint: "https://api.groq.com/openai/v1/chat/completions",
      } as PromptConfig);
      expect(endpoint).toBe("https://api.groq.com/openai/v1/chat/completions");
    });

    it("returns empty string for 'none'", () => {
      expect(getEndpointForProvider("none")).toBe("");
    });
  });

  describe("getActiveModelName", () => {
    it("returns 'Disabled' when provider is none", () => {
      expect(getActiveModelName({ provider: "none" } as PromptConfig)).toBe("Disabled");
    });

    it("returns model name for ollama provider", () => {
      expect(getActiveModelName({ provider: "ollama", model: "qwen2.5:7b" } as PromptConfig)).toBe("qwen2.5:7b");
    });

    it("returns fallback 'Ollama' when model is empty", () => {
      expect(getActiveModelName({ provider: "ollama", model: "" } as PromptConfig)).toBe("Ollama");
    });

    it("returns apiModel name for openai-compatible provider", () => {
      expect(getActiveModelName({ provider: "openai-compatible", apiModel: "claude-3-5-sonnet" } as PromptConfig)).toBe("claude-3-5-sonnet");
    });

    it("resolves custom display name from PROMPT_API_LIST in localStorage if available", () => {
      const apiList = [
        { model: "gemini-2.0-flash", name: "Google Gemini 2.0 Flash" },
      ];
      localStorage.setItem(STORAGE_KEYS.PROMPT_API_LIST, JSON.stringify(apiList));

      const name = getActiveModelName({
        provider: "openai-compatible",
        apiModel: "gemini-2.0-flash",
      } as PromptConfig);

      expect(name).toBe("Google Gemini 2.0 Flash");
    });
  });
});
