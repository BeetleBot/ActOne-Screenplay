import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  LinearProgress,
} from "@mui/material";
import { CloseIcon, AutoAwesomeIcon } from "./Icons";
import { useEditor } from "../context";
import { alpha } from "@mui/material/styles";

interface OnboardingTourProps {
  activeTour: "ui" | "fountain" | null;
  onCloseTour: () => void;
}

interface TourStep {
  targetId?: string;
  title: string;
  description: string;
  taskInstructions?: string;
  validate?: (text: string) => boolean;
}

const UI_STEPS: TourStep[] = [
  {
    title: "Welcome to ActOne!",
    description: "Let's take a guided tour of the workspace to get you familiar with every part of the interface.",
  },
  {
    targetId: "command-palette-btn",
    title: "Command Palette",
    description: "The logo button at the top of the Activity Bar opens the Command Palette (Ctrl+K). Type any command — open files, toggle settings, run analyses — and find it instantly without digging through menus.",
  },
  {
    targetId: "activity-bar",
    title: "The Activity Bar",
    description: "This vertical strip on the far left is your main navigation hub. Each icon switches to a different side panel. The Quick Settings menu lives at the bottom. Let's walk through every panel.",
  },
  {
    targetId: "activity-tab-outline",
    title: "Outline Panel",
    description: "Shows your screenplay's structure as a tree of scenes. You can drag to reorder scenes, collapse sections, and jump to any part of your script instantly.",
  },
  {
    targetId: "activity-tab-scripts",
    title: "Scripts Panel",
    description: "When working with .actone bundles, this panel lists all the scripts inside the bundle. Use the + icon to add multiple .fountain scripts to your bundle and switch between them seamlessly.",
  },
  {
    targetId: "activity-tab-notepad",
    title: "Notepad Panel",
    description: "A scratchpad for quick notes, character ideas, plot points — anything you want to jot down alongside your screenplay. Notes persist with your file.",
  },
  {
    targetId: "activity-tab-markers",
    title: "Markers / Production Breakdown",
    description: "Tag and categorize your scenes for production planning. Assign props, cast, locations, and generate breakdown reports to keep your shoot organized.",
  },
  {
    targetId: "activity-tab-todo",
    title: "Tasks Panel",
    description: "Keep track of writing goals and to-do items. Mark tasks as complete, set priorities, and manage your revision checklist right alongside your script.",
  },
  {
    targetId: "activity-tab-snapshots",
    title: "Snapshots Panel",
    description: "Save named versions of your screenplay at any point. Browse, restore, or compare snapshots — a safety net for experimental rewrites.",
  },
  {
    targetId: "activity-tab-sprint",
    title: "Sprint Tracker",
    description: "A built-in writing timer. Set a duration and write against the clock. Track your words-per-minute and see how your pace evolves across sessions.",
  },
  {
    targetId: "activity-tab-parking",
    title: "Parking Panel",
    description: "Stash deleted or unused text here instead of losing it forever. Great for alternate dialogue, cut scenes, or lines you want to revisit later.",
  },
  {
    targetId: "quick-settings",
    title: "Quick Settings",
    description: "Click the gear icon at the bottom of the Activity Bar to open the Quick Settings menu. Toggle Typewriter Mode, switch themes, choose Letter/A4 paper size, hide Fountain markup, and open the full Settings window.",
  },
  {
    targetId: "header-bar",
    title: "The Header Bar",
    description: "This strip holds your open file tabs — click any tab to switch, middle-click to close. Use the + button to create a new file. On the right, the window controls let you minimize, maximize, and close the app.",
  },
  {
    targetId: "editor-workspace",
    title: "The Editor Workspace",
    description: "Your main writing area. ActOne is a distraction-free environment that formats your screenplay in real time as you type. Fountain markup becomes proper screenplay layout instantly.",
  },
  {
    targetId: "status-bar",
    title: "The Status Bar",
    description: "The very bottom of the window gives you live file information and tools. Let's look at each section.",
  },
  {
    targetId: "status-file-name",
    title: "Status Bar — File & Save Status",
    description: "The left side shows the current file name (or active script name for bundles). A spinning indicator means saving is in progress; a green checkmark confirms it's saved to disk.",
  },
  {
    targetId: "status-scenes",
    title: "Status Bar — Document Statistics",
    description: "Keep an eye on your Scene count, running Word count, and your current Page number out of estimated total pages. All three update live as you type.",
  },
  {
    targetId: "status-xray",
    title: "Status Bar — X-Ray Deep Analysis",
    description: "The bar chart icon opens the X-Ray analysis window. It runs a deep pacing report: character speech balance, scene length distribution, page count breakdown, and more.",
  },
];

