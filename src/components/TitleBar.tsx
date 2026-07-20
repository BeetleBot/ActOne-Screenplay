import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { getTauriWindow } from "../utils";
import { DownloadIcon } from "./Icons";

interface TitleBarProps {
  title: string;
  onClose: () => void;
  icon?: React.ReactNode;
  updateAvailable?: boolean;
  installUpdate?: () => void;
  isModal?: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({ 
  title, 
  onClose, 
  icon,
  updateAvailable = false,
  installUpdate,
  isModal = false
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isResizable, setIsResizable] = useState(true);
  const lastClickTimeRef = useRef<number>(0);

  useEffect(() => {
    const win = getTauriWindow();
    if (!win) return;

    const checkWindow = async () => {
      try {
        setIsMaximized(await win.isMaximized());
        setIsResizable(await win.isResizable());
      } catch (e) {
        console.error("TitleBar window check failed", e);
      }
    };
    checkWindow();

    let unlisten: (() => void) | undefined;
    const setupListener = async () => {
      try {
        unlisten = await win.onResized(() => checkWindow());
      } catch (e) {
        console.error("TitleBar resize listener setup failed", e);
      }
    };
    setupListener();
    return () => { if (unlisten) unlisten(); };
  }, []);

  const handleMinimize = () => {
    try {
      getTauriWindow()?.minimize();
    } catch (e) {
      console.error("TitleBar minimize failed", e);
    }
  };

  const handleMaximize = async () => {
    try {
      const win = getTauriWindow();
      if (win && isResizable) {
        if (await win.isMaximized()) {
          await win.unmaximize();
          setIsMaximized(false);
        } else {
          await win.maximize();
          setIsMaximized(true);
        }
      }
    } catch (e) {
      console.error("TitleBar maximize failed", e);
    }
  };

  const handleStartDrag = async (e: React.MouseEvent) => {
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      // Do not drag if clicking any button or child of a button
      const isIconButton = target.closest("button") || target.tagName === "BUTTON" || target.closest("[role='button']");
      if (!isIconButton) {
        const now = Date.now();
        if (now - lastClickTimeRef.current < 400 && isResizable) {
          handleMaximize();
          lastClickTimeRef.current = 0;
          return;
        }
        lastClickTimeRef.current = now;
        try {
          const win = getTauriWindow();
          if (win) await win.startDragging();
        } catch (e) {
          console.error("TitleBar startDragging failed", e);
        }
      }
    }
  };

  // Calculate right padding based on controls layout
  const controlsWidth = (isResizable && !isModal ? 140 : (isModal ? 46 : 94)) + (updateAvailable && installUpdate ? 80 : 0);

  return (
    <Box
      onMouseDown={handleStartDrag}
      sx={{
        height: 40,
        display: "flex",
        alignItems: "center",
        px: 0,
        justifyContent: "space-between",
        userSelect: "none",
        flexShrink: 0,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        borderTopLeftRadius: 'inherit',
        borderTopRightRadius: 'inherit',
        position: 'relative',
        pr: `${controlsWidth}px`,
        cursor: "default",
      }}
    >
      <Box 
        sx={{ 
          display: "flex", 
          alignItems: "center", 
          height: "100%", 
          gap: 1.5, 
          borderTopLeftRadius: 'inherit' 
        }}
      >
        {icon && (
          <Box
            sx={{
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "primary.main",
              flexShrink: 0,
              borderTopLeftRadius: 'inherit',
              pl: 1.5,
            }}
          >
            {icon}
          </Box>
        )}
        <Typography 
          variant="caption" 
          sx={{ 
            fontWeight: 700, 
            fontSize: 11, 
            color: "text.secondary", 
            pl: icon ? 0.5 : 1.5 
          }}
        >
          {title.toUpperCase()}
        </Typography>
      </Box>

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
        {updateAvailable && installUpdate && (
          <Box
            onClick={(e) => { e.stopPropagation(); installUpdate(); }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Click to install update from Microsoft Store"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              height: 40,
              px: 2,
              cursor: 'pointer',
              bgcolor: (t) => alpha(t.palette.primary.main, 0.15),
              color: 'primary.main',
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              borderRight: 1,
              borderColor: 'divider',
              flexShrink: 0,
              transition: 'background-color 0.2s ease',
              '&:hover': {
                bgcolor: (t) => alpha(t.palette.primary.main, 0.25),
              },
            }}
          >
            <DownloadIcon sx={{ fontSize: 12 }} />
            Update
          </Box>
        )}

        {!isModal && (
          <IconButton
            onClick={handleMinimize}
            title="Minimize"
            sx={{
              width: 48, 
              height: 40, 
              borderRadius: 0,
              color: 'inherit',
              '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ pointerEvents: "none" }}>
              <path d="M2 6H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </IconButton>
        )}
        
        {!isModal && isResizable && (
          <IconButton
            onClick={handleMaximize}
            title={isMaximized ? "Restore" : "Maximize"}
            sx={{
              width: 46, 
              height: 40, 
              borderRadius: 0,
              color: 'inherit',
              borderLeft: 1,
              borderColor: 'divider',
              '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
            }}
          >
            {isMaximized ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ pointerEvents: "none" }}>
                <path d="M4 2H10V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 4H8V10H2V4Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ pointerEvents: "none" }}>
                <rect x="1.5" y="1.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            )}
          </IconButton>
        )}

        <IconButton
          onClick={onClose}
          title="Close"
          sx={{
            width: 46, 
            height: 40, 
            borderRadius: 0,
            color: 'inherit',
            borderLeft: 1,
            borderColor: 'divider',
            '&:hover': { bgcolor: (theme) => theme.palette.error.main, color: (theme) => theme.palette.common.white },
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ pointerEvents: "none" }}>
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </IconButton>
      </Box>
    </Box>
  );
};
