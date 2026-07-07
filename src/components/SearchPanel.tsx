import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useUI, useFile, useEditor, useCustomModal } from "../context";
import { EditorView } from "@codemirror/view";
import { updateSearchMatchesEffect } from "../editor/fountainSyntax";
import {
  SearchIcon, CloseIcon, InfoOutlinedIcon, FindReplaceIcon, DoneAllIcon,
  ArrowUpwardIcon, ArrowDownwardIcon, KeyboardArrowDownIcon, ChevronRightIcon,
} from "./Icons";
import {
  Box, Typography, IconButton, TextField, Chip, List, ListItemButton,
  ListItemText, Tooltip, Button, Divider,
} from "@mui/material";
import { LineType } from "../parser/FountainParser";
import { logger } from "../utils/logger";
import { PILL_RADIUS } from "../constants";

const SEARCH_QUERY_STORAGE_KEY = "actone-find-last-query";

interface SearchResult {
  from: number;
  to: number;
  text: string;
  lineIndex: number;
  column: number;
  lineText: string;
  sceneContext: string;
}

function buildPattern(query: string, caseSensitive: boolean, isRegex: boolean, wholeWord: boolean): RegExp | null {
  if (!query) return null;
  let src: string;
  if (isRegex) {
    src = query;
  } else {
    src = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  if (wholeWord) src = `\\b${src}\\b`;
  try {
    return new RegExp(src, caseSensitive ? "g" : "gi");
  } catch {
    return null;
  }
}

function findLineAtPosition(lineStarts: { lineIndex: number; start: number }[], pos: number) {
  let lo = 0, hi = lineStarts.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lineStarts[mid].start <= pos) lo = mid + 1;
    else hi = mid - 1;
  }
  return lineStarts[hi] ?? null;
}

const OptionButton: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  title: string;
}> = ({ active, onClick, label, title }) => (
  <Tooltip title={title}>
    <Box
      component="button"
      onClick={onClick}
      sx={{
        minWidth: 26,
        height: 22,
        px: 0.8,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: "var(--font-ui)",
        bgcolor: active ? "var(--button-color)" : "transparent",
        color: active ? "#fff" : "text.secondary",
        border: "1px solid",
        borderColor: active ? "var(--button-color)" : "divider",
        borderRadius: 0,
        cursor: "pointer",
        userSelect: "none",
        transition: "all 0.12s ease",
        "&:hover": {
          bgcolor: active ? "var(--button-color)" : "action.hover",
          borderColor: active ? "var(--button-color)" : "text.secondary",
        },
      }}
    >
      {label}
    </Box>
  </Tooltip>
);