const FOUNTAIN_STEPS: TourStep[] = [
  {
    title: "Fountain Scriptwriting Tutorial",
    description: "Fountain is a simple markup standard that lets you write screenplays in plain text. ActOne auto-formats it into standard screenplay layout instantly. Let's learn by typing!",
  },
  {
    targetId: "editor-workspace",
    title: "1. Scene Headings (Auto-detected)",
    description: "Scene headings outline locations. They always start with standard prefixes like INT. (Interior) or EXT. (Exterior) followed by location and time.",
    taskInstructions: "Type INT. DINER - DAY on a blank line and press Enter.",
    validate: (text) => {
      const lines = text.split("\n");
      return lines.some((l) => /^(INT|EXT)\..+$/i.test(l.trim()));
    },
  },
  {
    targetId: "editor-workspace",
    title: "2. Forced Scene Headings",
    description: "For scenes that aren't inside or outside (like dream sequences or space), force it by starting the line with a single period (.).",
    taskInstructions: "Type .THE BASEMENT - NIGHT on a blank line and press Enter.",
    validate: (text) => {
      const lines = text.split("\n");
      return lines.some((l) => /^\.[A-Z0-9_].+$/i.test(l.trim()) && !/^\.(INT|EXT)/i.test(l.trim()));
    },
  },
  {
    targetId: "editor-workspace",
    title: "3. Characters & Dialogue",
    description: "To write dialogue, type the character's name in ALL CAPS, press Enter, and then type their line on the next line.",
    taskInstructions: "Type WRITER in all caps, press Enter, and type a line of dialogue.",
    validate: (text) => {
      const lines = text.split("\n");
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        const nextLine = lines[i + 1].trim();
        if (line && line === line.toUpperCase() && /^[A-Z\s]+$/.test(line) && nextLine && !nextLine.startsWith("(")) {
          return true;
        }
      }
      return false;
    },
  },
  {
    targetId: "editor-workspace",
    title: "4. Forced Characters (@)",
    description: "For characters with mixed-case or lowercase names (e.g. McWriter or lowercase characters), start the line with an @ symbol.",
    taskInstructions: "Type @McWriter on a new line, hit Enter, and type a line of dialogue.",
    validate: (text) => {
      const lines = text.split("\n");
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        const nextLine = lines[i + 1].trim();
        if (line.startsWith("@") && line.length > 1 && nextLine) {
          return true;
        }
      }
      return false;
    },
  },
  {
    targetId: "editor-workspace",
    title: "5. Parentheticals",
    description: "Parentheticals provide actor direction and belong in parentheses ( ) on the line immediately below the Character name, followed by their dialogue on the next line.",
    taskInstructions: "Type WRITER (ALL CAPS), hit Enter, type (softly), hit Enter, and type a line of dialogue.",
    validate: (text) => {
      const lines = text.split("\n").map((l) => l.trim());
      for (let i = 0; i < lines.length - 2; i++) {
        const charLine = lines[i];
        const parenLine = lines[i + 1];
        const dialogueLine = lines[i + 2];
        const isCharacter = charLine && charLine === charLine.toUpperCase() && /^[A-Z\s]+$/.test(charLine);
        const isParenthetical = parenLine.startsWith("(") && parenLine.endsWith(")");
        const isDialogue = dialogueLine && !dialogueLine.startsWith("(") && !dialogueLine.startsWith(">");
        if (isCharacter && isParenthetical && isDialogue) {
          return true;
        }
      }
      return false;
    },
  },
  {
    targetId: "editor-workspace",
    title: "6. Transitions (>)",
    description: "Transitions ending in TO: are auto-formatted right-aligned. You can force any transition by starting the line with a > symbol.",
    taskInstructions: "Type > FADE TO BLACK. on a new line and press Enter.",
    validate: (text) => {
      const lines = text.split("\n");
      return lines.some((l) => l.trim().startsWith(">") || l.trim().endsWith("TO:"));
    },
  },
  {
    targetId: "editor-workspace",
    title: "7. Forced Shots (!!)",
    description: "Camera directions or shots are forced onto their own line by starting the line with double exclamation points (!!).",
    taskInstructions: "Type !! ANGLE ON THE DOOR on a new line and press Enter.",
    validate: (text) => {
      const lines = text.split("\n");
      return lines.some((l) => l.trim().startsWith("!!"));
    },
  },
  {
    targetId: "editor-workspace",
    title: "8. Complete Screenplay Demo",
    description: "Here is how a complete scene looks in Fountain format. Plain text auto-formats into standard screenplay layout instantly!",
  },
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  activeTour,
  onCloseTour,
}) => {

  const { editorView } = useEditor();
  const [activeStep, setActiveStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [taskComplete, setTaskComplete] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const sandboxCreated = useRef(false);

  // Reset drag position on step transitions
  useEffect(() => {
    setDragPosition(null);
    setDragOffset(null);
  }, [activeStep]);

  const steps = activeTour === "fountain" ? FOUNTAIN_STEPS : UI_STEPS;
  const currentStep = steps[activeStep];

  useEffect(() => {
    setActiveStep(0);
    setTaskComplete(false);
    sandboxCreated.current = false;
  }, [activeTour]);

  // Handle focus, newline injection, and demo screenplay injection
  useEffect(() => {
    if (activeTour !== "fountain" || !editorView) return;

    // Focus editor and place cursor at the end
    editorView.focus();
    const docLength = editorView.state.doc.length;
    editorView.dispatch({
      selection: { anchor: docLength, head: docLength }
    });

    // Automatically insert a new line for new writing steps
    if (activeStep > 1 && activeStep < steps.length - 1) {
      editorView.dispatch({
        changes: { from: docLength, to: docLength, insert: "\n\n" },
        selection: { anchor: docLength + 2, head: docLength + 2 }
      });
      editorView.focus();
    }

    // Inject demo screenplay on the final step
    if (activeStep === steps.length - 1) {
      const demoScene = `INT. COFFEE SHOP - DAY\n\nA young WRITER sits at a corner table, staring at a blank screen.\n\nWRITER\n(sighs)\nWhy is writing so hard?\n\nSuddenly, a beautiful idea sparks in their mind. They type furiously.\n\n!! CLOSE ON THE SCREEN\n\nWe see the words forming. It's magic.\n\n> FADE OUT.`;
      editorView.dispatch({
        changes: { from: 0, to: docLength, insert: demoScene },
        selection: { anchor: 0, head: 0 }
      });
      editorView.scrollDOM.scrollTop = 0;
      editorView.focus();
    }
  }, [activeStep, activeTour, editorView]);

  // Handle targeting DOM elements
  useEffect(() => {
    if (!currentStep?.targetId) {
      setTargetRect(null);
      return;
    }

    const updateBounds = () => {
      const element = document.getElementById(currentStep.targetId!);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      }
    };

    updateBounds();
    window.addEventListener("resize", updateBounds);
    const interval = setInterval(updateBounds, 500); // Poll in case layouts shift
    return () => {
      window.removeEventListener("resize", updateBounds);
      clearInterval(interval);
    };
  }, [currentStep]);

  // Global mouse event listeners for card dragging
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

  // Live validator for interactive Fountain typing
  useEffect(() => {
    if (activeTour !== "fountain" || !currentStep?.validate) {
      setTaskComplete(true); // Auto-complete if no verification needed
      return;
    }

    setTaskComplete(false);
    const interval = setInterval(() => {
      if (editorView) {
        const text = editorView.state.doc.toString();
        if (currentStep.validate!(text)) {
          setTaskComplete(true);
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [activeTour, activeStep, currentStep, editorView]);

  if (!activeTour) return null;

  const handleClose = () => {
    onCloseTour();
  };

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };

  // Card Positioning logic
  const cardStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 999999,
    width: 320,
    transition: dragOffset ? "transform 0.15s ease-out" : "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  const isSidebarTarget = currentStep.targetId === "activity-bar" ||
    currentStep.targetId?.startsWith("activity-tab-") ||
    currentStep.targetId === "command-palette-btn" ||
    currentStep.targetId === "quick-settings";

  if (dragPosition) {
    cardStyle.left = dragPosition.x;
    cardStyle.top = dragPosition.y;
    cardStyle.transform = "scale(1.025)";
  } else if (targetRect) {
    if (isSidebarTarget) {
      cardStyle.left = targetRect.right + 16;
      cardStyle.top = 16;
    } else if (currentStep.targetId === "status-bar") {
      cardStyle.left = Math.max(16, targetRect.left + (targetRect.width / 2) - 160);
      cardStyle.bottom = (window.innerHeight - targetRect.top) + 16;
    } else if (currentStep.targetId === "header-bar") {
      cardStyle.left = Math.max(16, targetRect.left + (targetRect.width / 2) - 160);
      cardStyle.top = targetRect.bottom + 16;
    } else {
      // For editor workspace: position on the left for Transitions to avoid blocking the right-aligned text,
      // and position on the right for other editor steps.
      if (currentStep.title.includes("Transitions")) {
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
    // Center of screen
    cardStyle.left = "50%";
    cardStyle.top = "50%";
    cardStyle.transform = "translate(-50%, -50%)";
  }

  const progress = ((activeStep + 1) / steps.length) * 100;

  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 999990, pointerEvents: "none" }}>
      {/* SVG Mask Overlay */}
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
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.45)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Floating Tour Card */}
      <Card
        className="tour-card"
        elevation={dragOffset ? 16 : 8}
        style={cardStyle}
        sx={{
          pointerEvents: "auto",
          border: 1,
          borderColor: "primary.main",
          background: (theme) => theme.palette.background.paper,
        }}
      >
        <LinearProgress variant="determinate" value={progress} sx={{ height: 3 }} />
        <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2 } }}>
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
              alignItems: "flex-start",
              mb: 1,
              cursor: dragOffset ? "grabbing" : "grab",
              userSelect: "none",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "primary.main", display: "flex", alignItems: "center", gap: 0.5 }}>
              <AutoAwesomeIcon sx={{ fontSize: 14 }} /> Tutorial
            </Typography>
            <IconButton size="small" onClick={handleClose} sx={{ p: 0, color: "text.secondary" }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 15, mb: 1, lineHeight: 1.25 }}>
            {currentStep.title}
          </Typography>

          <Typography variant="body2" sx={{ color: "text.secondary", fontSize: 12.5, lineHeight: 1.45, mb: 2 }}>
            {currentStep.description}
          </Typography>

          {/* Interactive Writing Prompts */}
          {activeTour === "fountain" && currentStep.taskInstructions && (
            <Box
              sx={{
                bgcolor: (t) => taskComplete ? alpha(t.palette.success.main, 0.04) : alpha(t.palette.action.hover, 0.6),
                border: "1px solid",
                borderColor: (t) => taskComplete ? alpha(t.palette.success.main, 0.3) : t.palette.divider,
                px: 2,
                py: 1.5,
                borderRadius: 0,
                mb: 2.5,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 800, color: taskComplete ? "success.main" : "primary.main", display: "block", mb: 0.5, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                {taskComplete ? "✓ Task Complete!" : "✏ Task Instruction:"}
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, whiteSpace: "pre-line" }}>
                {currentStep.taskInstructions}
              </Typography>
            </Box>
          )}

          {/* Card Navigation */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
              Step {activeStep + 1} of {steps.length}
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              {activeStep > 0 && (
                <Button variant="outlined" size="small" onClick={handleBack} sx={{ fontSize: 11, textTransform: "none", py: 0.25 }}>
                  Back
                </Button>
              )}
              <Button
                variant="contained"
                size="small"
                disabled={!taskComplete}
                onClick={handleNext}
                sx={{ fontSize: 11, textTransform: "none", py: 0.25 }}
              >
                {activeStep === steps.length - 1 ? "Finish" : "Next"}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

interface TutorialSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectTour: (type: "ui" | "fountain") => void;
}

