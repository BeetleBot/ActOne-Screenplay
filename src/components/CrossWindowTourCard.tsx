import React, { useState, useEffect } from "react";
import { Card, CardContent, Typography, Box, IconButton, LinearProgress, Button } from "@mui/material";
import { CloseIcon } from "./Icons";
import { alpha } from "@mui/material/styles";
import type { TourStep } from "../types/tour";

interface CrossWindowTourCardProps {
  step: TourStep;
  tourName: string;
  progress: number;
  taskComplete: boolean;
  isLastStep: boolean;
  stepNumber: number;
  totalSteps: number;
  onNext: () => void;
  onBack?: () => void;
  onCancel: () => void;
}

export const CrossWindowTourCard: React.FC<CrossWindowTourCardProps> = ({
  step,
  tourName,
  progress,
  taskComplete,
  isLastStep,
  stepNumber,
  totalSteps,
  onNext,
  onBack,
  onCancel,
}) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [sidebarRect, setSidebarRect] = useState<DOMRect | null>(null);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setDragPosition(null);
    setDragOffset(null);
  }, [step]);

  useEffect(() => {
    if (!step?.targetId) {
      setTargetRect(null);
      setSidebarRect(null);
      setMenuRect(null);
      return;
    }

    const updateBounds = () => {
      const element = document.getElementById(step.targetId!);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      }
      const sidebar = document.getElementById("sidebar-container");
      if (sidebar && sidebar.offsetWidth > 0) {
        setSidebarRect(sidebar.getBoundingClientRect());
      } else {
        setSidebarRect(null);
      }
      const menuEl = Array.from(document.querySelectorAll<HTMLElement>(".MuiMenu-paper"))
        .find((el) => el.textContent && el.textContent.includes("Quick Settings"));
      if (menuEl && menuEl.offsetWidth > 0) {
        setMenuRect(menuEl.getBoundingClientRect());
      } else {
        setMenuRect(null);
      }
    };

    updateBounds();
    window.addEventListener("resize", updateBounds);
    const interval = setInterval(updateBounds, 500);
    return () => {
      window.removeEventListener("resize", updateBounds);
      clearInterval(interval);
    };
  }, [step]);

  useEffect(() => {
    if (!dragOffset) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setDragOffset(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragOffset]);

  const cardStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 999999,
    width: step.cardWidth ?? 320,
    transition: dragOffset ? "transform 0.15s ease-out" : "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  const isSidebarTarget = step.targetId === "activity-bar" ||
    step.targetId?.startsWith("activity-tab-") ||
    step.targetId === "command-palette-btn" ||
    step.targetId === "quick-settings";

  const isStatusTarget = step.targetId === "status-bar" ||
    step.targetId?.startsWith("status-");

  if (dragPosition) {
    cardStyle.left = dragPosition.x;
    cardStyle.top = dragPosition.y;
    cardStyle.transform = "scale(1.025)";
  } else if (targetRect) {
    if (isSidebarTarget) {
      if (step.targetId === "quick-settings" && menuRect) {
        cardStyle.left = menuRect.right + 16;
      } else if (sidebarRect && step.targetId?.startsWith("activity-tab-")) {
        cardStyle.left = sidebarRect.right + 16;
      } else {
        cardStyle.left = targetRect.right + 16;
      }
      const estimatedCardHeight = 320;
      const maxAllowedTop = window.innerHeight - estimatedCardHeight - 16;
      cardStyle.top = Math.max(16, Math.min(targetRect.top, maxAllowedTop));
    } else if (isStatusTarget) {
      cardStyle.bottom = (window.innerHeight - targetRect.top) + 8;
      if (step.targetId === "status-file-name") {
        cardStyle.left = Math.max(16, targetRect.left + (targetRect.width / 2) - 160 + 300);
      } else {
        cardStyle.left = Math.max(16, targetRect.left + (targetRect.width / 2) - 160);
      }
    } else if (step.targetId === "header-bar") {
      cardStyle.left = Math.max(16, targetRect.left + (targetRect.width / 2) - 160);
      cardStyle.top = targetRect.bottom + 16;
    } else {
      if (step.title.includes("Transitions")) {
        cardStyle.left = 32;
        cardStyle.top = "50%";
        cardStyle.transform = "translateY(-50%)";
      } else {
        cardStyle.right = 32;
        cardStyle.top = "50%";
        cardStyle.transform = "translateY(-50%)";
      }
    }
  } else {
    if (step.cardPosition === "left") {
      cardStyle.left = 32;
      cardStyle.top = "50%";
      cardStyle.transform = "translateY(-50%)";
    } else if (step.cardPosition === "right") {
      cardStyle.right = 32;
      cardStyle.top = "50%";
      cardStyle.transform = "translateY(-50%)";
    } else {
      cardStyle.left = "50%";
      cardStyle.top = "50%";
      cardStyle.transform = "translate(-50%, -50%)";
    }
  }

  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 999990, pointerEvents: "none" }}>
      {!step.noMask && (
        <svg
          style={{
            position: "fixed",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.x - 6}
                  y={targetRect.y - 6}
                  width={targetRect.width + 12}
                  height={targetRect.height + 12}
                  rx={6}
                  fill="black"
                />
              )}
              {sidebarRect && step.targetId?.startsWith("activity-tab-") && !step.noAutoClick && (
                <rect
                  x={sidebarRect.x}
                  y={sidebarRect.y}
                  width={sidebarRect.width}
                  height={sidebarRect.height}
                  fill="black"
                />
              )}
              {menuRect && step.targetId === "quick-settings" && (
                <rect
                  x={menuRect.x}
                  y={menuRect.y}
                  width={menuRect.width}
                  height={menuRect.height}
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.45)"
            mask="url(#tour-mask)"
          />
        </svg>
      )}

      <Card
        className="tour-card"
        elevation={dragOffset ? 16 : 8}
        style={cardStyle}
        sx={{
          pointerEvents: "auto",
          borderRadius: 0,
          border: "1px solid",
          borderColor: "primary.main",
          background: (theme) => theme.palette.background.paper,
        }}
      >
        <LinearProgress variant="determinate" value={progress} sx={{ height: 3, borderRadius: 0 }} />
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          <Box
            onMouseDown={(e) => {
              if ((e.target as HTMLElement).closest("button")) return;
              e.preventDefault();
              const cardEl = e.currentTarget.closest(".tour-card") as HTMLElement;
              if (cardEl) {
                const rect = cardEl.getBoundingClientRect();
                setDragOffset({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                });
              }
            }}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              px: 2.5,
              py: 1.25,
              cursor: dragOffset ? "grabbing" : "grab",
              userSelect: "none",
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "primary.main" }}>
              {tourName}
            </Typography>
            <IconButton size="small" onClick={onCancel} sx={{ p: 0, color: "text.secondary" }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          <Box sx={{ px: 2.5, py: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 15, mb: 1, lineHeight: 1.25 }}>
              {step.title}
            </Typography>

            <Typography variant="body2" sx={{ color: "text.secondary", fontSize: 12.5, lineHeight: 1.45, mb: step.taskInstructions ? 2 : 0 }}>
              {step.description}
            </Typography>

            {step.taskInstructions && (
              <Box
                sx={{
                  bgcolor: "background.default",
                  border: "1px solid",
                  borderColor: (t) => taskComplete ? alpha(t.palette.success.main, 0.4) : alpha(t.palette.primary.main, 0.4),
                  px: 2,
                  py: 1.5,
                  borderRadius: 0,
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 800, color: taskComplete ? "success.main" : "primary.main", display: "block", mb: 0.5, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  {taskComplete ? "Task Complete!" : "Task Instruction:"}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, whiteSpace: "pre-line", color: "text.primary" }}>
                  {step.taskInstructions}
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2.5, py: 1.25, borderTop: "1px solid", borderColor: "divider" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
              Step {stepNumber} of {totalSteps}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              {onBack && (
                <Button variant="outlined" size="small" onClick={onBack} sx={{ borderRadius: 0, fontSize: 11, textTransform: "none", py: 0.5, px: 1.25, minWidth: 0 }}>
                  Back
                </Button>
              )}
              <Button
                variant="contained"
                size="small"
                disabled={!taskComplete}
                onClick={onNext}
                sx={{
                  borderRadius: 0,
                  fontSize: 11,
                  textTransform: "none",
                  py: 0.4,
                  px: 1.5,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  lineHeight: 1.2,
                  minWidth: 80,
                }}
              >
                <span>{isLastStep ? "Finish" : (step.nextLabel ?? "Next")}</span>
                <Typography component="span" variant="caption" sx={{ fontSize: 9, opacity: 0.7, lineHeight: 1 }}>
                  +Enter
                </Typography>
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
