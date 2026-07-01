import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Tabs,
  Tab,
  TextField,
  IconButton,
  List,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from "@mui/material";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createActOneTheme } from "../theme";
import { resolveThemeConfig, type CustomTheme } from "../theme/themeUtils";
import { initThemeEngine, onThemeChanged } from "../theme/ThemeEngine";
import { LineType, type FountainDocument } from "../parser";
import {
  extractCharacters,
  computeStats,
  computeSceneTiming,
  computeCharacterConnections,
} from "../utils/analysis";
import { getPerScriptSetting } from "../utils/perScriptSettings";
import {
  SearchIcon,
  CloseIcon,
  PersonIcon,
  BarChartIcon,
  TimerIcon,
  AddIcon,
  DeleteIcon,
  EditIcon,
} from "./Icons";
import { WindowResizeHandles } from "./WindowResizeHandles";
import SvgIcon, { SvgIconProps } from "@mui/material/SvgIcon";

const ShareIconLocal = (props: SvgIconProps) => (
  <SvgIcon {...props}>
    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
  </SvgIcon>
);

const getGenderColor = (gender: string) => {
  switch (gender?.toLowerCase()) {
    case "male":
      return "#2196f3"; // Blue
    case "female":
      return "#e91e63"; // Pink
    case "nonbinary":
      return "#9c27b0"; // Purple
    default:
      return "#9e9e9e"; // Grey (Unassigned)
  }
};

const CHART_COLORS = [
  "#8b5cf6", // Purple
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Orange
  "#ef4444", // Red
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#f97316", // Amber
  "#6366f1", // Indigo
  "#84cc16", // Lime
];

const SWATCH_COLORS = [
  "#9c27b0", // Purple
  "#2196f3", // Blue
  "#00bcd4", // Teal
  "#4caf50", // Green
  "#ffeb3b", // Yellow
  "#ff9800", // Orange
  "#f44336", // Red
  "#000000", // Black
  "#ffffff", // White
];

interface XrayData {
  parsedDoc: FountainDocument;
  scriptFileName: string;
  settings: Record<string, any>;
}

interface XrayContentProps {
  data: XrayData | null;
  onClose?: () => void;
  timedOut?: boolean;
}

