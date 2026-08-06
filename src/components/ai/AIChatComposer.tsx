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

  const submit = useCallback(() => {
    const raw = body.trim();
    if (!raw) return;
    if (streaming || disabled) return;
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
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
    el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (streaming && e.key === "Escape") {
        e.preventDefault();
        onStop();
        return;
      }

      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        submit();
      }
    },
    [submit, streaming, onStop],
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
