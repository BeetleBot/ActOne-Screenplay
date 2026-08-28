import React, { useState, useEffect, useCallback } from "react";
import { useUI, useEditor, useFile } from "../../context";
import { alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import { SidebarViews } from "../SidebarViews";
import { SearchPanel } from "../SearchPanel";
import { RightPane } from "../RightPane";
import { ScriptEditor } from "../ScriptEditor";
import { ProseEditor } from "../ProseEditor";
import { MusePanel } from "../MusePanel";
import Typography from "@mui/material/Typography";
import { DescriptionIcon, MenuBookIcon, UploadIcon } from "../Icons";
import { StructureImportModal } from "../StructureImportModal";
import { ThemeLogo } from "../ThemeLogo";

import { ErrorBoundary } from "../ErrorBoundary";
import { isProseScript } from "../../utils/scriptMode";

interface WorkspaceProps {
  isSidebarOpen: boolean;
}

export const Workspace = React.memo<WorkspaceProps>(({
  isSidebarOpen,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [importAnchorEl, setImportAnchorEl] = useState<null | HTMLElement>(null);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const { paperSize, activeTab, zoomLevel, isZenMode, typewriterMode, activeRightPane, setActiveRightPane, sidebarWidth, setSidebarWidth } = useUI();

  const { editorView } = useEditor();
  const { activeFileId, files, addScript, importScript } = useFile();

  const activeFile = files.find(f => f.id === activeFileId);
  const hasNoScripts = activeFile?.scripts && activeFile.scripts.length === 0;
  const activeScript = activeFile && activeFile.scripts && activeFile.activeScriptIndex !== undefined ? activeFile.scripts[activeFile.activeScriptIndex] : null;
  const isMarkdown = isProseScript(activeScript, activeFile?.filePath);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const activeEl = document.activeElement;
        const isEditorFocused = activeEl && (activeEl.classList.contains("cm-content") || activeEl.closest(".cm-editor") !== null);
        if (!isEditorFocused) {
          const isModalOpen = document.querySelector(".MuiDialog-root") || document.querySelector(".cp-overlay");
          if (!isModalOpen) {
            e.preventDefault();
            if (activeEl instanceof HTMLElement) activeEl.blur();
            editorView?.focus();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editorView]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const activityBarWidth = 48;
      const newWidth = Math.max(200, Math.min(e.clientX - activityBarWidth, 800));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => { setIsDragging(false); document.body.style.cursor = 'default'; };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }
    return () => { document.removeEventListener("mousemove", handleMouseMove); document.removeEventListener("mouseup", handleMouseUp); };
  }, [isDragging]);

  useEffect(() => {
    const el = document.getElementById("editor-workspace") as HTMLElement | null;
    if (!el) return;
    const SCROLLBAR_W = 14;
    let dragging = false;
    let trackTop = 0;
    let trackHeight = 0;
    let thumbHeight = 0;
    let maxScroll = 0;

    const getThumbHeight = () => {
      if (el.scrollHeight <= el.clientHeight) return el.clientHeight;
      const ratio = el.clientHeight / el.scrollHeight;
      return Math.max(28, Math.min(el.clientHeight * ratio, el.clientHeight - 20));
    };

    const onDown = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const isOnScrollbar = e.clientX >= rect.right - SCROLLBAR_W && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!isOnScrollbar || el.scrollHeight <= el.clientHeight) return;
      const thumbH = getThumbHeight();
      const scrollRatio = el.scrollTop / (el.scrollHeight - el.clientHeight);
      const thumbTop = rect.top + scrollRatio * (rect.height - thumbH);
      const thumbBottom = thumbTop + thumbH;
      const clickedOnThumb = e.clientY >= thumbTop && e.clientY <= thumbBottom;
      if (!clickedOnThumb) return;
      dragging = true;
      trackTop = rect.top;
      trackHeight = rect.height;
      thumbHeight = thumbH;
      maxScroll = el.scrollHeight - el.clientHeight;
      (e as unknown as { preventDefault: () => void }).preventDefault?.();
      document.body.style.userSelect = "none";
    };

    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const thumbH = thumbHeight;
      const trackH = trackHeight;
      const maxThumbTop = trackH - thumbH;
      if (maxThumbTop <= 0) return;
      let thumbTopDesired = e.clientY - trackTop - thumbH / 2;
      thumbTopDesired = Math.max(0, Math.min(maxThumbTop, thumbTopDesired));
      const scrollRatio = thumbTopDesired / maxThumbTop;
      const nextTop = scrollRatio * maxScroll;
      el.scrollTop = nextTop;
      const thumbTopNow = trackTop + scrollRatio * maxThumbTop;
      const thumbMiddleNow = thumbTopNow + thumbH / 2;
      const beyondTop = e.clientY < trackTop;
      const beyondBottom = e.clientY > trackTop + trackH;
      if (beyondTop || beyondBottom) {
        const distToMiddle = Math.abs(e.clientY - thumbMiddleNow);
        if (distToMiddle > thumbH / 2) return;
      }
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = "";
    };

    el.addEventListener("mousedown", onDown, true);
    window.addEventListener("mousemove", onMove, true);
    window.addEventListener("mouseup", onUp, true);
    return () => {
      el.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("mousemove", onMove, true);
      window.removeEventListener("mouseup", onUp, true);
    };
  }, []);

  const handleInsertAtCursor = useCallback((text: string) => {
    const view = editorView;
    if (!view) return;
    const sel = view.state.selection.main;
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert: `\n\n${text}` },
      selection: { anchor: sel.from + text.length + 2 },
    });
    view.focus();
  }, [editorView]);

  const [renderedRightPane, setRenderedRightPane] = useState<string | null>(activeRightPane);


  useEffect(() => {
    if (activeRightPane) {
      setRenderedRightPane(activeRightPane);
    } else {
      const timer = setTimeout(() => {
        setRenderedRightPane(null);
      }, 260);
      return () => clearTimeout(timer);
    }
  }, [activeRightPane]);

  const isSidebarVisible = isSidebarOpen && !isZenMode;
  const effectiveSidebarWidth = isSidebarVisible ? sidebarWidth : 0;

  return (
    <Box
      className="app-workspace"
      sx={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: 'none',
        position: 'relative',
      }}
    >
      <Paper
        id="sidebar-container"
        className="sidebar"
        elevation={0}
        tabIndex={-1}
        sx={{
          width: effectiveSidebarWidth,
          minWidth: effectiveSidebarWidth,
          maxWidth: effectiveSidebarWidth,
          flexBasis: effectiveSidebarWidth,
          flexShrink: 0,
          flexGrow: 0,
          outline: 'none',
          m: 0,
          borderRadius: 0,
          border: 'none',
          boxShadow: 'none',
          bgcolor: 'background.paper',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: isSidebarVisible ? 'auto' : 'none',
          opacity: isSidebarVisible ? 1 : 0,
          transition: isDragging
            ? 'none'
            : 'width 240ms cubic-bezier(0.25, 1, 0.5, 1), min-width 240ms cubic-bezier(0.25, 1, 0.5, 1), max-width 240ms cubic-bezier(0.25, 1, 0.5, 1), opacity 180ms ease',
          willChange: 'width, opacity',
        }}
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && target.tagName !== "SELECT" &&
            target.tagName !== "BUTTON" && !target.closest("button") && !target.closest("input") &&
            !target.closest("textarea") && !target.closest("select") && target.contentEditable !== "true") {
            e.currentTarget.focus();
          }
        }}
      >
        <Box className="sidebar-content" sx={{ width: '100%', height: '100%', overflow: 'auto' }}>
          <ErrorBoundary name="sidebar">
            <SidebarViews activeTab={activeTab} />
          </ErrorBoundary>
        </Box>
      </Paper>
      {isSidebarVisible && (
        <Box
          className="sidebar-resizer"
          onMouseDown={() => setIsDragging(true)}
          sx={{
            width: 4,
            cursor: 'col-resize',
            flexShrink: 0,
            my: 1,
            borderRadius: '2px',
            '&:hover': { bgcolor: 'primary.main', opacity: 0.5 },
            transition: 'background-color var(--duration-fast)',
          }}
        />
      )}

      <Box
        className="editor-container"
        sx={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          bgcolor: 'background.default',
          borderTopLeftRadius: isZenMode ? 0 : '12px',
          borderBottomLeftRadius: isZenMode ? 0 : '12px',
          borderTopRightRadius: isZenMode ? 0 : '12px',
          borderBottomRightRadius: isZenMode ? 0 : '12px',
          transition: 'border-radius 240ms cubic-bezier(0.25, 1, 0.5, 1)',
        }}
      >



        {hasNoScripts ? (
          <Box
            id="landing-pad"
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              userSelect: 'none',
              p: 3,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2.5,
                maxWidth: 480,
                width: '100%',
              }}
            >
              {/* Header */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    color: 'text.primary',
                    mb: 0.25,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ThemeLogo variant="solid" />
                </Box>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: '1.15rem',
                    color: 'text.primary',
                    letterSpacing: '-0.015em',
                  }}
                >
                  ActOne Screenplay
                </Typography>
                <Typography
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.815rem',
                    mt: 0.5,
                  }}
                >
                  Create or import documents for this project
                </Typography>
              </Box>

              {/* Native Action Panel */}
              <Box
                sx={{
                  width: '100%',
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                  p: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.75,
                }}
              >
                {/* Row 1: Screenplay */}
                <Box
                  component="button"
                  type="button"
                  onClick={() => addScript(undefined, "fountain")}
                  sx={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'transparent',
                    borderRadius: '8px',
                    bgcolor: 'transparent',
                    color: 'text.primary',
                    cursor: 'pointer',
                    textAlign: 'left',
                    font: 'inherit',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderColor: 'divider',
                      transform: 'translateY(-1px)',
                    },
                    '&:active': {
                      transform: 'scale(0.99)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', p: 1, borderRadius: '8px', bgcolor: (t) => alpha(t.palette.primary.main, 0.1) }}>
                      <DescriptionIcon sx={{ fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: 'text.primary', lineHeight: 1.3 }}>
                        New Screenplay
                      </Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: '0.76rem', lineHeight: 1.3, mt: 0.25 }}>
                        Fountain format with automatic screenplay pagination
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      px: 1,
                      py: 0.35,
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontFamily: '"Courier Prime", monospace',
                      fontWeight: 600,
                      color: 'text.secondary',
                      bgcolor: 'action.hover',
                      border: '1px solid',
                      borderColor: 'divider',
                      lineHeight: 1.3,
                      letterSpacing: '0.02em',
                      flexShrink: 0,
                    }}
                  >
                    .fountain
                  </Box>
                </Box>

                {/* Row 2: Prose */}
                <Box
                  component="button"
                  type="button"
                  onClick={() => addScript(undefined, "markdown")}
                  sx={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'transparent',
                    borderRadius: '8px',
                    bgcolor: 'transparent',
                    color: 'text.primary',
                    cursor: 'pointer',
                    textAlign: 'left',
                    font: 'inherit',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderColor: 'divider',
                      transform: 'translateY(-1px)',
                    },
                    '&:active': {
                      transform: 'scale(0.99)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', p: 1, borderRadius: '8px', bgcolor: (t) => alpha(t.palette.primary.main, 0.1) }}>
                      <MenuBookIcon sx={{ fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: 'text.primary', lineHeight: 1.3 }}>
                        New Prose Document
                      </Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: '0.76rem', lineHeight: 1.3, mt: 0.25 }}>
                        Markdown format for treatments, chapters, and notes
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      px: 1,
                      py: 0.35,
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontFamily: '"Courier Prime", monospace',
                      fontWeight: 600,
                      color: 'text.secondary',
                      bgcolor: 'action.hover',
                      border: '1px solid',
                      borderColor: 'divider',
                      lineHeight: 1.3,
                      letterSpacing: '0.02em',
                      flexShrink: 0,
                    }}
                  >
                    .md
                  </Box>
                </Box>

                {/* Row 3: Import / Template */}
                <Box
                  component="button"
                  type="button"
                  onClick={(e) => setImportAnchorEl(e.currentTarget)}
                  sx={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'transparent',
                    borderRadius: '8px',
                    bgcolor: 'transparent',
                    color: 'text.primary',
                    cursor: 'pointer',
                    textAlign: 'left',
                    font: 'inherit',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderColor: 'divider',
                      transform: 'translateY(-1px)',
                    },
                    '&:active': {
                      transform: 'scale(0.99)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', p: 1, borderRadius: '8px', bgcolor: (t) => alpha(t.palette.primary.main, 0.1) }}>
                      <UploadIcon sx={{ fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: 'text.primary', lineHeight: 1.3 }}>
                        Import or Structure Template...
                      </Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: '0.76rem', lineHeight: 1.3, mt: 0.25 }}>
                        Import .fountain, .fdx, .fadein, .md, or structure template
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      px: 1,
                      py: 0.35,
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: 'text.secondary',
                      bgcolor: 'action.hover',
                      border: '1px solid',
                      borderColor: 'divider',
                      lineHeight: 1.3,
                      letterSpacing: '0.02em',
                      flexShrink: 0,
                    }}
                  >
                    Import
                  </Box>
                </Box>
              </Box>

              {/* Menu for Import / Template */}
              <Menu
                anchorEl={importAnchorEl}
                open={Boolean(importAnchorEl)}
                onClose={() => setImportAnchorEl(null)}
                slotProps={{
                  paper: {
                    sx: {
                      borderRadius: '10px',
                      border: '1px solid',
                      borderColor: 'divider',
                      p: 0.5,
                      minWidth: 260,
                    }
                  }
                }}
              >
                <MenuItem
                  onClick={() => {
                    setImportAnchorEl(null);
                    importScript("fountain");
                  }}
                  sx={{ fontSize: '0.8rem', py: 0.75, borderRadius: '6px' }}
                >
                  Import Screenplay (.fountain, .fdx, .fadein)
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setImportAnchorEl(null);
                    importScript("markdown");
                  }}
                  sx={{ fontSize: '0.8rem', py: 0.75, borderRadius: '6px' }}
                >
                  Import Prose (.md)
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem
                  onClick={() => {
                    setImportAnchorEl(null);
                    setShowStructureModal(true);
                  }}
                  sx={{ fontSize: '0.8rem', py: 0.75, borderRadius: '6px' }}
                >
                  Screenplay Structure Template...
                </MenuItem>
              </Menu>
            </Box>
            {showStructureModal && <StructureImportModal onClose={() => setShowStructureModal(false)} />}
          </Box>
        ) : (
          <Box
            id="editor-workspace"
            className={`editor-scroll-area ${typewriterMode ? 'typewriter-active' : ''}`}
            sx={{ flex: 1, overflow: 'auto' }}
            onMouseDown={(e) => {
              const target = e.target as HTMLElement;
              if (target.id === "editor-workspace" || target.classList.contains("editor-paper")) {
                e.preventDefault();
                editorView?.focus();
              }
            }}
          >
            <Box
              className={`editor-paper paper-${paperSize}`}
              sx={{
                zoom: zoomLevel / 100,
                transition: 'zoom var(--duration-slow) var(--easing-standard)',
              }}
            >
              {isMarkdown ? (
                <ErrorBoundary name="prose-editor"><ProseEditor /></ErrorBoundary>
              ) : (
                <ErrorBoundary name="editor"><ScriptEditor /></ErrorBoundary>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {renderedRightPane === "search" && (
        <RightPane
          type="search"
          isOpen={activeRightPane === "search"}
          onClose={() => setActiveRightPane(null)}
          errorBoundaryName="search-pane"
        >
          <SearchPanel />
        </RightPane>
      )}

      {renderedRightPane === "prompt" && (
        <RightPane
          type="prompt"
          isOpen={activeRightPane === "prompt"}
          onClose={() => setActiveRightPane(null)}
          errorBoundaryName="prompt-pane"
          ariaLabel="Muse Go!"
        >
          <MusePanel onInsertAtCursor={handleInsertAtCursor} />
        </RightPane>
      )}
    </Box>
  );
});