// Helper to format timings
const formatDuration = (totalSeconds: number) => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.round(totalSeconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

function cleanSceneHeading(heading: string): string {
  if (!heading) return "";
  let cleaned = heading.replace(/#.*?#/g, "");
  cleaned = cleaned.replace(/^\s*\d+[\.\s]*/, "");
  cleaned = cleaned.replace(/\[\[.*?\]\]/g, ""); // Strip custom double-bracket tag markers
  cleaned = cleaned.replace(/[\*_~]/g, "");
  return cleaned.trim().toUpperCase();
}

function XrayContent({ data, onClose, timedOut }: XrayContentProps) {
  const [tabIndex, setTabIndex] = useState(0);
  const [characterFilter, setCharacterFilter] = useState("");
  const [selectedChar, setSelectedChar] = useState<string | null>(null);

  // SVG network map hover state
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [secondSelectedNode, setSecondSelectedNode] = useState<string | null>(null);
  const [connectionsMode, setConnectionsMode] = useState<"network" | "matrix">("network");

  // Pacing chart zoom state
  const [pacingZoom, setPacingZoom] = useState(1);
  const pacingContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);

  useEffect(() => {
    if (!pacingContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(pacingContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const doc = data?.parsedDoc;
  const settings = data?.settings || {};
  const scriptFileName = data?.scriptFileName || "";

  const sceneTimings = useMemo(() => {
    if (!doc) return [];
    return computeSceneTiming(doc);
  }, [doc]);

  const getSharedScenes = useCallback((charA: string, charB: string) => {
    if (!doc) return [];
    const shared: typeof sceneTimings = [];
    sceneTimings.forEach((scene, sceneIdx) => {
      let hasA = false;
      let hasB = false;
      let currentSceneIdx = -1;
      for (const line of doc.lines) {
        if (line.type === LineType.heading) {
          currentSceneIdx++;
        }
        if (currentSceneIdx === sceneIdx) {
          if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
            const name = line.text.replace(/^@[ ]*/, "").replace(/[ ]*\^[ ]*$/, "").replace(/\s*\([^)]*\)/g, "").trim().toUpperCase();
            if (name === charA) hasA = true;
            if (name === charB) hasB = true;
          }
        }
      }
      if (hasA && hasB) {
        shared.push(scene);
      }
    });
    return shared;
  }, [doc, sceneTimings]);


  // Retrieve character profiles from document settings
  const characterProfiles = useMemo(() => {
    return getPerScriptSetting("characterProfiles", settings, scriptFileName) || {};
  }, [settings, scriptFileName]);

  const genders = useMemo(() => {
    return getPerScriptSetting("genders", settings, scriptFileName) || {};
  }, [settings, scriptFileName]);

  const characters = useMemo(() => {
    if (!doc) return [];
    return extractCharacters(doc, genders, characterProfiles);
  }, [doc, genders, characterProfiles]);

  const totalDialogueLines = useMemo(() => {
    return characters.reduce((sum, c) => sum + c.lineCount, 0);
  }, [characters]);

  const filteredCharacters = useMemo(() => {
    if (!characterFilter) return characters;
    return characters.filter((c) =>
      c.name.toLowerCase().includes(characterFilter.toLowerCase())
    );
  }, [characters, characterFilter]);

  const stats = useMemo(() => {
    if (!doc) return null;
    return computeStats(doc, genders, characterProfiles);
  }, [doc, genders, characterProfiles]);



  const characterConnections = useMemo(() => {
    if (!doc) return [];
    return computeCharacterConnections(doc);
  }, [doc]);

  const totalRuntimeSeconds = useMemo(() => {
    if (sceneTimings.length === 0) return 0;
    const last = sceneTimings[sceneTimings.length - 1];
    return last.offsetSeconds + last.durationSeconds;
  }, [sceneTimings]);

  // A. Dialogue distribution max words calculation
  const maxDialogueWords = useMemo(() => {
    if (characters.length === 0) return 1;
    return Math.max(...characters.map((c) => c.wordCount));
  }, [characters]);

  // B. Gender Breakdown computation
  const genderStats = useMemo(() => {
    const map: Record<string, { characters: number; lines: number; words: number }> = {};
    let totalWords = 0;
    for (const char of characters) {
      const g = char.gender || "unassigned";
      if (!map[g]) map[g] = { characters: 0, lines: 0, words: 0 };
      map[g].characters++;
      map[g].lines += char.lineCount;
      map[g].words += char.wordCount;
      totalWords += char.wordCount;
    }
    return Object.entries(map).map(([gender, d], idx) => ({
      gender: gender.charAt(0).toUpperCase() + gender.slice(1),
      characters: d.characters,
      lines: d.lines,
      words: d.words,
      percentage: totalWords > 0 ? (d.words / totalWords) * 100 : 0,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    })).sort((a, b) => b.words - a.words);
  }, [characters]);

  // C. INT / EXT & Scene Breakdowns computation
  const sceneBreakdowns = useMemo(() => {
    let intCount = 0;
    let extCount = 0;
    let comboCount = 0;

    let dayCount = 0;
    let nightCount = 0;
    let otherCount = 0;

    const lengthBuckets = [
      { label: "< 1 page", count: 0 },
      { label: "1-2 pages", count: 0 },
      { label: "2-3 pages", count: 0 },
      { label: "3-5 pages", count: 0 },
      { label: "5+ pages", count: 0 },
    ];

    const locationMap: Record<string, number> = {};

    for (const scene of sceneTimings) {
      // INT / EXT parsing
      const headingUpper = scene.heading.toUpperCase();
      if (headingUpper.startsWith("INT.") || headingUpper.startsWith("INT ")) {
        intCount++;
      } else if (headingUpper.startsWith("EXT.") || headingUpper.startsWith("EXT ")) {
        extCount++;
      } else if (headingUpper.startsWith("I/E") || headingUpper.startsWith("INT/EXT")) {
        comboCount++;
      } else {
        intCount++; // Default fallback
      }

      // Time of Day parsing
      if (headingUpper.includes("- DAY") || headingUpper.includes("-DAY") || headingUpper.includes(" DAY")) {
        dayCount++;
      } else if (headingUpper.includes("- NIGHT") || headingUpper.includes("-NIGHT") || headingUpper.includes(" NIGHT")) {
        nightCount++;
      } else {
        otherCount++;
      }

      // Length buckets
      const pages = scene.totalWords / 250;
      if (pages < 1) lengthBuckets[0].count++;
      else if (pages < 2) lengthBuckets[1].count++;
      else if (pages < 3) lengthBuckets[2].count++;
      else if (pages < 5) lengthBuckets[3].count++;
      else lengthBuckets[4].count++;

      // Locations extraction
      // Simple location extraction from INT. LOCATION - TIME
      const match = scene.heading.match(/^(?:INT\.\/EXT\.|INT\.|EXT\.|I\/E)\s+(.+?)(?:\s+-\s+|$)/i);
      const loc = (match ? match[1] : scene.heading).trim().toUpperCase();
      locationMap[loc] = (locationMap[loc] || 0) + 1;
    }

    const topLocations = Object.entries(locationMap)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      intCount,
      extCount,
      comboCount,
      dayCount,
      nightCount,
      otherCount,
      lengthBuckets,
      topLocations,
    };
  }, [sceneTimings]);

  // D. Character Presence Grid computation
  // Pre-compute which characters speak in which scene (by scene index)
  const sceneCharacterMap = useMemo(() => {
    if (!doc || sceneTimings.length === 0) return new Map<number, Set<string>>();
    const map = new Map<number, Set<string>>();
    let sceneIdx = -1;
    for (const line of doc.lines) {
      if (line.type === LineType.heading) {
        sceneIdx++;
        map.set(sceneIdx, new Set());
      }
      if (sceneIdx >= 0 && (line.type === LineType.character || line.type === LineType.dualDialogueCharacter)) {
        const name = line.text.replace(/^@[ ]*/, "").replace(/[ ]*\^[ ]*$/, "").replace(/\s*\([^)]*\)/g, "").trim().toUpperCase();
        if (name) map.get(sceneIdx)?.add(name);
      }
    }
    return map;
  }, [doc, sceneTimings]);

  const presenceGridData = useMemo(() => {
    if (sceneTimings.length === 0 || characters.length === 0) return null;
    const topChars = characters.slice(0, 20);

    return topChars.map((char) => {
      const presence = sceneTimings.map((_, sceneIdx) => {
        return sceneCharacterMap.get(sceneIdx)?.has(char.name) ?? false;
      });

      return {
        name: char.name,
        color: characterProfiles[char.name]?.color || getGenderColor(char.gender),
        presence,
      };
    });
  }, [sceneTimings, characters, sceneCharacterMap, characterProfiles]);

  // SVG network map connections computation
  const connectionsSvg = useMemo(() => {
    if (characters.length === 0) return null;
    const width = 540;
    const height = 360;
    const cx = width / 2;
    const cy = height / 2;
    const r = 120;

    const activeChars = characters.slice(0, 12);
    const charCount = activeChars.length;

    const positions = activeChars.map((char, index) => {
      const angle = (index * 2 * Math.PI) / charCount - Math.PI / 2;
      return {
        name: char.name,
        color: characterProfiles[char.name]?.color || getGenderColor(char.gender),
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    });

    const activeConnections = characterConnections.filter(
      (c) =>
        positions.some((p) => p.name === c.source) &&
        positions.some((p) => p.name === c.target)
    );

    const maxInteractions = Math.max(1, ...activeConnections.map((c) => c.interactions));

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        {activeConnections.map((conn, idx) => {
          const p1 = positions.find((p) => p.name === conn.source)!;
          const p2 = positions.find((p) => p.name === conn.target)!;
          
          const isConnectionSelected =
            (selectedNode === conn.source && secondSelectedNode === conn.target) ||
            (selectedNode === conn.target && secondSelectedNode === conn.source);
          
          const isHighlighted = isConnectionSelected || (
            !secondSelectedNode && (
              selectedNode === conn.source || selectedNode === conn.target ||
              hoveredNode === conn.source || hoveredNode === conn.target
            )
          );

          const isDimmed = secondSelectedNode 
            ? !isConnectionSelected 
            : (selectedNode && selectedNode !== conn.source && selectedNode !== conn.target) ||
              (hoveredNode && hoveredNode !== conn.source && hoveredNode !== conn.target);

          const opacity = isHighlighted ? 0.95 : isDimmed ? 0.03 : 0.25;
          const strokeWidth = 1 + (conn.interactions / maxInteractions) * 5;

          return (
            <g key={idx}>
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={isHighlighted ? "#8b5cf6" : "#90caf9"}
                strokeWidth={strokeWidth}
                strokeOpacity={opacity}
              />
            </g>
          );
        })}

        {positions.map((pos) => {
          const isSelected = selectedNode === pos.name || secondSelectedNode === pos.name;
          const isHighlighted = hoveredNode === pos.name || isSelected;
          const isDimmed = secondSelectedNode
            ? (selectedNode !== pos.name && secondSelectedNode !== pos.name)
            : (selectedNode && selectedNode !== pos.name) || (hoveredNode && hoveredNode !== pos.name);
          const radius = isSelected ? 12 : hoveredNode === pos.name ? 10 : 8;

          return (
            <g
              key={pos.name}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoveredNode(pos.name)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  if (selectedNode) {
                    if (selectedNode === pos.name) {
                      setSelectedNode(secondSelectedNode);
                      setSecondSelectedNode(null);
                    } else if (secondSelectedNode === pos.name) {
                      setSecondSelectedNode(null);
                    } else {
                      setSecondSelectedNode(pos.name);
                    }
                  } else {
                    setSelectedNode(pos.name);
                  }
                } else {
                  if (selectedNode === pos.name && !secondSelectedNode) {
                    setSelectedNode(null);
                  } else {
                    setSelectedNode(pos.name);
                    setSecondSelectedNode(null);
                  }
                }
              }}
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r={radius}
                fill={pos.color}
                stroke="#fff"
                strokeWidth={isHighlighted ? 2.5 : 1}
                style={{ opacity: isDimmed ? 0.35 : 1 }}
              />
              <text
                x={pos.x}
                y={pos.y - radius - 4}
                textAnchor="middle"
                fontSize="9"
                fontWeight={isHighlighted ? "700" : "500"}
                fill={isHighlighted ? "#8b5cf6" : "#e0e0e0"}
                style={{
                  opacity: isDimmed ? 0.3 : 1,
                  paintOrder: "stroke",
                  stroke: "#121212",
                  strokeWidth: 2,
                }}
              >
                {pos.name}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }, [characters, characterProfiles, characterConnections, hoveredNode, selectedNode, secondSelectedNode]);

  // Edit Modal save function
  const handleSaveProfile = async (charName: string, updatedProfile: any) => {
    try {
      const { emit } = await import("@tauri-apps/api/event");
      emit("modal:xray:save-profile", { characterName: charName, profile: updatedProfile });
    } catch (e) {
      console.error("Failed to save character profile:", e);
    }
  };

  const getCharacterAppearanceCount = (charName: string) => {
    if (!doc) return 0;
    let count = 0;
    let activeSceneHasChar = false;
    for (const line of doc.lines) {
      if (line.type === LineType.heading) {
        if (activeSceneHasChar) count++;
        activeSceneHasChar = false;
      } else if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
        const name = line.text.replace(/^@[ ]*/, "").replace(/[ ]*\^[ ]*$/, "").replace(/\s*\([^)]*\)/g, "").trim().toUpperCase();
        if (name === charName) {
          activeSceneHasChar = true;
        }
      }
    }
    if (activeSceneHasChar) count++;
    return count;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", bgcolor: "background.default", color: "text.primary", overflow: "hidden" }}>
      {/* Header bar */}
      <Box
        data-tauri-drag-region
        sx={{
          display: "flex",
          alignItems: "center",
          px: 2,
          py: 0.5,
          borderBottom: 1,
          borderColor: "divider",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <BarChartIcon sx={{ fontSize: 18, color: "primary.main" }} />
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 14 }}>
            X-Ray
          </Typography>
        </Box>
        {data && (
          <Tabs
            value={tabIndex}
            onChange={(_, v) => setTabIndex(v)}
            sx={{
              ml: 3,
              minHeight: 32,
              "& .MuiTab-root": {
                minHeight: 32,
                py: 0,
                fontSize: 12,
                textTransform: "none",
                fontWeight: 600,
                color: "text.secondary",
                "&.Mui-selected": {
                  color: "primary.main",
                },
              },
              "& .MuiTabs-indicator": {
                bgcolor: "primary.main",
              },
            }}
          >
            <Tab label="Statistics" />
            <Tab label="Timing" icon={<TimerIcon sx={{ fontSize: 15 }} />} iconPosition="start" />
            <Tab label="Characters" icon={<PersonIcon sx={{ fontSize: 15 }} />} iconPosition="start" />
            <Tab label="Connections" icon={<ShareIconLocal sx={{ fontSize: 15 }} />} iconPosition="start" />
          </Tabs>
        )}
        {onClose && (
          <IconButton aria-label="close" onClick={onClose} sx={{ color: "#9e9e9e", ml: "auto", p: 0.5 }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Box>

      {/* Content wrapper */}
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

        {/* Tab 0: Comprehensive Script Statistics (matching screenshots 1, 2, 3) */}
        {tabIndex === 0 && stats && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {/* Overview Cards */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2 }}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2, textAlign: "center" }}>
                <Typography variant="h3" sx={{ fontWeight: 800, fontSize: "2rem", color: "text.primary" }}>
                  {stats.pages}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>
                  Pages
                </Typography>
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontSize: "0.7rem", mt: 0.5 }}>
                  Est. {formatDuration(totalRuntimeSeconds)}
                </Typography>
              </Paper>

              <Paper elevation={0} sx={{ p: 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2, textAlign: "center" }}>
                <Typography variant="h3" sx={{ fontWeight: 800, fontSize: "2rem", color: "text.primary" }}>
                  {stats.headingCount}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>
                  Scenes
                </Typography>
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontSize: "0.7rem", mt: 0.5 }}>
                  Avg {(stats.pages / Math.max(1, stats.headingCount)).toFixed(1)} pages
                </Typography>
              </Paper>

              <Paper elevation={0} sx={{ p: 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2, textAlign: "center" }}>
                <Typography variant="h3" sx={{ fontWeight: 800, fontSize: "2rem", color: "text.primary" }}>
                  {characters.length}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>
                  Characters
                </Typography>
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontSize: "0.7rem", mt: 0.5 }}>
                  {totalDialogueLines} dialogue lines
                </Typography>
              </Paper>

              <Paper elevation={0} sx={{ p: 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2, textAlign: "center" }}>
                <Typography variant="h3" sx={{ fontWeight: 800, fontSize: "2rem", color: "text.primary" }}>
                  {stats.totalWords.toLocaleString()}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>
                  Words
                </Typography>
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontSize: "0.7rem", mt: 0.5 }}>
                  {Math.round(stats.totalWords / Math.max(1, stats.pages))} per page
                </Typography>
              </Paper>
            </Box>

            {/* Dialogue Distribution */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.primary", mb: 2 }}>
                Dialogue Distribution
              </Typography>
              <Paper elevation={0} sx={{ p: 3, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 3 }}>
                  {characters.slice(0, 15).map((char, idx) => {
                    const profile = characterProfiles[char.name] || {};
                    const swatchColor = profile.color || CHART_COLORS[idx % CHART_COLORS.length];
                    const barWidth = maxDialogueWords > 0 ? (char.wordCount / maxDialogueWords) * 100 : 0;

                    return (
                      <Box key={char.name} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Typography variant="caption" sx={{ width: 100, textAlign: "right", fontWeight: 700, fontSize: "0.7rem", color: "text.secondary" }}>
                          {char.name}
                        </Typography>
                        <Box sx={{ flex: 1, bgcolor: "action.hover", height: 16, borderRadius: 1, overflow: "hidden" }}>
                          <Box sx={{ width: `${barWidth}%`, height: "100%", bgcolor: swatchColor, borderRadius: "0 4px 4px 0", transition: "width 0.5s ease" }} />
                        </Box>
                        <Typography variant="caption" sx={{ width: 40, fontWeight: 600, fontSize: "0.75rem", color: "text.primary" }}>
                          {char.wordCount}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>

                {/* Grid Table */}
                <Box sx={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", color: "var(--text-muted, #aaa)" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid", borderBottomColor: "var(--border-color, #2d2d2d)", textAlign: "left" }}>
                        <th style={{ padding: "8px 12px", color: "var(--text-main, #fff)" }}>CHARACTER</th>
                        <th style={{ padding: "8px 12px", color: "var(--text-main, #fff)" }}>LINES</th>
                        <th style={{ padding: "8px 12px", color: "var(--text-main, #fff)" }}>WORDS</th>
                        <th style={{ padding: "8px 12px", color: "var(--text-main, #fff)" }}>% DIALOGUE</th>
                        <th style={{ padding: "8px 12px", color: "var(--text-main, #fff)" }}>SCENES</th>
                        <th style={{ padding: "8px 12px", color: "var(--text-main, #fff)" }}>ROLE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {characters.map((c, idx) => {
                        const profile = characterProfiles[c.name] || {};
                        const swatchColor = profile.color || CHART_COLORS[idx % CHART_COLORS.length];
                        return (
                          <tr key={c.name} style={{ borderBottom: "1px solid", borderBottomColor: "var(--border-color, #202020)" }}>
                            <td style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, color: "var(--text-main, #fff)" }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: swatchColor }} />
                              {c.name}
                            </td>
                            <td style={{ padding: "8px 12px" }}>{c.lineCount}</td>
                            <td style={{ padding: "8px 12px" }}>{c.wordCount}</td>
                            <td style={{ padding: "8px 12px" }}>{c.dialoguePercentage.toFixed(1)}%</td>
                            <td style={{ padding: "8px 12px" }}>{c.sceneCount}</td>
                            <td style={{ padding: "8px 12px" }}>{c.role || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Box>
              </Paper>
            </Box>

            {/* Gender Analysis */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.primary", mb: 2 }}>
                Gender Analysis
              </Typography>
              <Paper elevation={0} sx={{ p: 3, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 4, alignItems: "center" }}>
                <Box sx={{ display: "flex", justifyContent: "center", flexShrink: 0, width: 160 }}>
                  {/* SVG Donut Chart */}
                  <Box sx={{ width: 160, height: 160, position: "relative" }}>
                    <svg width="100%" height="100%" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="35" fill="none" stroke="var(--border-color, #2d2d2d)" strokeWidth="12" />
                      {genderStats.map((g) => {
                        const totalPercentageBefore = genderStats.slice(0, genderStats.indexOf(g)).reduce((sum, item) => sum + item.percentage, 0);
                        const strokeDasharray = `${(g.percentage * 2 * Math.PI * 35) / 100} ${2 * Math.PI * 35}`;
                        const strokeDashoffset = `${-(totalPercentageBefore * 2 * Math.PI * 35) / 100}`;
                        return (
                          <circle
                            key={g.gender}
                            cx="50"
                            cy="50"
                            r="35"
                            fill="none"
                            stroke={g.color}
                            strokeWidth="12"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            transform="rotate(-90 50 50)"
                            style={{ transition: "stroke-dasharray 0.5s ease" }}
                          />
                        );
                      })}
                    </svg>
                  </Box>
                </Box>
                <Box sx={{ flex: 1, width: "100%" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", color: "#aaa" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #2d2d2d", textAlign: "left" }}>
                          <th style={{ padding: "8px 12px", color: "#fff" }}>GENDER</th>
                          <th style={{ padding: "8px 12px", color: "#fff" }}>CHARACTERS</th>
                          <th style={{ padding: "8px 12px", color: "#fff" }}>LINES</th>
                          <th style={{ padding: "8px 12px", color: "#fff" }}>WORDS</th>
                          <th style={{ padding: "8px 12px", color: "#fff" }}>%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {genderStats.map((g) => (
                          <tr key={g.gender} style={{ borderBottom: "1px solid #202020" }}>
                            <td style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, color: "#fff" }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: g.color }} />
                              {g.gender}
                            </td>
                            <td style={{ padding: "8px 12px" }}>{g.characters}</td>
                            <td style={{ padding: "8px 12px" }}>{g.lines}</td>
                            <td style={{ padding: "8px 12px" }}>{g.words}</td>
                            <td style={{ padding: "8px 12px" }}>{g.percentage.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                </Box>
              </Paper>
            </Box>

            {/* Scene Breakdown */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#fff", mb: 2 }}>
                Scene Breakdown
              </Typography>
              <Grid container spacing={2}>
                {/* INT / EXT Donut */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2, textAlign: "center" }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                      INTERIOR / EXTERIOR
                    </Typography>
                    <Box sx={{ width: 100, height: 100, mx: "auto", my: 2, position: "relative" }}>
                      <svg width="100%" height="100%" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="35" fill="none" stroke="var(--border-color, #2d2d2d)" strokeWidth="10" />
                        {(() => {
                          const total = sceneBreakdowns.intCount + sceneBreakdowns.extCount + sceneBreakdowns.comboCount;
                          const intPct = total > 0 ? (sceneBreakdowns.intCount / total) * 100 : 100;
                          return (
                            <circle
                              cx="50"
                              cy="50"
                              r="35"
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth="10"
                              strokeDasharray={`${(intPct * 2 * Math.PI * 35) / 100} ${2 * Math.PI * 35}`}
                              transform="rotate(-90 50 50)"
                            />
                          );
                        })()}
                      </svg>
                      <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "text.primary" }}>
                          INT {sceneBreakdowns.intCount}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>

                {/* Time of Day Donut */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2, textAlign: "center" }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                      TIME OF DAY
                    </Typography>
                    <Box sx={{ width: 100, height: 100, mx: "auto", my: 2, position: "relative" }}>
                      <svg width="100%" height="100%" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="35" fill="none" stroke="var(--border-color, #2d2d2d)" strokeWidth="10" />
                        {(() => {
                          const total = sceneBreakdowns.dayCount + sceneBreakdowns.nightCount + sceneBreakdowns.otherCount;
                          const dayPct = total > 0 ? (sceneBreakdowns.dayCount / total) * 100 : 0;
                          const nightPct = total > 0 ? (sceneBreakdowns.nightCount / total) * 100 : 0;

                          const dashDay = `${(dayPct * 2 * Math.PI * 35) / 100} ${2 * Math.PI * 35}`;
                          const dashNight = `${(nightPct * 2 * Math.PI * 35) / 100} ${2 * Math.PI * 35}`;
                          const offsetNight = `${-(dayPct * 2 * Math.PI * 35) / 100}`;

                          return (
                            <>
                              <circle
                                cx="50"
                                cy="50"
                                r="35"
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="10"
                                strokeDasharray={dashDay}
                                transform="rotate(-90 50 50)"
                              />
                              <circle
                                cx="50"
                                cy="50"
                                r="35"
                                fill="none"
                                stroke="#8b5cf6"
                                strokeWidth="10"
                                strokeDasharray={dashNight}
                                strokeDashoffset={offsetNight}
                                transform="rotate(-90 50 50)"
                              />
                            </>
                          );
                        })()}
                      </svg>
                      <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.6rem", display: "block", color: "text.primary" }}>
                          Day {sceneBreakdowns.dayCount}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.6rem", display: "block", color: "#8b5cf6" }}>
                          Night {sceneBreakdowns.nightCount}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>

                {/* Scene Length Distribution */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2, textAlign: "center" }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                      SCENE LENGTH DISTRIBUTION
                    </Typography>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: 120, px: 1, pt: 2, pb: 4 }}>
                      {(() => {
                        const counts = sceneBreakdowns.lengthBuckets.map((b) => b.count);
                        const maxCount = Math.max(1, ...counts);
                        return sceneBreakdowns.lengthBuckets.map((b) => {
                          const heightPct = (b.count / maxCount) * 100;
                          return (
                            <Box key={b.label} sx={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, height: "100%", justifyContent: "flex-end", position: "relative" }}>
                              <Typography variant="caption" sx={{ fontSize: "0.6rem", fontWeight: 700, mb: 0.5, color: "text.primary" }}>
                                {b.count}
                              </Typography>
                              <Box sx={{ width: 14, height: `${heightPct * 0.6}%`, bgcolor: "primary.main", borderRadius: "2px 2px 0 0", minHeight: b.count > 0 ? 4 : 0 }} />
                              <Box sx={{ position: "absolute", bottom: -24, left: "50%", transform: "translateX(-50%)", width: "100%", textAlign: "center" }}>
                                <Typography variant="caption" sx={{ fontSize: "0.5rem", color: "text.secondary", whiteSpace: "nowrap", display: "block" }}>
                                  {b.label}
                                </Typography>
                              </Box>
                            </Box>
                          );
                        });
                      })()}
                    </Box>
                  </Paper>
                </Grid>

                {/* Top Locations */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textAlign: "center", display: "block", mb: 1 }}>
                      TOP LOCATIONS
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, height: 110, overflowY: "auto" }}>
                      {sceneBreakdowns.topLocations.map((loc) => (
                        <Box key={loc.location} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Typography variant="caption" sx={{ fontSize: "0.65rem", fontWeight: 600, color: "text.secondary", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", width: "80%" }}>
                            {loc.location}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#14b8a6" }}>
                            {loc.count}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            {/* Pacing Chart */}
            <Box ref={pacingContainerRef}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.primary" }}>
                  Pacing — Dialogue vs Action by Scene
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6rem" }}>
                  Ctrl+Scroll to zoom · {Math.round(pacingZoom * 100)}%
                </Typography>
              </Box>
              <Paper
                elevation={0}
                sx={{ p: 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2 }}
                onWheel={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    setPacingZoom((prev) => Math.min(5, Math.max(0.5, prev + (e.deltaY < 0 ? 0.15 : -0.15))));
                  }
                }}
              >
                <Box sx={{ overflowX: "auto", overflowY: "hidden" }}>
                  {(() => {
                    const count = sceneTimings.length;
                    if (count === 0) return null;

                    // Fits the window by default (zoom = 1), scales/scrolls when zoomed
                    const marginLeft = 40;
                    const marginRight = 20;
                    const availableWidth = Math.max(400, containerWidth - 36); // subtract padding
                    const width = Math.max(availableWidth, availableWidth * pacingZoom);
                    const height = 180;

                    const maxVal = Math.max(10, ...sceneTimings.map((s) => Math.max(s.dialogueWords, s.actionWords)));

                    const pointsD = sceneTimings.map((s, idx) => {
                      const x = count === 1 ? marginLeft : (idx / (count - 1)) * (width - marginLeft - marginRight) + marginLeft;
                      const y = height - 20 - (s.dialogueWords / maxVal) * (height - 40);
                      return `${x},${y}`;
                    });

                    const pointsA = sceneTimings.map((s, idx) => {
                      const x = count === 1 ? marginLeft : (idx / (count - 1)) * (width - marginLeft - marginRight) + marginLeft;
                      const y = height - 20 - (s.actionWords / maxVal) * (height - 40);
                      return `${x},${y}`;
                    });

                    const lastX = count === 1 ? marginLeft : width - marginRight;
                    const pathDialogue = `M ${pointsD[0]} L ${pointsD.slice(1).join(" L ")} L ${lastX},${height - 20} L ${marginLeft},${height - 20} Z`;
                    const pathAction = `M ${pointsA[0]} L ${pointsA.slice(1).join(" L ")} L ${lastX},${height - 20} L ${marginLeft},${height - 20} Z`;

                    // Only show scene labels when they won't overlap
                    const labelInterval = Math.max(1, Math.ceil(count / (width / 30)));

                    return (
                      <svg width={width} height={height} style={{ display: "block" }}>
                        {/* Horizontal Grid lines */}
                        <line x1={marginLeft} y1={height - 20} x2={width - marginRight} y2={height - 20} stroke="var(--border-color, #2d2d2d)" strokeWidth="1" />
                        <line x1={marginLeft} y1={(height - 20) / 2} x2={width - marginRight} y2={(height - 20) / 2} stroke="var(--border-color, #202020)" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1={marginLeft} y1="20" x2={width - marginRight} y2="20" stroke="var(--border-color, #202020)" strokeWidth="1" strokeDasharray="3 3" />

                        {/* Y-axis Ticks */}
                        <text x="30" y="24" fill="var(--text-secondary, #666)" fontSize="8" textAnchor="end">{maxVal}</text>
                        <text x="30" y={(height - 20) / 2 + 3} fill="var(--text-secondary, #666)" fontSize="8" textAnchor="end">{Math.round(maxVal / 2)}</text>
                        <text x="30" y={height - 18} fill="var(--text-secondary, #666)" fontSize="8" textAnchor="end">0</text>

                        {/* Action Area */}
                        <path d={pathAction} fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" strokeWidth="1.5" />
                        {/* Dialogue Area */}
                        <path d={pathDialogue} fill="rgba(59, 130, 246, 0.25)" stroke="#3b82f6" strokeWidth="1.5" />

                        {/* X-axis Scene Markers — skip labels to prevent overlap */}
                        {sceneTimings.map((_, idx) => {
                          if (idx % labelInterval !== 0 && idx !== count - 1) return null;
                          const x = count === 1 ? marginLeft : (idx / (count - 1)) * (width - marginLeft - marginRight) + marginLeft;
                          return (
                            <text key={idx} x={x} y={height - 5} fill="var(--text-secondary, #666)" fontSize="8" textAnchor="middle">
                              S{idx + 1}
                            </text>
                          );
                        })}
                      </svg>
                    );
                  })()}
                </Box>
                <Box sx={{ display: "flex", justifyContent: "center", gap: 3, mt: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, bgcolor: "#f59e0b", borderRadius: "2px" }} />
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Action</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, bgcolor: "#3b82f6", borderRadius: "2px" }} />
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>Dialogue</Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>

            {/* Character Presence Grid */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "text.primary", mb: 2 }}>
                Character Presence by Scene
              </Typography>
              <Paper elevation={0} sx={{ p: 3, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <Box sx={{ overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ width: 120, textAlign: "left", fontSize: "0.75rem", padding: "4px 8px", color: "var(--text-main, #fff)" }}>Character</th>
                        {sceneTimings.map((_, idx) => (
                          <th key={idx} style={{ width: 28, textAlign: "center", fontSize: "0.7rem", padding: "4px 2px", color: "var(--text-secondary, #666)" }}>
                            {idx + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {presenceGridData?.map((row) => (
                        <tr key={row.name}>
                          <td style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", fontSize: "0.75rem", color: "var(--text-main, #fff)" }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: row.color }} />
                            {row.name}
                          </td>
                          {row.presence.map((isPresent, sceneIdx) => (
                            <td key={sceneIdx} style={{ padding: "4px 2px" }}>
                              <Box
                                sx={{
                                  width: 14,
                                  height: 14,
                                  mx: "auto",
                                  borderRadius: "2px",
                                  bgcolor: isPresent ? "primary.main" : "action.hover",
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              </Paper>
            </Box>
          </Box>
        )}

        {/* Tab 1: Timing Report Table (matching screenshot 4) */}
        {tabIndex === 1 && sceneTimings.length > 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, textTransform: "uppercase", color: "text.primary" }}>
                Timing Report — Est. {formatDuration(totalRuntimeSeconds)}
              </Typography>
            </Box>

            <Paper elevation={0} sx={{ p: 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              <Box sx={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", color: "var(--text-muted, #aaa)" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid", borderBottomColor: "var(--border-color, #2d2d2d)", textAlign: "left" }}>
                      <th style={{ padding: "10px 8px", width: 40, color: "var(--text-secondary, #666)" }}>#</th>
                      <th style={{ padding: "10px 8px", color: "var(--text-main, #fff)" }}>SCENE</th>
                      <th style={{ padding: "10px 8px", color: "var(--text-main, #fff)", textAlign: "right" }}>DIALOGUE</th>
                      <th style={{ padding: "10px 8px", color: "var(--text-main, #fff)", textAlign: "right" }}>ACTION</th>
                      <th style={{ padding: "10px 8px", color: "var(--text-main, #fff)", textAlign: "right" }}>EST.</th>
                      <th style={{ padding: "10px 8px", color: "var(--text-main, #fff)", textAlign: "right" }}>CUMULATIVE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sceneTimings.map((t, idx) => {
                      // Timing calculations
                      const estDialogueSecs = Math.round((t.dialogueWords / 150) * 60);
                      const estActionSecs = Math.round((t.actionWords / 200) * 60);
                      const totalSecs = estDialogueSecs + estActionSecs;

                      return (
                        <tr
                          key={idx}
                          style={{ borderBottom: "1px solid", borderBottomColor: "var(--border-color, #202020)", cursor: "pointer" }}
                          onDoubleClick={async () => {
                            try {
                              const { emit } = await import("@tauri-apps/api/event");
                              emit("modal:xray:scroll-to-line", { lineIndex: t.lineIndex });
                            } catch (e) {
                              console.error("Failed to emit scroll to line:", e);
                            }
                          }}
                        >
                          <td style={{ padding: "10px 8px", color: "var(--text-secondary, #666)" }}>{idx + 1}</td>
                          <td style={{ padding: "10px 8px", color: "var(--text-main, #fff)", fontWeight: 500 }}>{cleanSceneHeading(t.heading)}</td>
                          <td style={{ padding: "10px 8px", textAlign: "right" }}>{formatDuration(estDialogueSecs)}</td>
                          <td style={{ padding: "10px 8px", textAlign: "right" }}>{formatDuration(estActionSecs)}</td>
                          <td style={{ padding: "10px 8px", textAlign: "right", color: "#10b981", fontWeight: 700 }}>
                            {formatDuration(totalSecs)}
                          </td>
                          <td style={{ padding: "10px 8px", textAlign: "right" }}>
                            {formatDuration(t.offsetSeconds)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ borderTop: "2px solid", borderTopColor: "var(--border-color, #2d2d2d)", fontWeight: 800 }}>
                      <td style={{ padding: "12px 8px" }}></td>
                      <td style={{ padding: "12px 8px", color: "var(--text-main, #fff)" }}>TOTAL</td>
                      <td style={{ padding: "12px 8px" }}></td>
                      <td style={{ padding: "12px 8px" }}></td>
                      <td style={{ padding: "12px 8px" }}></td>
                      <td style={{ padding: "12px 8px", textAlign: "right", color: "#10b981" }}>
                        {formatDuration(totalRuntimeSeconds)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Box>
            </Paper>
          </Box>
        )}

        {/* Tab 2: Characters */}
        {tabIndex === 2 && (
          <Box sx={{ display: "flex", flexDirection: "column", height: "100%", gap: 2 }}>
            <TextField
              value={characterFilter}
              onChange={(e) => setCharacterFilter(e.target.value)}
              placeholder="Search characters..."
              size="small"
              fullWidth
              slotProps={{
                input: {
                  sx: {
                    color: "text.primary",
                    bgcolor: "background.paper",
                    borderColor: "divider",
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" }
                  },
                  startAdornment: (
                    <Box sx={{ display: "flex", color: "text.secondary", mr: 1 }}>
                      <SearchIcon sx={{ fontSize: 16 }} />
                    </Box>
                  ),
                },
              }}
            />
            {filteredCharacters.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                {characters.length === 0
                  ? "No characters found in screenplay."
                  : "No characters matching search."}
              </Typography>
            ) : (
              <List disablePadding sx={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
                {filteredCharacters.map((char, idx) => {
                  const profile = characterProfiles[char.name] || {};
                  const swatchColor = profile.color || CHART_COLORS[idx % CHART_COLORS.length];
                  const currentCharGender = profile.gender || genders[char.name] || "unknown";
                  const currentCharRole = profile.role || "";

                  return (
                    <Box
                      key={char.name}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 1,
                        borderRadius: "6px",
                        bgcolor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                        transition: "background-color 0.2s",
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      {/* Left section: Color Swatch + Name & Lines info */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, minWidth: 0 }}>
                        <Box
                          sx={{
                            width: 22,
                            height: 22,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "10px",
                            bgcolor: `${swatchColor}18`,
                            flexShrink: 0,
                          }}
                        >
                          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: swatchColor, flexShrink: 0 }} />
                        </Box>
                        <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
                          <Typography sx={{ fontWeight: 600, fontSize: "0.85rem", color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {char.name}
                          </Typography>
                          <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>
                            {char.lineCount} lines | {char.wordCount} words
                          </Typography>
                        </Box>
                      </Box>

                      {/* Middle-Right section: Dropdowns for quick selection */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mr: 1 }}>
                        {/* Gender Select dropdown */}
                        <FormControl size="small" sx={{ width: 110 }}>
                          <Select
                            value={currentCharGender}
                            onChange={(e) => {
                              const updatedProfile = { ...profile, gender: e.target.value };
                              handleSaveProfile(char.name, updatedProfile);
                            }}
                            sx={{
                              fontSize: "0.75rem",
                              height: 28,
                              color: "text.primary",
                              "& .MuiSelect-select": { py: 0.5 },
                              "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" }
                            }}
                          >
                            <MenuItem value="male" sx={{ fontSize: "0.75rem" }}>Male</MenuItem>
                            <MenuItem value="female" sx={{ fontSize: "0.75rem" }}>Female</MenuItem>
                            <MenuItem value="nonbinary" sx={{ fontSize: "0.75rem" }}>Nonbinary</MenuItem>
                            <MenuItem value="unknown" sx={{ fontSize: "0.75rem" }}>Unknown</MenuItem>
                          </Select>
                        </FormControl>

                        {/* Role Select dropdown */}
                        <FormControl size="small" sx={{ width: 120 }}>
                          <Select
                            value={currentCharRole}
                            onChange={(e) => {
                              const updatedProfile = { ...profile, role: e.target.value };
                              handleSaveProfile(char.name, updatedProfile);
                            }}
                            displayEmpty
                            sx={{
                              fontSize: "0.75rem",
                              height: 28,
                              color: "text.primary",
                              "& .MuiSelect-select": { py: 0.5 },
                              "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" }
                            }}
                          >
                            <MenuItem value="" sx={{ fontSize: "0.75rem" }}><em>No Role</em></MenuItem>
                            <MenuItem value="Protagonist" sx={{ fontSize: "0.75rem" }}>Protagonist</MenuItem>
                            <MenuItem value="Antagonist" sx={{ fontSize: "0.75rem" }}>Antagonist</MenuItem>
                            <MenuItem value="Supporting" sx={{ fontSize: "0.75rem" }}>Supporting</MenuItem>
                            <MenuItem value="Minor" sx={{ fontSize: "0.75rem" }}>Minor</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>

                      {/* Far Right: Edit Button */}
                      <IconButton
                        size="small"
                        onClick={() => setSelectedChar(char.name)}
                        sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
                        title="Edit details (Backstory, Arc, Relationships)"
                      >
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  );
                })}
              </List>
            )}
          </Box>
        )}

        {/* Tab 3: Character Connections Network Map / Matrix Heatmap */}
        {tabIndex === 3 && (
          <Box sx={{ display: "flex", flexDirection: "column", height: "100%", gap: 2 }}>
            {/* Header controls */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Character Interactions
                </Typography>
                {connectionsMode === "network" && (
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem", display: { xs: "none", sm: "block" } }}>
                    (Ctrl + Click two nodes to show connection data)
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  variant={connectionsMode === "network" ? "contained" : "outlined"}
                  onClick={() => setConnectionsMode("network")}
                  sx={{
                    textTransform: "none",
                    fontSize: 11,
                    py: 0.5,
                    bgcolor: connectionsMode === "network" ? "primary.main" : "transparent",
                    color: connectionsMode === "network" ? "primary.contrastText" : "text.primary",
                    borderColor: "primary.main",
                    "&:hover": {
                      bgcolor: connectionsMode === "network" ? "primary.dark" : "action.hover",
                      borderColor: "primary.main",
                    }
                  }}
                >
                  Network
                </Button>
                <Button
                  size="small"
                  variant={connectionsMode === "matrix" ? "contained" : "outlined"}
                  onClick={() => setConnectionsMode("matrix")}
                  sx={{
                    textTransform: "none",
                    fontSize: 11,
                    py: 0.5,
                    bgcolor: connectionsMode === "matrix" ? "primary.main" : "transparent",
                    color: connectionsMode === "matrix" ? "primary.contrastText" : "text.primary",
                    borderColor: "primary.main",
                    "&:hover": {
                      bgcolor: connectionsMode === "matrix" ? "primary.dark" : "action.hover",
                      borderColor: "primary.main",
                    }
                  }}
                >
                  Matrix
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 2, flex: 1, minHeight: 0 }}>
              {/* Left Side: Map / Matrix */}
              <Paper elevation={0} sx={{ flex: 1, p: 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2, display: "flex", flexDirection: "column", overflow: "auto", minWidth: 0 }}>
                {connectionsMode === "network" ? (
                  <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {connectionsSvg}
                  </Box>
                ) : (
                  /* Interaction Matrix Heatmap — fills the panel */
                  <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
                    {/* Summary stats row */}
                    <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
                      <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1, bgcolor: "action.hover", display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main", fontSize: "0.8rem" }}>
                          {characterConnections.length}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem" }}>
                          connections
                        </Typography>
                      </Box>
                      <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1, bgcolor: "action.hover", display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main", fontSize: "0.8rem" }}>
                          {characterConnections.reduce((s, c) => s + c.interactions, 0)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem" }}>
                          total scenes shared
                        </Typography>
                      </Box>
                      {(() => {
                        const strongest = characterConnections.length > 0
                          ? characterConnections.reduce((a, b) => a.interactions > b.interactions ? a : b)
                          : null;
                        return strongest ? (
                          <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1, bgcolor: "action.hover", display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: "#10b981", fontSize: "0.7rem" }}>
                              {strongest.source} ↔ {strongest.target}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem" }}>
                              strongest ({strongest.interactions})
                            </Typography>
                          </Box>
                        ) : null;
                      })()}
                    </Box>

                    {/* The actual matrix grid */}
                    <Box sx={{ flex: 1, overflow: "auto" }}>
                      <table style={{ borderCollapse: "separate", borderSpacing: 2, width: "100%", minWidth: 400, tableLayout: "fixed" }}>
                        <colgroup>
                          <col style={{ width: 90 }} />
                          {characters.slice(0, 12).map((char) => (
                            <col key={char.name} style={{ width: "calc((100% - 90px) / 12)" }} />
                          ))}
                        </colgroup>
                        <thead>
                          <tr>
                            <th style={{ width: 90 }} />
                            {characters.slice(0, 12).map((char) => (
                              <th
                                key={char.name}
                                style={{
                                  padding: "2px 0",
                                  verticalAlign: "bottom",
                                  textAlign: "center",
                                }}
                              >
                                <Box
                                  sx={{
                                    writingMode: "vertical-rl",
                                    transform: "rotate(180deg)",
                                    fontSize: "0.6rem",
                                    fontWeight: 700,
                                    color: selectedNode === char.name ? "primary.main" : "text.secondary",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    maxHeight: 70,
                                    cursor: "pointer",
                                  }}
                                  onClick={() => setSelectedNode(selectedNode === char.name ? null : char.name)}
                                >
                                  {char.name.length > 8 ? char.name.slice(0, 7) + "…" : char.name}
                                </Box>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {characters.slice(0, 12).map((rowChar) => (
                            <tr key={rowChar.name}>
                              <td style={{ textAlign: "right", paddingRight: 8 }}>
                                <Typography
                                  variant="caption"
                                  onClick={() => setSelectedNode(selectedNode === rowChar.name ? null : rowChar.name)}
                                  sx={{
                                    fontWeight: 700,
                                    fontSize: "0.65rem",
                                    color: selectedNode === rowChar.name ? "primary.main" : "text.secondary",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    display: "block",
                                    maxWidth: 85,
                                    cursor: "pointer",
                                    "&:hover": { color: "primary.main" },
                                  }}
                                >
                                  {rowChar.name}
                                </Typography>
                              </td>
                              {characters.slice(0, 12).map((colChar) => {
                                const isSelf = rowChar.name === colChar.name;
                                const connection = characterConnections.find(
                                  (c) =>
                                    (c.source === rowChar.name && c.target === colChar.name) ||
                                    (c.source === colChar.name && c.target === rowChar.name)
                                );
                                const count = connection ? connection.interactions : 0;
                                const maxInt = Math.max(1, ...characterConnections.map((c) => c.interactions));
                                const intensity = count > 0 ? 0.15 + (count / maxInt) * 0.85 : 0;
                                const isRowOrColSelected = selectedNode === rowChar.name || selectedNode === colChar.name;

                                return (
                                  <td key={colChar.name} style={{ padding: 0 }}>
                                    <Box
                                      onClick={() => !isSelf && setSelectedNode(rowChar.name)}
                                      title={`${rowChar.name} & ${colChar.name}: ${count} scenes`}
                                      sx={{
                                        width: "100%",
                                        aspectRatio: "1",
                                        borderRadius: "4px",
                                        bgcolor: isSelf
                                          ? "action.selected"
                                          : count > 0
                                            ? `rgba(139, 92, 246, ${intensity})`
                                            : "action.hover",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: isSelf ? "default" : "pointer",
                                        outline: isRowOrColSelected && !isSelf ? "1.5px solid" : "none",
                                        outlineColor: isRowOrColSelected && !isSelf ? "primary.main" : "transparent",
                                        transition: "all 0.15s ease",
                                        "&:hover": !isSelf ? {
                                          filter: "brightness(1.3)",
                                          outline: "1.5px solid",
                                          outlineColor: "text.primary",
                                        } : {},
                                      }}
                                    >
                                      {count > 0 && (
                                        <Typography variant="caption" sx={{ fontSize: "0.6rem", fontWeight: 800, color: "text.primary" }}>
                                          {count}
                                        </Typography>
                                      )}
                                    </Box>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Box>
                  </Box>
                )}
              </Paper>

              {/* Right Side: Detail panel */}
              <Paper elevation={0} sx={{ width: 280, flexShrink: 0, p: 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 2, display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
                {selectedNode && secondSelectedNode ? (
                  /* Dual selection connection detail view */
                  <>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        CONNECTION DETAILS
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "0.8rem", color: "text.primary" }}>
                          {selectedNode}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700 }}>
                          ↔
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "0.8rem", color: "text.primary" }}>
                          {secondSelectedNode}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ borderColor: "divider" }} />

                    {/* Shared Scenes Count & Stats */}
                    {(() => {
                      const connection = characterConnections.find(
                        (c) =>
                          (c.source === selectedNode && c.target === secondSelectedNode) ||
                          (c.source === secondSelectedNode && c.target === selectedNode)
                      );
                      const sharedScenes = getSharedScenes(selectedNode, secondSelectedNode);
                      return (
                        <>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "action.hover", p: 1, borderRadius: 1 }}>
                            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                              Shared Scenes
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", fontSize: "0.95rem" }}>
                              {connection ? connection.interactions : 0}
                            </Typography>
                          </Box>

                          <Divider sx={{ borderColor: "divider" }} />

                          {/* List of shared scenes */}
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, flex: 1, minHeight: 0 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              SHARED SCENES LIST
                            </Typography>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, overflowY: "auto", flex: 1 }}>
                              {sharedScenes.map((s, idx) => (
                                <Box
                                  key={idx}
                                  sx={{ p: 0.75, bgcolor: "action.hover", borderRadius: 1, borderLeft: "2px solid", borderLeftColor: "primary.main", cursor: "pointer" }}
                                  onDoubleClick={async () => {
                                    try {
                                      const { emit } = await import("@tauri-apps/api/event");
                                      emit("modal:xray:scroll-to-line", { lineIndex: s.lineIndex });
                                    } catch (e) {
                                      console.error("Failed to scroll to scene line:", e);
                                    }
                                  }}
                                >
                                  <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.6rem", display: "block", color: "text.primary", lineHeight: 1.3 }}>
                                    {cleanSceneHeading(s.heading)}
                                  </Typography>
                                  <Typography variant="caption" sx={{ fontSize: "0.55rem", color: "text.secondary" }}>
                                    {formatDuration(s.durationSeconds)} est. | @{formatDuration(s.offsetSeconds)}
                                  </Typography>
                                </Box>
                              ))}
                              {sharedScenes.length === 0 && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic", fontSize: "0.6rem" }}>
                                  No shared speaking scenes.
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </>
                      );
                    })()}
                  </>
                ) : selectedNode ? (
                  /* Single selection character detail view */
                  <>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: characterProfiles[selectedNode]?.color || getGenderColor(genders[selectedNode]), flexShrink: 0 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.85rem", color: "text.primary" }}>
                        {selectedNode}
                      </Typography>
                    </Box>

                    <Divider sx={{ borderColor: "divider" }} />

                    {/* Co-occurrence bars */}
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Scene co-occurrences
                      </Typography>
                      {characterConnections
                        .filter((c) => c.source === selectedNode || c.target === selectedNode)
                        .sort((a, b) => b.interactions - a.interactions)
                        .map((c) => {
                          const peer = c.source === selectedNode ? c.target : c.source;
                          const peerProfile = characterProfiles[peer] || {};
                          const peerColor = peerProfile.color || getGenderColor(genders[peer]);
                          const maxInt = Math.max(1, ...characterConnections
                            .filter((cc) => cc.source === selectedNode || cc.target === selectedNode)
                            .map((cc) => cc.interactions));
                          const pct = (c.interactions / maxInt) * 100;

                          return (
                            <Box
                              key={peer}
                              sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer", "&:hover": { bgcolor: "action.hover" }, borderRadius: 0.5, px: 0.5, py: 0.25 }}
                              onClick={() => setHoveredNode(peer)}
                            >
                              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: peerColor, flexShrink: 0 }} />
                              <Typography variant="caption" sx={{ width: 70, fontWeight: 600, fontSize: "0.6rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "text.primary" }}>
                                {peer}
                              </Typography>
                              <Box sx={{ flex: 1, bgcolor: "action.hover", height: 6, borderRadius: 1, overflow: "hidden" }}>
                                <Box sx={{ width: `${pct}%`, height: "100%", bgcolor: peerColor, borderRadius: 1, transition: "width 0.3s ease" }} />
                              </Box>
                              <Typography variant="caption" sx={{ fontWeight: 800, fontSize: "0.6rem", color: "text.primary", minWidth: 18, textAlign: "right" }}>
                                {c.interactions}
                              </Typography>
                            </Box>
                          );
                        })}
                    </Box>

                    <Divider sx={{ borderColor: "divider" }} />

                    {/* Shared scenes */}
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, flex: 1, minHeight: 0 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Shared scenes
                      </Typography>
                      {(() => {
                        const peer = hoveredNode && hoveredNode !== selectedNode ? hoveredNode :
                          characterConnections.find((c) => c.source === selectedNode || c.target === selectedNode)?.source === selectedNode ?
                          characterConnections.find((c) => c.source === selectedNode || c.target === selectedNode)?.target :
                          characterConnections.find((c) => c.source === selectedNode || c.target === selectedNode)?.source;

                        if (!peer) {
                          return (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic", fontSize: "0.65rem" }}>
                              No connections found.
                            </Typography>
                          );
                        }

                        const shared = getSharedScenes(selectedNode, peer);
                        return (
                          <>
                            <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "primary.main", fontWeight: 700 }}>
                              with {peer} ({shared.length} scenes)
                            </Typography>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, overflowY: "auto", flex: 1 }}>
                              {shared.map((s, idx) => (
                                <Box
                                  key={idx}
                                  sx={{ p: 0.75, bgcolor: "action.hover", borderRadius: 1, borderLeft: "2px solid", borderLeftColor: "primary.main", cursor: "pointer" }}
                                  onDoubleClick={async () => {
                                    try {
                                      const { emit } = await import("@tauri-apps/api/event");
                                      emit("modal:xray:scroll-to-line", { lineIndex: s.lineIndex });
                                    } catch (e) {
                                      console.error("Failed to scroll to scene line:", e);
                                    }
                                  }}
                                >
                                  <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.6rem", display: "block", color: "text.primary", lineHeight: 1.3 }}>
                                    {cleanSceneHeading(s.heading)}
                                  </Typography>
                                  <Typography variant="caption" sx={{ fontSize: "0.55rem", color: "text.secondary" }}>
                                    {formatDuration(s.durationSeconds)} est. | @{formatDuration(s.offsetSeconds)}
                                  </Typography>
                                </Box>
                              ))}
                              {shared.length === 0 && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic", fontSize: "0.6rem" }}>
                                  No shared speaking scenes.
                                </Typography>
                              )}
                            </Box>
                          </>
                        );
                      })()}
                    </Box>
                  </>
                ) : (
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 1 }}>
                    <PersonIcon sx={{ fontSize: 28, color: "text.secondary", opacity: 0.4 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic", fontSize: "0.7rem", textAlign: "center" }}>
                      Click a character to see their interaction details
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Box>
          </Box>
        )}
      </Box>

      {/* Rocky-style Character Edit Dialog */}
      {selectedChar && (
        <CharacterEditModal
          characterName={selectedChar}
          open={!!selectedChar}
          onClose={() => setSelectedChar(null)}
          allCharacters={characters.map((c) => c.name)}
          existingProfile={characterProfiles[selectedChar] || {}}
          genderFromGendersSetting={genders[selectedChar] || "unknown"}
          appearsInCount={getCharacterAppearanceCount(selectedChar)}
          onSave={handleSaveProfile}
        />
      )}
    </Box>
  );
}

// Dialog Modal Component
interface CharacterEditModalProps {
  characterName: string;
  open: boolean;
  onClose: () => void;
  allCharacters: string[];
  existingProfile: any;
  genderFromGendersSetting: string;
  appearsInCount: number;
  onSave: (charName: string, updatedProfile: any) => Promise<void>;
}

function CharacterEditModal({
  characterName,
  open,
  onClose,
  allCharacters,
  existingProfile,
  genderFromGendersSetting,
  appearsInCount,
  onSave,
}: CharacterEditModalProps) {
  const [description, setDescription] = useState(existingProfile.description || "");
  const [role, setRole] = useState(existingProfile.role || "");
  const [gender, setGender] = useState(existingProfile.gender || genderFromGendersSetting || "unknown");
  const [age, setAge] = useState(existingProfile.age || "");
  const [backstory, setBackstory] = useState(existingProfile.backstory || "");
  const [arc, setArc] = useState(existingProfile.arc || "");
  const [color, setColor] = useState(existingProfile.color || getGenderColor(gender));
  const [highlight, setHighlight] = useState(existingProfile.highlight ?? true);

  const [relationships, setRelationships] = useState<Array<{ target: string; type: string }>>(
    existingProfile.relationships || []
  );
  const [newRelTarget, setNewRelTarget] = useState("");
  const [newRelType, setNewRelType] = useState("");

  const handleAddRelationship = () => {
    if (!newRelTarget || !newRelType) return;
    if (relationships.some((r) => r.target === newRelTarget)) return;
    setRelationships([...relationships, { target: newRelTarget, type: newRelType }]);
    setNewRelTarget("");
    setNewRelType("");
  };

  const handleRemoveRelationship = (target: string) => {
    setRelationships(relationships.filter((r) => r.target !== target));
  };

  const handleSave = () => {
    const updatedProfile = {
      description,
      role,
      gender,
      age,
      backstory,
      arc,
      color,
      highlight,
      relationships,
    };
    onSave(characterName, updatedProfile);
    onClose();
  };

  const peerCharacters = allCharacters.filter((name) => name !== characterName);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { bgcolor: "#1a1a1a", color: "#fff", border: "1px solid #333" } } }}>
      <DialogTitle sx={{ fontWeight: 800, fontSize: "1.1rem", textTransform: "uppercase", pb: 1 }}>
        {characterName}
      </DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2, borderColor: "#333" }}>
        <TextField
          label="DESCRIPTION"
          placeholder="e.g. A weary detective in his 50s, haunted by a cold case..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          rows={2}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ "& label": { color: "#888" }, "& .MuiInputBase-input": { color: "#fff" } }}
        />

        <Grid container spacing={2}>
          <Grid size={{ xs: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel shrink id="role-select-label" sx={{ color: "#888" }}>ROLE</InputLabel>
              <Select
                labelId="role-select-label"
                label="ROLE"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                displayEmpty
                sx={{ color: "#fff", "& .MuiOutlinedInput-notchedOutline": { borderColor: "#333" } }}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                <MenuItem value="Protagonist">Protagonist</MenuItem>
                <MenuItem value="Antagonist">Antagonist</MenuItem>
                <MenuItem value="Supporting">Supporting</MenuItem>
                <MenuItem value="Minor">Minor</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel shrink id="gender-select-label" sx={{ color: "#888" }}>GENDER</InputLabel>
              <Select
                labelId="gender-select-label"
                label="GENDER"
                value={gender}
                onChange={(e) => {
                  setGender(e.target.value);
                  setColor(getGenderColor(e.target.value));
                }}
                sx={{ color: "#fff", "& .MuiOutlinedInput-notchedOutline": { borderColor: "#333" } }}
              >
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="nonbinary">Nonbinary</MenuItem>
                <MenuItem value="unknown">Unknown</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField
              label="AGE"
              placeholder="e.g. 30s"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ "& label": { color: "#888" }, "& .MuiInputBase-input": { color: "#fff" } }}
            />
          </Grid>
        </Grid>

        <TextField
          label="BACKSTORY"
          placeholder="Character history, motivations, secrets..."
          value={backstory}
          onChange={(e) => setBackstory(e.target.value)}
          multiline
          rows={2}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ "& label": { color: "#888" }, "& .MuiInputBase-input": { color: "#fff" } }}
        />

        <TextField
          label="CHARACTER ARC"
          placeholder="How does this character change through the story..."
          value={arc}
          onChange={(e) => setArc(e.target.value)}
          multiline
          rows={2}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ "& label": { color: "#888" }, "& .MuiInputBase-input": { color: "#fff" } }}
        />

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.65rem", display: "block", mb: 1, color: "#888" }}>
            COLOR PROFILE
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "row", gap: 1, alignItems: "center" }}>
            {SWATCH_COLORS.map((c) => (
              <IconButton
                key={c}
                onClick={() => setColor(c)}
                sx={{
                  width: 24,
                  height: 24,
                  bgcolor: c,
                  border: color === c ? 2 : 0,
                  borderColor: "#fff",
                  "&:hover": { bgcolor: c, opacity: 0.8 },
                }}
              />
            ))}
            <Button
              variant={highlight ? "contained" : "outlined"}
              size="small"
              onClick={() => setHighlight(!highlight)}
              sx={{ textTransform: "none", ml: "auto", fontSize: 10, py: 0.25, color: "#fff", borderColor: "#333" }}
            >
              Highlight: {highlight ? "On" : "Off"}
            </Button>
          </Box>
        </Box>

        <Divider sx={{ borderColor: "#333" }} />

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.65rem", display: "block", mb: 1, color: "#888" }}>
            RELATIONSHIPS
          </Typography>
          {relationships.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", fontSize: 11 }}>
              No relationships defined yet.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 1.5 }}>
              {relationships.map((r) => (
                <Box
                  key={r.target}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    bgcolor: "#252525",
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: 11, fontWeight: 600 }}>
                    {r.target} — {r.type}
                  </Typography>
                  <IconButton size="small" onClick={() => handleRemoveRelationship(r.target)} sx={{ color: "#aaa" }}>
                    <DeleteIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}

          <Box sx={{ display: "flex", flexDirection: "row", gap: 1, alignItems: "center" }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="rel-target-label" sx={{ color: "#888" }}>Character</InputLabel>
              <Select
                labelId="rel-target-label"
                value={newRelTarget}
                onChange={(e) => setNewRelTarget(e.target.value)}
                label="Character"
                sx={{ color: "#fff", "& .MuiOutlinedInput-notchedOutline": { borderColor: "#333" } }}
              >
                {peerCharacters.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Relation Type"
              placeholder="e.g. Partner"
              value={newRelType}
              onChange={(e) => setNewRelType(e.target.value)}
              size="small"
              fullWidth
              sx={{ "& label": { color: "#888" }, "& .MuiInputBase-input": { color: "#fff" } }}
            />
            <IconButton onClick={handleAddRelationship} color="primary" disabled={!newRelTarget || !newRelType}>
              <AddIcon />
            </IconButton>
          </Box>
        </Box>

        <Divider sx={{ borderColor: "#333" }} />
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
          APPEARS IN ({appearsInCount} SCENES)
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit" sx={{ color: "#aaa" }}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export const XrayWindow: React.FC = () => {
  const [themeId, setThemeId] = useState("light");
  const [appScale, setAppScale] = useState(100);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [data, setData] = useState<XrayData | null>(null);
  const [timedOut, setTimedOut] = useState(false);

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

  const currentThemeConfig = resolveThemeConfig(themeId, customThemes, systemDark);
  const muiTheme = createActOneTheme(currentThemeConfig, appScale);

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      <WindowResizeHandles />
      <Box sx={{ height: "100vh", overflow: "hidden", zoom: `${appScale}%` }}>
        <XrayContent data={data} onClose={handleClose} timedOut={timedOut} />
      </Box>
    </MuiThemeProvider>
  );
};


