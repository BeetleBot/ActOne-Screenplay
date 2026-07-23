import { type ChangeEvent, type KeyboardEvent, useCallback, useRef, useState, useMemo, useEffect } from "react";
import { Box, IconButton, Typography, useTheme } from "@mui/material";
import { SendIcon, StopIcon } from "../Icons";

const MAX_TEXTAREA_HEIGHT = 120;

export type ComposerAction = "write-scene" | "q" | "lookup" | "synonyms";

interface AIChatComposerProps {
  streaming: boolean;
  disabled?: boolean;
  placeholder: string;
  onSend: (text: string, action?: ComposerAction) => void;
  onStop: () => void;
}

const ALL_COMMANDS: ComposerAction[] = ["write-scene", "q", "lookup", "synonyms"];

const PREFIX_RE = /^@(write-scene|q|lookup|synonyms)\s+(.*)/i;
const PREFIX_ONLY_RE = /^@(write-scene|q|lookup|synonyms)(\s*)$/i;

const COMMAND_SUGGESTIONS: { command: ComposerAction; label: string; description: string }[] = [
  { command: "write-scene", label: "write-scene", description: "Generate a Fountain scene" },
  { command: "q", label: "q", description: "Ask about the document" },
  { command: "lookup", label: "lookup", description: "Define a term" },
  { command: "synonyms", label: "synonyms", description: "Get alternative words" },
];

