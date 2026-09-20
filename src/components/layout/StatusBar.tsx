import React, { useMemo, useState, useEffect } from "react";
import { useFile, useUI, useSprint } from "../../context";
import { LineType, parseSceneHeading } from "../../parser";
import { countWords } from "../../utils/text";
import { Box, Typography, Menu, MenuItem, ListItemText, InputBase, Divider } from "@mui/material";
import { alpha } from "@mui/material/styles";

import { useEditor, useCursor } from "../../context";
import { DownloadIcon, CheckIcon, ViewAgendaIcon, KeyboardArrowDownIcon } from "../Icons";
import { useStoreUpdateCheck } from "../../hooks";
import { useModalWindows } from "../../hooks/useModalWindows";
import { isProseScript } from "../../utils/scriptMode";

export const StatusBar = React.memo(() => {
  const { rawText, parsedDoc, isBundle, scripts, activeScriptIndex, filePath, activeScriptName, setActiveScript, activeFileId, saveStatus, files } = useFile();
  const {
    isZenMode, aiStatus, translationState, setTranslationState, cancelTranslation,
    spellcheckEnabled, setSpellcheckEnabled, spellcheckLanguage, setSpellcheckLanguage,
    showTimeline, timelineFilter, setTimelineFilter,
    timelineShowSections, setTimelineShowSections,
    timelineShowSceneNumbers, setTimelineShowSceneNumbers,
    timelineShowSceneColors, setTimelineShowSceneColors,
  } = useUI();
  const activeFile = files.find(f => f.id === activeFileId);
  const isMarkdown = isProseScript(scripts[activeScriptIndex], filePath);
  const hasNoScripts = activeFile?.scripts && activeFile.scripts.length === 0;
  const { activeLineNumber } = useCursor();
  const { activeSprints } = useSprint();
  const { updateAvailable, installUpdate } = useStoreUpdateCheck();
  const { openSettingsWindow } = useModalWindows();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [spellMenuAnchorEl, setSpellMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [installedLangs, setInstalledLangs] = useState<{ code: string; name: string; native_name: string }[]>([]);
  const [tick, setTick] = useState(0);

  const [timelineMenuAnchor, setTimelineMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuView, setMenuView] = useState<'main' | 'characters' | 'locations' | 'times' | 'settings'>('main');
  const [charSearchQuery, setCharSearchQuery] = useState("");
  const [locSearchQuery, setLocSearchQuery] = useState("");

  const parsedTokens = useMemo(() => {
    const characters = new Set<string>();
    const locations = new Set<string>();
    const times = new Set<string>();

    if (parsedDoc?.lines) {
      for (const line of parsedDoc.lines) {
        if (line.type === LineType.character || line.type === LineType.dualDialogueCharacter) {
          const charName = line.text
            .replace(/\(.*\)/g, "")
            .replace(/\[\[.*\]\]/g, "")
            .replace(/#.*#/g, "")
            .trim()
            .toUpperCase();
          if (charName) {
            characters.add(charName);
          }
        } else if (line.type === LineType.heading) {
          const parsed = parseSceneHeading(line.text);
          const loc = (line.location || parsed.location || "").trim().toUpperCase();
          const tod = (line.timeOfDay || parsed.timeOfDay || "").trim().toUpperCase();
          if (loc) locations.add(loc);
          if (tod) times.add(tod);
        }
      }
    }

    return {
      characters: Array.from(characters).sort(),
      locations: Array.from(locations).sort(),
      times: Array.from(times).sort(),
    };
  }, [parsedDoc]);

  const filteredCharacters = useMemo(() => {
    const query = charSearchQuery.trim().toUpperCase();
    if (!query) return parsedTokens.characters;
    return parsedTokens.characters.filter(char => char.includes(query));
  }, [parsedTokens.characters, charSearchQuery]);

  const filteredLocations = useMemo(() => {
    const query = locSearchQuery.trim().toUpperCase();
    if (!query) return parsedTokens.locations;
    return parsedTokens.locations.filter(loc => loc.includes(query));
  }, [parsedTokens.locations, locSearchQuery]);

  const handleTimelineMenuOpen = (event: React.MouseEvent<HTMLDivElement>) => {
    setTimelineMenuAnchor(event.currentTarget);
    setMenuView('main');
  };

  const handleTimelineMenuClose = () => {
    setTimelineMenuAnchor(null);
    setCharSearchQuery("");
    setLocSearchQuery("");
  };

  const selectFilter = (type: 'default' | 'character' | 'location' | 'time' | 'setting' | 'marker', value?: string) => {
    setTimelineFilter({ type, values: value ? [value] : [] });
    handleTimelineMenuClose();
  };

  const toggleFilterValue = (type: 'character' | 'location' | 'time' | 'setting', val: string) => {
    if (timelineFilter.type !== type) {
      setTimelineFilter({ type, values: [val] });
      return;
    }
    const exists = timelineFilter.values.includes(val);
    const newValues = exists
      ? timelineFilter.values.filter(v => v !== val)
      : [...timelineFilter.values, val];
    if (newValues.length === 0) {
      setTimelineFilter({ type: 'default', values: [] });
    } else {
      setTimelineFilter({ type, values: newValues });
    }
  };

  const getFilterLabel = () => {
    if (timelineFilter.type === "default" || !timelineFilter.values || (timelineFilter.type !== "marker" && timelineFilter.values.length === 0)) {
      return "Timeline Options";
    }
    if (timelineFilter.type === "marker") {
      return "Timeline: MARKERS";
    }
    const typeLabel = timelineFilter.type === "character" ? "CHARACTER"
                    : timelineFilter.type === "location" ? "LOCATION"
                    : timelineFilter.type === "time" ? "TIME"
                    : "SETTING";

    if (timelineFilter.values.length > 1) {
      return `Timeline: ${typeLabel}S (${timelineFilter.values.length})`;
    } else {
      return `Timeline: ${typeLabel} (${timelineFilter.values[0]})`;
    }
  };

  const loadInstalledLangs = async () => {
    try {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        const { invoke } = await import("@tauri-apps/api/core");
        const langs = await invoke<{ code: string; name: string; native_name: string }[]>("spellcheck_get_installed");
        setInstalledLangs(langs);
      }
    } catch { void 0; }
  };

  useEffect(() => {
    loadInstalledLangs();
    const handler = () => { loadInstalledLangs(); };
    window.addEventListener("dictionary-changed", handler);
    return () => window.removeEventListener("dictionary-changed", handler);
  }, []);

  const currentSprint = activeSprints[activeFileId];

  useEffect(() => {
    if (currentSprint) {
      const timer = setInterval(() => {
        setTick(t => t + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentSprint]);

  const { editorView } = useEditor();

  const selectionStats = useMemo(() => {
    if (!editorView) return null;
    const sel = editorView.state.selection.main;
    if (sel.empty) return null;
    const text = editorView.state.sliceDoc(sel.from, sel.to);
    const words = countWords(text);
    const chars = text.length;
    return { words, chars };
  }, [editorView, editorView?.state.selection.main.from, editorView?.state.selection.main.to, rawText]);

  const docStats = useMemo(() => {
    const text = rawText || "";
    const words = countWords(text);
    const chars = text.length;
    const docLinesCount = text ? text.split("\n").length : 1;

    const hasTitlePage = parsedDoc?.lines?.some(
      l => l.type >= LineType.titlePageTitle && l.type <= LineType.titlePageUnknown
    ) || false;

    const breaks = parsedDoc?.pageBreaks || [];
    const hasBreaks = breaks.length > 0;

    let pages: number;
    if (isMarkdown) {
      pages = Math.max(1, Math.ceil(docLinesCount / 40));
    } else if (hasBreaks) {
      if (hasTitlePage) {
        pages = Math.max(1, breaks.length);
      } else {
        pages = breaks.length + 1;
      }
    } else {
      pages = Math.max(1, Math.ceil(docLinesCount / 54));
    }

    const sceneCount = parsedDoc?.lines ? parsedDoc.lines.filter(l => l.type === LineType.heading).length : 0;

    return {
      words: words.toLocaleString(),
      chars: chars.toLocaleString(),
      pages: pages.toLocaleString(),
      rawPages: pages,
      hasBreaks,
      hasTitlePage,
      breaks,
      sceneCount: sceneCount.toLocaleString()
    };
  }, [rawText, parsedDoc, isMarkdown]);

  const currentPage = useMemo(() => {
    const currentLineNumber = Math.max(1, activeLineNumber + 1);
    if (isMarkdown) {
      return Math.min(docStats.rawPages, Math.max(1, Math.ceil(currentLineNumber / 40)));
    }
    if (docStats.hasBreaks) {
      if (docStats.hasTitlePage) {
        const contentBreaks = docStats.breaks.filter(b => b <= currentLineNumber);
        return Math.min(docStats.rawPages, Math.max(1, contentBreaks.length));
      } else {
        const passedBreaks = docStats.breaks.filter(b => b <= currentLineNumber);
        return Math.min(docStats.rawPages, passedBreaks.length + 1);
      }
    }
    return Math.min(docStats.rawPages, Math.max(1, Math.ceil(currentLineNumber / 54)));
  }, [activeLineNumber, isMarkdown, docStats]);

  const stats = useMemo(() => ({
    words: docStats.words,
    chars: docStats.chars,
    pages: docStats.pages,
    currentPage: currentPage.toLocaleString(),
    sceneCount: docStats.sceneCount
  }), [docStats, currentPage]);

  const sprintDetails = useMemo(() => {
    if (!currentSprint) return null;
    const totalSec = currentSprint.durationMinutes * 60;
    const elapsed = Math.floor((Date.now() - currentSprint.startTime) / 1000);
    const remaining = Math.max(0, totalSec - elapsed);
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    const timeStr = `${m}:${s.toString().padStart(2, "0")}`;

    const text = rawText || "";
    const currentWords = countWords(text);
    const diffWords = Math.max(0, currentWords - currentSprint.startWordCount);
    const elapsedMins = Math.max(0.1, elapsed / 60);
    const wpm = Math.round(diffWords / elapsedMins);

    return { timeStr, total: currentSprint.durationMinutes, wpm };
  }, [currentSprint, rawText, tick]);

  const handleScriptClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isBundle && scripts.length > 0) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleScriptSelect = (index: number) => {
    setActiveScript(index);
    setAnchorEl(null);
  };

  const fileName = filePath ? filePath.split(/[/\\]/).pop() || "Untitled" : "Untitled";

  return (
    <Box 
      id="status-bar"
      sx={{ 
        height: isZenMode ? 0 : 30, 
        bgcolor: 'transparent', 
        borderTop: 'none',
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        pl: 1.5, 
        pr: 0.5, 
        userSelect: "none", 
        flexShrink: isZenMode ? 1 : 0,
        pointerEvents: isZenMode ? 'none' : 'auto',
        overflow: 'hidden',
      }}


    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
        <Box
          id="status-file-name"
          onClick={handleScriptClick}
          sx={{ 
            fontSize: 11, 
            color: "text.secondary",
            cursor: !hasNoScripts && isBundle && scripts.length > 0 ? "pointer" : "default",
            display: "inline-flex",
            alignItems: "center",
            bgcolor: (t) => alpha(t.palette.text.primary, 0.06),
            border: "none",
            px: 1.25,
            py: 0.25,
            borderRadius: "20px",
            '&:hover': !hasNoScripts && isBundle && scripts.length > 0 ? { 
              bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
              color: "primary.main" 
            } : {},
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: { xs: 150, sm: 250, md: 350 },
            flexShrink: 0,
            transition: "all 0.15s ease",
          }}
        >
          <Typography variant="caption" sx={{ fontSize: 11, color: "inherit", fontWeight: 500 }}>
            {hasNoScripts ? "Project: " : "File: "}
          </Typography>
          <strong style={{ color: "var(--text-main)", marginLeft: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}>
            {hasNoScripts ? fileName : (isBundle ? `${activeScriptName} (${fileName})` : fileName)}
          </strong>
          {hasNoScripts ? (
            <span style={{ marginLeft: 6, color: "text.disabled", fontStyle: "italic", fontSize: 10 }}>
              (No script)
            </span>
          ) : (
            isBundle && scripts.length > 0 && <span style={{ marginLeft: 4, fontSize: 8, flexShrink: 0 }}>▼</span>
          )}
        </Box>


        {saveStatus !== "idle" && (
          <Box
            id="status-save-status"
            sx={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 0.5,
              opacity: 1,
              transition: "opacity var(--duration-fast) ease-in-out",
              flexShrink: 0
            }}
          >
            {saveStatus === "saving" && (
              <Box 
                sx={{ 
                  width: 10, 
                  height: 10, 
                  border: "1.5px solid",
                  borderColor: "primary.main",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            )}
            {saveStatus === "saved" && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5L4.5 7.5L8.5 2.5" stroke="#4caf50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <Typography variant="caption" sx={{ fontSize: 10, color: saveStatus === "saved" ? "#4caf50" : "text.secondary", fontWeight: 500 }}>
              {saveStatus === "saving" ? "Saving..." : "Saved"}
            </Typography>
          </Box>
        )}
        {aiStatus && (() => {
          const isAiActive = !/error|fail|credits|completed|cancelled/i.test(aiStatus);
          return (
            <Box
              id="status-ai-status"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                flexShrink: 0,
                px: 1,
                py: 0.2,
                borderRadius: "4px",
                bgcolor: (t) =>
                  /error|fail|credits/i.test(aiStatus)
                    ? alpha(t.palette.error.main, 0.1)
                    : alpha(t.palette.primary.main, 0.1),
              }}
            >
              {isAiActive && translationState !== "paused" && (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    bgcolor: "primary.main",
                    borderRadius: "1px",
                    animation: "actone-pulse 1s ease-in-out infinite",
                  }}
                />
              )}
              <Typography
                variant="caption"
                sx={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: (t) =>
                    /error|fail|credits/i.test(aiStatus)
                      ? t.palette.error.main
                      : t.palette.primary.main,
                }}
              >
                {aiStatus}
              </Typography>

              {isAiActive && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: 1 }}>
                  {/* Pause/Resume buttons only for Translation */}
                  {/Translating|Preparing|Paused/i.test(aiStatus) && (
                    <>
                      {translationState !== "paused" ? (
                        <Box
                          component="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTranslationState("paused");
                          }}
                          sx={{
                            cursor: "pointer",
                            fontSize: 10,
                            fontWeight: 700,
                            px: 0.8,
                            py: 0.1,
                            border: "none",
                            borderRadius: "3px",
                            bgcolor: "primary.main",
                            color: "#fff",
                            lineHeight: 1.4,
                            "&:hover": { opacity: 0.85 }
                          }}
                          title="Pause Translation"
                        >
                          ⏸ Pause
                        </Box>
                      ) : (
                        <Box
                          component="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTranslationState("running");
                          }}
                          sx={{
                            cursor: "pointer",
                            fontSize: 10,
                            fontWeight: 700,
                            px: 0.8,
                            py: 0.1,
                            border: "none",
                            borderRadius: "3px",
                            bgcolor: "#2e7d32",
                            color: "#fff",
                            lineHeight: 1.4,
                            "&:hover": { opacity: 0.85 }
                          }}
                          title="Resume Translation"
                        >
                          ▶ Resume
                        </Box>
                      )}
                    </>
                  )}

                  {/* Stop button for any active AI process */}
                  <Box
                    component="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelTranslation();
                    }}
                    sx={{
                      cursor: "pointer",
                      fontSize: 10,
                      fontWeight: 700,
                      px: 0.8,
                      py: 0.1,
                      border: "none",
                      borderRadius: "3px",
                      bgcolor: "#d32f2f",
                      color: "#fff",
                      lineHeight: 1.4,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      "&:hover": { opacity: 0.85 }
                    }}
                    title="Stop AI Process"
                  >
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        bgcolor: "#fff",
                        borderRadius: "1px",
                        animation: "actone-pulse 1.2s ease-in-out infinite",
                      }}
                    />
                    Stop
                  </Box>
                </Box>
              )}
            </Box>
          );
        })()}

        {isBundle && scripts.length > 0 && (
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            slotProps={{ paper: { sx: { maxHeight: 200, width: 220 } } }}
          >
            {scripts.map((script, idx) => {
              const ext = isProseScript(script) ? "md" : "fountain";
              const displayName = script.fileName?.split("/").pop() || `${script.name}.${ext}`;
              return (
                <MenuItem 
                  key={script.fileName} 
                  selected={idx === activeScriptIndex}
                  onClick={() => handleScriptSelect(idx)}
                >
                  <ListItemText 
                    primary={displayName} 
                    slotProps={{
                      primary: { sx: { fontWeight: idx === activeScriptIndex ? 700 : 400, fontSize: 13 } },
                    }}
                  />
                </MenuItem>
              );
            })}
          </Menu>
        )}
      </Box>

        <Box sx={{ display: "flex", alignItems: "center", height: "100%", flexShrink: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.5, sm: 2 }, flexShrink: 0, mr: 2 }}>
            {sprintDetails && (
              <Typography
                id="status-sprint"
                variant="caption" 
                sx={{ 
                  fontSize: 11, 
                  color: "primary.main", 
                  fontWeight: 500, 
                  display: "flex", 
                  alignItems: "center",
                  mr: 1,
                  whiteSpace: "nowrap",
                  flexShrink: 0
                }}
              >
                <span style={{ 
                  display: "inline-block", 
                  width: 6, 
                  height: 6, 
                  borderRadius: "50%", 
                  backgroundColor: "var(--accent-color)", 
                  marginRight: 6,
                  flexShrink: 0
                }}></span>
                Sprint: <strong style={{ color: "var(--text-main)", marginLeft: 3 }}>{sprintDetails.timeStr} / {sprintDetails.total}m</strong>&nbsp;({sprintDetails.wpm} WPM)
              </Typography>
            )}

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
              {updateAvailable && (
                <Box
                  onClick={() => installUpdate()}
                  title="Click to install update from Microsoft Store"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    mr: 1,
                    pr: 1.5,
                    pl: 0.5,
                    cursor: 'pointer',
                    color: 'primary.main',
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    borderRight: 1,
                    borderColor: 'divider',
                    flexShrink: 0,
                    transition: 'opacity 0.2s ease',
                    '&:hover': { opacity: 0.7 }
                  }}
                >
                  <DownloadIcon sx={{ fontSize: 14 }} />
                  Update
                </Box>
              )}
              {selectionStats && (
                <Typography id="status-selection" variant="caption" sx={{ fontSize: 11, color: "primary.main", fontWeight: 600, whiteSpace: "nowrap" }}>
                  Selection: <strong style={{ color: "var(--text-main)" }}>{selectionStats.words.toLocaleString()} words ({selectionStats.chars.toLocaleString()} chars)</strong>
                </Typography>
              )}
              <Typography
                id="status-spellcheck"
                variant="caption"
                onClick={(e) => setSpellMenuAnchorEl(e.currentTarget)}
                sx={{
                  fontSize: 11,
                  color: spellcheckEnabled ? "text.secondary" : "text.disabled",
                  opacity: spellcheckEnabled ? 1 : 0.45,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.4,
                  whiteSpace: "nowrap",
                  transition: "opacity 0.15s ease, color 0.15s ease",
                  "&:hover": { color: "primary.main", opacity: 1 },
                }}
                title={spellcheckEnabled ? `Spellcheck: ${installedLangs.find(l => l.code === spellcheckLanguage)?.name || spellcheckLanguage.toUpperCase()} (On)` : `Spellcheck: ${installedLangs.find(l => l.code === spellcheckLanguage)?.name || spellcheckLanguage.toUpperCase()} (Off)`}
              >
                <strong style={{ color: spellcheckEnabled ? "var(--text-main)" : "inherit" }}>
                  {installedLangs.find(l => l.code === spellcheckLanguage)?.name || spellcheckLanguage.toUpperCase()}
                </strong>
                <span style={{ fontSize: 7, opacity: 0.7 }}>▲</span>
              </Typography>
              <Menu
                anchorEl={spellMenuAnchorEl}
                open={Boolean(spellMenuAnchorEl)}
                onClose={() => setSpellMenuAnchorEl(null)}
                anchorOrigin={{ vertical: "top", horizontal: "left" }}
                transformOrigin={{ vertical: "bottom", horizontal: "left" }}
                slotProps={{ paper: { sx: { minWidth: 180, boxShadow: 3 } } }}
              >
                <MenuItem
                  dense
                  onClick={() => {
                    setSpellcheckEnabled(!spellcheckEnabled);
                    setSpellMenuAnchorEl(null);
                  }}
                >
                  <ListItemText
                    primary={spellcheckEnabled ? "Disable Spellcheck" : "Enable Spellcheck"}
                    slotProps={{ primary: { sx: { fontSize: 12, fontWeight: 600 } } }}
                  />
                </MenuItem>
                <Box sx={{ borderBottom: 1, borderColor: "divider", my: 0.5 }} />
                {(installedLangs.length > 0 ? installedLangs : [{ code: "en", name: "English (US)", native_name: "English (US)" }]).map((lang) => (
                  <MenuItem
                    key={lang.code}
                    dense
                    selected={lang.code === spellcheckLanguage}
                    onClick={async () => {
                      setSpellcheckLanguage(lang.code);
                      try {
                        if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
                          const { invoke } = await import("@tauri-apps/api/core");
                          await invoke("spellcheck_set_language", { lang: lang.code });
                          window.dispatchEvent(new CustomEvent("dictionary-changed"));
                        }
                      } catch { void 0; }
                      setSpellMenuAnchorEl(null);
                    }}
                  >
                    <ListItemText
                      primary={`${lang.name} ${lang.code === spellcheckLanguage ? "✓" : ""}`}
                      slotProps={{
                        primary: {
                          sx: {
                            fontSize: 12,
                            fontWeight: lang.code === spellcheckLanguage ? 700 : 400,
                          },
                        },
                      }}
                    />
                  </MenuItem>
                ))}
                <Box sx={{ borderBottom: 1, borderColor: "divider", my: 0.5 }} />
                <MenuItem
                  dense
                  onClick={() => {
                    setSpellMenuAnchorEl(null);
                    openSettingsWindow("spellcheck");
                  }}
                >
                  <ListItemText
                    primary="Spellcheck Settings…"
                    slotProps={{ primary: { sx: { fontSize: 12 } } }}
                  />
                </MenuItem>
              </Menu>
              {showTimeline && !isMarkdown && (
                <Box
                  id="status-timeline-options"
                  onClick={handleTimelineMenuOpen}
                  sx={(t) => {
                    const isFiltered = timelineFilter.type !== "default";
                    return {
                      display: "flex",
                      alignItems: "center",
                      gap: 0.6,
                      cursor: "pointer",
                      color: isFiltered ? "primary.main" : "text.secondary",
                      fontSize: 11,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      px: 1,
                      py: 0.25,
                      borderRadius: "6px",
                      bgcolor: isFiltered
                        ? alpha(t.palette.primary.main, 0.12)
                        : "transparent",
                      border: "1px solid",
                      borderColor: isFiltered
                        ? alpha(t.palette.primary.main, 0.3)
                        : "transparent",
                      transition: "all var(--duration-fast, 0.12s) var(--motion-snappy, ease)",
                      "&:hover": {
                        color: "primary.main",
                        bgcolor: alpha(t.palette.primary.main, 0.08),
                        borderColor: alpha(t.palette.primary.main, 0.2),
                      },
                      "&:active": {
                        transform: "scale(0.97)",
                      },
                    };
                  }}
                  title="Timeline Filter Options"
                >
                  <ViewAgendaIcon sx={{ fontSize: 13, opacity: 0.85 }} />
                  <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: "inherit", lineHeight: 1 }}>
                    {getFilterLabel()}
                  </Typography>
                  <KeyboardArrowDownIcon sx={{ fontSize: 12, opacity: 0.7, ml: -0.2 }} />
                </Box>
              )}
              {showTimeline && !isMarkdown && (
                <Menu
                  anchorEl={timelineMenuAnchor}
                  open={Boolean(timelineMenuAnchor)}
                  onClose={handleTimelineMenuClose}
                  anchorOrigin={{ vertical: "top", horizontal: "left" }}
                  transformOrigin={{ vertical: "bottom", horizontal: "left" }}
                  slotProps={{
                    paper: {
                      sx: (theme) => ({
                        borderRadius: "8px",
                        boxShadow: `0px 4px 16px ${alpha(theme.palette.common.black, 0.15)}`,
                        border: "1px solid",
                        borderColor: "divider",
                        minWidth: 180,
                        py: 0.25,
                        maxHeight: 400,
                        width: 230,
                      })
                    }
                  }}
                >
                  {menuView === 'main' && [
                    <Box key="display-options-header" sx={{ px: 2, pt: 1, pb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
                        Display Options
                      </Typography>
                    </Box>,
                    <MenuItem key="toggle-sections" onClick={(e) => { e.stopPropagation(); setTimelineShowSections(!timelineShowSections); }}>
                      <ListItemText primary="Section Lines" slotProps={{ primary: { sx: { fontSize: 12 } } }} />
                      {timelineShowSections && <CheckIcon sx={{ fontSize: 14, ml: 'auto', color: 'primary.main' }} />}
                    </MenuItem>,
                    <MenuItem key="toggle-scene-numbers" onClick={(e) => { e.stopPropagation(); setTimelineShowSceneNumbers(!timelineShowSceneNumbers); }}>
                      <ListItemText primary="Scene Numbers" slotProps={{ primary: { sx: { fontSize: 12 } } }} />
                      {timelineShowSceneNumbers && <CheckIcon sx={{ fontSize: 14, ml: 'auto', color: 'primary.main' }} />}
                    </MenuItem>,
                    <MenuItem key="toggle-scene-colors" onClick={(e) => { e.stopPropagation(); setTimelineShowSceneColors(!timelineShowSceneColors); }}>
                      <ListItemText primary="Scene Colors" slotProps={{ primary: { sx: { fontSize: 12 } } }} />
                      {timelineShowSceneColors && <CheckIcon sx={{ fontSize: 14, ml: 'auto', color: 'primary.main' }} />}
                    </MenuItem>,
                    <Divider key="options-divider" sx={{ my: 0.5 }} />,
                    <Box key="filters-header" sx={{ px: 2, pt: 0.5, pb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
                        Highlight Filter
                      </Typography>
                    </Box>,
                    <MenuItem key="default" onClick={() => selectFilter('default')}>
                      <ListItemText primary="Default (All Scenes)" slotProps={{ primary: { sx: { fontSize: 12 } } }} />
                      {timelineFilter.type === 'default' && <CheckIcon sx={{ fontSize: 14, ml: 'auto', color: 'primary.main' }} />}
                    </MenuItem>,
                    <MenuItem key="characters" onClick={() => setMenuView('characters')}>
                      <ListItemText primary="Characters" slotProps={{ primary: { sx: { fontSize: 12 } } }} />
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>▶</Typography>
                    </MenuItem>,
                    <MenuItem key="locations" onClick={() => setMenuView('locations')}>
                      <ListItemText primary="Locations" slotProps={{ primary: { sx: { fontSize: 12 } } }} />
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>▶</Typography>
                    </MenuItem>,
                    <MenuItem key="times" onClick={() => setMenuView('times')}>
                      <ListItemText primary="Time of Day" slotProps={{ primary: { sx: { fontSize: 12 } } }} />
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>▶</Typography>
                    </MenuItem>,
                    <MenuItem key="settings" onClick={() => setMenuView('settings')}>
                      <ListItemText primary="Setting (INT/EXT)" slotProps={{ primary: { sx: { fontSize: 12 } } }} />
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>▶</Typography>
                    </MenuItem>,
                    <MenuItem key="markers" onClick={() => selectFilter('marker')}>
                      <ListItemText primary="Markers" slotProps={{ primary: { sx: { fontSize: 12 } } }} />
                      {timelineFilter.type === 'marker' && <CheckIcon sx={{ fontSize: 14, ml: 'auto', color: 'primary.main' }} />}
                    </MenuItem>
                  ]}

                  {menuView === 'characters' && [
                    <MenuItem key="back" onClick={() => { setMenuView('main'); setCharSearchQuery(""); }} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                      <ListItemText primary="◀ Back" slotProps={{ primary: { sx: { fontWeight: 600, fontSize: 12 } } }} />
                    </MenuItem>,
                    <Box key="search-char-box" sx={{ px: 1.5, py: 1, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center" }}>
                      <InputBase
                        autoFocus
                        placeholder="Search characters..."
                        value={charSearchQuery}
                        onChange={(e) => setCharSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        sx={{
                          fontSize: 12,
                          width: "100%",
                          bgcolor: "action.hover",
                          px: 1,
                          py: 0.5,
                          borderRadius: "4px",
                          border: "1px solid",
                          borderColor: "divider",
                          "& input": { p: 0 }
                        }}
                      />
                    </Box>,
                    filteredCharacters.length === 0 ? (
                      <MenuItem key="empty" disabled><ListItemText primary="No characters found" slotProps={{ primary: { sx: { fontSize: 12 } } }} /></MenuItem>
                    ) : (
                      filteredCharacters.map(char => {
                        const isSel = timelineFilter.type === 'character' && timelineFilter.values.includes(char);
                        return (
                          <MenuItem key={char} onClick={() => toggleFilterValue('character', char)} selected={isSel}>
                            <ListItemText primary={char} slotProps={{ primary: { sx: { fontSize: 12 } } }} />
                            {isSel && <CheckIcon sx={{ fontSize: 14, ml: 'auto', color: 'primary.main' }} />}
                          </MenuItem>
                        );
                      })
                    )
                  ]}

                  {menuView === 'locations' && [
                    <MenuItem key="back" onClick={() => { setMenuView('main'); setLocSearchQuery(""); }} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                      <ListItemText primary="◀ Back" slotProps={{ primary: { sx: { fontWeight: 600, fontSize: 12 } } }} />
                    </MenuItem>,
                    <Box key="search-loc-box" sx={{ px: 1.5, py: 1, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center" }}>
                      <InputBase
                        autoFocus
                        placeholder="Search locations..."
                        value={locSearchQuery}
                        onChange={(e) => setLocSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        sx={{
                          fontSize: 12,
                          width: "100%",
                          bgcolor: "action.hover",
                          px: 1,
                          py: 0.5,
                          borderRadius: "4px",
                          border: "1px solid",
                          borderColor: "divider",
                          "& input": { p: 0 }
                        }}
                      />
                    </Box>,
                    filteredLocations.length === 0 ? (
                      <MenuItem key="empty" disabled><ListItemText primary="No locations found" slotProps={{ primary: { sx: { fontSize: 12 } } }} /></MenuItem>
                    ) : (
                      filteredLocations.map(loc => {
                        const isSel = timelineFilter.type === 'location' && timelineFilter.values.includes(loc);
                        return (
                          <MenuItem key={loc} onClick={() => toggleFilterValue('location', loc)} selected={isSel}>
                            <ListItemText primary={loc} slotProps={{ primary: { sx: { fontSize: 12 } } }} />
                            {isSel && <CheckIcon sx={{ fontSize: 14, ml: 'auto', color: 'primary.main' }} />}
                          </MenuItem>
                        );
                      })
                    )
                  ]}

                  {menuView === 'times' && [
                    <MenuItem key="back" onClick={() => setMenuView('main')} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                      <ListItemText primary="◀ Back" slotProps={{ primary: { sx: { fontWeight: 600, fontSize: 12 } } }} />
                    </MenuItem>,
                    parsedTokens.times.length === 0 ? (
                      <MenuItem key="empty" disabled><ListItemText primary="No times found" slotProps={{ primary: { sx: { fontSize: 12 } } }} /></MenuItem>
                    ) : (
                      parsedTokens.times.map(t => {
                        const isSel = timelineFilter.type === 'time' && timelineFilter.values.includes(t);
                        return (
                          <MenuItem key={t} onClick={() => toggleFilterValue('time', t)} selected={isSel}>
                            <ListItemText primary={t} slotProps={{ primary: { sx: { fontSize: 12 } } }} />
                            {isSel && <CheckIcon sx={{ fontSize: 14, ml: 'auto', color: 'primary.main' }} />}
                          </MenuItem>
                        );
                      })
                    )
                  ]}

                  {menuView === 'settings' && [
                    <MenuItem key="back" onClick={() => setMenuView('main')} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                      <ListItemText primary="◀ Back" slotProps={{ primary: { sx: { fontWeight: 600, fontSize: 12 } } }} />
                    </MenuItem>,
                    <MenuItem key="int" onClick={() => toggleFilterValue('setting', 'INT')} selected={timelineFilter.type === 'setting' && timelineFilter.values.includes('INT')}>
                      <ListItemText primary="INT (Interior)" slotProps={{ primary: { sx: { fontSize: 12 } } }} />
                      {timelineFilter.type === 'setting' && timelineFilter.values.includes('INT') && <CheckIcon sx={{ fontSize: 14, ml: 'auto', color: 'primary.main' }} />}
                    </MenuItem>,
                    <MenuItem key="ext" onClick={() => toggleFilterValue('setting', 'EXT')} selected={timelineFilter.type === 'setting' && timelineFilter.values.includes('EXT')}>
                      <ListItemText primary="EXT (Exterior)" slotProps={{ primary: { sx: { fontSize: 12 } } }} />
                      {timelineFilter.type === 'setting' && timelineFilter.values.includes('EXT') && <CheckIcon sx={{ fontSize: 14, ml: 'auto', color: 'primary.main' }} />}
                    </MenuItem>
                  ]}
                </Menu>
              )}
              {hasNoScripts ? (
                <Typography id="status-no-script" variant="caption" sx={{ fontSize: 11, color: "text.disabled", fontStyle: "italic", whiteSpace: "nowrap" }}>
                  No active script
                </Typography>
              ) : (
                <>
                  <Typography id="status-mode" variant="caption" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'primary.main', bgcolor: 'action.hover', px: 0.8, py: 0.2, borderRadius: 0.5, whiteSpace: "nowrap" }}>
                    {isMarkdown ? "Prose" : "Script"}
                  </Typography>
                  {!isMarkdown && (
                    <Typography id="status-scenes" variant="caption" sx={{ fontSize: 11, color: "text.secondary", whiteSpace: "nowrap", display: { xs: "none", md: "inline" } }}>
                      Scenes: <strong style={{ color: "var(--text-main)" }}>{stats.sceneCount}</strong>
                    </Typography>
                  )}
                  <Typography id="status-words" variant="caption" sx={{ fontSize: 11, color: "text.secondary", whiteSpace: "nowrap", display: { xs: "none", sm: "inline" } }}>
                    Words: <strong style={{ color: "var(--text-main)" }}>{stats.words}</strong>
                  </Typography>
                  <Typography id="status-page" variant="caption" sx={{ fontSize: 11, color: "text.secondary", whiteSpace: "nowrap" }}>
                    Page: <strong style={{ color: "var(--text-main)" }}>{stats.currentPage} of {stats.pages}</strong>
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
  );
});
