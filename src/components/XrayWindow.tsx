import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { type FountainDocument } from "../parser";
import { WindowLoading } from "./WindowLoading";
import { TitleBar } from "./TitleBar";
import { WindowResizeHandles } from "./WindowResizeHandles";
import { AddIcon, DeleteIcon } from "./Icons";
import { createActOneTheme } from "../theme";
import { resolveThemeConfig, type CustomTheme } from "../theme/themeUtils";
import { initThemeEngine, onThemeChanged, getInitialThemeId, getInitialCustomThemes } from "../theme/ThemeEngine";
import { useTourListener } from "../hooks/useTourListener";
import { CrossWindowTourCard } from "./CrossWindowTourCard";
import { getPerScriptSettingObject } from "../utils/perScriptSettings";
import { analyzeXray } from "../utils/xray";
import { XrayDashboard } from "./XrayDashboard";
const SWATCH_COLORS = [
  "#2196f3",
  "#4caf50",
  "#ff9800",
  "#e91e63",
  "#9c27b0",
  "#00bcd4",
  "#ffeb3b",
  "#795548",
  "#607d8b",
];
interface CharacterProfile {
  description?: string;
  role?: string;
  gender?: string;
  age?: string;
  backstory?: string;
  arc?: string;
  color?: string;
  relationships?: Array<{ target: string; type: string }>;
  [key: string]: unknown;
}
export interface XrayData {
  parsedDoc: FountainDocument | null;
  scriptFileName: string;
  settings: Record<string, unknown>;
}
interface XrayContentProps {
  data: XrayData | null;
  onClose?: () => void;
  timedOut?: boolean;
}
const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export function XrayContent({ data, onClose, timedOut }: XrayContentProps) {
  const [dialogueWpm, setDialogueWpm] = useState(150);
  const [actionWpm, setActionWpm] = useState(200);
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [error, setError] = useState("");
  const report = useMemo(
    () => (data?.parsedDoc ? analyzeXray(data.parsedDoc, dialogueWpm, actionWpm) : null),
    [data?.parsedDoc, dialogueWpm, actionWpm],
  );
  const profiles = useMemo(
    () =>
      getPerScriptSettingObject<Record<string, CharacterProfile>>(
        "characterProfiles",
        data?.settings || {},
        data?.scriptFileName || "",
        {},
      ),
    [data?.settings, data?.scriptFileName],
  );
  const genders = useMemo(
    () =>
      getPerScriptSettingObject<Record<string, string>>(
        "genders",
        data?.settings || {},
        data?.scriptFileName || "",
        {},
      ),
    [data?.settings, data?.scriptFileName],
  );
  const jump = async (lineIndex: number) => {
    if (!isTauri()) return;
    try {
      const { emit } = await import("@tauri-apps/api/event");
      await emit("modal:xray:scroll-to-line", { lineIndex });
    } catch {
      setError("Could not navigate to the editor. Please try again.");
    }
  };
  const save = async (profile: CharacterProfile) => {
    if (!isTauri()) {
      setError("Character profiles can be saved in the desktop app.");
      return;
    }
    try {
      const { emit } = await import("@tauri-apps/api/event");
      await emit("modal:xray:save-profile", {
        characterName: selectedChar,
        profile: { ...profiles[selectedChar!], ...profile },
      });
      setSelectedChar(null);
    } catch {
      setError("Could not save the profile. Please try again.");
    }
  };
  const exportPdf = async () => {
    if (!report || exporting) return;
    setExporting(true);
    setExported(false);
    setError("");
    try {
      const { exportXrayPdf } = await import("../utils/xrayReport");
      setExported(await exportXrayPdf(report, data?.scriptFileName || "Untitled screenplay", dialogueWpm, actionWpm));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : typeof cause === "string" ? cause : "Could not export the report.",
      );
    } finally {
      setExporting(false);
    }
  };
  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        color: "text.primary",
      }}
    >
      {onClose && <TitleBar title="X-Ray Analysis" onClose={onClose} />}
      {report ? (
        <XrayDashboard
          key={data?.scriptFileName}
          report={report}
          title={data?.scriptFileName || "Untitled screenplay"}
          exporting={exporting}
          dialogueWpm={dialogueWpm}
          actionWpm={actionWpm}
          onDialogueWpm={setDialogueWpm}
          onActionWpm={setActionWpm}
          onExport={() => void exportPdf()}
          onJump={(line) => void jump(line)}
          onEdit={setSelectedChar}
          notices={
            <>
              {exported && (
                <Alert severity="success" onClose={() => setExported(false)}>
                  Your analysis PDF has been saved.
                </Alert>
              )}
              {error && (
                <Alert severity="error" onClose={() => setError("")}>
                  {error}
                </Alert>
              )}
            </>
          }
        />
      ) : !timedOut ? <WindowLoading label="Loading X-Ray" embedded /> : (
        <Box sx={{ p: 3 }}>
          <Button disabled>Export PDF</Button>
          <Alert severity="info">
            {timedOut
              ? "No screenplay received. Reopen X-Ray from your screenplay to reconnect."
              : "Waiting for your screenplay..."}
          </Alert>
        </Box>
      )}
      {selectedChar && (
        <CharacterEditModal
          key={selectedChar}
          charName={selectedChar}
          profile={{
            ...profiles[selectedChar],
            gender: profiles[selectedChar]?.gender || genders[selectedChar] || "unknown",
          }}
          onClose={() => setSelectedChar(null)}
          onSave={(profile) => void save(profile)}
        />
      )}
    </Box>
  );
}

