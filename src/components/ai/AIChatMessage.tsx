import { useState, useMemo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Box, Typography, IconButton, Tooltip } from "@mui/material";

import { ContentCopyIcon, CheckIcon, AutoAwesomeIcon } from "../Icons";
import type { ChatTurn } from "../../hooks/useAIChat";
import { FountainBlock } from "./FountainBlock";
import { copyToClipboard } from "../../utils";




interface AIChatMessageProps {
  turn: ChatTurn;
  isStreaming?: boolean;
  pending?: boolean;
  onInsertAtCursor?: (text: string) => void;
  onApplyToEditor?: (sceneNumber: number, fountainText: string) => void;
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

function getToolLabel(step: { name: string; args: Record<string, any> }): string {
  const sceneId = step.args.sceneNumber ?? step.args.scene_number ?? step.args.scene_id ?? step.args.id;
  const query = step.args.query ?? step.args.q;
  const task = step.args.taskText ?? step.args.task;
  const color = step.args.color;
  const storyline = step.args.storyline;

  switch (step.name) {
    case "read_scene": return `Looking into Scene ${sceneId || "screenplay"}...`;
    case "replace_scene": return `Drafted Scene ${sceneId || ""}`;
    case "tag_scene": return `Tagging Scene ${sceneId || ""} (${[color ? `color: ${color}` : "", storyline ? `storyline: ${storyline}` : ""].filter(Boolean).join(", ")})`;
    case "search_script": return `Searching screenplay for "${query || ""}"`;
    case "add_project_todo": return `Adding To-Do "${task || ""}"`;
    case "add_parking_note": return `Adding note to Parking Lot`;
    case "get_character_scenes": return `Analyzing character scenes`;
    case "get_screenplay_stats": return `Calculating screenplay statistics`;
    case "read_active_cursor_context": return `Reading current scene around cursor`;
    default: return `Executing ${step.name}`;
  }
}

function formatTurnMetadata(turn: ChatTurn) {
  const ts = turn.timestamp ? new Date(turn.timestamp) : new Date();
  const timeStr = ts.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  const dateStr = ts.toLocaleDateString([], { month: "short", day: "numeric" });
  const textContent = turn.display || turn.content || "";
  const calculatedTokens = turn.tokens !== undefined && turn.tokens > 0 
    ? turn.tokens 
    : Math.max(1, Math.ceil(textContent.length / 3.8));

  return {
    fullDate: `${timeStr} • ${dateStr}`,
    model: turn.model || "Muse",
    tokens: `${calculatedTokens.toLocaleString()} tokens`,
  };
}

export function AIChatMessage({ turn, isStreaming, pending, onInsertAtCursor, onApplyToEditor }: AIChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [thinkingOpen, setThinkingOpen] = useState(false);
  const segments = useMemo(() => splitContent(turn.content), [turn.content]);
  const meta = useMemo(() => formatTurnMetadata(turn), [turn]);

  const isStreamingThisTurn = Boolean(isStreaming || pending);
  const hasContent = Boolean(turn.content && turn.content.trim().length > 0);
  const stepCount = (turn.toolCalls?.length || 0) + (turn.thinking ? 1 : 0);

  const handleCopy = useCallback(() => {
    void copyToClipboard(turn.content).then((success) => {
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    });
  }, [turn.content]);

  if (turn.role === "user") {
    return (
      <Box className="ai-message-fade-in" sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", width: "100%", gap: 0.35 }}>
        <Box
          dir="auto"
          sx={{
            maxWidth: "85%",
            bgcolor: "primary.main",
            color: "primary.contrastText",
            px: 1.5,
            py: 1,
            borderRadius: 1.5,
            fontSize: "0.8125rem",
            lineHeight: 1.6,
            userSelect: "text",
            "& p": { m: 0, mb: 0.5 },
            "& p:last-child": { mb: 0 },
            "& ul, & ol": { my: 0.5, pl: 2.5 },
            "& li": { mb: 0.25 },
            "& strong, & b": { fontWeight: 700 },
            "& code": { fontFamily: "monospace", fontSize: "0.75rem", opacity: 0.85 },
            "& ::selection": { bgcolor: "rgba(255,255,255,0.25)" },
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {turn.display ?? turn.content}
          </ReactMarkdown>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, opacity: 0.55, fontSize: "0.62rem", color: "text.secondary", px: 0.5 }}>
          <span>{meta.fullDate}</span>
          <span>•</span>
          <span style={{ fontWeight: 600 }}>{meta.model}</span>
          <span>•</span>
          <span>{meta.tokens}</span>
        </Box>
      </Box>
    );
  }

  if (isStreamingThisTurn && !hasContent && stepCount === 0) {
    return (
      <Box className="ai-message-fade-in" sx={{ display: "flex", alignItems: "center", gap: 0.75, pl: 0.25, py: 0.5 }}>
        <AutoAwesomeIcon className="ai-thinking-pulse" sx={{ fontSize: 13, color: "primary.main" }} />
        <Typography
          className="ai-thinking-pulse"
          variant="caption"
          sx={{ fontWeight: 600, fontSize: "0.78rem", color: "primary.main", fontStyle: "italic" }}
        >
          Thinking...
        </Typography>
      </Box>
    );
  }



  return (
    <Box
      className="ai-message-fade-in"
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        gap: 0.25,
        "&:hover .ai-copy-btn": { opacity: 1 },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pl: 0.25 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <AutoAwesomeIcon sx={{ fontSize: 12, color: "primary.main" }} />
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.65rem", color: "primary.main", letterSpacing: "0.06em" }}>
            MUSE
          </Typography>
        </Box>
        {hasContent && (
          <Tooltip title={copied ? "Copied!" : "Copy"} placement="left">
            <IconButton
              className="ai-copy-btn"
              size="small"
              onClick={handleCopy}
              sx={{
                opacity: 0,
                transition: "opacity 0.15s",
                borderRadius: '4px',
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
        )}
      </Box>

      {/* Collapsible Steps Section */}
      {stepCount > 0 && (
        <Box sx={{ py: 0.25, px: 0.5 }}>
          <Box
            onClick={() => setStepsOpen(!stepsOpen)}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              cursor: "pointer",
              userSelect: "none",
              color: "text.secondary",
              fontSize: "0.75rem",
              fontWeight: 500,
              opacity: 0.7,
              "&:hover": { opacity: 1 },
            }}
          >
            <span style={{ fontSize: "0.6rem" }}>{stepsOpen ? "▼" : "▶"}</span>
            <span>Muse used {stepCount} step{stepCount !== 1 ? "s" : ""}</span>
          </Box>

          {stepsOpen && (
            <Box sx={{ pl: 1.5, mt: 0.5, borderLeft: "1px solid", borderColor: "divider" }}>
              {turn.thinking && (
                <Box sx={{ mb: 0.5 }}>
                  <Box
                    onClick={() => setThinkingOpen(!thinkingOpen)}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      cursor: "pointer",
                      userSelect: "none",
                      color: "text.secondary",
                      fontSize: "0.72rem",
                      fontWeight: 500,
                      opacity: 0.7,
                      "&:hover": { opacity: 1 },
                    }}
                  >
                    <span style={{ fontSize: "0.55rem" }}>{thinkingOpen ? "▼" : "▶"}</span>
                    <span>Thought</span>
                  </Box>
                  {thinkingOpen && (
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.25,
                        pl: 1,
                        borderLeft: "2px solid",
                        borderColor: "divider",
                        color: "text.secondary",
                        fontSize: "0.72rem",
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        fontStyle: "italic",
                        opacity: 0.8,
                      }}
                    >
                      {turn.thinking}
                    </Typography>
                  )}
                </Box>
              )}

              {turn.toolCalls?.map((step) => (
                <Box
                  key={step.id}
                  className="ai-step-line"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    color: "text.secondary",
                    py: 0.1,
                    userSelect: "none",
                    opacity: 0.8,
                    "&:hover": { opacity: 1 },
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "text.secondary",
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <span>{getToolLabel(step)}</span>
                    <span style={{ fontSize: "0.7rem", opacity: 0.4 }}>›</span>
                  </Typography>
                  {step.status === "running" && (
                    <Typography
                      className="ai-thinking-pulse"
                      variant="caption"
                      sx={{ fontSize: "0.65rem", color: "primary.main", fontStyle: "italic", ml: "auto" }}
                    >
                      running
                    </Typography>
                  )}
                </Box>
              ))}

              {turn.toolCalls?.filter(s => s.pendingApply).map((step) => (
                <FountainBlock
                  key={`apply-${step.id}`}
                  fountainText={step.pendingApply!.fountainText}
                  sceneNumber={step.pendingApply!.sceneNumber}
                  onInsertAtCursor={onInsertAtCursor}
                  onApplyToEditor={onApplyToEditor}
                />
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Render pending apply cards directly if steps accordion is collapsed */}
      {!stepsOpen && turn.toolCalls?.some(s => s.pendingApply) && (
        <Box sx={{ px: 0.5, py: 0.25 }}>
          {turn.toolCalls.filter(s => s.pendingApply).map((step) => (
            <FountainBlock
              key={`apply-direct-${step.id}`}
              fountainText={step.pendingApply!.fountainText}
              sceneNumber={step.pendingApply!.sceneNumber}
              onInsertAtCursor={onInsertAtCursor}
              onApplyToEditor={onApplyToEditor}
            />
          ))}
        </Box>
      )}

      {hasContent && (
        <Box
          dir="auto"
          sx={{
            width: "100%",
            px: 0.5,
            pt: 0.5,
            fontSize: "0.8125rem",
            lineHeight: 1.7,
            color: "text.primary",
            userSelect: "text",
            "& p": { m: 0, mb: 0.75 },
            "& p:last-child": { mb: 0 },
            "& h1, & h2, & h3, & h4": { fontWeight: 700, mt: 1, mb: 0.5, lineHeight: 1.3, color: "text.primary" },
            "& h1": { fontSize: "1rem" },
            "& h2": { fontSize: "0.9rem" },
            "& h3": { fontSize: "0.85rem" },
            "& strong, & b": { fontWeight: 700, color: "text.primary" },
            "& ul, & ol": { my: 0.5, pl: 2.5 },
            "& li": { mb: 0.35, lineHeight: 1.6 },
            "& blockquote": {
              m: "6px 0", pl: 1.25,
              borderLeft: "2px solid",
              borderColor: "primary.main",
              color: "text.secondary",
              fontStyle: "italic",
            },
            "& code": {
              fontFamily: "monospace",
              fontSize: "0.75rem",
              bgcolor: "action.selected",
              px: 0.5,
              py: 0.1,
              borderRadius: 0.5,
            },
            "& pre": {
              m: "6px 0",
              p: 1.25,
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
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
      )}

      {/* Active Thinking/Working pulse indicator while streaming */}
      {isStreamingThisTurn && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, pl: 0.5, py: 0.5 }}>
          <AutoAwesomeIcon className="ai-thinking-pulse" sx={{ fontSize: 13, color: "primary.main" }} />
          <Typography
            className="ai-thinking-pulse"
            variant="caption"
            sx={{ fontWeight: 600, fontSize: "0.78rem", color: "primary.main", fontStyle: "italic" }}
          >
            {turn.toolCalls && turn.toolCalls.length > 0 ? "Working..." : "Thinking..."}
          </Typography>
        </Box>
      )}

      {/* Metadata footer for Assistant turn */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, opacity: 0.55, fontSize: "0.62rem", color: "text.secondary", pl: 0.5, pt: 0.25 }}>
        <span>{meta.fullDate}</span>
        <span>•</span>
        <span style={{ fontWeight: 600 }}>{meta.model}</span>
        <span>•</span>
        <span>{meta.tokens}</span>
      </Box>
    </Box>
  );
}
