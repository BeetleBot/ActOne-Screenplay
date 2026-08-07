import { type ChangeEvent, type KeyboardEvent, useCallback, useRef, useState } from "react";
import { Box, IconButton } from "@mui/material";
import { SendIcon, StopIcon } from "../Icons";

const MAX_TEXTAREA_HEIGHT = 120;

interface AIChatComposerProps {
  streaming: boolean;
  disabled?: boolean;
  placeholder: string;
  onSend: (text: string) => void;
  onStop: () => void;
}

export function AIChatComposer({
  streaming,
  disabled,
  placeholder,
  onSend,
  onStop,
}: AIChatComposerProps) {
  const [body, setBody] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const draftRef = useRef<string>("");

  const submit = useCallback(() => {
    const raw = body.trim();
    if (!raw) return;
    if (streaming || disabled) return;
    
    // Push prompt into history stack if unique or non-duplicate of latest
    if (historyRef.current[historyRef.current.length - 1] !== raw) {
      historyRef.current.push(raw);
    }
    historyIndexRef.current = -1;
    draftRef.current = "";

    onSend(raw);
    setBody("");
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.overflowY = "hidden";
    }
  }, [body, streaming, disabled, onSend]);

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setBody(e.target.value);
    if (historyIndexRef.current === -1) {
      draftRef.current = e.target.value;
    }
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
    el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Escape key cancels active generation
      if (e.key === "Escape") {
        if (streaming) {
          e.preventDefault();
          onStop();
          return;
        }
      }

      // Enter key submits prompt
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        submit();
        return;
      }

      // ArrowUp history navigation
      if (e.key === "ArrowUp" && historyRef.current.length > 0) {
        const el = textareaRef.current;
        if (!el) return;
        const isAtStart = el.selectionStart === 0 && el.selectionEnd === 0;
        const isSingleLine = !el.value.includes("\n");

        if (isAtStart || isSingleLine) {
          e.preventDefault();
          if (historyIndexRef.current === -1) {
            draftRef.current = body;
            historyIndexRef.current = historyRef.current.length - 1;
          } else if (historyIndexRef.current > 0) {
            historyIndexRef.current -= 1;
          }
          const prevPrompt = historyRef.current[historyIndexRef.current] ?? "";
          setBody(prevPrompt);
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.style.height = "auto";
              textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
            }
          });
        }
        return;
      }

      // ArrowDown history navigation
      if (e.key === "ArrowDown" && historyIndexRef.current !== -1) {
        const el = textareaRef.current;
        if (!el) return;
        const isAtEnd = el.selectionStart === el.value.length && el.selectionEnd === el.value.length;
        const isSingleLine = !el.value.includes("\n");

        if (isAtEnd || isSingleLine) {
          e.preventDefault();
          if (historyIndexRef.current < historyRef.current.length - 1) {
            historyIndexRef.current += 1;
            const nextPrompt = historyRef.current[historyIndexRef.current];
            setBody(nextPrompt);
          } else {
            historyIndexRef.current = -1;
            setBody(draftRef.current);
          }
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.style.height = "auto";
              textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
            }
          });
        }
        return;
      }
    },
    [submit, streaming, onStop, body],
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5 }}>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.default",
            position: "relative",
            "&:focus-within": { borderColor: "primary.main" },
            transition: "border-color 0.15s",
            gap: 0,
          }}
        >
          <textarea
            ref={textareaRef}
            className="ai-composer-textarea"
            dir="auto"
            rows={1}
            value={body}
            placeholder={placeholder}
            disabled={disabled}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
        </Box>

        <IconButton
          size="small"
          onClick={streaming ? onStop : submit}
          disabled={!streaming && (disabled || !body.trim())}
          aria-label={streaming ? "Stop generating" : "Send message"}
          title={streaming ? "Stop" : "Send"}
          sx={{
            width: 32,
            height: 32,
            borderRadius: 0,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            flexShrink: 0,
            "&:hover": { opacity: 0.85 },
            "&.Mui-disabled": { bgcolor: "action.disabledBackground", color: "action.disabled" },
            transition: "background-color 0.15s",
          }}
        >
          {streaming
            ? <StopIcon sx={{ fontSize: 16 }} />
            : <SendIcon sx={{ fontSize: 16 }} />
          }
        </IconButton>
      </Box>
    </Box>
  );
}
