import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
  Tooltip,
} from "@mui/material";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { LineType, type FountainDocument } from "../parser";
import { TitleBar } from "./TitleBar";
import { WindowResizeHandles } from "./WindowResizeHandles";
import {
  AddIcon,
  BarChartIcon,
  DeleteIcon,
  EditIcon,
  PersonIcon,
  SearchIcon,
  TimerIcon,
} from "./Icons";
import { createActOneTheme } from "../theme";
import { resolveThemeConfig, type CustomTheme } from "../theme/themeUtils";
import {
  initThemeEngine,
  onThemeChanged,
  getInitialThemeId,
  getInitialCustomThemes,
} from "../theme/ThemeEngine";
import { useTourListener } from "../hooks/useTourListener";
import { CrossWindowTourCard } from "./CrossWindowTourCard";
import {
  computeStats,
  computeSceneTiming,
  extractCharacters,
  type CharacterEntry,
  type ScriptStats,
  type SceneTiming,
} from "../utils/analysis";
import { getPerScriptSettingObject } from "../utils/perScriptSettings";

// ─── Color Palette & Helper Functions ─────────────────────────────────────

const GENDER_COLORS: Record<string, string> = {
  male: "#2196f3",
  female: "#e91e63",
  nonbinary: "#9c27b0",
  unknown: "#9e9e9e",
};

function getGenderColor(gender: string): string {
  return GENDER_COLORS[gender.toLowerCase()] || GENDER_COLORS.unknown;
}