export const TutorialSelectionDialog: React.FC<TutorialSelectionDialogProps> = ({
  open,
  onClose,
  onSelectTour,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            p: 1,
            borderRadius: 0,
            border: 1,
            borderColor: "divider",
          },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, fontSize: 16, pb: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Interactive Tutorials
        <IconButton size="small" onClick={onClose} sx={{ color: "text.secondary" }}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pb: 2 }}>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2, fontSize: 13 }}>
          Select a guided walkthrough to learn the app interface or get hands-on experience formatting screenplays in Fountain.
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box
            onClick={() => { onSelectTour("ui"); onClose(); }}
            sx={{
              p: 2,
              borderRadius: 0,
              cursor: "pointer",
              border: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
              transition: "all var(--duration-fast) ease",
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: "action.hover",
                transform: "translateY(-1px)",
              },
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 0.5 }}>
              🧭 App Interface Tour
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
              Explore every panel: Command Palette, all Activity Bar panels, Quick Settings, Header tabs, Editor Workspace, and all Status Bar tools.
            </Typography>
          </Box>

          <Box
            onClick={() => { onSelectTour("fountain"); onClose(); }}
            sx={{
              p: 2,
              borderRadius: 0,
              cursor: "pointer",
              border: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
              transition: "all var(--duration-fast) ease",
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: "action.hover",
                transform: "translateY(-1px)",
              },
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 0.5 }}>
              ✍ Fountain Writing Tutorial
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
              Hands-on writing sandbox. Practice scene headings, dialogue, parentheticals, and shots.
            </Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
