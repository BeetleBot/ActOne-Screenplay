import React, { useEffect } from "react";
import { useChatActions } from "@mui/x-chat-headless";

export const PromptMessageListener: React.FC = () => {
  const actions = useChatActions();

  useEffect(() => {
    const pending = (window as any).pendingPromptAction;
    if (pending) {
      const { action, text } = pending;
      delete (window as any).pendingPromptAction;
      if (text && text.trim().length > 0) {
        if (action === "lookup") {
          actions.sendMessage({
            id: crypto.randomUUID(),
            author: { id: "user", role: "user" as const, displayName: "You" },
            parts: [{ type: "text" as const, text: `Look up: ${text}` }],
            createdAt: new Date().toISOString(),
          });
        } else if (action === "synonyms") {
          actions.sendMessage({
            id: crypto.randomUUID(),
            author: { id: "user", role: "user" as const, displayName: "You" },
            parts: [{ type: "text" as const, text: `Synonyms: ${text}` }],
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    const handleLookup = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const text = customEvent.detail;
      if (text && text.trim().length > 0) {
        actions.sendMessage({
          id: crypto.randomUUID(),
          author: { id: "user", role: "user" as const, displayName: "You" },
          parts: [{ type: "text" as const, text: `Look up: ${text}` }],
          createdAt: new Date().toISOString(),
        });
      }
    };

    const handleSynonyms = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const text = customEvent.detail;
      if (text && text.trim().length > 0) {
        actions.sendMessage({
          id: crypto.randomUUID(),
          author: { id: "user", role: "user" as const, displayName: "You" },
          parts: [{ type: "text" as const, text: `Synonyms: ${text}` }],
          createdAt: new Date().toISOString(),
        });
      }
    };

    window.addEventListener("prompt-lookup", handleLookup);
    window.addEventListener("prompt-synonyms", handleSynonyms);
    return () => {
      window.removeEventListener("prompt-lookup", handleLookup);
      window.removeEventListener("prompt-synonyms", handleSynonyms);
    };
  }, [actions]);

  return null;
};
