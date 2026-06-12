import React, { useState, useEffect, useRef } from "react";
import { useUI, useEditor } from "../context";
import { EditorView } from "@codemirror/view";
import { ChevronRightIcon, KeyboardArrowDownIcon, ArrowUpwardIcon, ArrowDownwardIcon, CloseIcon, FindReplaceIcon, DoneAllIcon } from "./Icons";

import {
  setSearchQuery,
  SearchQuery,
  findNext,
  findPrevious,
  replaceNext,
} from "@codemirror/search";
import {
  Box,
  Paper,
  IconButton,
  InputBase,
  Typography,
} from "@mui/material";

export const SearchPanel: React.FC = () => {
  const { showSearchPanel, setShowSearchPanel, showReplacePanel, setShowReplacePanel } = useUI();
  const { editorView } = useEditor();

  const [searchText, setSearchText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [isWholeWord, setIsWholeWord] = useState(false);
  const [isRegex, setIsRegex] = useState(false);
  const [preserveCase, setPreserveCase] = useState(false);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0 });

  const [matches, setMatches] = useState<{ index: number; text: string }[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      setPosition({
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("input") || target.closest("button")) return;

    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    e.preventDefault();
  };

  useEffect(() => {
    if (showSearchPanel) {
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }, 50);

      if (editorView) {
        const { from, to } = editorView.state.selection.main;
        if (from !== to) {
          const selected = editorView.state.sliceDoc(from, to);
          if (selected && selected.indexOf("\n") === -1) {
            setSearchText(selected);
          }
        }
      }
    }
  }, [showSearchPanel, editorView]);

  useEffect(() => {
    if (!editorView) return;

    const docText = editorView.state.doc.toString();
    if (!searchText) {
      setMatches([]);
      setActiveIndex(-1);
      editorView.dispatch({
        effects: setSearchQuery.of(
          new SearchQuery({
            search: "",
            replace: "",
            caseSensitive: isCaseSensitive,
            literal: !isRegex,
            regexp: isRegex,
            wholeWord: isWholeWord,
          })
        ),
      });
      return;
    }

    try {
      let escapedQuery = searchText.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      let pattern = isRegex ? searchText : escapedQuery;
      if (isWholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      const regex = new RegExp(pattern, isCaseSensitive ? "g" : "gi");

      const list: { index: number; text: string }[] = [];
      let match;
      while ((match = regex.exec(docText)) !== null) {
        list.push({ index: match.index, text: match[0] });
        if (regex.lastIndex === match.index) {
          regex.lastIndex++;
        }
      }
      setMatches(list);

      const query = new SearchQuery({
        search: searchText,
        replace: replaceText,
        caseSensitive: isCaseSensitive,
        literal: !isRegex,
        regexp: isRegex,
        wholeWord: isWholeWord,
      });

      editorView.dispatch({
        effects: setSearchQuery.of(query),
      });
    } catch (e) {
      setMatches([]);
    }
  }, [searchText, replaceText, isCaseSensitive, isWholeWord, isRegex, editorView]);

  useEffect(() => {
    if (!editorView || matches.length === 0) {
      setActiveIndex(-1);
      return;
    }

    const mainSel = editorView.state.selection.main;
    let foundIndex = matches.findIndex((m) => m.index === mainSel.from);

    if (foundIndex === -1) {
      foundIndex = matches.findIndex((m) => m.index >= mainSel.head);
    }

    if (foundIndex === -1) {
      foundIndex = matches.length - 1;
    }

    setActiveIndex(foundIndex);
  }, [matches, editorView?.state.selection.main]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  };

  const handleReplaceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleReplace();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  };

  const handleNext = () => {
    if (editorView) {
      findNext(editorView);
      const pos = editorView.state.selection.main.head;
      editorView.dispatch({
        effects: EditorView.scrollIntoView(pos, { y: "center" }),
      });
      editorView.focus();
    }
  };

  const handlePrev = () => {
    if (editorView) {
      findPrevious(editorView);
      const pos = editorView.state.selection.main.head;
      editorView.dispatch({
        effects: EditorView.scrollIntoView(pos, { y: "center" }),
      });
      editorView.focus();
    }
  };

  const getCaseMatchedReplacement = (matchText: string, replaceText: string): string => {
    if (!matchText || !replaceText) return replaceText;

    // 1. ALL CAPS
    if (matchText === matchText.toUpperCase() && matchText !== matchText.toLowerCase()) {
      return replaceText.toUpperCase();
    }

    // 2. Capitalized / Title Case
    const firstChar = matchText.charAt(0);
    const restChars = matchText.slice(1);
    const isCapitalized =
      firstChar === firstChar.toUpperCase() &&
      restChars === restChars.toLowerCase() &&
      matchText !== matchText.toLowerCase();

    if (isCapitalized) {
      return replaceText.charAt(0).toUpperCase() + replaceText.slice(1).toLowerCase();
    }

    // 3. Lowercase
    if (matchText === matchText.toLowerCase() && matchText !== matchText.toUpperCase()) {
      return replaceText.toLowerCase();
    }

    return replaceText;
  };

  const handleReplace = () => {
    if (!editorView) return;

    const { from, to } = editorView.state.selection.main;
    if (from !== to) {
      const matchText = editorView.state.sliceDoc(from, to);
      let finalReplace = replaceText;
      if (preserveCase) {
        finalReplace = getCaseMatchedReplacement(matchText, replaceText);
      }

      const tempQuery = new SearchQuery({
        search: searchText,
        replace: finalReplace,
        caseSensitive: isCaseSensitive,
        literal: !isRegex,
        regexp: isRegex,
        wholeWord: isWholeWord,
      });

      editorView.dispatch({
        effects: setSearchQuery.of(tempQuery),
      });

      replaceNext(editorView);

      const originalQuery = new SearchQuery({
        search: searchText,
        replace: replaceText,
        caseSensitive: isCaseSensitive,
        literal: !isRegex,
        regexp: isRegex,
        wholeWord: isWholeWord,
      });
      editorView.dispatch({
        effects: setSearchQuery.of(originalQuery),
      });
    } else {
      replaceNext(editorView);
    }
    editorView.focus();
  };

  const handleReplaceAll = () => {
    if (!editorView || matches.length === 0) return;

    const sortedMatches = [...matches].sort((a, b) => b.index - a.index);
    const changes = sortedMatches.map((match) => {
      let finalReplace = replaceText;
      if (preserveCase) {
        finalReplace = getCaseMatchedReplacement(match.text, replaceText);
      }
      return {
        from: match.index,
        to: match.index + match.text.length,
        insert: finalReplace,
      };
    });

    editorView.dispatch({
      changes,
      selection: { anchor: editorView.state.selection.main.head },
    });

    editorView.focus();
  };

  const handleClose = () => {
    setShowSearchPanel(false);
    if (editorView) {
      editorView.focus();
    }
  };

  if (!showSearchPanel) return null;

  return (
    <Paper
      elevation={8}
      ref={containerRef}
      onMouseDown={handleDragStart}
      sx={{
        position: "fixed",
        top: 80,
        right: 40,
        zIndex: 1000,
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        width: 380,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? "grabbing" : "grab",
      }}
    >
      {/* Search Row */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <IconButton
          size="small"
          onClick={() => setShowReplacePanel(!showReplacePanel)}
          title="Toggle Replace"
        >
          {showReplacePanel ? <KeyboardArrowDownIcon sx={{ fontSize: 16 }} /> : <ChevronRightIcon sx={{ fontSize: 16 }} />}
        </IconButton>

        <Box sx={{ display: "flex", flex: 1, alignItems: "center", border: "1px solid", borderColor: "divider", borderRadius: 1.5, px: 1, bgcolor: "background.paper" }}>
          <InputBase
            inputRef={searchInputRef}
            placeholder="Find"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            sx={{ flex: 1, fontSize: 13, py: 0.2 }}
          />
          <Box sx={{ display: "flex", gap: 0.2 }}>
            {[
              { label: "Aa", active: isCaseSensitive, onClick: () => setIsCaseSensitive(!isCaseSensitive), title: "Match Case (Aa)" },
              { label: "ab", active: isWholeWord, onClick: () => setIsWholeWord(!isWholeWord), title: "Match Whole Word (ab)" },
              { label: ".*", active: isRegex, onClick: () => setIsRegex(!isRegex), title: "Use Regular Expression (.*)" },
            ].map((btn) => (
              <IconButton
                key={btn.label}
                size="small"
                onClick={btn.onClick}
                title={btn.title}
                sx={{
                  width: 22,
                  height: 22,
                  fontSize: 10,
                  fontWeight: 700,
                  borderRadius: 1,
                  bgcolor: btn.active ? "var(--button-color)" : "transparent",
                  color: btn.active ? "#fff" : "text.secondary",
                  "&:hover": {
                    bgcolor: btn.active ? "var(--button-color)" : "action.hover",
                  }
                }}
              >
                {btn.label}
              </IconButton>
            ))}
          </Box>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 45, textAlign: "center", fontSize: 11 }}>
          {matches.length > 0 ? `${activeIndex + 1}/${matches.length}` : "0/0"}
        </Typography>

        <Box sx={{ display: "flex", gap: 0.2 }}>
          <IconButton size="small" onClick={handlePrev} title="Previous Match (Shift+Enter)">
            <ArrowUpwardIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton size="small" onClick={handleNext} title="Next Match (Enter)">
            <ArrowDownwardIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton size="small" onClick={handleClose} title="Close (Escape)">
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Replace Row */}
      {showReplacePanel && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ width: 28 }} /> {/* Spacer */}
          <Box sx={{ display: "flex", flex: 1, alignItems: "center", border: "1px solid", borderColor: "divider", borderRadius: 1.5, px: 1, bgcolor: "background.paper" }}>
            <InputBase
              placeholder="Replace"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              onKeyDown={handleReplaceKeyDown}
              sx={{ flex: 1, fontSize: 13, py: 0.2 }}
            />
            <IconButton
              size="small"
              onClick={() => setPreserveCase(!preserveCase)}
              title="Preserve Case (AB)"
              sx={{
                width: 22,
                height: 22,
                fontSize: 10,
                fontWeight: 700,
                borderRadius: 1,
                bgcolor: preserveCase ? "var(--button-color)" : "transparent",
                color: preserveCase ? "#fff" : "text.secondary",
                "&:hover": {
                  bgcolor: preserveCase ? "var(--button-color)" : "action.hover",
                }
              }}
            >
              AB
            </IconButton>
          </Box>

          <Box sx={{ display: "flex", gap: 0.2 }}>
            <IconButton size="small" onClick={handleReplace} title="Replace">
              <FindReplaceIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton size="small" onClick={handleReplaceAll} title="Replace All">
              <DoneAllIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <Box sx={{ width: 28 }} /> {/* Balance space with close btn */}
          </Box>
        </Box>
      )}
    </Paper>
  );
};

