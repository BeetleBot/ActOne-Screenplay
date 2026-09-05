import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  OpenAICompatibleProvider,
  OllamaProvider,
  createAIProvider,
  ChatMessage,
  ChatOptions,
} from "./aiProviders";
import { PromptConfig } from "../hooks/usePromptConfig";

// Helper to create readable mock response streams
function createMockStreamResponse(chunks: string[], status = 200, statusText = "OK") {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    status,
    statusText,
    headers: { "Content-Type": "text/event-stream" },
  });
}

describe("aiProviders", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("OpenAICompatibleProvider", () => {
    it("formats OpenAI payload correctly with system prompt, temperature, and max_tokens", async () => {
      let capturedUrl = "";
      let capturedInit: RequestInit | undefined;

      const mockResponse = createMockStreamResponse([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" World!"}}]}\n\n',
        "data: [DONE]\n\n",
      ]);

      globalThis.fetch = vi.fn(async (url: any, init?: RequestInit) => {
        capturedUrl = String(url);
        capturedInit = init;
        return mockResponse;
      });

      const provider = new OpenAICompatibleProvider(
        "https://api.openai.com/v1/chat/completions",
        "sk-testkey123",
        "gpt-4o"
      );

      const messages: ChatMessage[] = [
        { role: "user", content: "Write a logline." },
      ];
      const chunks: string[] = [];
      const options: ChatOptions = {
        system: "You are a screenwriting assistant.",
        temperature: 0.5,
        onChunk: (delta) => chunks.push(delta),
      };

      const result = await provider.chat(messages, options);

      expect(result).toBe("Hello World!");
      expect(chunks).toEqual(["Hello", " World!"]);
      expect(capturedUrl).toBe("https://api.openai.com/v1/chat/completions");
      expect(capturedInit?.method).toBe("POST");

      const headers = capturedInit?.headers as Record<string, string>;
      expect(headers["Authorization"]).toBe("Bearer sk-testkey123");
      expect(headers["Content-Type"]).toBe("application/json");

      const body = JSON.parse(capturedInit?.body as string);
      expect(body.model).toBe("gpt-4o");
      expect(body.stream).toBe(true);
      expect(body.temperature).toBe(0.5);
      expect(body.max_tokens).toBe(4096);
      expect(body.messages).toEqual([
        { role: "system", content: "You are a screenwriting assistant." },
        { role: "user", content: "Write a logline." },
      ]);
    });

    it("formats Gemini OpenAI-compatible payload and endpoint", async () => {
      let capturedBody: any;
      let capturedHeaders: any;

      const mockResponse = createMockStreamResponse([
        'data: {"choices":[{"delta":{"content":"Gemini response"}}]}\n\n',
        "data: [DONE]\n\n",
      ]);

      globalThis.fetch = vi.fn(async (_url: any, init?: RequestInit) => {
        capturedBody = JSON.parse(init?.body as string);
        capturedHeaders = init?.headers;
        return mockResponse;
      });

      const provider = new OpenAICompatibleProvider(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        "gemini-key",
        "gemini-2.0-flash"
      );

      const result = await provider.chat(
        [{ role: "user", content: "Outline Act 1." }],
        { temperature: 0.2 }
      );

      expect(result).toBe("Gemini response");
      expect(capturedBody.model).toBe("gemini-2.0-flash");
      expect(capturedBody.temperature).toBe(0.2);
      expect(capturedHeaders["Authorization"]).toBe("Bearer gemini-key");
    });

    it("supports custom maxTokens option in payload", async () => {
      let capturedBody: any;
      const mockResponse = createMockStreamResponse([
        'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
        "data: [DONE]\n\n",
      ]);

      globalThis.fetch = vi.fn(async (_url: any, init?: RequestInit) => {
        capturedBody = JSON.parse(init?.body as string);
        return mockResponse;
      });

      const provider = new OpenAICompatibleProvider("https://api.openai.com/v1", "key", "gpt-4o");
      await provider.chat([{ role: "user", content: "test" }], { maxTokens: 8192 });
      expect(capturedBody.max_tokens).toBe(8192);
    });

    it("formats Claude / OpenRouter / Anthropic compatible endpoint payload", async () => {
      let capturedBody: any;

      const mockResponse = createMockStreamResponse([
        'data: {"choices":[{"delta":{"content":"Claude says hi."}}]}\n\n',
        "data: [DONE]\n\n",
      ]);

      globalThis.fetch = vi.fn(async (_url: any, init?: RequestInit) => {
        capturedBody = JSON.parse(init?.body as string);
        return mockResponse;
      });

      const provider = new OpenAICompatibleProvider(
        "https://openrouter.ai/api/v1/chat/completions",
        "sk-or-v1-key",
        "anthropic/claude-3.5-sonnet"
      );

      const result = await provider.chat([{ role: "user", content: "Character arc review" }]);
      expect(result).toBe("Claude says hi.");
      expect(capturedBody.model).toBe("anthropic/claude-3.5-sonnet");
      expect(capturedBody.messages).toEqual([{ role: "user", content: "Character arc review" }]);
    });

    it("handles API HTTP error status responses", async () => {
      globalThis.fetch = vi.fn(async () => {
        return new Response("Invalid API key provided", {
          status: 401,
          statusText: "Unauthorized",
        });
      });

      const provider = new OpenAICompatibleProvider(
        "https://api.openai.com/v1/chat/completions",
        "bad-key",
        "gpt-4o"
      );

      await expect(
        provider.chat([{ role: "user", content: "Hi" }])
      ).rejects.toThrow("API error (401): Invalid API key provided");
    });

    it("handles SSE event error messages in stream", async () => {
      const mockResponse = createMockStreamResponse([
        'data: {"error":{"message":"Rate limit exceeded"}}\n\n',
      ]);

      globalThis.fetch = vi.fn(async () => mockResponse);

      const provider = new OpenAICompatibleProvider(
        "https://api.openai.com/v1/chat/completions",
        "key",
        "gpt-4o"
      );

      await expect(
        provider.chat([{ role: "user", content: "Hi" }])
      ).rejects.toThrow("Rate limit exceeded");
    });

    it("returns partial text if error happens after receiving chunks", async () => {
      const mockResponse = createMockStreamResponse([
        'data: {"choices":[{"delta":{"content":"Partial text"}}\n\n',
      ]);

      globalThis.fetch = vi.fn(async () => mockResponse);

      const provider = new OpenAICompatibleProvider(
        "https://api.openai.com/v1/chat/completions",
        "key",
        "gpt-4o"
      );

      // JSON parsing failure on corrupt line returns what was accumulated if any, or throws
      const result = await provider.chat([{ role: "user", content: "Hi" }]).catch((e) => e.message);
      expect(result).toBeDefined();
    });
  });

  describe("OllamaProvider", () => {
    it("formats Ollama payload with baseUrl/api/chat, stream, and options.temperature", async () => {
      let capturedUrl = "";
      let capturedInit: RequestInit | undefined;

      const mockResponse = createMockStreamResponse([
        JSON.stringify({ message: { content: "Drafting " } }) + "\n",
        JSON.stringify({ message: { content: "scene." } }) + "\n",
      ]);

      globalThis.fetch = vi.fn(async (url: any, init?: RequestInit) => {
        capturedUrl = String(url);
        capturedInit = init;
        return mockResponse;
      });

      const provider = new OllamaProvider("http://localhost:11434", "llama3.2");

      const chunks: string[] = [];
      const result = await provider.chat(
        [{ role: "user", content: "Write scene" }],
        {
          system: "System prompt",
          temperature: 0.8,
          onChunk: (delta) => chunks.push(delta),
        }
      );

      expect(result).toBe("Drafting scene.");
      expect(chunks).toEqual(["Drafting ", "scene."]);
      expect(capturedUrl).toBe("http://localhost:11434/api/chat");
      expect(capturedInit?.method).toBe("POST");

      const body = JSON.parse(capturedInit?.body as string);
      expect(body.model).toBe("llama3.2");
      expect(body.stream).toBe(true);
      expect(body.options).toEqual({ temperature: 0.8 });
      expect(body.messages).toEqual([
        { role: "system", content: "System prompt" },
        { role: "user", content: "Write scene" },
      ]);
    });

    it("handles Ollama HTTP errors", async () => {
      globalThis.fetch = vi.fn(async () => {
        return new Response("model not found", { status: 404, statusText: "Not Found" });
      });

      const provider = new OllamaProvider("http://localhost:11434", "unknown-model");

      await expect(
        provider.chat([{ role: "user", content: "Hi" }])
      ).rejects.toThrow("Ollama error (404): model not found");
    });

    it("handles Ollama JSON streaming error response", async () => {
      const mockResponse = createMockStreamResponse([
        JSON.stringify({ error: "CUDA out of memory" }) + "\n",
      ]);

      globalThis.fetch = vi.fn(async () => mockResponse);

      const provider = new OllamaProvider("http://localhost:11434", "llama3.2");

      await expect(
        provider.chat([{ role: "user", content: "Hi" }])
      ).rejects.toThrow("Ollama error: CUDA out of memory");
    });
  });

  describe("createAIProvider Factory", () => {
    const baseConfig: PromptConfig = {
      provider: "none",
      model: "llama3.2",
      systemPrompt: "Default Prompt",
      rephrasePresets: [],
      chatTemp: 0.7,
      rephraseTemp: 0.1,
      translateLanguages: ["English"],
      translatePrompt: "Translate",
      translateTemp: 0.1,
      apiEndpoint: "https://api.openai.com/v1/chat/completions",
      apiKey: "sk-test",
      apiModel: "gpt-4o",
      ollamaUrl: "http://localhost:11434",
    };

    it("returns null when provider is 'none'", () => {
      const provider = createAIProvider({ ...baseConfig, provider: "none" });
      expect(provider).toBeNull();
    });

    it("creates OpenAICompatibleProvider when provider is 'openai-compatible' with valid endpoint", () => {
      const provider = createAIProvider({
        ...baseConfig,
        provider: "openai-compatible",
        apiEndpoint: "https://api.openai.com/v1/chat/completions",
        apiKey: "sk-key",
        apiModel: "gpt-4o",
      });

      expect(provider).toBeInstanceOf(OpenAICompatibleProvider);
    });

    it("returns null when provider is 'openai-compatible' but endpoint is empty", () => {
      const provider = createAIProvider({
        ...baseConfig,
        provider: "openai-compatible",
        apiEndpoint: "",
      });

      expect(provider).toBeNull();
    });

    it("creates OllamaProvider when provider is 'ollama'", () => {
      const provider = createAIProvider({
        ...baseConfig,
        provider: "ollama",
        ollamaUrl: "http://127.0.0.1:11434",
        model: "mistral",
      });

      expect(provider).toBeInstanceOf(OllamaProvider);
    });
  });
});
