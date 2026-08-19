import React, { useState, useEffect, useCallback } from "react";
import { useUI, useEditor, useFile } from "../../context";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { SidebarViews } from "../SidebarViews";
import { SearchPanel } from "../SearchPanel";
import { RightPane } from "../RightPane";
import { ScriptEditor } from "../ScriptEditor";
import { ProseEditor } from "../ProseEditor";
import { AmbientPanel } from "../AmbientPanel";
import { MusePanel } from "../MusePanel";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { AddIcon } from "../Icons";


import { ErrorBoundary } from "../ErrorBoundary";
import { isProseScript } from "../../utils/scriptMode";

interface WorkspaceProps {
  isSidebarOpen: boolean;
}

export const Workspace = React.memo<WorkspaceProps>(({
  isSidebarOpen,
}) => {
  const [sidebarWidth, setSidebarWidth] = useState<number>(260);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const { paperSize, activeTab, zoomLevel, isZenMode, typewriterMode, activeRightPane, setActiveRightPane } = useUI();
  const { editorView } = useEditor();
  const { activeFileId, files, addScript } = useFile();

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

  return (
    <Box className="app-workspace" sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {isSidebarOpen && (
        <>
          <Paper
            id="sidebar-container"
            className="sidebar"
            elevation={0}
            tabIndex={-1}
            square
            sx={{
              width: isZenMode ? 0 : sidebarWidth, flexShrink: 0, outline: 'none',
              borderRight: isZenMode ? '0px solid' : '1px solid',
              borderColor: 'divider', overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              pointerEvents: isZenMode ? 'none' : 'auto',
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
            <Box className="sidebar-content" sx={{ flex: 1, overflow: 'auto' }}>
              <ErrorBoundary name="sidebar">
                <SidebarViews activeTab={activeTab} />
              </ErrorBoundary>
            </Box>
          </Paper>
          <Box
            className="sidebar-resizer"
            onMouseDown={() => setIsDragging(true)}
            sx={{
              width: isZenMode ? 0 : 4, cursor: 'col-resize', flexShrink: 0,
              pointerEvents: isZenMode ? 'none' : 'auto',
              '&:hover': { bgcolor: 'var(--button-color)', opacity: 0.3 },
              transition: 'background-color var(--duration-fast)',
            }}
          />
        </>
      )}

      <Box className="editor-container" sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {hasNoScripts ? (
          <Box
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
                gap: 2,
                maxWidth: 420,
                width: '100%',
                textAlign: 'center',
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, width: '100%' }}>
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: '1rem',
                    letterSpacing: '0.01em',
                    color: 'text.primary',
                    textAlign: 'center',
                  }}
                >
                  Act One, Scene One.
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.825rem',
                    lineHeight: 1.45,
                    textAlign: 'center',
                    maxWidth: 340,
                  }}
                >
                  Every screenplay starts here. Create your first script to begin writing.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                  onClick={() => addScript(undefined, "fountain")}
                  sx={{
                    borderRadius: '6px',
                    textTransform: 'none',
                    fontSize: '0.825rem',
                    fontWeight: 500,
                    pl: 1.75,
                    pr: 1.25,
                    py: 0.6,
                    borderColor: 'divider',
                    color: 'text.primary',
                    bgcolor: 'background.paper',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                    transition: 'all var(--duration-fast) var(--easing-standard)',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderColor: 'text.secondary',
                      '& .fountain-tag': {
                        borderColor: 'text.secondary',
                        bgcolor: 'action.selected',
                      },
                    },
                  }}
                >
                  <span>Create a new script</span>
                  <Box
                    component="span"
                    className="fountain-tag"
                    sx={{
                      ml: 0.75,
                      px: 0.75,
                      py: 0.15,
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontFamily: '"Courier Prime", monospace',
                      fontWeight: 600,
                      color: 'text.secondary',
                      bgcolor: 'action.hover',
                      border: '1px solid',
                      borderColor: 'divider',
                      lineHeight: 1.4,
                      letterSpacing: '0.02em',
                      transition: 'all var(--duration-fast) var(--easing-standard)',
                    }}
                  >
                    .fountain
                  </Box>
                </Button>

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                  onClick={() => addScript(undefined, "markdown")}
                  sx={{
                    borderRadius: '6px',
                    textTransform: 'none',
                    fontSize: '0.825rem',
                    fontWeight: 500,
                    pl: 1.75,
                    pr: 1.25,
                    py: 0.6,
                    borderColor: 'divider',
                    color: 'text.primary',
                    bgcolor: 'background.paper',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                    transition: 'all var(--duration-fast) var(--easing-standard)',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderColor: 'text.secondary',
                      '& .fountain-tag': {
                        borderColor: 'text.secondary',
                        bgcolor: 'action.selected',
                      },
                    },
                  }}
                >
                  <span>Create a new prose</span>
                  <Box
                    component="span"
                    className="fountain-tag"
                    sx={{
                      ml: 0.75,
                      px: 0.75,
                      py: 0.15,
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontFamily: '"Courier Prime", monospace',
                      fontWeight: 600,
                      color: 'text.secondary',
                      bgcolor: 'action.hover',
                      border: '1px solid',
                      borderColor: 'divider',
                      lineHeight: 1.4,
                      letterSpacing: '0.02em',
                      transition: 'all var(--duration-fast) var(--easing-standard)',
                    }}
                  >
                    .md
                  </Box>
                </Button>
              </Box>
            </Box>
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

      {activeRightPane === "search" && (
        <RightPane type="search" onClose={() => setActiveRightPane(null)} errorBoundaryName="search-pane">
          <SearchPanel />
        </RightPane>
      )}

      {activeRightPane === "ambient" && (
        <RightPane type="ambient" onClose={() => setActiveRightPane(null)} errorBoundaryName="ambient-pane" ariaLabel="Ambient Sounds">
          <AmbientPanel />
        </RightPane>
      )}

      {activeRightPane === "prompt" && (
        <RightPane type="prompt" onClose={() => setActiveRightPane(null)} errorBoundaryName="prompt-pane" ariaLabel="Muse">
          <MusePanel onInsertAtCursor={handleInsertAtCursor} />
        </RightPane>
      )}
    </Box>
  );
});