const SWATCH_COLORS = [
  "#2196f3", "#4caf50", "#ff9800", "#e91e63", "#9c27b0",
  "#00bcd4", "#ffeb3b", "#795548", "#607d8b",
];

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function cleanSceneHeading(heading: string): string {
  return heading
    .replace(/#.*?#/g, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/\[\[.*?\]\]/g, "")
    .replace(/[\*_~]/g, "")
    .trim()
    .toUpperCase();
}

interface CharacterProfile {
  description?: string;
  role?: string;
  gender?: string;
  age?: string;
  backstory?: string;
  arc?: string;
  color?: string;
  highlight?: boolean;
  relationships?: Array<{ target: string; type: string }>;
  [key: string]: unknown;
}

interface XrayData {
  parsedDoc: FountainDocument;
  scriptFileName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: Record<string, any>;
}

interface XrayContentProps {
  data: XrayData | null;
  onClose?: () => void;
  timedOut?: boolean;
}

// ─── Main Content Component ───────────────────────────────────────────────

function XrayContent({ data, onClose, timedOut }: XrayContentProps) {
  const [tabIndex, setTabIndex] = useState(0);
  const [characterFilter, setCharacterFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [pacingZoom, setPacingZoom] = useState(1.0);

  const pacingContainerRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const doc = data?.parsedDoc;
  const scriptFileName = data?.scriptFileName || "";

  const sceneTimings = useMemo<SceneTiming[]>(() => {
    if (!doc) return [];
    return computeSceneTiming(doc);
  }, [doc]);

  const characterProfiles = useMemo<Record<string, CharacterProfile>>(() => {
    if (!data?.settings) return {};
    return getPerScriptSettingObject<Record<string, CharacterProfile>>(
      "characterProfiles",
      data.settings,
      scriptFileName,
      {}
    );
  }, [data?.settings, scriptFileName]);

  const genders = useMemo<Record<string, string>>(() => {
    if (!data?.settings) return {};
    return getPerScriptSettingObject<Record<string, string>>(
      "genders",
      data.settings,
      scriptFileName,
      {}
    );
  }, [data?.settings, scriptFileName]);

  const characters = useMemo<CharacterEntry[]>(() => {
    if (!doc) return [];
    return extractCharacters(doc, genders, characterProfiles);
  }, [doc, genders, characterProfiles]);

  const totalDialogueLines = useMemo(() => {
    return characters.reduce((sum, c) => sum + c.lineCount, 0);
  }, [characters]);

  const filteredCharacters = useMemo(() => {
    return characters.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(characterFilter.toLowerCase());
      const matchesRole = roleFilter === "all" || c.role.toLowerCase() === roleFilter.toLowerCase();
      return matchesSearch && matchesRole;
    });
  }, [characters, characterFilter, roleFilter]);

  const stats = useMemo<ScriptStats | null>(() => {
    if (!doc) return null;
    return computeStats(doc, genders, characterProfiles);
  }, [doc, genders, characterProfiles]);

  const totalRuntimeSeconds = useMemo(() => {
    if (!sceneTimings.length) return 0;
    const last = sceneTimings[sceneTimings.length - 1];
    return last.offsetSeconds + last.durationSeconds;
  }, [sceneTimings]);

  // Gender Stats calculation
  const genderStats = useMemo(() => {
    const counts = { male: 0, female: 0, nonbinary: 0, unknown: 0 };
    const lines = { male: 0, female: 0, nonbinary: 0, unknown: 0 };
    const words = { male: 0, female: 0, nonbinary: 0, unknown: 0 };

    characters.forEach((c) => {
      const g = (["male", "female", "nonbinary"].includes(c.gender.toLowerCase())
        ? c.gender.toLowerCase()
        : "unknown") as keyof typeof counts;
      counts[g]++;
      lines[g] += c.lineCount;
      words[g] += c.wordCount;
    });

    const totalWords = Object.values(words).reduce((a, b) => a + b, 0);

    return {
      counts,
      lines,
      words,
      totalWords,
      percentages: {
        male: totalWords > 0 ? Math.round((words.male / totalWords) * 100) : 0,
        female: totalWords > 0 ? Math.round((words.female / totalWords) * 100) : 0,
        nonbinary: totalWords > 0 ? Math.round((words.nonbinary / totalWords) * 100) : 0,
        unknown: totalWords > 0 ? Math.round((words.unknown / totalWords) * 100) : 0,
      },
    };
  }, [characters]);

  // Character presence matrix data
  const presenceGridData = useMemo(() => {
    if (!doc || !sceneTimings.length) return { topChars: [], matrix: [], charTotals: [] };
    const topChars = characters.slice(0, 15);
    const matrix: Array<{ sceneHeading: string; presence: number[]; lineIndex: number }> = [];
    const charTotals = new Array(topChars.length).fill(0);

    sceneTimings.forEach((st) => {
      const rowPresence: number[] = [];
      topChars.forEach((c, cIdx) => {
        let dialogueWordsInScene = 0;
        let currentSpeaker = "";

        for (let i = st.lineIndex; i < doc.lines.length; i++) {
          const line = doc.lines[i];
          if (i > st.lineIndex && line.type === LineType.heading) break;

          if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
            currentSpeaker = line.text.replace(/^@[ ]*/, "").replace(/[ ]*\^[ ]*$/, "").replace(/\s*\([^)]*\)/g, "").trim().toUpperCase();
          } else if ((line.type === LineType.dialogue || line.type === LineType.dualDialogue) && currentSpeaker === c.name) {
            const words = line.text.trim().split(/\s+/).filter((w) => w !== "").length;
            dialogueWordsInScene += words;
          }
        }

        rowPresence.push(dialogueWordsInScene);
        if (dialogueWordsInScene > 0) {
          charTotals[cIdx]++;
        }
      });

      matrix.push({
        sceneHeading: cleanSceneHeading(st.heading),
        presence: rowPresence,
        lineIndex: st.lineIndex,
      });
    });

    return { topChars, matrix, charTotals };
  }, [doc, sceneTimings, characters]);

  // IPC event emission helper
  const handleScrollToLine = useCallback(async (lineIndex: number) => {
    try {
      const { emit } = await import("@tauri-apps/api/event");
      await emit("modal:xray:scroll-to-line", { lineIndex });
    } catch {
      // not in Tauri
    }
  }, []);

  const handleSaveProfile = useCallback(
    async (charName: string, updatedProfile: CharacterProfile) => {
      try {
        const { emit } = await import("@tauri-apps/api/event");
        await emit("modal:xray:save-profile", {
          characterName: charName,
          profile: updatedProfile,
        });
      } catch {
        // not in Tauri
      }
    },
    []
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", bgcolor: "background.default", color: "text.primary", overflow: "hidden" }}>
      {onClose && (
        <TitleBar title="X-Ray Analysis" onClose={onClose} icon={<BarChartIcon sx={{ fontSize: 16 }} />} />
      )}

      {/* Header Tabs */}
      <Box
        data-tauri-drag-region
        sx={{
          display: "flex",
          alignItems: "center",
          px: 2,
          height: 40,
          borderBottom: 1,
          borderColor: "divider",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        {data && (
          <Tabs
            value={tabIndex}
            onChange={(_, v) => setTabIndex(v)}
            sx={{
              minHeight: 28,
              height: 28,
              bgcolor: "action.hover",
              borderRadius: "4px",
              p: "2px",
              "& .MuiTabs-indicator": {
                bgcolor: "background.paper",
                borderRadius: "3px",
                height: "calc(100% - 4px)",
                top: 2,
                bottom: 2,
                boxShadow: "0px 1px 3px rgba(0,0,0,0.08)",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              },
              "& .MuiTab-root": {
                minHeight: 24,
                height: 24,
                py: 0,
                px: 1.5,
                fontSize: 11,
                textTransform: "none",
                fontWeight: 600,
                color: "text.secondary",
                borderRadius: "3px",
                transition: "color 0.2s ease",
                zIndex: 1,
                gap: 0.75,
                "&.Mui-selected": {
                  color: "text.primary",
                },
                "& .MuiSvgIcon-root": {
                  fontSize: 13,
                }
              },
            }}
          >
            <Tab label="Overview & Stats" icon={<BarChartIcon />} iconPosition="start" />
            <Tab label="Pacing & Timeline" icon={<TimerIcon />} iconPosition="start" />
            <Tab label="Characters" icon={<PersonIcon />} iconPosition="start" />
          </Tabs>
        )}
      </Box>

      {/* Content Body */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
        {timedOut && !data ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 2, p: 4 }}>
            <Typography color="text.secondary" sx={{ fontSize: 13, textAlign: "center" }}>
              No screenplay data received. Make sure a file is open in the main window.
            </Typography>
          </Box>
        ) : !data ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#666", fontSize: 12 }}>
            Waiting for screenplay data...
          </Box>
        ) : null}

        {/* ─── TAB 0: OVERVIEW & STATS ────────────────────────────────────────── */}
        {tabIndex === 0 && stats && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* 4 Hero KPI Cards */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2 }}>
              <Paper elevation={1} sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper" }}>
                <Typography color="text.secondary" sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                  Pages & Runtime
                </Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 800, mt: 0.5 }}>{stats.pages}</Typography>
                <Typography color="text.secondary" sx={{ fontSize: 11, mt: 0.5 }}>
                  Est. Runtime: <strong>{formatDuration(totalRuntimeSeconds)}</strong>
                </Typography>
              </Paper>

              <Paper elevation={1} sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper" }}>
                <Typography color="text.secondary" sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                  Scenes & Pace
                </Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 800, mt: 0.5 }}>{stats.headingCount}</Typography>
                <Typography color="text.secondary" sx={{ fontSize: 11, mt: 0.5 }}>
                  Avg <strong>{(stats.pages / (stats.headingCount || 1)).toFixed(1)}</strong> pgs / scene
                </Typography>
              </Paper>

              <Paper elevation={1} sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper" }}>
                <Typography color="text.secondary" sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                  Words & Density
                </Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 800, mt: 0.5 }}>
                  {stats.totalWords.toLocaleString()}
                </Typography>
                <Typography color="text.secondary" sx={{ fontSize: 11, mt: 0.5 }}>
                  Avg <strong>{Math.round(stats.totalWords / (stats.pages || 1))}</strong> words / pg
                </Typography>
              </Paper>

              <Paper elevation={1} sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper" }}>
                <Typography color="text.secondary" sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                  Speaking Cast
                </Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 800, mt: 0.5 }}>{characters.length}</Typography>
                <Typography color="text.secondary" sx={{ fontSize: 11, mt: 0.5 }}>
                  Total <strong>{totalDialogueLines}</strong> dialogue lines
                </Typography>
              </Paper>
            </Box>

            {/* Act Structure & Balance */}
            <Paper elevation={1} sx={{ p: 2.5, borderRadius: 2, bgcolor: "background.paper" }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 1.5 }}>
                Act Structure & Balance
              </Typography>

              {stats.acts.length > 0 ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {/* Multi-segment Act Bar */}
                  <Box sx={{ height: 24, width: "100%", borderRadius: 1.5, overflow: "hidden", display: "flex", bgcolor: "action.hover" }}>
                    {stats.acts.map((act, i) => {
                      const colors = ["#2196f3", "#4caf50", "#ff9800", "#9c27b0", "#e91e63"];
                      const bg = colors[i % colors.length];
                      return (
                        <Tooltip key={act.title} title={`${act.title}: ${act.percentage}% (${act.wordCount} words, ${act.sceneCount} scenes) — Click to jump`}>
                          <Box
                            onClick={() => handleScrollToLine(act.lineIndex)}
                            sx={{
                              width: `${act.percentage}%`,
                              bgcolor: bg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontSize: 10,
                              fontWeight: 700,
                              px: 0.5,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              cursor: "pointer",
                              transition: "transform 0.1s, opacity 0.15s",
                              "&:hover": { opacity: 0.85, transform: "scaleY(1.08)" },
                            }}
                          >
                            {act.percentage > 8 ? `${act.title} (${act.percentage}%)` : ""}
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Box>

                  {/* Act details grid */}
                  <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(stats.acts.length, 5)}, 1fr)`, gap: 1.5 }}>
                    {stats.acts.map((act) => (
                      <Paper
                        key={act.title}
                        variant="outlined"
                        onClick={() => handleScrollToLine(act.lineIndex)}
                        sx={{
                          p: 1.5,
                          borderRadius: 1.5,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          "&:hover": { borderColor: "primary.main", bgcolor: "action.hover", transform: "translateY(-1px)" },
                        }}
                      >
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: "primary.main" }}>
                          {act.title}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: "text.secondary", mt: 0.5 }}>
                          {act.wordCount.toLocaleString()} words ({act.percentage}%)
                        </Typography>
                        <Typography sx={{ fontSize: 10, color: "text.secondary" }}>
                          {act.sceneCount} scenes
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              ) : (
                <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                    No Act Section Headings detected. Tip: Add <code># Act 1</code>, <code># Act 2</code> headings in Fountain to automatically track structural balance!
                  </Typography>
                </Box>
              )}
            </Paper>

            {/* Script Composition & Speech Insights */}
            <Box sx={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 2 }}>
              {/* Script Composition Bar */}
              <Paper elevation={1} sx={{ p: 2.5, borderRadius: 2, bgcolor: "background.paper" }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 1.5 }}>
                  Script Composition
                </Typography>
                <Box sx={{ height: 20, width: "100%", borderRadius: 1, overflow: "hidden", display: "flex", mb: 2 }}>
                  <Box sx={{ width: `${stats.dialoguePct}%`, bgcolor: "info.main", title: `Dialogue: ${stats.dialoguePct}%` }} />
                  <Box sx={{ width: `${stats.actionPct}%`, bgcolor: "warning.main", title: `Action: ${stats.actionPct}%` }} />
                  <Box sx={{ width: `${100 - stats.dialoguePct - stats.actionPct}%`, bgcolor: "action.disabled", title: "Other" }} />
                </Box>

                <Box sx={{ display: "flex", gap: 3, justifyContent: "space-around" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "info.main" }} />
                    <Box>
                      <Typography sx={{ fontSize: 11, color: "text.secondary" }}>Dialogue</Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{stats.dialoguePct}%</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "warning.main" }} />
                    <Box>
                      <Typography sx={{ fontSize: 11, color: "text.secondary" }}>Action</Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{stats.actionPct}%</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "action.disabled" }} />
                    <Box>
                      <Typography sx={{ fontSize: 11, color: "text.secondary" }}>Other</Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                        {100 - stats.dialoguePct - stats.actionPct}%
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Paper>

              {/* Speech & Density Highlights */}
              <Paper elevation={1} sx={{ p: 2.5, borderRadius: 2, bgcolor: "background.paper", display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                  Speech Complexity & Density
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                  <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1.5 }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: "text.secondary", textTransform: "uppercase" }}>
                      Avg Words / Speech
                    </Typography>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, mt: 0.5 }}>
                      {stats.avgWordsPerSpeech}
                    </Typography>
                  </Box>

                  {stats.busiestScene ? (
                    <Box
                      onClick={() => handleScrollToLine(stats.busiestScene!.lineIndex)}
                      sx={{
                        p: 1.5,
                        bgcolor: "action.hover",
                        borderRadius: 1.5,
                        cursor: "pointer",
                        transition: "background-color 0.15s",
                        "&:hover": { bgcolor: "action.selected" },
                      }}
                    >
                      <Typography sx={{ fontSize: 10, fontWeight: 700, color: "text.secondary", textTransform: "uppercase" }}>
                        Busiest Scene ({stats.busiestScene.characterCount} chars)
                      </Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 800, mt: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {cleanSceneHeading(stats.busiestScene.heading)}
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1.5 }}>
                      <Typography sx={{ fontSize: 10, fontWeight: 700, color: "text.secondary", textTransform: "uppercase" }}>
                        Avg Chars / Scene
                      </Typography>
                      <Typography sx={{ fontSize: 18, fontWeight: 800, mt: 0.5 }}>
                        {stats.avgCharsPerScene}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {stats.longestMonologue && (
                  <Box
                    onClick={() => handleScrollToLine(stats.longestMonologue!.lineIndex)}
                    sx={{
                      p: 1.5,
                      border: "1px dashed",
                      borderColor: "primary.main",
                      borderRadius: 1.5,
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: "primary.main", textTransform: "uppercase" }}>
                      Longest Monologue ({stats.longestMonologue.wordCount} words)
                    </Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, mt: 0.25 }}>
                      {stats.longestMonologue.character}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: "text.secondary", fontStyle: "italic", mt: 0.5 }}>
                      &ldquo;{stats.longestMonologue.textSnippet}&rdquo;
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Box>

            {/* Environment & Location Analysis */}
            <Paper elevation={1} sx={{ p: 2.5, borderRadius: 2, bgcolor: "background.paper" }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>
                Environment & Location Insights
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: 3 }}>
                {/* INT / EXT Stacked Bar */}
                <Box>
                  <Typography sx={{ fontSize: 11, color: "text.secondary", fontWeight: 700, mb: 1 }}>
                    SETTING BREAKDOWN
                  </Typography>
                  {stats.headingCount > 0 && (
                    <>
                      <Box sx={{ height: 16, borderRadius: 1, overflow: "hidden", display: "flex", mb: 1, bgcolor: "action.disabledBackground" }}>
                        {stats.settingStats.map((st, idx) => {
                          const palette = ["#2196f3", "#4caf50", "#ff9800", "#9c27b0", "#00bcd4", "#795548"];
                          const color = st.name === "INT" ? "#2196f3" : st.name === "EXT" ? "#4caf50" : st.name === "INT/EXT" ? "#ff9800" : palette[idx % palette.length];
                          return (
                            <Tooltip key={st.name} title={`${st.name}: ${st.count} scenes (${st.percentage}%)`}>
                              <Box sx={{ width: `${st.percentage}%`, bgcolor: color }} />
                            </Tooltip>
                          );
                        })}
                      </Box>
                      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", fontSize: 11, color: "text.secondary" }}>
                        {stats.settingStats.map((st, idx) => {
                          const palette = ["#2196f3", "#4caf50", "#ff9800", "#9c27b0", "#00bcd4", "#795548"];
                          const color = st.name === "INT" ? "#2196f3" : st.name === "EXT" ? "#4caf50" : st.name === "INT/EXT" ? "#ff9800" : palette[idx % palette.length];
                          return (
                            <span key={st.name} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color, display: "inline-block" }} />
                              {st.name}: {st.count} ({st.percentage}%)
                            </span>
                          );
                        })}
                      </Box>
                    </>
                  )}
                </Box>

                {/* Day / Night / All Times Stacked Bar */}
                <Box>
                  <Typography sx={{ fontSize: 11, color: "text.secondary", fontWeight: 700, mb: 1 }}>
                    TIME OF DAY BREAKDOWN
                  </Typography>
                  {stats.headingCount > 0 && (() => {
                    const getTimeColor = (name: string, index: number) => {
                      const upper = name.toUpperCase();
                      if (upper === "DAY") return "#ffb74d";
                      if (upper === "NIGHT") return "#7e57c2";
                      if (upper.includes("MORNING") || upper.includes("DAWN")) return "#ff9800";
                      if (upper.includes("EVENING") || upper.includes("DUSK")) return "#e91e63";
                      if (upper.includes("AFTERNOON")) return "#fbc02d";
                      if (upper.includes("CONTINUOUS")) return "#4caf50";
                      if (upper.includes("LATER")) return "#00bcd4";
                      if (upper.includes("SAME")) return "#8e24aa";
                      const palette = ["#00acc1", "#3949ab", "#d81b60", "#00897b", "#7cb342", "#fb8c00"];
                      return palette[index % palette.length];
                    };

                    return (
                      <>
                        <Box sx={{ height: 16, borderRadius: 1, overflow: "hidden", display: "flex", mb: 1, bgcolor: "action.disabledBackground" }}>
                          {stats.timeOfDayStats.map((t, idx) => (
                            <Tooltip key={t.name} title={`${t.name}: ${t.count} scenes (${t.percentage}%)`}>
                              <Box sx={{ width: `${t.percentage}%`, bgcolor: getTimeColor(t.name, idx) }} />
                            </Tooltip>
                          ))}
                        </Box>
                        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", fontSize: 11, color: "text.secondary", maxHeight: 90, overflowY: "auto" }}>
                          {stats.timeOfDayStats.map((t, idx) => (
                            <span key={t.name} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: getTimeColor(t.name, idx), display: "inline-block" }} />
                              {t.name}: {t.count} ({t.percentage}%)
                            </span>
                          ))}
                        </Box>
                      </>
                    );
                  })()}
                </Box>

                {/* Top Locations List */}
                <Box>
                  <Typography sx={{ fontSize: 11, color: "text.secondary", fontWeight: 700, mb: 1 }}>
                    TOP LOCATIONS
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, maxHeight: 110, overflowY: "auto" }}>
                    {stats.locations.map((loc) => (
                      <Box key={loc.name} sx={{ display: "flex", justifyContent: "space-between", fontSize: 11, px: 1, py: 0.25, bgcolor: "action.hover", borderRadius: 1 }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {loc.name}
                        </Typography>
                        <Chip label={loc.count} size="small" sx={{ height: 16, fontSize: 10, fontWeight: 700 }} />
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Box>
        )}

        {/* ─── TAB 1: PACING & TIMELINE ────────────────────────────────────────── */}
        {tabIndex === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Interactive Visual Script Timeline */}
            <Paper elevation={1} sx={{ p: 2.5, borderRadius: 2, bgcolor: "background.paper" }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 1.5 }}>
                Interactive Script Sequence Timeline
              </Typography>
              <Typography sx={{ fontSize: 11, color: "text.secondary", mb: 2 }}>
                Each block represents a scene. Width is proportional to scene length. Double-click any scene to jump to it in the editor.
              </Typography>

              <Box
                ref={timelineContainerRef}
                sx={{
                  display: "flex",
                  gap: "2px",
                  height: 48,
                  width: "100%",
                  bgcolor: "action.hover",
                  borderRadius: 1.5,
                  p: 0.5,
                  overflowX: "auto",
                }}
              >
                {sceneTimings.map((st, i) => {
                  const pct = totalRuntimeSeconds > 0 ? (st.durationSeconds / totalRuntimeSeconds) * 100 : 100 / sceneTimings.length;
                  const isExt = st.heading.toUpperCase().includes("EXT");
                  const bg = isExt ? "#4caf50" : "#2196f3";

                  return (
                    <Tooltip key={i} title={`Scene ${i + 1}: ${cleanSceneHeading(st.heading)} (${formatDuration(st.durationSeconds)})`}>
                      <Box
                        onDoubleClick={() => handleScrollToLine(st.lineIndex)}
                        sx={{
                          flexBasis: `${pct}%`,
                          flexShrink: 0,
                          minWidth: 12,
                          height: "100%",
                          bgcolor: bg,
                          borderRadius: 0.75,
                          cursor: "pointer",
                          opacity: 0.85,
                          transition: "opacity 0.15s",
                          "&:hover": { opacity: 1, transform: "scaleY(1.05)" },
                        }}
                      />
                    </Tooltip>
                  );
                })}
              </Box>
            </Paper>

            {/* Pacing Chart (Dialogue vs Action Density) */}
            <Paper elevation={1} sx={{ p: 2.5, borderRadius: 2, bgcolor: "background.paper" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                    Scene Pacing Chart (Dialogue vs Action Density)
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: "text.secondary", mt: 0.25 }}>
                    Click any scene bar to jump to it in the editor.
                  </Typography>
                </Box>

                {/* Legend & Zoom Controls */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Box sx={{ display: "flex", gap: 2, fontSize: 11, color: "text.secondary" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#2196f3", display: "inline-block" }} />
                      Dialogue Words
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#ff9800", display: "inline-block" }} />
                      Action Words
                    </span>
                  </Box>

                  <Box sx={{ display: "flex", gap: 0.5, bgcolor: "action.hover", p: 0.5, borderRadius: 1.5 }}>
                    {[1.0, 1.5, 2.0].map((z) => (
                      <Button
                        key={z}
                        size="small"
                        variant={pacingZoom === z ? "contained" : "text"}
                        onClick={() => setPacingZoom(z)}
                        sx={{
                          minWidth: 36,
                          height: 24,
                          fontSize: 10,
                          fontWeight: 700,
                          py: 0,
                          px: 1,
                          boxShadow: "none",
                        }}
                      >
                        {z}x
                      </Button>
                    ))}
                  </Box>
                </Box>
              </Box>

              {/* Chart Body */}
              <Box ref={pacingContainerRef} sx={{ height: 220, width: "100%", overflowX: "auto", pt: 1 }}>
                {sceneTimings.length > 0 && (() => {
                  const maxWords = Math.max(
                    ...sceneTimings.map((s) => Math.max(s.dialogueWords, s.actionWords)),
                    50
                  );
                  const avgWords = Math.round(
                    sceneTimings.reduce((sum, s) => sum + s.totalWords, 0) / (sceneTimings.length || 1)
                  );
                  const chartHeight = 160;
                  const colWidth = 32;
                  const totalWidth = Math.max(sceneTimings.length * colWidth, 600) * pacingZoom;

                  return (
                    <Box sx={{ minWidth: totalWidth, height: "100%", position: "relative" }}>
                      <svg width="100%" height={chartHeight + 30} viewBox={`0 0 ${sceneTimings.length * colWidth + 20} ${chartHeight + 30}`}>
                        {/* Background Grid Lines */}
                        <line x1="0" y1="20" x2={sceneTimings.length * colWidth + 20} y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="3" />
                        <line x1="0" y1={chartHeight / 2} x2={sceneTimings.length * colWidth + 20} y2={chartHeight / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="3" />
                        <line x1="0" y1={chartHeight} x2={sceneTimings.length * colWidth + 20} y2={chartHeight} stroke="rgba(255,255,255,0.12)" />

                        {/* Average Reference Line */}
                        {avgWords > 0 && (() => {
                          const avgY = chartHeight - (avgWords / (maxWords * 2)) * chartHeight;
                          return (
                            <g>
                              <line x1="0" y1={avgY} x2={sceneTimings.length * colWidth + 20} y2={avgY} stroke="#ffeb3b" strokeDasharray="4" strokeWidth="1" opacity="0.6" />
                              <text x={sceneTimings.length * colWidth + 10} y={avgY - 3} fill="#ffeb3b" fontSize="8" textAnchor="end" opacity="0.8">
                                Avg Scene ({avgWords}w)
                              </text>
                            </g>
                          );
                        })()}

                        {/* Scene Bars */}
                        {sceneTimings.map((st, i) => {
                          const x = i * colWidth + 10;
                          const diaH = Math.max(4, (st.dialogueWords / maxWords) * (chartHeight - 20));
                          const actH = Math.max(4, (st.actionWords / maxWords) * (chartHeight - 20));

                          return (
                            <Tooltip
                              key={i}
                              title={
                                <Box sx={{ p: 0.5 }}>
                                  <Typography sx={{ fontSize: 11, fontWeight: 800 }}>
                                    Scene {i + 1}: {cleanSceneHeading(st.heading)}
                                  </Typography>
                                  <Typography sx={{ fontSize: 10, color: "#90caf9", mt: 0.5 }}>
                                    Dialogue: {st.dialogueWords} words
                                  </Typography>
                                  <Typography sx={{ fontSize: 10, color: "#ffcc80" }}>
                                    Action: {st.actionWords} words
                                  </Typography>
                                  <Typography sx={{ fontSize: 9, color: "#bbb", mt: 0.5, fontStyle: "italic" }}>
                                    Click to jump to line {st.lineIndex + 1}
                                  </Typography>
                                </Box>
                              }
                            >
                              <g
                                onClick={() => handleScrollToLine(st.lineIndex)}
                                style={{ cursor: "pointer" }}
                              >
                                {/* Dialogue Bar */}
                                <rect
                                  x={x}
                                  y={chartHeight - diaH}
                                  width="9"
                                  height={diaH}
                                  fill="#2196f3"
                                  rx="2"
                                  opacity="0.9"
                                />
                                {/* Action Bar */}
                                <rect
                                  x={x + 11}
                                  y={chartHeight - actH}
                                  width="9"
                                  height={actH}
                                  fill="#ff9800"
                                  rx="2"
                                  opacity="0.9"
                                />
                                {/* Scene Label on X Axis */}
                                <text
                                  x={x + 10}
                                  y={chartHeight + 16}
                                  fill="rgba(255,255,255,0.5)"
                                  fontSize="9"
                                  fontWeight="600"
                                  textAnchor="middle"
                                >
                                  {i + 1}
                                </text>
                              </g>
                            </Tooltip>
                          );
                        })}
                      </svg>
                    </Box>
                  );
                })()}
              </Box>
            </Paper>

            {/* Character Presence Matrix Grid */}
            <Paper elevation={1} sx={{ p: 2.5, borderRadius: 2, bgcolor: "background.paper" }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 1.5 }}>
                Character Scene Presence Matrix
              </Typography>

              <Box sx={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "6px" }}>Character</th>
                      {presenceGridData.matrix.map((_, i) => (
                        <th key={i} style={{ padding: "4px", fontSize: 9 }}>S{i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {presenceGridData.topChars.map((char, cIdx) => (
                      <tr key={char.name} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "6px", fontWeight: 700 }}>{char.name}</td>
                        {presenceGridData.matrix.map((row, rIdx) => {
                          const val = row.presence[cIdx];
                          const bg = val > 0 ? `rgba(33, 150, 243, ${Math.min(1, 0.2 + val / 100)})` : "transparent";
                          return (
                            <td key={rIdx} onClick={() => handleScrollToLine(row.lineIndex)} style={{ textAlign: "center", cursor: "pointer" }}>
                              <Box sx={{ width: 14, height: 14, borderRadius: "3px", bgcolor: bg, margin: "auto" }} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Paper>
          </Box>
        )}

        {/* ─── TAB 2: CHARACTERS ──────────────────────────────────────────────── */}
        {tabIndex === 2 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Gender Analysis Card */}
            <Paper elevation={1} sx={{ p: 2.5, borderRadius: 2, bgcolor: "background.paper" }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>
                Demographic & Gender Analysis
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2 }}>
                {(["male", "female", "nonbinary", "unknown"] as const).map((g) => (
                  <Paper key={g} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, borderLeft: 4, borderColor: getGenderColor(g) }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                      {g}
                    </Typography>
                    <Typography sx={{ fontSize: 20, fontWeight: 800, mt: 0.5 }}>
                      {genderStats.counts[g]} <span style={{ fontSize: 12, fontWeight: 400 }}>chars</span>
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                      {genderStats.percentages[g]}% of dialogue words
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Paper>

            {/* Filterable Character Directory */}
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <TextField
                size="small"
                placeholder="Search characters..."
                value={characterFilter}
                onChange={(e) => setCharacterFilter(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ width: 260 }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel sx={{ fontSize: 12 }}>Filter by Role</InputLabel>
                <Select
                  value={roleFilter}
                  label="Filter by Role"
                  onChange={(e) => setRoleFilter(e.target.value)}
                  sx={{ fontSize: 12 }}
                >
                  <MenuItem value="all">All Roles</MenuItem>
                  <MenuItem value="protagonist">Protagonist</MenuItem>
                  <MenuItem value="antagonist">Antagonist</MenuItem>
                  <MenuItem value="supporting">Supporting</MenuItem>
                  <MenuItem value="minor">Minor</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Character Cards Grid */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 2 }}>
              {filteredCharacters.map((char) => (
                <Paper key={char.name} elevation={1} sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper", display: "flex", flexDirection: "column", gap: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: char.color || getGenderColor(char.gender) }} />
                      <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{char.name}</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => setSelectedChar(char.name)}>
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>

                  <Box sx={{ display: "flex", gap: 2, fontSize: 11, color: "text.secondary" }}>
                    <span>{char.lineCount} lines</span>
                    <span>{char.wordCount} words</span>
                    <span>{char.dialoguePercentage.toFixed(1)}% dialogue</span>
                  </Box>

                  <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                    <Chip label={char.gender} size="small" sx={{ fontSize: 10, height: 20 }} />
                    <Chip label={char.role || "Unassigned"} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* Character Profile Modal */}
      {selectedChar && (
        <CharacterEditModal
          charName={selectedChar}
          profile={characterProfiles[selectedChar] || {}}
          onClose={() => setSelectedChar(null)}
          onSave={(p) => {
            handleSaveProfile(selectedChar, p);
            setSelectedChar(null);
          }}
        />
      )}
    </Box>
  );
}

// ─── Character Edit Modal Component ──────────────────────────────────────────

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
    profile.relationships || []
  );

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
        <TextField label="Description" multiline rows={2} fullWidth value={description} onChange={(e) => setDescription(e.target.value)} size="small" />

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
          <FormControl size="small">
            <InputLabel>Role</InputLabel>
            <Select value={role} label="Role" onChange={(e) => setRole(e.target.value)}>
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

        <TextField label="Backstory" multiline rows={2} fullWidth value={backstory} onChange={(e) => setBackstory(e.target.value)} size="small" />
        <TextField label="Character Arc" multiline rows={2} fullWidth value={arc} onChange={(e) => setArc(e.target.value)} size="small" />

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
            <Box key={idx} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: "action.hover", p: 1, borderRadius: 1 }}>
              <Typography sx={{ fontSize: 12 }}>
                {rel.target} &mdash; <strong>{rel.type}</strong>
              </Typography>
              <IconButton size="small" onClick={() => handleRemoveRelationship(idx)}>
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          ))}
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <TextField placeholder="Target Name" size="small" value={newRelTarget} onChange={(e) => setNewRelTarget(e.target.value)} />
            <TextField placeholder="Relation (e.g. Rival)" size="small" value={newRelType} onChange={(e) => setNewRelType(e.target.value)} />
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

// ─── Outer Window Container Component ─────────────────────────────────────

export const XrayWindow: React.FC = () => {
  const [themeId, setThemeId] = useState(() => getInitialThemeId());
  const [appScale, setAppScale] = useState(100);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(() => getInitialCustomThemes());
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [data, setData] = useState<XrayData | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const { currentStep: tourStep, tourName, progress, taskComplete, isLastStep, currentIndex, totalSteps } = useTourListener("xray");

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
      try {
        const { emit, listen } = await import("@tauri-apps/api/event");
        const unlisten = await listen<XrayData>("modal:xray:init", (event) => {
          if (!cancelled) {
            setData(event.payload);
            setTimedOut(false);
          }
        });
        emit("modal:xray:ready");
        return unlisten;
      } catch {
        // not in Tauri
      }
    };

    let cleanup: (() => void) | undefined;
    setup().then((fn) => {
      cleanup = fn;
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
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch {
      window.close();
    }
  }, []);

  const currentThemeConfig = useMemo(
    () => resolveThemeConfig(themeId, customThemes, systemDark),
    [themeId, customThemes, systemDark]
  );
  const muiTheme = useMemo(
    () => createActOneTheme(currentThemeConfig, appScale),
    [currentThemeConfig, appScale]
  );

  useEffect(() => {
    document.body.classList.toggle("dark-theme", currentThemeConfig.isDark);
  }, [currentThemeConfig.isDark]);

  return (
    <>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        <WindowResizeHandles />
        <Box sx={{ height: "100vh", overflow: "hidden", zoom: `${appScale}%` }}>
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
            try {
              const { emit } = await import("@tauri-apps/api/event");
              await emit("tour:step-done", { stepIndex: 0, window: "xray" });
            } catch {
              void 0;
            }
          }}
          onCancel={async () => {
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
