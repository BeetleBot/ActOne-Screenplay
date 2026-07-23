import { useState, useMemo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import { ContentCopyIcon, CheckIcon, AutoAwesomeIcon } from "../Icons";
import type { ChatTurn } from "../../hooks/useAIChat";
import { FountainBlock } from "./FountainBlock";

interface AIChatMessageProps {
  turn: ChatTurn;
  pending?: boolean;
  onInsertAtCursor?: (text: string) => void;
}

const FOUNTAIN_FENCE_RE = /```fountain\s*\n([\s\S]*?)```/g;
const FOUNTAIN_FENCE_OPEN_RE = /```fountain\s*\n([\s\S]*)$/;

function splitContent(content: string): Array<{ type: "markdown" | "fountain"; text: string }> {
  const segments: Array<{ type: "markdown" | "fountain"; text: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  FOUNTAIN_FENCE_RE.lastIndex = 0;
  while ((match = FOUNTAIN_FENCE_RE.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "markdown", text: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: "fountain", text: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const tail = content.slice(lastIndex);
    const openMatch = FOUNTAIN_FENCE_OPEN_RE.exec(tail);
    if (openMatch) {
      if (openMatch.index > 0) {
        segments.push({ type: "markdown", text: tail.slice(0, openMatch.index) });
      }
      segments.push({ type: "fountain", text: openMatch[1].trim() });
    } else {
      segments.push({ type: "markdown", text: tail });
    }
  }
  return segments;
}

export function AIChatMessage({ turn, pending, onInsertAtCursor }: AIChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const segments = useMemo(() => splitContent(turn.content), [turn.content]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(turn.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => undefined);
  }, [turn.content]);

  /* ── User bubble ── */
  if (turn.role === "user") {
    return (
      <Box sx={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
        <Box
          dir="auto"
          sx={{
            maxWidth: "82%",
            bgcolor: "primary.main",
            color: "primary.contrastText",
            px: 1.75,
            py: 1.25,
            fontSize: "0.8125rem",
            lineHeight: 1.6,
            userSelect: "text",
            "& p": { m: 0, mb: 0.75 },
            "& p:last-child": { mb: 0 },
            "& ul, & ol": { my: 0.5, pl: 2.5 },
            "& li": { mb: 0.5 },
            "& strong, & b": { fontWeight: 700 },
            "& code": { fontFamily: "monospace", fontSize: "0.75rem", opacity: 0.85 },
            "& ::selection": { bgcolor: "rgba(255,255,255,0.25)" },
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {turn.display ?? turn.content}
          </ReactMarkdown>
        </Box>
      </Box>
    );
  }

  /* ── Typing / pending indicator ── */
  if (pending) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", width: "100%", gap: 0.75 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, pl: 0.25 }}>
          <AutoAwesomeIcon sx={{ fontSize: 12, color: "primary.main" }} />
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.65rem", color: "primary.main", letterSpacing: "0.06em" }}>
            MUSE
          </Typography>
        </Box>
        <Box
          role="status"
          aria-label="Thinking..."
          sx={{
            display: "flex",
            gap: 0.6,
            px: 1.5,
            py: 1,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.default",
            width: "fit-content",
          }}
        >
          {[0, 0.15, 0.3].map((delay, i) => (
            <Box
              key={i}
              component="span"
              sx={{
                width: 6, height: 6,
                bgcolor: "primary.main",
                display: "inline-block",
                animation: "ai-typing-bounce 1.2s infinite ease-in-out",
                animationDelay: `${delay}s`,
              }}
            />
          ))}
        </Box>
      </Box>
    );
  }

  /* ── Assistant message ── */
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        gap: 0.5,
        "&:hover .ai-copy-btn": { opacity: 1 },
      }}
    >
      {/* Header row */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pl: 0.25 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <AutoAwesomeIcon sx={{ fontSize: 12, color: "primary.main" }} />
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.65rem", color: "primary.main", letterSpacing: "0.06em" }}>
            MUSE
          </Typography>
        </Box>
        <Tooltip title={copied ? "Copied!" : "Copy"} placement="left">
          <IconButton
            className="ai-copy-btn"
            size="small"
            onClick={handleCopy}
            sx={{
              opacity: 0,
              transition: "opacity 0.15s",
              borderRadius: 0,
              p: 0.25,
              color: copied ? "success.main" : "text.secondary",
            }}
          >
            {copied
              ? <CheckIcon sx={{ fontSize: 13 }} />
              : <ContentCopyIcon sx={{ fontSize: 13 }} />
            }
          </IconButton>
        </Tooltip>
      </Box>

      {/* Message card */}
      <Box
        dir="auto"
        sx={{
          width: "100%",
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.default",
          boxShadow: (t) => `0 0 12px 0 ${t.palette.primary.main}18`,
          px: 1.75,
          py: 1.5,
          fontSize: "0.8125rem",
          lineHeight: 1.7,
          color: "text.primary",
          userSelect: "text",
          "& p": { m: 0, mb: 1 },
          "& p:last-child": { mb: 0 },
          "& h1, & h2, & h3, & h4": { fontWeight: 700, mt: 1.5, mb: 0.75, lineHeight: 1.3, color: "text.primary" },
          "& h1": { fontSize: "1rem" },
          "& h2": { fontSize: "0.9rem" },
          "& h3": { fontSize: "0.85rem" },
          "& strong, & b": { fontWeight: 700, color: "text.primary" },
          "& ul, & ol": { my: 0.75, pl: 2.5 },
          "& li": { mb: 0.5, lineHeight: 1.6 },
          "& blockquote": {
            m: "8px 0", pl: 1.5,
            borderLeft: "3px solid",
            borderColor: "primary.main",
            bgcolor: "action.hover",
            color: "text.secondary",
            fontStyle: "italic",
          },
          "& code": {
            fontFamily: "monospace",
            fontSize: "0.75rem",
            bgcolor: "action.selected",
            px: 0.5,
            py: 0.1,
            border: "1px solid",
            borderColor: "divider",
          },
          "& pre": {
            m: "8px 0",
            p: 1.5,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            overflow: "auto",
            "& code": { bgcolor: "transparent", border: "none", p: 0, fontSize: "0.75rem" },
          },
        }}
      >
        {segments.map((seg, i) =>
          seg.type === "fountain" ? (
            <FountainBlock key={i} fountainText={seg.text} onInsertAtCursor={onInsertAtCursor} />
          ) : (
            <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>
              {seg.text}
            </ReactMarkdown>
          )
        )}
      </Box>
    </Box>
  );
}