export function AIChatComposer({
  streaming,
  disabled,
  placeholder,
  onSend,
  onStop,
}: AIChatComposerProps) {
  const theme = useTheme();
  const ACTION_META: Record<ComposerAction, { label: string; color: string }> = {
    "write-scene": { label: "write-scene", color: theme.palette.primary.main },
    "q": { label: "q", color: theme.palette.secondary.main },
    "lookup": { label: "lookup", color: theme.palette.info.main },
    "synonyms": { label: "synonyms", color: theme.palette.warning.main },
  };
  const [mode, setMode] = useState<ComposerAction | null>(null);
  const [body, setBody] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [lastSent, setLastSent] = useState<{ mode: ComposerAction | null; body: string } | null>(null);

  // ── Autocomplete ──
  const showSuggestions = useMemo(() => {
    return !mode && /^@/.test(body);
  }, [mode, body]);

  const suggestionFilter = useMemo(() => {
    const m = body.match(/^@(\S*)$/);
    return m ? m[1].toLowerCase() : "";
  }, [body]);

  const filteredSuggestions = useMemo(() => {
    if (!showSuggestions) return [];
    return COMMAND_SUGGESTIONS.filter(
      s => s.command.startsWith(suggestionFilter)
    );
  }, [showSuggestions, suggestionFilter]);

  useEffect(() => {
    setSuggestionIndex(0);
  }, [filteredSuggestions.length]);

  const selectSuggestion = useCallback((cmd: ComposerAction) => {
    setMode(cmd);
    setBody("");
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.overflowY = "hidden";
    }
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  const submit = useCallback(() => {
    const raw = body.trim();
    if (!raw && !mode) return;
    if (streaming || disabled) return;
    const fullText = mode ? `@${mode} ${raw}` : raw;
    onSend(fullText, mode ?? undefined);
    setLastSent({ mode, body: raw });
    setMode(null);
    setBody("");
    const el = textareaRef.current as HTMLTextAreaElement;
    if (el) {
      el.style.height = "auto";
      el.style.overflowY = "hidden";
    }
  }, [body, mode, streaming, disabled, onSend]);

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const raw = e.target.value;

    if (!mode) {
      // Check if user typed a command with body
      const m = raw.match(PREFIX_RE);
      if (m && m[2]?.trim()) {
        const cmd = m[1].toLowerCase() as ComposerAction;
        setMode(cmd);
        setBody(m[2]);
        return;
      }
      // Check if user typed just a command (no body yet)
      const m2 = raw.match(PREFIX_ONLY_RE);
      if (m2 && ALL_COMMANDS.includes(m2[1].toLowerCase() as ComposerAction)) {
        const cmd = m2[1].toLowerCase() as ComposerAction;
        setMode(cmd);
        setBody("");
        const el = e.target;
        el.style.height = "auto";
        el.style.overflowY = "hidden";
        return;
      }
    }

    // When mode is set, strip the @command prefix from raw value
    // (textarea value is always body-only when mode is active)
    let next = raw;
    if (mode) {
      const prefixMatch = raw.match(/^@(\S+)\s*/);
      if (prefixMatch) {
        next = raw.slice(prefixMatch[0].length);
      }
    }

    setBody(next);

    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
    el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, [mode]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (streaming && e.key === "Escape") {
        e.preventDefault();
        onStop();
        return;
      }

      // Don't handle keyboard shortcuts when in autocomplete mode
      if (showSuggestions && filteredSuggestions.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSuggestionIndex(prev => Math.min(prev + 1, filteredSuggestions.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSuggestionIndex(prev => Math.max(prev - 1, 0));
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          selectSuggestion(filteredSuggestions[suggestionIndex].command);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setBody("");
          return;
        }
      }

      // Restore last sent message on ArrowUp if input is empty
      if (e.key === "ArrowUp" && body === "" && !mode && lastSent) {
        e.preventDefault();
        setMode(lastSent.mode);
        setBody(lastSent.body);
        return;
      }

      // Backspace when body is empty and mode is set → clear mode
      if (mode && e.key === "Backspace" && body === "") {
        e.preventDefault();
        setMode(null);
        setBody("@");
        const el = textareaRef.current;
        if (el) {
          el.setSelectionRange(1, 1);
        }
        return;
      }

      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        submit();
      }
    },
    [submit, showSuggestions, filteredSuggestions, suggestionIndex, selectSuggestion, mode, body, lastSent, streaming, onStop],
  );

  const meta = mode ? ACTION_META[mode] : null;

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
            "&:focus-within": { borderColor: meta ? meta.color : "primary.main" },
            transition: "border-color 0.15s",
            gap: 0,
          }}
        >
          {mode && (
            <Typography
              component="span"
              sx={{
                fontFamily: '"Courier Prime", Courier, monospace',
                fontSize: "0.8125rem",
                lineHeight: 1.5,
                color: meta?.color,
                fontWeight: 700,
                pl: "10px",
                py: "8px",
                whiteSpace: "nowrap",
                userSelect: "none",
                cursor: "pointer",
                "&:hover": { opacity: 0.8 },
              }}
              onClick={() => {
                setMode(null);
                setBody(`@${mode}`);
                requestAnimationFrame(() => {
                  const el = textareaRef.current;
                  if (el) {
                    el.focus();
                    el.setSelectionRange(`@${mode}`.length, `@${mode}`.length);
                  }
                });
              }}
            >
              @{mode}
            </Typography>
          )}

          <textarea
            ref={textareaRef}
            className="ai-composer-textarea"
            dir="auto"
            rows={1}
            value={body}
            placeholder={mode ? "Type your request..." : placeholder}
            disabled={disabled}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />

          {showSuggestions && filteredSuggestions.length > 0 && (
            <Box
              sx={{
                position: "absolute",
                bottom: "100%",
                left: 0,
                right: 0,
                mb: 0.5,
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                boxShadow: 2,
                zIndex: 10,
                maxHeight: 160,
                overflow: "auto",
              }}
            >
              {filteredSuggestions.map((s, i) => (
                <Box
                  key={s.command}
                  onClick={() => selectSuggestion(s.command)}
                  onMouseEnter={() => setSuggestionIndex(i)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 1.25,
                    py: 0.75,
                    cursor: "pointer",
                    bgcolor: i === suggestionIndex ? "action.selected" : "transparent",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: '"Courier Prime", Courier, monospace',
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: ACTION_META[s.command].color,
                    }}
                  >
                    @{s.command}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "text.secondary" }}>
                    {s.description}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <IconButton
          size="small"
          onClick={streaming ? onStop : submit}
          disabled={!streaming && (disabled || (!mode && !body.trim()))}
          aria-label={streaming ? "Stop generating" : "Send message"}
          title={streaming ? "Stop" : "Send"}
          sx={{
            width: 32,
            height: 32,
            borderRadius: 0,
            bgcolor: meta ? meta.color : "primary.main",
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
