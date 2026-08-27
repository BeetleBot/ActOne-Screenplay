import React, { useState, useEffect } from "react";
import { Box, Paper, IconButton } from "@mui/material";
import { useUI } from "../context";
import { CloseIcon } from "./Icons";
import { ErrorBoundary } from "./ErrorBoundary";

interface RightPaneProps {
  type: string;
  isOpen?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  errorBoundaryName?: string;
  ariaLabel?: string;
}

export const RightPane: React.FC<RightPaneProps> = ({
  type,
  isOpen = true,
  onClose,
  children,
  errorBoundaryName = "right-pane",
  ariaLabel = "Find and Replace",
}) => {
  const { rightPaneWidth, setRightPaneWidth } = useUI();
  const [isDragging, setIsDragging] = useState(false);
  const effectiveWidth = isOpen ? rightPaneWidth : 0;

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const newWidth = Math.max(240, Math.min(700, window.innerWidth - e.clientX));
      setRightPaneWidth(newWidth);
    };
    const handleUp = () => {
      setIsDragging(false);
      document.body.style.cursor = "default";
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    document.body.style.cursor = "col-resize";
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging, setRightPaneWidth]);

  return (
    <>
      <Box
        className="right-pane-resizer"
        onMouseDown={() => setIsDragging(true)}
        sx={{
          width: isOpen ? 4 : 0,
          cursor: "col-resize",
          flexShrink: 0,
          my: 1,
          borderRadius: '2px',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          "&:hover": { bgcolor: "primary.main", opacity: 0.5 },
          transition: isDragging
            ? 'none'
            : 'width 240ms cubic-bezier(0.25, 1, 0.5, 1), opacity 180ms ease',
        }}
      />
      <Paper
        className="right-pane"
        elevation={0}
        data-pane-type={type}
        aria-label={ariaLabel}
        sx={{
          width: effectiveWidth,
          minWidth: effectiveWidth,
          maxWidth: effectiveWidth,
          flexBasis: effectiveWidth,
          flexShrink: 0,
          flexGrow: 0,
          m: 0,
          borderRadius: 0,
          border: "none",
          boxShadow: "none",
          bgcolor: 'background.paper',
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          pointerEvents: isOpen ? 'auto' : 'none',
          opacity: isOpen ? 1 : 0,
          transition: isDragging
            ? "none"
            : "width 240ms cubic-bezier(0.25, 1, 0.5, 1), min-width 240ms cubic-bezier(0.25, 1, 0.5, 1), max-width 240ms cubic-bezier(0.25, 1, 0.5, 1), opacity 180ms ease",
          willChange: "width, opacity",
        }}
      >
        <IconButton
          size="small"
          aria-label="Close pane"
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 6,
            right: 6,
            zIndex: 2,
            opacity: 0.6,
            borderRadius: '6px',
            "&:hover": { opacity: 1 },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <ErrorBoundary name={errorBoundaryName}>
          <Box sx={{ width: "100%", height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {children}
          </Box>
        </ErrorBoundary>
      </Paper>
    </>
  );
};


