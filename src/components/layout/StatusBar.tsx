import React, { useMemo, useState, useEffect } from "react";
import { useFile, useUI, useSprint } from "../../context";
import { LineType, parseSceneHeading } from "../../parser";
import { Box, Typography, Menu, MenuItem, ListItemText, InputBase } from "@mui/material";
import { alpha } from "@mui/material/styles";

import { useEditor } from "../../context";
import { CheckIcon } from "../Icons";

export const StatusBar: React.FC = () => {
  const { rawText, parsedDoc, isBundle, scripts, activeScriptIndex, filePath, activeScriptName, setActiveScript, activeFileId } = useFile();
  const { isZenMode, showTimeline, timelineFilter, setTimelineFilter } = useUI();
  const { activeLineId } = useEditor();
  const { activeSprints } = useSprint();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [tick, setTick] = useState(0);

  const currentSprint = activeSprints[activeFileId];

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
          if (parsed.timeOfDay) {
            times.add(parsed.timeOfDay);
          }
          if (parsed.location) {
            locations.add(parsed.location);
          }
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

  const selectFilter = (type: 'default' | 'character' | 'location' | 'time' | 'setting', value?: string) => {
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
    if (timelineFilter.type === "default" || !timelineFilter.values || timelineFilter.values.length === 0) {
      return "Timeline Options";
    }
    const typeLabel = timelineFilter.type === "character" ? "CHARACTER"
                    : timelineFilter.type === "location" ? "LOCATION"
                    : timelineFilter.type === "time" ? "TIME"
                    : "SETTING";
    
    if (timelineFilter.values.length > 1) {
      return `Timeline: ${typeLabel}S`;
    } else {
      return `Timeline: ${typeLabel} (${timelineFilter.values[0]})`;
    }
  };

  useEffect(() => {
    if (currentSprint) {
      const timer = setInterval(() => {
        setTick(t => t + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentSprint]);

  const stats = useMemo(() => {
    const text = rawText || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const pages = parsedDoc?.pageBreaks ? parsedDoc.pageBreaks.length + 1 : 1;

    let currentPage = 1;
    if (parsedDoc?.lines) {
      const activeLineIndex = parsedDoc.lines.findIndex(l => l.id === activeLineId);
      if (activeLineIndex !== -1 && parsedDoc.pageBreaks) {
        currentPage = parsedDoc.pageBreaks.filter(b => b <= activeLineIndex).length + 1;
      }
    }

    const sceneCount = parsedDoc?.lines ? parsedDoc.lines.filter(l => l.type === LineType.heading).length : 0;

    return { words, chars, pages, currentPage, sceneCount };
  }, [rawText, parsedDoc, activeLineId]);

  const sprintDetails = useMemo(() => {
    if (!currentSprint) return null;
    const totalSec = currentSprint.durationMinutes * 60;
    const elapsed = Math.floor((Date.now() - currentSprint.startTime) / 1000);
    const remaining = Math.max(0, totalSec - elapsed);
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    const timeStr = `${m}:${s.toString().padStart(2, "0")}`;

    const text = rawText || "";
    const currentWords = text.trim() ? text.trim().split(/\s+/).length : 0;
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

  if (isZenMode) return null;

  const fileName = filePath ? filePath.split(/[/\\]/).pop() || "Untitled" : "Untitled";

  return (
    <Box 
      sx={{ 
        height: 28, 
        bgcolor: "background.paper", 
        borderTop: 1, 
        borderColor: "divider", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        px: 2, 
        userSelect: "none", 
        flexShrink: 0 
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Typography 
          onClick={handleScriptClick}
          variant="caption" 
          sx={{ 
            fontSize: 11, 
            color: "text.secondary",
            cursor: isBundle && scripts.length > 0 ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            '&:hover': isBundle && scripts.length > 0 ? { color: "primary.main" } : {}
          }}
        >
          File: <strong style={{ color: "var(--text-main)", marginLeft: 3 }}>
            {isBundle ? `${activeScriptName} (${fileName})` : fileName}
          </strong>
          {isBundle && scripts.length > 0 && <span style={{ marginLeft: 4, fontSize: 8 }}>▼</span>}
        </Typography>

        {isBundle && scripts.length > 0 && (
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            slotProps={{ paper: { sx: { maxHeight: 200, width: 220 } } }}
          >
            {scripts.map((script, idx) => (
              <MenuItem 
                key={script.fileName} 
                selected={idx === activeScriptIndex}
                onClick={() => handleScriptSelect(idx)}
              >
                <ListItemText 
                  primary={`${script.name}.fountain`} 
                  slotProps={{
                    primary: { sx: { fontWeight: idx === activeScriptIndex ? 700 : 400, fontSize: 13 } },
                  }}
                />
              </MenuItem>
            ))}
          </Menu>
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
        {showTimeline && (
          <Box 
            onClick={handleTimelineMenuOpen}
            sx={{ 
              display: "flex", 
              alignItems: "center", 
              cursor: "pointer", 
              px: 1, 
              py: 0.25,
              borderRadius: "4px",
              '&:hover': { bgcolor: 'action.hover' }, 
              gap: 0.5 
            }}
          >
            <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: "primary.main", textTransform: "uppercase" }}>
              {getFilterLabel()}
            </Typography>
          </Box>
        )}

        {showTimeline && (
          <Menu
            anchorEl={timelineMenuAnchor}
            open={Boolean(timelineMenuAnchor)}
            onClose={handleTimelineMenuClose}
            {...{
              disableScrollLock: true,
              disableAutoFocus: true,
              disableRestoreFocus: true,
              MenuListProps: {
                autoFocusItem: false,
                dense: true,
              }
            }}
            slotProps={{
              paper: {
                sx: (theme: any) => ({
                  borderRadius: "8px",
                  boxShadow: `0px 4px 16px ${alpha(theme.palette.common.black, 0.15)}`,
                  border: "1px solid",
                  borderColor: "divider",
                  minWidth: 180,
                  py: 0.25,
                  maxHeight: 300,
                  width: 230,
                })
              }
            }}
          >
            {menuView === 'main' && [
              <MenuItem key="default" onClick={() => selectFilter('default')}>
                <ListItemText primary="Default" />
                {timelineFilter.type === 'default' && <CheckIcon sx={{ fontSize: 14, ml: 'auto', color: 'primary.main' }} />}
              </MenuItem>,
              <MenuItem key="characters" onClick={() => setMenuView('characters')}>
                <ListItemText primary="Characters" />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>▶</Typography>
              </MenuItem>,
              <MenuItem key="locations" onClick={() => setMenuView('locations')}>
                <ListItemText primary="Locations" />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>▶</Typography>
              </MenuItem>,
              <MenuItem key="times" onClick={() => setMenuView('times')}>
                <ListItemText primary="Time of Day" />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>▶</Typography>
              </MenuItem>,
              <MenuItem key="settings" onClick={() => setMenuView('settings')}>
                <ListItemText primary="Setting (INT/EXT)" />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>▶</Typography>
              </MenuItem>
            ]}

            {menuView === 'characters' && [
              <MenuItem key="back" onClick={() => { setMenuView('main'); setCharSearchQuery(""); }} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                <ListItemText primary="◀ Back" slotProps={{ primary: { sx: { fontWeight: 600 } } }} />
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
                <MenuItem key="empty" disabled><ListItemText primary="No characters found" /></MenuItem>
              ) : (
                filteredCharacters.map(char => {
                  const isSel = timelineFilter.type === 'character' && timelineFilter.values.includes(char);
                  return (
                    <MenuItem key={char} onClick={() => toggleFilterValue('character', char)} selected={isSel}>
                      <ListItemText primary={char} />
                      {isSel && <CheckIcon sx={{ fontSize: 14, ml: 'auto', color: 'primary.main' }} />}
                    </MenuItem>
                  );
                })
              )
            ]}

            {menuView === 'locations' && [
              <MenuItem key="back" onClick={() => { setMenuView('main'); setLocSearchQuery(""); }} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                <ListItemText primary="◀ Back" slotProps={{ primary: { sx: { fontWeight: 600 } } }} />
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
                <MenuItem key="empty" disabled><ListItemText primary="No locations found" /></MenuItem>
              ) : (
                filteredLocations.map(loc => {
                  const isSel = timelineFilter.type === 'location' && timelineFilter.values.includes(loc);
                  return (
                    <MenuItem key={loc} onClick={() => toggleFilterValue('location', loc)} selected={isSel}>
                      <ListItemText primary={loc} />
                      {isSel && <CheckIcon sx={{ fontSize: 14, ml: 'auto', color: 'primary.main' }} />}
                    </MenuItem>
                  );
                })
              )
            ]}

            {menuView === 'times' && [
              <MenuItem key="back" onClick={() => setMenuView('main')} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                <ListItemText primary="◀ Back" slotProps={{ primary: { sx: { fontWeight: 600 } } }} />
              </MenuItem>,
              parsedTokens.times.length === 0 ? (
                <MenuItem key="empty" disabled><ListItemText primary="No times found" /></MenuItem>
              ) : (
                parsedTokens.times.map(t => {
                  const isSel = timelineFilter.type === 'time' && timelineFilter.values.includes(t);
                  return (
                    <MenuItem key={t} onClick={() => toggleFilterValue('time', t)} selected={isSel}>
                      <ListItemText primary={t} />
                      {isSel && <CheckIcon sx={{ fontSize: 14, ml: 'auto', color: 'primary.main' }} />}
                    </MenuItem>
                  );
                })
              )
            ]}

            {menuView === 'settings' && [
              <MenuItem key="back" onClick={() => setMenuView('main')} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                <ListItemText primary="◀ Back" slotProps={{ primary: { sx: { fontWeight: 600 } } }} />
              </MenuItem>,
              <MenuItem key="int" onClick={() => toggleFilterValue('setting', 'INT')} selected={timelineFilter.type === 'setting' && timelineFilter.values.includes('INT')}>
                <ListItemText primary="INT (Interior)" />
                {timelineFilter.type === 'setting' && timelineFilter.values.includes('INT') && <CheckIcon sx={{ fontSize: 14, ml: 'auto', color: 'primary.main' }} />}
              </MenuItem>,
              <MenuItem key="ext" onClick={() => toggleFilterValue('setting', 'EXT')} selected={timelineFilter.type === 'setting' && timelineFilter.values.includes('EXT')}>
                <ListItemText primary="EXT (Exterior)" />
                {timelineFilter.type === 'setting' && timelineFilter.values.includes('EXT') && <CheckIcon sx={{ fontSize: 14, ml: 'auto', color: 'primary.main' }} />}
              </MenuItem>
            ]}
          </Menu>
        )}

        {sprintDetails && (
          <Typography 
            variant="caption" 
            sx={{ 
              fontSize: 11, 
              color: "primary.main", 
              fontWeight: 500, 
              display: "flex", 
              alignItems: "center",
              mr: 1
            }}
          >
            <span style={{ 
              display: "inline-block", 
              width: 6, 
              height: 6, 
              borderRadius: "50%", 
              backgroundColor: "var(--accent-color)", 
              marginRight: 6
            }}></span>
            Sprint: <strong style={{ color: "var(--text-main)", marginLeft: 3 }}>{sprintDetails.timeStr} / {sprintDetails.total}m</strong>&nbsp;({sprintDetails.wpm} WPM)
          </Typography>
        )}

        <>
          <Typography variant="caption" sx={{ fontSize: 11, color: "text.secondary" }}>
            Scenes: <strong style={{ color: "var(--text-main)" }}>{stats.sceneCount}</strong>
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 11, color: "text.secondary" }}>
            Words: <strong style={{ color: "var(--text-main)" }}>{stats.words}</strong>
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 11, color: "text.secondary" }}>
            Page: <strong style={{ color: "var(--text-main)" }}>{stats.currentPage} of {stats.pages}</strong>
          </Typography>
        </>
      </Box>
    </Box>
  );
};
