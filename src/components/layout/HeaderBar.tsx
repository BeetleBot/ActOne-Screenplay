import React, { useState, useEffect, useRef } from "react";
import { useFile, useUI } from "../../context";
import { getTauriWindow } from "../../utils";
import { alpha } from "@mui/material/styles";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
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
      const isClickable = target.closest(".clickable") || target.closest(".MuiMenuItem-root") || target.closest(".MuiMenu-root") || target.closest(".context-menu") || target.closest(".MuiBackdrop-root") || target.tagName === "LI";

      if (!isTab && !isIconButton && !isInput && !isClickable) {
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
        bgcolor: 'transparent',
        color: (theme) => theme.palette.text.secondary,
        borderBottom: 'none',
        height: isZenMode ? 0 : 46,
        minHeight: isZenMode ? 0 : 46,
        zIndex: 10,
        pointerEvents: isZenMode ? 'none' : 'auto',
        overflow: 'hidden',
      }}


    >
      <Box sx={{ display: 'flex', alignItems: 'center', height: 46, minHeight: 46, pl: 0, pr: '120px', position: 'relative' }}>
        {/* Tab Track */}
        <Box 
          ref={tabsContainerRef} 
          className="header-tabs-container" 
          sx={{ 
            flex: 1, 
            minWidth: 0, 
            display: 'flex', 
            alignItems: 'center', 
            overflow: 'hidden', 
            pl: 0, 
            pr: 0.5, 
            gap: 0.75,
          }}
        >

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
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  px: 1.75, 
                  height: 34, 
                  width: 'auto',
                  minWidth: 140, 
                  maxWidth: 220, 
                  borderRadius: '20px',
                  cursor: 'pointer', 
                  flexShrink: 0, 
                  userSelect: 'none',
                  fontSize: "0.82rem", 
                  fontFamily: 'var(--font-ui, "Inter", sans-serif)', 
                  whiteSpace: 'nowrap',
                  bgcolor: (theme) => isActive ? alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.12 : 0.08) : 'transparent',
                  color: (theme) => isActive ? theme.palette.text.primary : theme.palette.text.secondary,
                  border: 'none',
                  boxShadow: (theme) => isActive ? (theme.palette.mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.35)' : '0 2px 8px rgba(0, 0, 0, 0.06)') : 'none',
                  backdropFilter: isActive ? 'blur(8px)' : 'none',
                  '&:hover': {
                    bgcolor: (theme) => isActive ? alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.16 : 0.11) : alpha(theme.palette.text.primary, 0.06),
                    color: (theme) => isActive ? theme.palette.text.primary : theme.palette.text.primary,
                  },
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                {/* Active dot indicator */}
                {isActive && (
                  <Box 
                    sx={{ 
                      width: 6, 
                      height: 6, 
                      borderRadius: '50%', 
                      bgcolor: 'primary.main', 
                      flexShrink: 0,
                      boxShadow: (t) => `0 0 6px ${alpha(t.palette.primary.main, 0.6)}`,
                    }} 
                  />
                )}
                <span className="tab-name" style={{ fontFamily: 'var(--font-ui, "Inter", sans-serif)', fontWeight: isActive ? 600 : 500, letterSpacing: "0.005em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{display}</span>
                {file.isDirty && (
                  <Box 
                    sx={{ 
                      width: 6, height: 6, borderRadius: '50%', 
                      bgcolor: '#f59e0b', 
                      flexShrink: 0,
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
                    p: '3px', 
                    borderRadius: '50%',
                    opacity: 0.6, 
                    color: 'inherit',
                    '&:hover': { 
                      opacity: 1,
                      bgcolor: (t) => alpha(t.palette.error.main, 0.12),
                      color: 'error.main'
                    }, 
                    ml: 0.25 
                  }}
                >
                  <CloseIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Box>
            );
          })}
            <IconButton 
              size="small" 
              onClick={(e) => { e.stopPropagation(); newFile(); }} 
              onMouseDown={(e) => e.stopPropagation()}
              sx={{ 
                width: 32,
                height: 32,
                borderRadius: '50%',
                color: 'text.secondary',
                bgcolor: (t) => alpha(t.palette.text.primary, 0.05),
                border: 'none',
                '&:hover': { 
                  color: 'primary.main', 
                  bgcolor: (t) => alpha(t.palette.primary.main, 0.15),
                },
                transition: 'all 0.15s ease',
              }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
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

          {/* Window Controls */}
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.5,
              flexShrink: 0,
              position: 'absolute',
              right: 8,
              top: 0,
              height: '100%',
              bgcolor: 'inherit',
              zIndex: 11,
            }} 
            onMouseDown={(e) => e.stopPropagation()}
          >
            <IconButton
              onClick={handleMinimize}
              title="Minimize"
              size="small"
              sx={{
                width: 28, 
                height: 28, 
                borderRadius: '6px',
                color: 'text.secondary',
                '&:hover': { bgcolor: (t) => alpha(t.palette.text.primary, 0.08), color: 'text.primary' },
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </IconButton>
            <IconButton
              onClick={handleMaximize}
              title={isMaximized ? "Restore" : "Maximize"}
              size="small"
              sx={{
                width: 28, 
                height: 28, 
                borderRadius: '6px',
                color: 'text.secondary',
                '&:hover': { bgcolor: (t) => alpha(t.palette.text.primary, 0.08), color: 'text.primary' },
                transition: 'all 0.15s ease',
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
              size="small"
              sx={{
                width: 28, 
                height: 28, 
                borderRadius: '6px',
                color: 'text.secondary',
                '&:hover': { bgcolor: (theme) => alpha(theme.palette.error.main, 0.15), color: (theme) => theme.palette.error.main },
                transition: 'all 0.15s ease',
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