export const SearchPanel: React.FC = () => {
  const { editorView } = useEditor();
  const { parsedDoc, rawText, setRawText } = useFile();
  const { confirm } = useCustomModal();
  const { setActiveRightPane, activeRightPane } = useUI();

  const [query, setQuery] = useState<string>(() => {
    try { return localStorage.getItem(SEARCH_QUERY_STORAGE_KEY) || ""; } catch { return ""; }
  });
  const [showReplace, setShowReplace] = useState(false);
  const [replaceText, setReplaceText] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [isRegex, setIsRegex] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    try { localStorage.setItem(SEARCH_QUERY_STORAGE_KEY, query); } catch { void 0; }
  }, [query]);

  useEffect(() => {
    if (!initializedRef.current && activeRightPane === "search") {
      initializedRef.current = true;
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    }
  }, [activeRightPane]);

  const docString = useMemo(() => {
    return parsedDoc?.screenplayText ?? rawText ?? "";
  }, [parsedDoc, rawText]);

  const lineStarts = useMemo(() => {
    if (!parsedDoc) return [] as { lineIndex: number; start: number }[];
    const out: { lineIndex: number; start: number }[] = [];
    let pos = 0;
    parsedDoc.lines.forEach((line, idx) => {
      out.push({ lineIndex: idx, start: pos });
      pos += line.text.length + 1;
    });
    return out;
  }, [parsedDoc]);

  const resultRows = useMemo<SearchResult[]>(() => {
    if (!query) return [];
    const pattern = buildPattern(query, caseSensitive, isRegex, wholeWord);
    if (!pattern) return [];
    const matches: SearchResult[] = [];
    const re = new RegExp(pattern.source, pattern.flags);
    let m: RegExpExecArray | null;
    let lastHeading: { sceneNumber?: string; text: string } | null = null;
    while ((m = re.exec(docString)) !== null) {
      const lineInfo = findLineAtPosition(lineStarts, m.index);
      const lineIndex = lineInfo?.lineIndex ?? 0;
      const lineText = parsedDoc?.lines[lineIndex]?.text ?? "";
      const column = lineInfo ? m.index - lineInfo.start : 0;
      if (lineText && parsedDoc) {
        const current = parsedDoc.lines[lineIndex];
        if (current && current.type === LineType.heading) {
          lastHeading = { sceneNumber: current.sceneNumber, text: current.text };
        }
      }
      if (!lastHeading) {
        for (let i = lineIndex; i >= 0; i--) {
          const l = parsedDoc?.lines[i];
          if (l && l.type === LineType.heading) {
            lastHeading = { sceneNumber: l.sceneNumber, text: l.text };
            break;
          }
        }
      }
      const sceneLabel = lastHeading
        ? `${lastHeading.sceneNumber ? `[${lastHeading.sceneNumber}] ` : ""}${lastHeading.text}`
        : "—";
      matches.push({
        from: m.index,
        to: m.index + m[0].length,
        text: m[0],
        lineIndex,
        column,
        lineText,
        sceneContext: sceneLabel,
      });
      if (m[0].length === 0) re.lastIndex++;
    }
    return matches;
  }, [query, caseSensitive, wholeWord, isRegex, docString, lineStarts, parsedDoc]);

  const regexError = useMemo(() => {
    if (!query) return null;
    const pattern = buildPattern(query, caseSensitive, isRegex, wholeWord);
    if (!pattern && isRegex) return "Invalid regular expression";
    return null;
  }, [query, caseSensitive, isRegex, wholeWord]);

  useEffect(() => {
    if (activeIndex >= resultRows.length) setActiveIndex(-1);
  }, [resultRows.length, activeIndex]);

  const editorViewRef = useRef(editorView);
  useEffect(() => {
    editorViewRef.current = editorView;
  }, [editorView]);

  useEffect(() => {
    if (!editorView) return;
    try {
      const positions = resultRows.map((r) => ({ from: r.from, to: r.to }));
      editorView.dispatch({ effects: updateSearchMatchesEffect.of(positions) });
    } catch (e) {
      logger.error("search", "Failed to dispatch search highlights:", e);
    }
  }, [resultRows, editorView]);

  useEffect(() => {
    return () => {
      const view = editorViewRef.current;
      if (view) {
        try {
          view.dispatch({ effects: updateSearchMatchesEffect.of([]) });
        } catch { void 0; }
      }
    };
  }, []);

  const handleResultClick = useCallback((r: SearchResult) => {
    if (!editorView) return;
    try {
      editorView.dispatch({
        selection: { anchor: r.from, head: r.to },
        effects: EditorView.scrollIntoView(r.from, { y: "center" }),
      });
      editorView.focus();
    } catch (e) {
      logger.error("search", "Failed to scroll to match:", e);
    }
  }, [editorView]);

  const goTo = useCallback((delta: number) => {
    if (resultRows.length === 0) return;
    const len = resultRows.length;
    const next = ((activeIndex + delta) % len + len) % len;
    setActiveIndex(next);
    handleResultClick(resultRows[next]);
  }, [activeIndex, resultRows, handleResultClick]);

  const handleReplaceCurrent = useCallback(() => {
    if (activeIndex < 0 || activeIndex >= resultRows.length) return;
    if (!editorView) return;
    const r = resultRows[activeIndex];
    try {
      editorView.dispatch({
        changes: { from: r.from, to: r.to, insert: replaceText },
        selection: { anchor: r.from + replaceText.length },
      });
    } catch (e) {
      logger.error("search", "Failed to replace current match:", e);
    }
  }, [activeIndex, resultRows, replaceText, editorView]);

  const handleReplaceAll = useCallback(async () => {
    if (resultRows.length === 0) return;
    if (!docString) return;
    try {
      const choice = await confirm({
        title: "Replace All",
        message: `Replace all ${resultRows.length} occurrence(s) with "${replaceText}"? You can undo with Ctrl+Z.`,
        buttons: [
          { value: "cancel", label: "Cancel", variant: "text" },
          { value: "ok", label: "Replace All", variant: "contained", color: "primary" },
        ],
      });
      if (choice !== "ok") return;
      const pattern = buildPattern(query, caseSensitive, isRegex, wholeWord);
      if (!pattern) return;
      const newDoc = docString.replace(pattern, replaceText);
      setRawText(newDoc);
    } catch (e) {
      logger.error("search", "Failed to replace all:", e);
    }
  }, [resultRows, docString, query, caseSensitive, isRegex, wholeWord, replaceText, confirm, setRawText]);

  const handleReplaceSelected = useCallback(() => {
    if (selected.size === 0) return;
    if (!docString) return;
    const sortedRows = [...resultRows]
      .map((r, originalIndex) => ({ r, originalIndex }))
      .filter(({ originalIndex }) => selected.has(originalIndex))
      .sort((a, b) => b.r.from - a.r.from);
    let working = docString;
    for (const { r } of sortedRows) {
      working = working.slice(0, r.from) + replaceText + working.slice(r.to);
    }
    setRawText(working);
    setSelected(new Set());
  }, [selected, resultRows, replaceText, docString, setRawText]);

  const toggleCheck = useCallback((idx: number, value: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (value) next.add(idx); else next.delete(idx);
      return next;
    });
  }, []);

  const handleClose = useCallback(() => {
    setActiveRightPane(null);
    setTimeout(() => editorView?.focus(), 50);
  }, [setActiveRightPane, editorView]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (resultRows.length === 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const dir = e.key === "ArrowDown" ? 1 : -1;
      goTo(dir);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < resultRows.length) {
        handleResultClick(resultRows[activeIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  };

  const renderHighlightedLine = (r: SearchResult) => {
    const text = r.lineText || "";
    if (!r.text || text.length === 0) {
      return <span style={{ opacity: 0.5, fontStyle: "italic" }}>(empty line)</span>;
    }
    const lower = text.toLowerCase();
    const needle = r.text.toLowerCase();
    const start = lower.indexOf(needle);
    if (start < 0) {
      return <>{text}</>;
    }
    const before = text.slice(0, start);
    const hit = text.slice(start, start + r.text.length);
    const after = text.slice(start + r.text.length);
    return (
      <>
        {before}
        <Box component="span" sx={{ bgcolor: "warning.main", color: "warning.contrastText", borderRadius: 0, px: 0.3 }}>
          {hit}
        </Box>
        {after}
      </>
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pl: 2, pr: 5, height: 40, minHeight: 40, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.8, fontSize: "0.7rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Find and Replace
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          <Tooltip title="Search and replace text in the screenplay. Use Enter to jump to the next match, Shift+Enter for the previous one.">
            <span>
              <InfoOutlinedIcon sx={{ fontSize: 14, opacity: 0.6, cursor: "help" }} />
            </span>
          </Tooltip>
          <Chip
            label={resultRows.length === 0 ? "0 matches" : `${resultRows.length} ${resultRows.length === 1 ? "match" : "matches"}`}
            size="small"
            sx={{ height: 18, fontSize: 10, fontWeight: 600, borderRadius: PILL_RADIUS }}
          />
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", flex: 1, p: 1.5, gap: 1.25, overflow: "hidden" }}>
        <TextField
          inputRef={searchInputRef}
          placeholder="Find..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1); setSelected(new Set()); }}
          onKeyDown={handleKeyDown}
          size="small"
          fullWidth
          error={!!regexError}
          helperText={regexError || undefined}
          slotProps={{
            input: {
              sx: {
                bgcolor: "background.paper",
                fontSize: "0.8rem",
                "& fieldset": { border: "none" },
              },
              startAdornment: (
                <Box sx={{ display: "flex", color: "text.secondary", mr: 0.8 }}>
                  <SearchIcon sx={{ fontSize: 14 }} />
                </Box>
              ),
              endAdornment: (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                  {query && (
                    <Tooltip title="Clear search">
                      <IconButton size="small" onClick={() => { setQuery(""); setSelected(new Set()); setActiveIndex(-1); }}>
                        <CloseIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title={showReplace ? "Hide replace" : "Show replace"}>
                    <IconButton size="small" onClick={() => setShowReplace((s) => !s)}>
                      {showReplace
                        ? <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
                        : <ChevronRightIcon sx={{ fontSize: 14 }} />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Previous match (Shift+Enter)">
                    <span>
                      <IconButton size="small" onClick={() => goTo(-1)} disabled={resultRows.length === 0}>
                        <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Next match (Enter)">
                    <span>
                      <IconButton size="small" onClick={() => goTo(1)} disabled={resultRows.length === 0}>
                        <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              ),
            },
          }}
        />

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <OptionButton active={caseSensitive} onClick={() => setCaseSensitive((v) => !v)} label="Aa" title="Match case" />
          <OptionButton active={wholeWord} onClick={() => setWholeWord((v) => !v)} label="\\b" title="Whole word" />
          <OptionButton active={isRegex} onClick={() => setIsRegex((v) => !v)} label=".*" title="Regular expression" />
          <Box sx={{ flex: 1 }} />
          {resultRows.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, fontWeight: 700 }}>
              {activeIndex < 0 ? "1" : activeIndex + 1} of {resultRows.length}
            </Typography>
          )}
        </Box>

        {showReplace && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            <TextField
              inputRef={replaceInputRef}
              placeholder="Replace with..."
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleReplaceCurrent(); }
                else if (e.key === "Escape") { e.preventDefault(); handleClose(); }
              }}
              size="small"
              fullWidth
              slotProps={{
                input: {
                  sx: {
                    bgcolor: "background.paper",
                    fontSize: "0.8rem",
                    "& fieldset": { border: "none" },
                  },
                },
              }}
            />
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
              <Tooltip title="Replace current match (Enter)">
                <span>
                  <Button
                    size="small"
                    onClick={handleReplaceCurrent}
                    disabled={resultRows.length === 0 || activeIndex < 0}
                    startIcon={<FindReplaceIcon sx={{ fontSize: 13 }} />}
                    sx={{ fontSize: 11, textTransform: "none", py: 0.25 }}
                  >
                    Replace
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Replace all matches">
                <span>
                  <Button
                    size="small"
                    onClick={handleReplaceAll}
                    disabled={resultRows.length === 0}
                    startIcon={<DoneAllIcon sx={{ fontSize: 13 }} />}
                    sx={{ fontSize: 11, textTransform: "none", py: 0.25 }}
                  >
                    All ({resultRows.length})
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Replace only checked matches">
                <span>
                  <Button
                    size="small"
                    onClick={handleReplaceSelected}
                    disabled={selected.size === 0}
                    sx={{ fontSize: 11, textTransform: "none", py: 0.25 }}
                  >
                    Selected ({selected.size})
                  </Button>
                </span>
              </Tooltip>
            </Box>
          </Box>
        )}

        <Divider sx={{ mt: showReplace ? 0 : 0 }} />

        <List
          tabIndex={0}
          onKeyDown={handleKeyDown}
          sx={{
            flex: 1,
            overflowY: "auto",
            outline: "none",
            p: 0.5,
            mx: -1.5,
            mb: -1.5,
            mt: 0,
            pt: 0.5,
            "&:focus": { outline: "none" },
          }}
        >
          {resultRows.length === 0 ? (
            <Box
              sx={{
                p: 4,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
                color: "text.secondary",
                textAlign: "center",
              }}
            >
              <SearchIcon sx={{ fontSize: 28, opacity: 0.4 }} />
              <Typography variant="body2" sx={{ fontSize: 12, fontStyle: "italic" }}>
                {query
                  ? (regexError || "No matches found")
                  : "Type a query to search the screenplay"}
              </Typography>
              {!query && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, opacity: 0.7, mt: 0.5 }}>
                  Use Aa, \\b, or .* to refine your search
                </Typography>
              )}
            </Box>
          ) : (
            resultRows.map((r, idx) => {
              const isActive = idx === activeIndex;
              const isChecked = selected.has(idx);
              return (
                <ListItemButton
                  key={`${r.from}-${r.to}-${idx}`}
                  data-match-id={`${r.from}-${r.to}`}
                  selected={isActive}
                  onClick={(e) => {
                    setActiveIndex(idx);
                    handleResultClick(r);
                    e.currentTarget.parentElement?.focus();
                  }}
                  sx={{
                    pl: 1.5,
                    pr: 1,
                    py: 0.75,
                    borderRadius: 0,
                    mb: 0.25,
                    transition: "all 0.12s ease",
                    bgcolor: isActive ? "action.selected" : "transparent",
                    "&.Mui-selected": {
                      bgcolor: "action.selected",
                      "&:hover": { bgcolor: "action.selected" },
                    },
                    "&:hover": {
                      bgcolor: isActive ? "action.selected" : "action.hover",
                    },
                  }}
                >
                  <Box
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCheck(idx, !isChecked);
                    }}
                    sx={{
                      width: 14,
                      height: 14,
                      minWidth: 14,
                      borderRadius: 0,
                      border: "1.5px solid",
                      borderColor: isChecked ? "primary.main" : "divider",
                      bgcolor: isChecked ? "primary.main" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      mr: 1,
                      mt: 0.25,
                      flexShrink: 0,
                      transition: "all 0.12s ease",
                      "&:hover": { borderColor: "primary.main" },
                    }}
                  >
                    {isChecked && (
                      <Box
                        component="svg"
                        viewBox="0 0 12 12"
                        sx={{ width: 10, height: 10, fill: "none", stroke: "#fff", strokeWidth: 2 }}
                      >
                        <path d="M2 6 L5 9 L10 3" />
                      </Box>
                    )}
                  </Box>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", gap: 0.6, alignItems: "center", flexWrap: "wrap" }}>
                        <Typography
                          variant="caption"
                          sx={{
                            bgcolor: "action.selected",
                            px: 0.4,
                            borderRadius: 0,
                            fontSize: "8.5px",
                            fontWeight: 700,
                            color: "text.secondary",
                          }}
                        >
                          Line {r.lineIndex + 1}
                        </Typography>
                        {r.column > 0 && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: 9, opacity: 0.7 }}
                          >
                            col {r.column + 1}
                          </Typography>
                        )}
                        {r.sceneContext && r.sceneContext !== "—" && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: 9,
                              fontWeight: 600,
                              color: "text.secondary",
                              maxWidth: "60%",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              textTransform: "uppercase",
                              letterSpacing: "0.03em",
                            }}
                          >
                            {r.sceneContext}
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box
                        sx={{
                          fontSize: 12,
                          lineHeight: 1.45,
                          fontFamily: "var(--font-ui)",
                          mt: 0.3,
                          ml: 1.5,
                          color: "text.primary",
                          wordBreak: "break-word",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {renderHighlightedLine(r)}
                      </Box>
                    }
                  />
                </ListItemButton>
              );
            })
          )}
        </List>
      </Box>
    </Box>
  );
};
