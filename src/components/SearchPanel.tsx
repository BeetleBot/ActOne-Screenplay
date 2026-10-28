import { revealVirtualRow } from "./revealVirtualRow";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useUI, useEditor, useCustomModal } from "../context";
import { EditorView } from "@codemirror/view";
import { undo, redo } from "@codemirror/commands";
import { SearchQuery, setSearchQuery, getSearchQuery } from "@codemirror/search";
import {
  SearchIcon,
  CloseIcon,
  InfoOutlinedIcon,
  FindReplaceIcon,
  DoneAllIcon,
  ArrowUpwardIcon,
  ArrowDownwardIcon,
  KeyboardArrowDownIcon,
  ChevronRightIcon,
} from "./Icons";
import {
  Box,
  Typography,
  IconButton,
  TextField,
  Chip,
  ListItemButton,
  ListItemText,
  Tooltip,
  Button,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  alpha,
} from "@mui/material";
import { Compartment, StateEffect, type EditorState, type ChangeSet, type Text } from "@codemirror/state";
import { findNext, findPrevious } from "@codemirror/search";
import { scanUpdatedSearchResults, type SearchSnapshot } from "../editor/searchResults";
import { lineTypesField, LINE_HEADING } from "../editor/fountainSyntax";
import { List as VirtualList, useDynamicRowHeight, type ListImperativeAPI, type RowComponentProps } from "react-window";
import { logger } from "../utils/logger";

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

// Share lazy preview getters instead of allocating them for every result on each edit.
class SearchResultRecord implements SearchResult {
  constructor(
    readonly from: number,
    readonly to: number,
    private doc: Text,
    private headings: { line: number; label: string }[],
  ) {}
  private get line() {
    return this.doc.lineAt(this.from);
  }
  get text() {
    return this.doc.sliceString(this.from, this.to);
  }
  get lineIndex() {
    return this.line.number - 1;
  }
  get column() {
    return this.from - this.line.from;
  }
  get lineText() {
    return this.line.text;
  }
  get sceneContext() {
    let lo = 0,
      hi = this.headings.length;
    const number = this.line.number;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.headings[mid].line <= number) lo = mid + 1;
      else hi = mid;
    }
    const label = this.headings[lo - 1]?.label;
    if (!label) return "\u2014";
    const numberMatch = label.match(/#([^#\s]+)#/);
    return `${numberMatch ? `[${numberMatch[1]}] ` : ""}${label}`;
  }
}

