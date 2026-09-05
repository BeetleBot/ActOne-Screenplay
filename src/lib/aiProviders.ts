import { PromptConfig } from "../hooks/usePromptConfig";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

function isTauriEnv(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function platformFetch(url: string, init?: RequestInit): Promise<Response> {
  if (isTauriEnv()) {
    try {
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url);
      const headers = new Headers(init?.headers);
      if (isLocalhost) headers.set("Origin", "http://localhost");
      return await tauriFetch(url, { ...init, headers });
    } catch (tauriErr) {
      if ((init?.signal as AbortSignal)?.aborted) {
        throw tauriErr;
      }
      try {
        return await fetch(url, init);
      } catch {
        throw tauriErr;
      }
    }
  }
  return fetch(url, init);
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatOptions {
  system?: string;
  signal?: AbortSignal;
  onChunk?: (delta: string) => void;
  temperature?: number;
  maxTokens?: number;
}

export interface AIProvider {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
}

async function streamLines(response: Response, onLine: (line: string) => void): Promise<void> {
  const body = response.body;
  if (!body) {
    for (const line of (await response.text()).split("\n")) onLine(line);
    return;
  }
  try {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx = buffer.indexOf("\n");
      while (idx !== -1) {
        onLine(buffer.slice(0, idx));
        buffer = buffer.slice(idx + 1);
        idx = buffer.indexOf("\n");
      }
    }
    buffer += decoder.decode();
    if (buffer) onLine(buffer);
  } catch (err) {
    try {
      const text = await response.text();
      for (const line of text.split("\n")) onLine(line);
    } catch {
      throw err;
    }
  }
}

function sseData(line: string): unknown | null {
  if (!line.startsWith("data:")) return null;
  const payload = line.slice(5).trim();
  if (!payload || payload === "[DONE]") return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export class OpenAICompatibleProvider implements AIProvider {
  constructor(
    private endpoint: string,
    private apiKey: string,
    private model: string,
  ) {}

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    const payload: Array<{ role: string; content: string }> = [];
    if (options.system) payload.push({ role: "system", content: options.system });
    payload.push(...messages);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    let url = this.endpoint.trim().replace(/\/+$/, "");
    if (!url.endsWith("/chat/completions")) {
      url = `${url}/chat/completions`;
    }

    const response = await platformFetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.model || "gpt-4o",
        messages: payload,
        stream: true,
        temperature: options.temperature,
        max_tokens: options.maxTokens ?? 4096,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const err = await response.text().catch(() => "Unknown error");
      throw new Error(`API error (${response.status}): ${err}`);
    }

    let text = "";
    try {
      await streamLines(response, (line) => {
        const event = sseData(line) as {
          choices?: Array<{ delta?: { content?: string } }>;
          error?: { message?: string };
        } | null;
        if (event?.error?.message) {
          throw new Error(event.error.message);
        }
        const delta = event?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta) {
          text += delta;
          options.onChunk?.(delta);
        }
      });
    } catch (e: unknown) {
      if (text.length > 0) {
        return text;
      }
      throw new Error((e as Error)?.message || "Failed to decode response stream from AI provider.", { cause: e });
    }
    return text;
  }
}

export class OllamaProvider implements AIProvider {
  constructor(
    private baseUrl: string,
    private model: string,
  ) {}

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    const payload: Array<{ role: string; content: string }> = [];
    if (options.system) payload.push({ role: "system", content: options.system });
    payload.push(...messages);

    // ── Tauri: route through Rust proxy (no CORS issues) ──────────────
    if (isTauriEnv()) {
      const sessionId = crypto.randomUUID();

      const unlisten = await listen<{ session_id: string; delta: string }>(
        "ollama-chat-chunk",
        (event) => {
          if (event.payload.session_id === sessionId) {
            options.onChunk?.(event.payload.delta);
          }
        },
      );

      // If the caller aborts, clean up the listener
      const abortHandler = () => {
        unlisten();
        invoke("cancel_ollama_chat", { sessionId }).catch(() => {});
      };
      options.signal?.addEventListener("abort", abortHandler, { once: true });

      try {
        const result = await invoke<string>("ollama_chat", {
          sessionId,
          url: this.baseUrl,
          model: this.model || "llama3.2",
          messages: payload,
          temperature: options.temperature,
        });
        return result;
      } finally {
        unlisten();
        options.signal?.removeEventListener("abort", abortHandler);
      }
    }

    // ── Browser fallback (dev without Tauri) ───────────────────────────
    const response = await platformFetch(`${this.baseUrl.replace(/\/+$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model || "llama3.2",
        messages: payload,
        stream: true,
        options: {
          ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
          ...(options.maxTokens !== undefined ? { num_predict: options.maxTokens } : {}),
        }
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const err = await response.text().catch(() => "Unknown error");
      throw new Error(`Ollama error (${response.status}): ${err}`);
    }

    let text = "";
    let streamError: string | null = null;
    await streamLines(response, (line) => {
      if (!line.trim()) return;
      let event: { message?: { content?: string }; error?: string };
      try {
        event = JSON.parse(line);
      } catch {
        return;
      }
      if (event.error) {
        streamError = event.error;
        return;
      }
      const delta = event.message?.content;
      if (typeof delta === "string" && delta) {
        text += delta;
        options.onChunk?.(delta);
      }
    });
    if (streamError) throw new Error(`Ollama error: ${streamError}`);
    return text;
  }
}

export function createAIProvider(config: PromptConfig): AIProvider | null {
  switch (config.provider) {
    case "openai-compatible": {
      if (!config.apiEndpoint) return null;
      return new OpenAICompatibleProvider(config.apiEndpoint, config.apiKey, config.apiModel);
    }
    case "ollama": {
      return new OllamaProvider(config.ollamaUrl || "http://localhost:11434", config.model);
    }
    default:
      return null;
  }
}
