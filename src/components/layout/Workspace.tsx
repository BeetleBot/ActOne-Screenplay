import React, { useState, useEffect, useCallback } from "react";
import { useUI, useEditor, useFile } from "../../context";
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
import { AmbientPanel } from "../AmbientPanel";
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
  const [sidebarWidth, setSidebarWidth] = useState<number>(260);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [importAnchorEl, setImportAnchorEl] = useState<null | HTMLElement>(null);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const { paperSize, activeTab, zoomLevel, isZenMode, typewriterMode, activeRightPane, setActiveRightPane } = useUI();
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
                  borderRadius: 0,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  overflow: 'hidden',
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
                    p: 1.75,
                    border: 'none',
                    borderRadius: 0,
                    bgcolor: 'transparent',
                    color: 'text.primary',
                    cursor: 'pointer',
                    textAlign: 'left',
                    font: 'inherit',
                    transition: 'background-color var(--duration-fast) var(--easing-standard)',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
                      <DescriptionIcon sx={{ fontSize: 18 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 500, fontSize: '0.85rem', color: 'text.primary', lineHeight: 1.3 }}>
                        New Screenplay
                      </Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', lineHeight: 1.3, mt: 0.25 }}>
                        Fountain format with automatic screenplay pagination
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      px: 0.75,
                      py: 0.2,
                      borderRadius: 0,
                      fontSize: '0.7rem',
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

                <Divider />

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
                    p: 1.75,
                    border: 'none',
                    borderRadius: 0,
                    bgcolor: 'transparent',
                    color: 'text.primary',
                    cursor: 'pointer',
                    textAlign: 'left',
                    font: 'inherit',
                    transition: 'background-color var(--duration-fast) var(--easing-standard)',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
                      <MenuBookIcon sx={{ fontSize: 18 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 500, fontSize: '0.85rem', color: 'text.primary', lineHeight: 1.3 }}>
                        New Prose Document
                      </Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', lineHeight: 1.3, mt: 0.25 }}>
                        Markdown format for treatments, chapters, and notes
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      px: 0.75,
                      py: 0.2,
                      borderRadius: 0,
                      fontSize: '0.7rem',
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

                <Divider />

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
                    p: 1.75,
                    border: 'none',
                    borderRadius: 0,
                    bgcolor: 'transparent',
                    color: 'text.primary',
                    cursor: 'pointer',
                    textAlign: 'left',
                    font: 'inherit',
                    transition: 'background-color var(--duration-fast) var(--easing-standard)',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
                      <UploadIcon sx={{ fontSize: 18 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 500, fontSize: '0.85rem', color: 'text.primary', lineHeight: 1.3 }}>
                        Import or Structure Template...
                      </Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', lineHeight: 1.3, mt: 0.25 }}>
                        Import .fountain, .fdx, .fadein, .md, or structure template
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      px: 0.75,
                      py: 0.2,
                      borderRadius: 0,
                      fontSize: '0.7rem',
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
                      borderRadius: 0,
                      border: '1px solid',
                      borderColor: 'divider',
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
                  sx={{ fontSize: '0.8rem', py: 0.75, borderRadius: 0 }}
                >
                  Import Screenplay (.fountain, .fdx, .fadein)
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setImportAnchorEl(null);
                    importScript("markdown");
                  }}
                  sx={{ fontSize: '0.8rem', py: 0.75, borderRadius: 0 }}
                >
                  Import Prose (.md)
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem
                  onClick={() => {
                    setImportAnchorEl(null);
                    setShowStructureModal(true);
                  }}
                  sx={{ fontSize: '0.8rem', py: 0.75, borderRadius: 0 }}
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
