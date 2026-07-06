import React, { useState, useEffect } from "react";
import { useUI, useEditor } from "../../context";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { SidebarViews } from "../SidebarViews";
import { SearchPanel } from "../SearchPanel";
import { RightPane } from "../RightPane";
import { FountainEditor } from "../FountainEditor";
import { AmbientPanel } from "../AmbientPanel";

import { ErrorBoundary } from "../ErrorBoundary";

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
              // Zen mode transition support with staggered delay (0.1s)
              opacity: isZenMode ? 0 : 1,
              pointerEvents: isZenMode ? 'none' : 'auto',
              transition: 'opacity 0.3s ease-in-out 0.1s, width 0.3s ease-in-out 0.1s, border-right 0.3s ease-in-out 0.1s',
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
              // Zen mode transition support with staggered delay (0.1s)
              opacity: isZenMode ? 0 : 1,
              pointerEvents: isZenMode ? 'none' : 'auto',
              '&:hover': { bgcolor: 'var(--button-color)', opacity: 0.3 },
              transition: 'background-color 0.2s, opacity 0.3s ease-in-out 0.1s, width 0.3s ease-in-out 0.1s',
            }}
          />
        </>
      )}

      <Box className="editor-container" sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
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
              transition: 'zoom 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <ErrorBoundary name="editor"><FountainEditor /></ErrorBoundary>
          </Box>
        </Box>
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
    </Box>
  );
});
