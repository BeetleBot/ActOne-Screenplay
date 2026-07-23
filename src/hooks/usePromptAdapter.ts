import { useMemo } from "react";
import type { ChatAdapter, ChatMessage, ChatMessageChunk } from "@mui/x-chat-headless";
import type { ChatListMessagesInput, ChatListMessagesResult } from "@mui/x-chat-headless/adapters";
import { usePromptConfig, getEndpointForProvider } from "./usePromptConfig";
import { FOUNTAIN_SYNTAX_RULES } from "../constants";

import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

function isTauriEnv(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function customFetch(url: string, init?: RequestInit) {
  if (isTauriEnv()) {
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url);
    const headers = new Headers(init?.headers);
    if (isLocalhost) headers.set("Origin", "http://localhost");
    return tauriFetch(url, { ...init, headers });
  }
  return fetch(url, init);
}

function parseSSEChunk(data: string): string | null {
  for (const line of data.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(":")) continue;
    if (trimmed === "data: [DONE]") return null;
    if (trimmed.startsWith("data: ")) {
      try {
        const parsed = JSON.parse(trimmed.slice(6));
        const content = parsed.choices?.[0]?.delta?.content;
        if (typeof content === "string") return content;
      } catch { /* ignore parse errors */ }
    }
  }
  return null;
}

function getMessageText(msg: { parts: { type: string; text?: string }[] }): string {
  return msg.parts.map((p) => (p.type === "text" ? p.text ?? "" : "")).join("");
}

export function usePromptAdapter(messagesRef?: { current: ChatMessage[] }): ChatAdapter {
  const config = usePromptConfig();

  return useMemo(() => ({
    async listMessages(_input: ChatListMessagesInput): Promise<ChatListMessagesResult> {
      return { messages: messagesRef?.current ?? [] };
    },

    async sendMessage({ messages, signal }) {
      const endpoint = getEndpointForProvider(config.provider, config);

      const systemMessages = config.systemPrompt
        ? [{ role: "system" as const, content: `${config.systemPrompt}\n\n${FOUNTAIN_SYNTAX_RULES}` }]
        : [{ role: "system" as const, content: FOUNTAIN_SYNTAX_RULES }];

      const apiMessages = messages.map((m) => {
        let content = getMessageText(m);
        if (m.role === "user" && content.startsWith("Look up: ")) {
          content = `Please provide the meaning, context, or information about the following word or phrase: '${content.slice(9)}'`;
        } else if (m.role === "user" && content.startsWith("Synonyms: ")) {
          content = `Please provide a list of synonyms and alternatives for the following word or phrase: '${content.slice(10)}'`;
        }
        return {
          role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
          content,
        };
      });

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (config.provider === "openai-compatible" && config.apiKey) {
        headers["Authorization"] = `Bearer ${config.apiKey}`;
      }

      const model = config.provider === "openai-compatible" && config.apiModel ? config.apiModel : config.model;

      const useStreaming = !(isTauriEnv() && config.provider === "openai-compatible");

      const isCustomApi = config.provider === "openai-compatible";

      const response = await (isCustomApi
        ? customFetch(`${endpoint.replace(/\/+$/, "")}/chat/completions`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              model,
              messages: [...systemMessages, ...apiMessages],
              temperature: config.chatTemp,
              stream: useStreaming,
            }),
            signal,
          })
        : fetch(`${endpoint.replace(/\/+$/, "")}/chat/completions`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              model,
              messages: [...systemMessages, ...apiMessages],
              temperature: config.chatTemp,
              stream: useStreaming,
            }),
            signal,
          }));

      if (!response.ok) {
        const errText = await response.text().catch(() => "Unknown error");
        throw new Error(`API error ${response.status}: ${errText}`);
      }

      if (!useStreaming) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || "";

        return new ReadableStream<ChatMessageChunk>({
          start(controller) {
            const messageId = crypto.randomUUID();
            const textId = crypto.randomUUID();
            controller.enqueue({ type: "start", messageId });
            controller.enqueue({ type: "text-start", id: textId });
            controller.enqueue({ type: "text-delta", id: textId, delta: text });
            controller.enqueue({ type: "text-end", id: textId });
            controller.enqueue({ type: "finish", messageId });
            controller.close();
          }
        });
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Response body is not readable");

      const decoder = new TextDecoder();
      let buffer = "";

      return new ReadableStream<ChatMessageChunk>({
        async start(controller) {
          const messageId = crypto.randomUUID();
          const textId = crypto.randomUUID();
          let started = false;

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              for (const line of lines) {
                const text = parseSSEChunk(line);
                if (text === null) break;
                if (text === undefined) continue;

                if (!started) {
                  controller.enqueue({ type: "start", messageId });
                  controller.enqueue({ type: "text-start", id: textId });
                  started = true;
                }

                controller.enqueue({ type: "text-delta", id: textId, delta: text });
              }
            }

            if (started) {
              controller.enqueue({ type: "text-end", id: textId });
            }
            controller.enqueue({ type: "finish", messageId });
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });
    },
  }), [config, messagesRef]);
}