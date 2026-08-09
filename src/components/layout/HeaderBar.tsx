import React, { useState, useEffect, useRef } from "react";
import { useFile, useUI } from "../../context";
import { getTauriWindow } from "../../utils";
import { alpha, darken } from "@mui/material/styles";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { CloseIcon, AddIcon } from "../Icons";
import { logger } from "../../utils/logger";
import { ContextMenu, type ContextMenuItem } from "../ContextMenu";

export const HeaderBar = React.memo(() => {
  const { files, activeFileId, selectFile, newFile, closeFile, closeOthers, closeAll } = useFile();
  const { isZenMode } = useUI();
  const [isMaximized, setIsMaximized] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; fileId: string } | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent, fileId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, fileId });
  };

  useEffect(() => {
    const checkMaximized = async () => {
      const win = getTauriWindow();
      if (win) setIsMaximized(await win.isMaximized());
    };
    checkMaximized();

    let unlisten: (() => void) | undefined;
    const setupListener = async () => {
      const win = getTauriWindow();
      if (win) unlisten = await win.onResized(() => checkMaximized());
    };
    setupListener();
    return () => { if (unlisten) unlisten(); };
  }, []);

  useEffect(() => {
    const activeTab = tabsContainerRef.current?.querySelector(".header-tab.active");
    if (activeTab) activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeFileId]);

  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  const handleClose = () => { try { getTauriWindow()?.close(); } catch (e) { logger.error("header", String(e)); } };
  const handleMinimize = () => { try { getTauriWindow()?.minimize(); } catch (e) { logger.error("header", String(e)); } };
  const handleMaximize = async () => {
    try {
      const win = getTauriWindow();
      if (win) {
        if (await win.isMaximized()) { await win.unmaximize(); setIsMaximized(false); }
        else { await win.maximize(); setIsMaximized(true); }
      }
    } catch (e) { logger.error("header", String(e)); }
  };

  const lastClickTimeRef = useRef<number>(0);
  const handleStartDrag = async (e: React.MouseEvent) => {
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      const isTab = target.closest(".header-tab");
      const isIconButton = target.closest("button") || target.tagName === "BUTTON";
      const isInput = target.closest("input") || target.tagName === "INPUT";
      const isMenuItem = target.closest(".MuiMenuItem-root") || target.closest(".MuiMenu-root") || target.closest(".context-menu") || target.closest(".MuiBackdrop-root") || target.tagName === "LI";

      if (!isTab && !isIconButton && !isInput && !isMenuItem) {
        const now = Date.now();
        if (now - lastClickTimeRef.current < 400) { handleMaximize(); lastClickTimeRef.current = 0; return; }
        lastClickTimeRef.current = now;
        try { const win = getTauriWindow(); if (win) await win.startDragging(); } catch (e) { logger.error("header", String(e)); }
      }
    }
  };



  return (
    <AppBar
      id="header-bar"
      position="static"
      elevation={0}
      onMouseDown={handleStartDrag}
      sx={{
        bgcolor: (theme) => theme.palette.mode === 'light' ? darken(theme.palette.background.paper, 0.08) : darken(theme.palette.background.paper, 0.25),
        color: (theme) => theme.palette.text.secondary,
        borderBottom: isZenMode ? 0 : 1,
        borderColor: "divider",
        height: isZenMode ? 0 : 40,
        minHeight: isZenMode ? 0 : 40,
        zIndex: 10,
        pointerEvents: isZenMode ? 'none' : 'auto',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', height: 40, minHeight: 40, px: 0, position: 'relative', pr: '140px' }}>
        <Box ref={tabsContainerRef} className="header-tabs-container" sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', overflow: 'hidden', px: 0, gap: 0 }}>

          {files.map((file) => {
            const display = file.filePath ? file.filePath.split(/[/\\]/).pop() : "Untitled";
            const isActive = file.id === activeFileId;
            return (
              <Box
                key={file.id}
                className={`header-tab ${isActive ? "active" : ""} ${file.isDirty ? "dirty" : ""}`}
                onClick={() => selectFile(file.id)}
                onContextMenu={(e) => handleContextMenu(e, file.id)}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (e.button === 1) { e.preventDefault(); closeFile(file.id); }
                }}
                onMouseUp={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                onAuxClick={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.8,
                  px: 1.5, height: 40, width: 175, minWidth: 175, maxWidth: 175, borderRadius: 0,
                  cursor: 'pointer', flexShrink: 0, userSelect: 'none',
                  fontSize: "0.8rem", fontFamily: 'var(--font-ui, "Inter", sans-serif)', whiteSpace: 'nowrap',
                  bgcolor: (theme) => isActive ? theme.palette.background.paper : 'transparent',
                  color: (theme) => isActive ? theme.palette.text.primary : theme.palette.text.secondary,
                  borderRight: 1,
                  borderColor: 'divider',
                  '&:hover': {
                    bgcolor: (theme) => isActive ? theme.palette.background.paper : alpha(theme.palette.text.primary, 0.04),
                    color: (theme) => isActive ? theme.palette.text.primary : theme.palette.text.primary
                  },
                  transition: 'all var(--duration-fast) ease',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: isActive ? 2 : 0,
                    bgcolor: 'primary.main',
                    transition: 'height var(--duration-fast) ease',
                  },
                }}
              >
                <span className="tab-name" style={{ fontFamily: 'var(--font-ui, "Inter", sans-serif)', fontWeight: isActive ? 700 : 500, letterSpacing: "0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{display}</span>
                {file.isDirty && (
                  <Box 
                    sx={{ 
                      width: 5, height: 5, borderRadius: '50%', 
                      bgcolor: (theme) => isActive ? theme.palette.primary.main : theme.palette.text.secondary, 
                      flexShrink: 0,
                      boxShadow: (theme) => isActive ? `0 0 4px ${alpha(theme.palette.primary.main, 0.4)}` : 'none'
                    }} 
                  />
                )}
                <IconButton
                  size="small"
                  className="tab-close"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    closeFile(file.id);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  sx={{ 
                    p: '1px', 
                    opacity: 0.6, 
                    color: 'inherit',
                    '&:hover': { 
                      opacity: 1,
                      bgcolor: 'action.hover',
                      color: 'error.main'
                    }, 
                    ml: 0.5 
                  }}
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            );
          })}
          <Tooltip title="New File">
            <IconButton 
              size="small" 
              onClick={(e) => { e.stopPropagation(); newFile(); }} 
              onMouseDown={(e) => e.stopPropagation()}
              sx={{ 
                p: '4px', 
                ml: 0.5,
                color: 'text.secondary',
                '&:hover': { color: 'text.primary', bgcolor: 'action.hover' }
              }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
        <ContextMenu
          open={contextMenu !== null}
          x={contextMenu?.x ?? 0}
          y={contextMenu?.y ?? 0}
          items={contextMenu ? [
            { label: "Close", action: () => closeFile(contextMenu.fileId) },
            { label: "Close Others", action: () => closeOthers(contextMenu.fileId) },
            { label: "Close All", action: closeAll },
          ] satisfies ContextMenuItem[] : []}
          onClose={() => setContextMenu(null)}
        />

        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            flexShrink: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            height: '100%',
            bgcolor: 'inherit',
            zIndex: 11,
            borderLeft: 1,
            borderColor: 'divider',
          }} 
          onMouseDown={(e) => e.stopPropagation()}
        >
          <IconButton
            onClick={handleMinimize}
            title="Minimize"
            sx={{
              width: 48, height: 40, borderRadius: 0,
              color: 'inherit',
              borderLeft: 1,
              borderColor: 'divider',
              '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </IconButton>
          <IconButton
            onClick={handleMaximize}
            title={isMaximized ? "Restore" : "Maximize"}
            sx={{
              width: 46, height: 40, borderRadius: 0,
              color: 'inherit',
              borderLeft: 1,
              borderColor: 'divider',
              '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
            }}
          >
            {isMaximized ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4 2H10V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 4H8V10H2V4Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1.5" y="1.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            )}
          </IconButton>
          <IconButton
            onClick={handleClose}
            title="Close"
            sx={{
              width: 46, height: 40, borderRadius: 0,
              color: 'inherit',
              borderLeft: 1,
              borderColor: 'divider',
              '&:hover': { bgcolor: (theme) => theme.palette.error.main, color: (theme) => theme.palette.common.white },
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </IconButton>
        </Box>
      </Box>

    </AppBar>
  );
});
