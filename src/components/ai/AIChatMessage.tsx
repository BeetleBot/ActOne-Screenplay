import { useState, useMemo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Box, Button, Typography, IconButton, Tooltip } from "@mui/material";

import { ContentCopyIcon, CheckIcon, AutoAwesomeIcon, PushPinIcon } from "../Icons";
import type { ChatTurn } from "../../hooks/useAIChat";
import type { UrAISceneRef } from "../../lib/uraiSources";
import { FountainBlock } from "./FountainBlock";
import { copyToClipboard } from "../../utils";




interface AIChatMessageProps {
  turn: ChatTurn;
  isStreaming?: boolean;
  pending?: boolean;
  onPin?: () => void;
  onSource?: (source: UrAISceneRef) => void;
  onSaveNote?: (source: UrAISceneRef) => void;
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

function getToolLabel(step: { name: string; args: Record<string, unknown> }): string {
  const sceneId = step.args.label ?? step.args.sceneNumber ?? step.args.scene_number ?? step.args.scene_id ?? step.args.id;
  const query = step.args.query ?? step.args.q;
  const task = step.args.taskText ?? step.args.task;
  const color = step.args.color;
  const storyline = step.args.storyline;

  switch (step.name) {
    case "read_scene": return `Looking into Scene ${sceneId || "screenplay"}...`;
    case "read_requested_source": return "Read the requested source";
    case "read_candidate_scenes": return "Read matching scenes";
    case "read_source_part": return "Read a source part";
    case "read_scenes": return "Read multiple scenes";
    case "compare_scenes": return "Compared scenes";
    case "find_scenes": return "Found scene headings";
    case "search_dialogue": return "Searched dialogue";
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
    model: turn.model || "UrAI",
    tokens: `${turn.inputTokens === undefined ? "~" : ""}${calculatedTokens.toLocaleString()} output tokens${turn.inputTokens === undefined ? " (estimate)" : ` · ${turn.inputTokens.toLocaleString()} input tokens`}`,
  };
}

const pinVisibility = {
  "@media (hover: hover)": {
    "& .urai-pin": { opacity: 0 },
    "&:hover .urai-pin, &:focus-within .urai-pin": { opacity: 1 },
  },
};

function MessageDetails({ meta, children }: { meta: ReturnType<typeof formatTurnMetadata>; children?: React.ReactNode }) {
  const shortModel = meta.model.split("/").at(-1);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0, maxWidth: "100%", px: 0.5, color: "text.secondary" }}>
      <Typography variant="caption" sx={{ flexShrink: 0, whiteSpace: "nowrap" }}>{meta.fullDate}</Typography>
      <Typography component="span" variant="caption" aria-hidden="true">·</Typography>
      <Tooltip title={meta.model + " · " + meta.tokens}>
        <Typography variant="caption" noWrap tabIndex={0} sx={{ minWidth: 0, maxWidth: 160 }}>{shortModel}</Typography>
      </Tooltip>
      {children}
    </Box>
  );
}

export function AIChatMessage({ turn, isStreaming, pending, onPin, onSource, onSaveNote }: AIChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [thinkingOpen, setThinkingOpen] = useState(false);
  const segments = useMemo(() => turn.sourceText ? [{ type: "fountain", text: turn.content }] : splitContent(turn.content), [turn.content, turn.sourceText]);
  const meta = useMemo(() => formatTurnMetadata(turn), [turn]);

  const isStreamingThisTurn = Boolean(isStreaming || pending);
  const hasContent = Boolean(turn.content && turn.content.trim().length > 0);
  const stepCount = (turn.toolCalls?.length || 0) + (turn.thinking ? 1 : 0);
  const sources = [...new Map(turn.sources?.map((source) => [source.id, source])).values()];
  const pin = onPin && hasContent && !isStreamingThisTurn && (
    <Tooltip title={turn.pinned ? "Unpin message" : "Pin for future replies"}>
      <IconButton size="small" color={turn.pinned ? "primary" : "default"} className={turn.pinned ? undefined : "urai-pin"} onClick={onPin} aria-pressed={Boolean(turn.pinned)} aria-label={turn.pinned ? "Unpin message" : "Pin for future replies"}>
        <PushPinIcon sx={{ fontSize: 13 }} />
      </IconButton>
    </Tooltip>
  );

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
      <Box className="ai-message-fade-in" sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", width: "100%", gap: 0.35, ...pinVisibility }}>
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
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              img: ({ alt }) => (
                <Typography component="span" sx={{ fontStyle: "italic", opacity: 0.7 }}>
                  [Image omitted: {alt || "image"}]
                </Typography>
              ),
              a: ({ href, children, title }) => (
                <a 
                  href={href} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  title={title || href}
                  style={{ color: "inherit", textDecoration: "underline" }}
                >
                  {children}
                </a>
              )
            }}
          >
            {turn.display ?? turn.content}
          </ReactMarkdown>
        </Box>
        <MessageDetails meta={meta}>{pin}</MessageDetails>
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
        ...pinVisibility,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pl: 0.25 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <AutoAwesomeIcon sx={{ fontSize: 12, color: "primary.main" }} />
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.65rem", color: "primary.main", letterSpacing: "0.06em" }}>
            UrAI
          </Typography>
        </Box>
        {hasContent && (
          <Box sx={{ display: "flex", alignItems: "center" }}>
          {pin}
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
          </Box>
        )}
      </Box>

      {sources.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.25 }}>
          {sources.map((source) => (
            <Button key={source.id} size="small" title={source.heading} onClick={() => onSource?.(source)}>
              Scene {source.label}
            </Button>
          ))}
          {onSaveNote && hasContent && !isStreamingThisTurn && sources.length === 1 && (
            <Button size="small" onClick={() => onSaveNote(sources[0])}>Save scene note</Button>
          )}
        </Box>
      )}

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
            <span>UrAI used {stepCount} step{stepCount !== 1 ? "s" : ""}</span>
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
                    {step.result && step.sources && <span>{step.result}</span>}
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
              <FountainBlock key={i} fountainText={seg.text} />
            ) : (
              <ReactMarkdown 
                key={i} 
                remarkPlugins={[remarkGfm]}
                components={{
                  img: ({ alt }) => (
                    <Typography component="span" sx={{ fontStyle: "italic", opacity: 0.7 }}>
                      [Image omitted: {alt || "image"}]
                    </Typography>
                  ),
                  a: ({ href, children, title }) => (
                    <a 
                      href={href} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      title={title || href}
                      style={{ color: "inherit", textDecoration: "underline" }}
                    >
                      {children}
                    </a>
                  )
                }}
              >
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

      {hasContent && <MessageDetails meta={meta} />}
    </Box>
  );
}
