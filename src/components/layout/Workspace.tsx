import React, { useState, useEffect } from "react";
import { useUI, useEditor } from "../../context";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { ActivityBar } from "./ActivityBar";
import { SidebarViews } from "../SidebarViews";
import { SearchPanel } from "../SearchPanel";
import { FountainEditor } from "../FountainEditor";

interface WorkspaceProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onOpenSettingsModal: () => void;
  onOpenPalette: () => void;
  onOpenBreakdownModal: () => void;
  onOpenThemeManagerModal: () => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({
  isSidebarOpen, setIsSidebarOpen, onOpenSettingsModal, onOpenPalette,
  onOpenBreakdownModal, onOpenThemeManagerModal,
}) => {
  const [sidebarWidth, setSidebarWidth] = useState<number>(260);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const { paperSize, activeTab, setActiveTab, zoomLevel, isZenMode, typewriterMode } = useUI();
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
      {!isZenMode && (
        <ActivityBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          onOpenSettingsModal={onOpenSettingsModal}
          onOpenPalette={onOpenPalette}
          onOpenBreakdownModal={onOpenBreakdownModal}
          onOpenThemeManagerModal={onOpenThemeManagerModal}
        />
      )}

      {isSidebarOpen && !isZenMode && (
        <>
          <Paper
            className="sidebar"
            elevation={0}
            tabIndex={-1}
            square
            sx={{
              width: sidebarWidth, flexShrink: 0, outline: 'none',
              borderRight: 1, borderColor: 'divider', overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
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
              <SidebarViews activeTab={activeTab} />
            </Box>
          </Paper>
          <Box
            className="sidebar-resizer"
            onMouseDown={() => setIsDragging(true)}
            sx={{
              width: 4, cursor: 'col-resize', flexShrink: 0,
              '&:hover': { bgcolor: 'var(--button-color)', opacity: 0.3 },
              transition: 'background-color 0.2s',
            }}
          />
        </>
      )}

      <Box className="editor-container" sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <SearchPanel />
        <Box className={`editor-scroll-area ${typewriterMode ? 'typewriter-active' : ''}`} sx={{ flex: 1, overflow: 'auto' }}>
          <Box className={`editor-paper paper-${paperSize}`} sx={{ zoom: zoomLevel / 100 }}>
            <FountainEditor />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