interface CharacterEditModalProps {
  charName: string;
  profile: CharacterProfile;
  onClose: () => void;
  onSave: (profile: CharacterProfile) => void;
}

function CharacterEditModal({ charName, profile, onClose, onSave }: CharacterEditModalProps) {
  const [description, setDescription] = useState(profile.description || "");
  const [role, setRole] = useState(profile.role || "");
  const [gender, setGender] = useState(profile.gender || "unknown");
  const [age, setAge] = useState(profile.age || "");
  const [backstory, setBackstory] = useState(profile.backstory || "");
  const [arc, setArc] = useState(profile.arc || "");
  const [color, setColor] = useState(profile.color || "");
  const [relationships, setRelationships] = useState<Array<{ target: string; type: string }>>(
    profile.relationships || [],
  );

  useEffect(() => {
    setDescription(profile.description || "");
    setRole(profile.role || "");
    setGender(profile.gender || "unknown");
    setAge(profile.age || "");
    setBackstory(profile.backstory || "");
    setArc(profile.arc || "");
    setColor(profile.color || "");
    setRelationships(profile.relationships || []);
  }, [profile]);

  const [newRelTarget, setNewRelTarget] = useState("");
  const [newRelType, setNewRelType] = useState("");

  const handleAddRelationship = () => {
    if (!newRelTarget || !newRelType) return;
    setRelationships([...relationships, { target: newRelTarget, type: newRelType }]);
    setNewRelTarget("");
    setNewRelType("");
  };

  const handleRemoveRelationship = (idx: number) => {
    setRelationships(relationships.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Edit Character Profile: {charName}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <TextField
          label="Description"
          multiline
          rows={2}
          fullWidth
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          size="small"
        />

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
          <FormControl size="small">
            <InputLabel>Role</InputLabel>
            <Select value={role} label="Role" onChange={(e) => setRole(e.target.value)}>
              <MenuItem value="">Unassigned</MenuItem>
              <MenuItem value="Protagonist">Protagonist</MenuItem>
              <MenuItem value="Antagonist">Antagonist</MenuItem>
              <MenuItem value="Supporting">Supporting</MenuItem>
              <MenuItem value="Minor">Minor</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small">
            <InputLabel>Gender</InputLabel>
            <Select value={gender} label="Gender" onChange={(e) => setGender(e.target.value)}>
              <MenuItem value="male">Male</MenuItem>
              <MenuItem value="female">Female</MenuItem>
              <MenuItem value="nonbinary">Nonbinary</MenuItem>
              <MenuItem value="unknown">Unknown</MenuItem>
            </Select>
          </FormControl>

          <TextField label="Age" value={age} onChange={(e) => setAge(e.target.value)} size="small" />
        </Box>

        <TextField
          label="Backstory"
          multiline
          rows={2}
          fullWidth
          value={backstory}
          onChange={(e) => setBackstory(e.target.value)}
          size="small"
        />
        <TextField
          label="Character Arc"
          multiline
          rows={2}
          fullWidth
          value={arc}
          onChange={(e) => setArc(e.target.value)}
          size="small"
        />

        {/* Color Swatch Picker */}
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1 }}>Color Swatch</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {SWATCH_COLORS.map((c) => (
              <Box
                key={c}
                onClick={() => setColor(c)}
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  bgcolor: c,
                  cursor: "pointer",
                  border: color === c ? "2px solid #fff" : "none",
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Relationships Manager */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Relationships</Typography>
          {relationships.map((rel, idx) => (
            <Box
              key={idx}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                bgcolor: "action.hover",
                p: 1,
                borderRadius: 1,
              }}
            >
              <Typography sx={{ fontSize: 12 }}>
                {rel.target} &mdash; <strong>{rel.type}</strong>
              </Typography>
              <IconButton size="small" onClick={() => handleRemoveRelationship(idx)}>
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          ))}
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <TextField
              placeholder="Target Name"
              size="small"
              value={newRelTarget}
              onChange={(e) => setNewRelTarget(e.target.value)}
            />
            <TextField
              placeholder="Relation (e.g. Rival)"
              size="small"
              value={newRelType}
              onChange={(e) => setNewRelType(e.target.value)}
            />
            <IconButton onClick={handleAddRelationship} color="primary">
              <AddIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() =>
            onSave({
              ...profile,
              description,
              role,
              gender,
              age,
              backstory,
              arc,
              color,
              relationships,
            })
          }
        >
          Save Profile
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export const XrayWindow: React.FC = () => {
  const [themeId, setThemeId] = useState(() => getInitialThemeId());
  const [appScale, setAppScale] = useState(100);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(() => getInitialCustomThemes());
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [data, setData] = useState<XrayData | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const {
    currentStep: tourStep,
    tourName,
    progress,
    taskComplete,
    isLastStep,
    currentIndex,
    totalSteps,
  } = useTourListener("xray");

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener("contextmenu", handleContextMenu);
    return () => window.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled && !data) setTimedOut(true);
    }, 8000);

    const setup = async () => {
      if (!isTauri()) return;
      try {
        const { emit, listen } = await import("@tauri-apps/api/event");
        const unlisten = await listen<XrayData>("modal:xray:init", (event) => {
          if (!cancelled) {
            setData(event.payload);
            setTimedOut(false);
          }
        });
        emit("modal:xray:ready").catch(() => {});
        return unlisten;
      } catch {
        // not in Tauri
      }
    };

    let cleanup: (() => void) | undefined;
    setup().then((fn) => {
      if (cancelled) fn?.();
      else cleanup = fn;
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (cleanup) cleanup();
    };
  }, []);

  useEffect(() => {
    initThemeEngine().then((state) => {
      setThemeId(state.themeId);
      setAppScale(state.appScale);
      try {
        setCustomThemes(JSON.parse(state.customThemes));
      } catch {
        setCustomThemes([]);
      }
    });
    return onThemeChanged((state) => {
      setThemeId(state.themeId);
      setAppScale(state.appScale);
      try {
        setCustomThemes(JSON.parse(state.customThemes));
      } catch {
        setCustomThemes([]);
      }
    });
  }, []);

  const handleClose = useCallback(async () => {
    if (!isTauri()) {
      window.close();
      return;
    }
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch {
      window.close();
    }
  }, []);

  const currentThemeConfig = useMemo(
    () => resolveThemeConfig(themeId, customThemes, systemDark),
    [themeId, customThemes, systemDark],
  );
  const muiTheme = useMemo(() => createActOneTheme(currentThemeConfig, appScale), [currentThemeConfig, appScale]);

  useEffect(() => {
    document.body.classList.toggle("dark-theme", currentThemeConfig.isDark);
  }, [currentThemeConfig.isDark]);

  return (
    <>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        <WindowResizeHandles />
        <Box sx={{ height: "100vh", overflow: "hidden" }}>
          <XrayContent data={data} onClose={handleClose} timedOut={timedOut} />
        </Box>
      </MuiThemeProvider>
      {tourStep && (
        <CrossWindowTourCard
          step={tourStep}
          tourName={tourName}
          progress={progress}
          taskComplete={taskComplete}
          isLastStep={isLastStep}
          stepNumber={currentIndex + 1}
          totalSteps={totalSteps}
          onNext={async () => {
            if (!isTauri()) return;
            try {
              const { emit } = await import("@tauri-apps/api/event");
              await emit("tour:step-done", { stepIndex: 0, window: "xray" });
            } catch {
              void 0;
            }
          }}
          onCancel={async () => {
            if (!isTauri()) return;
            try {
              const { emit } = await import("@tauri-apps/api/event");
              await emit("tour:cancel", {});
            } catch {
              void 0;
            }
          }}
        />
      )}
    </>
  );
};