export const SearchPanel: React.FC = React.memo(() => {
  const { editorView } = useEditor();
  const completedSearchRef = useRef<SearchSnapshot | null>(null);
  const changesRef = useRef<{ doc: Text; changes: ChangeSet } | null>(null);
  const [documentState, setDocumentState] = useState<EditorState | null>(() => editorView?.state ?? null);
  useEffect(() => {
    if (!editorView) {
      setDocumentState(null);
      return;
    }
    const compartment = new Compartment();
    setDocumentState(editorView.state);
    editorView.dispatch({
      effects: StateEffect.appendConfig.of(
        compartment.of(
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const pending = changesRef.current;
              if (pending?.doc === update.startState.doc)
                changesRef.current = { doc: update.state.doc, changes: pending.changes.compose(update.changes) };
              else if (completedSearchRef.current?.state.doc === update.startState.doc)
                changesRef.current = { doc: update.state.doc, changes: update.changes };
              else changesRef.current = null;
              setDocumentState(update.state);
              setSelected((previous) => {
                const next = new Set<string>();
                for (const key of previous) {
                  const [from, to] = key.split(":").map(Number);
                  if (!update.changes.touchesRange(from, to))
                    next.add(`${update.changes.mapPos(from, 1)}:${update.changes.mapPos(to, -1)}`);
                }
                return next;
              });
            }
          }),
        ),
      ),
    });
    return () => {
      editorView.dispatch({ effects: compartment.reconfigure([]) });
    };
  }, [editorView]);
  const { confirm } = useCustomModal();
  const { setActiveRightPane, activeRightPane } = useUI();

  const [query, setQuery] = useState<string>(() => {
    try {
      return localStorage.getItem(SEARCH_QUERY_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });
  const [showReplace, setShowReplace] = useState(false);
  const [replaceText, setReplaceText] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  const resultsListRef = useRef<ListImperativeAPI | null>(null);
  const [resultsWidth, setResultsWidth] = useState(0);
  const resultRowHeight = useDynamicRowHeight({ defaultRowHeight: 65, key: resultsWidth });

  useEffect(() => {
    try {
      localStorage.setItem(SEARCH_QUERY_STORAGE_KEY, query);
    } catch {
      void 0;
    }
  }, [query]);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
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

  const searchQuery = useMemo<SearchQuery | null>(() => {
    if (!debouncedQuery) return null;
    return new SearchQuery({
      search: debouncedQuery,
      caseSensitive,
      wholeWord,
    });
  }, [debouncedQuery, caseSensitive, wholeWord]);

  const editorViewRef = useRef(editorView);
  useEffect(() => {
    editorViewRef.current = editorView;
  }, [editorView]);

  useEffect(() => {
    if (!editorView) return;
    editorView.dispatch({
      effects: setSearchQuery.of(searchQuery ?? new SearchQuery({ search: "" })),
    });
  }, [searchQuery, editorView]);

  useEffect(() => {
    return () => {
      const view = editorViewRef.current;
      if (view) {
        view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: "" })) });
      }
    };
  }, []);

  const [resultSnapshot, setResultSnapshot] = useState<{
    state: EditorState;
    query: SearchQuery;
    rows: SearchResult[];
  } | null>(null);
  useEffect(() => {
    if (!documentState || !searchQuery?.valid) {
      setResultSnapshot(null);
      return;
    }
    const state = documentState;
    const query = searchQuery;
    return scanUpdatedSearchResults(
      state,
      query,
      (ranges) => {
        if (editorView?.state.doc !== state.doc) return;
        completedSearchRef.current = { state, query, ranges };
        changesRef.current = null;
        const headings: { line: number; label: string }[] = [];
        const types = state.field(lineTypesField, false);
        if (types)
          for (let index = 0; index < types.length; index++) {
            if (types[index] === LINE_HEADING)
              headings.push({ line: index + 1, label: state.doc.line(index + 1).text });
          }
        const rows = ranges.map((range) => new SearchResultRecord(range.from, range.to, state.doc, headings));
        const valid = new Set(ranges.map((range) => `${range.from}:${range.to}`));
        setSelected((previous) => new Set([...previous].filter((key) => valid.has(key))));
        setResultSnapshot({ state, query, rows });
      },
      completedSearchRef.current,
      changesRef.current?.doc === state.doc ? changesRef.current.changes : null,
    );
  }, [documentState, searchQuery, editorView]);
  const resultsCurrent =
    !!resultSnapshot &&
    resultSnapshot.state.doc === editorView?.state.doc &&
    !!searchQuery &&
    resultSnapshot.query.eq(searchQuery);
  const resultRows = resultSnapshot && searchQuery?.eq(resultSnapshot.query) ? resultSnapshot.rows : [];
  useEffect(() => {
    setSelected(new Set());
    setActiveIndex(-1);
  }, [searchQuery, editorView]);
  useEffect(() => {
    if (activeIndex < 0 || activeIndex >= resultRows.length) return;
    const row = resultRows[activeIndex];
    return revealVirtualRow(
      () => resultsListRef.current,
      activeIndex,
      (element) => element.querySelector(`[data-match-id="${row.from}-${row.to}"]`),
    );
  }, [activeIndex, resultRows]);

  const queryError = null;

  useEffect(() => {
    if (activeIndex >= resultRows.length) setActiveIndex(-1);
  }, [resultRows.length, activeIndex]);

  useEffect(() => {
    if (!editorView) return;
    const view = editorView;
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        if (undo(view)) {
          e.preventDefault();
          e.stopPropagation();
        }
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        if (redo(view)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [editorView]);

  const handleResultClick = useCallback(
    (r: SearchResult) => {
      if (!editorView || !resultSnapshot || resultSnapshot.state.doc !== editorView.state.doc) return;
      try {
        editorView.dispatch({
          selection: { anchor: r.from, head: r.to },
          effects: EditorView.scrollIntoView(r.from, { y: "center" }),
        });
        editorView.focus();
      } catch (e) {
        logger.error("search", "Failed to scroll to match:", e);
      }
    },
    [editorView, resultSnapshot],
  );

  const goTo = useCallback(
    (delta: number) => {
      if (!editorView) return;
      if (!resultsCurrent) {
        (delta > 0 ? findNext : findPrevious)(editorView);
        return;
      }
      if (resultRows.length === 0) return;
      const len = resultRows.length;
      const next = (((activeIndex + delta) % len) + len) % len;
      setActiveIndex(next);
      handleResultClick(resultRows[next]);
    },
    [activeIndex, resultRows, handleResultClick, editorView, resultsCurrent],
  );

  const handleReplaceCurrent = useCallback(() => {
    if (activeIndex < 0 || activeIndex >= resultRows.length) return;
    if (!editorView || resultSnapshot?.state.doc !== editorView.state.doc) return;
    const r = resultRows[activeIndex];
    try {
      editorView.dispatch({
        changes: { from: r.from, to: r.to, insert: replaceText },
        selection: { anchor: r.from + replaceText.length },
      });
    } catch (e) {
      logger.error("search", "Failed to replace current match:", e);
    }
  }, [activeIndex, resultRows, replaceText, editorView, resultSnapshot]);

  const handleReplaceAll = useCallback(async () => {
    if (resultRows.length === 0 || !resultsCurrent) return;
    if (!editorView) return;
    try {
      const queryBeforeConfirm = getSearchQuery(editorView.state);
      const choice = await confirm({
        title: "Replace All",
        message: `Replace all ${resultRows.length} occurrence(s) with "${replaceText}"? You can undo with Ctrl+Z.`,
        buttons: [
          { value: "cancel", label: "Cancel", variant: "text" },
          { value: "ok", label: "Replace All", variant: "contained", color: "primary" },
        ],
      });
      if (choice !== "ok") return;
      // Confirmation is asynchronous: never apply offsets from an older document.
      if (
        editorView.state.doc !== resultSnapshot?.state.doc ||
        !getSearchQuery(editorView.state).eq(queryBeforeConfirm)
      ) {
        await confirm({
          title: "Search results changed",
          message: "The document or search changed. Review the updated matches and choose Replace All again.",
          buttons: [{ value: "ok", label: "OK", variant: "contained" }],
        });
        return;
      }
      const changes = resultRows.map((r) => ({ from: r.from, to: r.to, insert: replaceText }));
      editorView.dispatch({ changes });
    } catch (e) {
      logger.error("search", "Failed to replace all:", e);
    }
  }, [resultRows, replaceText, confirm, editorView, resultSnapshot, searchQuery, resultsCurrent]);

  const handleReplaceSelected = useCallback(() => {
    if (selected.size === 0 || resultSnapshot?.state.doc !== editorView?.state.doc) return;
    if (!editorView) return;
    const sortedRows = [...resultRows]
      .map((r, originalIndex) => ({ r, originalIndex }))
      .filter(({ r }) => selected.has(`${r.from}:${r.to}`))
      .sort((a, b) => b.r.from - a.r.from);
    const changes = sortedRows.map(({ r }) => ({ from: r.from, to: r.to, insert: replaceText }));
    editorView.dispatch({ changes });
    setSelected(new Set());
  }, [selected, resultRows, replaceText, editorView, resultSnapshot]);

  const toggleCheck = useCallback(
    (idx: number, value: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev);
        const row = resultRows[idx];
        const key = `${row.from}:${row.to}`;
        if (value) next.add(key);
        else next.delete(key);
        return next;
      });
    },
    [resultRows],
  );

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

  const renderResult = useCallback(
    (idx: number) => {
      const r = resultRows[idx];
      const isActive = idx === activeIndex;
      const isChecked = selected.has(`${r.from}:${r.to}`);
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
            pl: 1.25,
            pr: 1,
            py: 0.6,
            borderRadius: "8px",
            mb: 0.3,
            transition: "all var(--duration-fast) ease",
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
              borderRadius: "4px",
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
              transition: "all var(--duration-fast) ease",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            {isChecked && (
              <Box
                component="svg"
                viewBox="0 0 12 12"
                sx={{ width: 10, height: 10, fill: "none", stroke: "primary.contrastText", strokeWidth: 2 }}
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
                    px: 0.6,
                    py: 0.1,
                    borderRadius: "6px",
                    fontSize: "8.5px",
                    fontWeight: 700,
                    color: "text.secondary",
                  }}
                >
                  Line {r.lineIndex + 1}
                </Typography>
                {r.column > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9, opacity: 0.7 }}>
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
    },
    [resultRows, activeIndex, selected, handleResultClick, toggleCheck],
  );

  return (
    <Box
      data-search-result-count={resultRows.length}
      data-search-current={resultsCurrent}
      sx={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pl: 2,
          pr: 5,
          height: 40,
          minHeight: 40,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            opacity: 0.8,
            fontSize: "0.7rem",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Find and Replace
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          <Tooltip title="Search and replace text in the screenplay. Use Enter to jump to the next match, Shift+Enter for the previous one.">
            <span>
              <InfoOutlinedIcon sx={{ fontSize: 14, opacity: 0.6, cursor: "help" }} />
            </span>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", flex: 1, p: 1.5, gap: 1.25, overflow: "hidden" }}>
        <TextField
          inputRef={searchInputRef}
          placeholder="Find..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
            setSelected(new Set());
          }}
          onKeyDown={handleKeyDown}
          size="small"
          fullWidth
          error={!!queryError}
          helperText={queryError || undefined}
          slotProps={{
            input: {
              sx: {
                bgcolor: "background.paper",
                fontSize: "0.8rem",
                borderRadius: "20px",
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
                      <IconButton
                        size="small"
                        onClick={() => {
                          setQuery("");
                          setSelected(new Set());
                          setActiveIndex(-1);
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title={showReplace ? "Hide replace" : "Show replace"}>
                    <IconButton size="small" onClick={() => setShowReplace((s) => !s)}>
                      {showReplace ? (
                        <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
                      ) : (
                        <ChevronRightIcon sx={{ fontSize: 14 }} />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Previous match (Shift+Enter)">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => goTo(-1)}
                        disabled={resultRows.length === 0 && !searchQuery?.valid}
                      >
                        <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Next match (Enter)">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => goTo(1)}
                        disabled={resultRows.length === 0 && !searchQuery?.valid}
                      >
                        <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              ),
            },
          }}
        />

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ flex: 1 }} />
          {resultRows.length > 0 && (
            <Chip
              label={`${activeIndex < 0 ? "1" : activeIndex + 1} of ${resultRows.length}`}
              size="small"
              sx={{ height: 22, fontSize: 10, fontWeight: 600, borderRadius: "20px" }}
            />
          )}
          <ToggleButtonGroup
            size="small"
            value={[...(caseSensitive ? ["case" as const] : []), ...(wholeWord ? ["word" as const] : [])]}
            onChange={(_, values: string[]) => {
              setCaseSensitive(values.includes("case"));
              setWholeWord(values.includes("word"));
            }}
            sx={{
              gap: 0.5,
              "& .MuiToggleButtonGroup-grouped": {
                border: "none",
                borderRadius: "20px !important",
                minWidth: 28,
                height: 24,
                fontSize: 10.5,
                fontWeight: 700,
                px: 1,
                textTransform: "none",
                bgcolor: (t) => alpha(t.palette.text.primary, 0.05),
                color: "text.secondary",
                "&.Mui-selected": {
                  bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === "dark" ? 0.25 : 0.15),
                  color: "primary.main",
                  "&:hover": {
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.25),
                  },
                },
                "&:hover": {
                  bgcolor: (t) => alpha(t.palette.text.primary, 0.09),
                },
              },
            }}
          >
            <ToggleButton value="case" title="Match case">
              Aa
            </ToggleButton>
            <ToggleButton value="word" title="Whole word">
              \b
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {showReplace && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            <TextField
              inputRef={replaceInputRef}
              placeholder="Replace with..."
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleReplaceCurrent();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  handleClose();
                }
              }}
              size="small"
              fullWidth
              slotProps={{
                input: {
                  sx: {
                    bgcolor: "background.paper",
                    fontSize: "0.8rem",
                    borderRadius: "20px",
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
                    variant="outlined"
                    onClick={handleReplaceCurrent}
                    disabled={!resultsCurrent || resultRows.length === 0 || activeIndex < 0}
                    startIcon={<FindReplaceIcon sx={{ fontSize: 13 }} />}
                    sx={{
                      fontSize: 11,
                      textTransform: "none",
                      py: 0.35,
                      px: 1.25,
                      borderRadius: "20px",
                      fontWeight: 600,
                    }}
                  >
                    Replace
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Replace all matches">
                <span>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleReplaceAll}
                    disabled={!resultsCurrent || resultRows.length === 0}
                    startIcon={<DoneAllIcon sx={{ fontSize: 13 }} />}
                    sx={{
                      fontSize: 11,
                      textTransform: "none",
                      py: 0.35,
                      px: 1.25,
                      borderRadius: "20px",
                      fontWeight: 600,
                    }}
                  >
                    All ({resultRows.length})
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Replace only checked matches">
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleReplaceSelected}
                    disabled={!resultsCurrent || selected.size === 0}
                    sx={{
                      fontSize: 11,
                      textTransform: "none",
                      py: 0.35,
                      px: 1.25,
                      borderRadius: "20px",
                      fontWeight: 600,
                    }}
                  >
                    Selected ({selected.size})
                  </Button>
                </span>
              </Tooltip>
            </Box>
          </Box>
        )}

        <Divider sx={{ mt: showReplace ? 0 : 0 }} />
        {searchQuery?.valid && !resultsCurrent && (
          <Typography role="status" variant="caption" sx={{ px: 1, py: 0.5 }}>
            Updating results...
          </Typography>
        )}

        <Box
          tabIndex={0}
          onKeyDown={handleKeyDown}
          sx={{ flex: 1, minHeight: 0, overflow: "hidden", mx: -1.5, mb: -1.5 }}
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
                {query ? queryError || "No matches found" : "Type a query to search the screenplay"}
              </Typography>
              {!query && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, opacity: 0.7, mt: 0.5 }}>
                  Use Aa or \\b to refine your search
                </Typography>
              )}
            </Box>
          ) : (
            <VirtualList
              listRef={resultsListRef}
              rowCount={resultRows.length}
              rowHeight={resultRowHeight}
              rowComponent={SearchVirtualRow}
              rowProps={{ renderResult }}
              overscanCount={5}
              defaultHeight={500}
              onResize={({ width }) => setResultsWidth(width)}
              style={{ height: "100%", width: "100%" }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
});

function SearchVirtualRow({
  index,
  style,
  ariaAttributes,
  renderResult,
}: RowComponentProps<{ renderResult: (index: number) => React.ReactNode }>) {
  return (
    <div {...ariaAttributes} style={{ ...style, padding: "0 4px", boxSizing: "border-box", display: "flow-root" }}>
      {renderResult(index)}
    </div>
  );
}

function renderHighlightedLine(r: SearchResult) {
  const text = r.lineText || "";
  if (!r.text || text.length === 0) {
    return <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>(empty line)</span>;
  }
  const start = r.column;
  if (start < 0) {
    return <>{text}</>;
  }
  const before = text.slice(0, start);
  const hit = text.slice(start, start + r.text.length);
  const after = text.slice(start + r.text.length);
  return (
    <>
      {before}
      <Box
        component="span"
        sx={{ bgcolor: "warning.main", color: "warning.contrastText", borderRadius: "3px", px: 0.3 }}
      >
        {hit}
      </Box>
      {after}
    </>
  );
}
